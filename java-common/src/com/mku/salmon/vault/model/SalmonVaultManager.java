package com.mku.salmon.vault.model;
/*
MIT License

Copyright (c) 2021 Max Kas

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import com.mku.fs.drive.utils.FileCommander;
import com.mku.fs.drive.utils.FileCommander.BatchDeleteOptions;
import com.mku.fs.drive.utils.FileSearcher;
import com.mku.fs.file.*;
import com.mku.func.BiConsumer;
import com.mku.func.Consumer;
import com.mku.func.Function;
import com.mku.salmon.sequence.INonceSequenceSerializer;
import com.mku.salmon.sequence.INonceSequencer;
import com.mku.salmon.sequence.SequenceSerializer;
import com.mku.salmon.streams.AesStream;
import com.mku.salmon.vault.config.SalmonConfig;
import com.mku.salmon.vault.dialog.SalmonDialog;
import com.mku.salmon.vault.dialog.SalmonDialogs;
import com.mku.salmon.vault.utils.ByteUtils;
import com.mku.salmon.vault.utils.IPropertyNotifier;
import com.mku.salmon.vault.utils.WindowUtils;
import com.mku.salmonfs.drive.AesDrive;
import com.mku.salmonfs.drive.Drive;
import com.mku.salmonfs.drive.HttpDrive;
import com.mku.salmonfs.drive.WSDrive;
import com.mku.salmonfs.drive.utils.AesFileCommander;
import com.mku.salmonfs.file.AesFile;
import com.mku.salmonfs.sequence.FileSequencer;
import com.mku.streams.RandomAccessStream;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.RandomAccess;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

public class SalmonVaultManager implements IPropertyNotifier {
    protected static final String SEQUENCER_DIR_NAME = ".salmon";
    protected static final String SERVICE_PIPE_NAME = "SalmonService";

    private static int bufferSize = 512 * 1024;
    private static int threads = 1;

    public static final int REQUEST_OPEN_VAULT_DIR = 1000;
    public static final int REQUEST_CREATE_VAULT_DIR = 1001;
    public static final int REQUEST_IMPORT_FILES = 1002;
    public static final int REQUEST_EXPORT_DIR = 1003;
    public static final int REQUEST_IMPORT_AUTH_FILE = 1004;
    public static final int REQUEST_EXPORT_AUTH_FILE = 1005;
    public static final int REQUEST_IMPORT_FOLDER = 1006;

    private static ExecutorService executor = Executors.newFixedThreadPool(2);

    private String sequencerDefaultDirPath = SalmonConfig.getPrivateDir() + File.separator + SEQUENCER_DIR_NAME;
    private HashSet<BiConsumer<Object, String>> observers = new HashSet<>();

    private boolean promptExitOnBack;
    private AesDrive drive;

    public AesDrive getDrive() {
        return this.drive;
    }

    public String getSequencerDefaultDirPath() {
        return sequencerDefaultDirPath;
    }

    public void setSequencerDefaultDirPath(String value) {
        sequencerDefaultDirPath = value;
    }

    protected String getSequencerFilepath() {
        return sequencerDefaultDirPath + File.separator
                + SalmonConfig.FILE_SEQ_FILENAME;
    }

    public Function<AesFile, Boolean> openListItem;
    public Consumer<AesFile> updateListItem;
    public BiConsumer<Integer, AesFile> onFileItemRemoved;
    public BiConsumer<Integer, AesFile> onFileItemAdded;

    protected static SalmonVaultManager instance;
    private INonceSequencer sequencer = null;

    synchronized
    public static SalmonVaultManager getInstance() {
        if (instance == null) {
            instance = new SalmonVaultManager();
        }
        return instance;
    }

    public static int getBufferSize() {
        return bufferSize;
    }

    public static void setBufferSize(int bufferSize) {
        SalmonVaultManager.bufferSize = bufferSize;
    }

    public static int getThreads() {
        return threads;
    }

    public static void setThreads(int threads) {
        SalmonVaultManager.threads = threads;
    }

    private List<AesFile> fileItemList;

    public List<AesFile> getFileItemList() {
        return fileItemList;
    }

    public void setFileItemList(List<AesFile> value) {
        if (fileItemList != value) {
            fileItemList = value;
            propertyChanged(this, "FileItemList");
        }
    }

    private HashSet<AesFile> selectedFiles = new HashSet<>();

    public HashSet<AesFile> getSelectedFiles() {
        return selectedFiles;
    }

    public void setSelectedFiles(HashSet<AesFile> value) {
        if (value != selectedFiles) {
            selectedFiles = value;
            propertyChanged(this, "SelectedFiles");
        }
    }

    private AesFile _currentItem;

    public AesFile getCurrentItem() {
        return _currentItem;
    }

    public void setCurrentItem(AesFile value) {
        if (value != _currentItem) {
            _currentItem = value;
            propertyChanged(this, "CurrentItem");
        }
    }

    private String status = "";

    public String getStatus() {
        return status;
    }

    public void setStatus(String value) {
        if (value != status) {
            status = value;
            propertyChanged(this, "Status");
        }
    }

    private boolean isJobRunning;

    public boolean isJobRunning() {
        return isJobRunning;
    }

    private void setJobRunning(boolean value) {
        if (value != isJobRunning) {
            isJobRunning = value;
            propertyChanged(this, "IsJobRunning");
        }
    }

    private String path;

    public String getPath() {
        return path;
    }

    public void setPath(String value) {
        if (value != path) {
            path = value;
            propertyChanged(this, "Path");
        }
    }

    private double fileProgress;

    public double getFileProgress() {
        return fileProgress;
    }

    public void setFileProgress(double value) {
        if (value != fileProgress) {
            fileProgress = value;
            propertyChanged(this, "FileProgress");
        }
    }

    private double filesProgress;

    public double getFilesProgress() {
        return filesProgress;
    }

    public void setFilesProgress(double value) {
        if (value != filesProgress) {
            filesProgress = value;
            propertyChanged(this, "FilesProgress");
        }
    }

    private AesFile currDir;

    public AesFile getCurrDir() {
        return currDir;
    }

    private AesFileCommander fileCommander;
    private AesFile[] copyFiles;
    private AesFile[] salmonFiles;
    private String searchTerm;
    private Mode fileManagerMode = Mode.Browse;

    public Mode getFileManagerMode() {
        return fileManagerMode;
    }

    protected SalmonVaultManager() {
        SalmonSettings.getInstance().load();
        setupFileCommander();
        setupSalmonManager();
    }

    public void initialize() {

    }

    public boolean onOpenItem(int selectedItem) {
        try {
            AesFile selectedFile = fileItemList.get(selectedItem);
            return openItem(selectedFile);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return false;
    }

    public void setPathText(String value) {
        if (value == null) {
            setPath("");
            return;
        }

        if (value.startsWith("/"))
            value = value.substring(1);
        setPath("fs://" + value);
    }

    public void stopOperation() {
        fileCommander.cancel();
        fileManagerMode = Mode.Browse;
        clearSelectedFiles();
        clearCopiedFiles();
        fileProgress = 0;
        filesProgress = 0;
        setTaskRunning(false);
        setTaskMessage("");
    }

    public void copySelectedFiles() {
        if (isJobRunning())
            throw new RuntimeException("Another Job is Running");
        fileManagerMode = Mode.Copy;
        copyFiles = selectedFiles.toArray(new AesFile[0]);
        setTaskRunning(true, false);
        setTaskMessage(copyFiles.length + " Items selected for copy");
    }

    public void cutSelectedFiles() {
        if (isJobRunning())
            throw new RuntimeException("Another Job is Running");
        fileManagerMode = Mode.Move;
        copyFiles = selectedFiles.toArray(new AesFile[0]);
        setTaskRunning(true, false);
        setTaskMessage(copyFiles.length + " Items selected for move");
    }

    private void setupFileCommander() {
        fileCommander = new AesFileCommander(bufferSize, bufferSize, threads);
    }

    public void refresh() {
        if (checkFileSearcher())
            return;
        if (this.drive == null)
            return;
        executor.execute(() ->
        {
            if (fileManagerMode != Mode.Search)
                salmonFiles = currDir.listFiles();
            AesFile selectedFile = selectedFiles.size() > 0 ? selectedFiles.iterator().next() : null;
            populateFileList(selectedFile);
        });

    }

    private boolean checkFileSearcher() {
        if (fileCommander.isFileSearcherRunning()) {
            SalmonDialogs.promptAnotherProcessRunning();
            return true;
        }
        return false;
    }

    private void populateFileList(AesFile currentFile) {
        executor.execute(() ->
        {
            selectedFiles.clear();
            try {
                if (fileManagerMode == Mode.Search)
                    setPathText(currDir.getPath() + "?search=" + searchTerm);
                else
                    setPathText(currDir.getPath());
            } catch (Exception exception) {
                exception.printStackTrace();
                SalmonDialog.promptDialog("Error", exception.getMessage());
            }

            List<AesFile> list = new ArrayList<>();
            for (AesFile file : salmonFiles) {
                try {
                    list.add(file);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
            setFileItemList(list);
            AesFile currFile = findCurrentItem(currentFile);
            setCurrentItem(currFile);
        });
    }

    public void setupSalmonManager() {
        try {
            // file sequencer for mobile is secure since it runs in sandbox
            setupFileSequencer();
        } catch (Exception e) {
            e.printStackTrace();
            SalmonDialog.promptDialog("Error", "Error during initializing: " + e.getMessage());
        }
    }

    private void setupFileSequencer() throws IOException {
        IFile dirFile = new File(getSequencerDefaultDirPath());
        if (!dirFile.exists())
            dirFile.mkdir();
        IFile seqFile = new File(getSequencerFilepath());
        this.sequencer = new FileSequencer(seqFile, createSerializer());
    }

    protected INonceSequenceSerializer createSerializer() {
        return new SequenceSerializer();
    }

    public void pasteSelected() {
        if (isJobRunning())
            throw new RuntimeException("Another Job is Running");
        copySelectedFiles(fileManagerMode == Mode.Move);
    }

    public void setTaskRunning(boolean value) {
        setTaskRunning(value, true);
    }

    public void setTaskRunning(boolean value, boolean progress) {
        if (progress)
            setJobRunning(value);
    }

    public void setTaskMessage(String msg) {
        setStatus(msg != null ? msg : "");
    }

    public void openVault(IFile dir, String password) {
        if (dir == null)
            return;

        executor.submit(() -> {
            try {
                propertyChanged(this, "taskRunning");
                closeVault();
                this.drive = AesDrive.openDrive(dir, getDriveClassType(dir), password, this.sequencer);
                this.currDir = this.drive.getRoot();
                refresh();
            } catch (Error e) {
                e.printStackTrace();
                SalmonDialog.promptDialog("Error", "Could not open vault: " + e.getMessage() + ". "
                        + "Make sure your vault folder contains a file named " + AesDrive.getConfigFilename());
            } catch (Exception e) {
                e.printStackTrace();
                SalmonDialog.promptDialog("Error", "Could not open vault: " + e.getMessage() + ". " +
                        (e.getCause() != null ? e.getCause().getMessage() : ""));
            } finally {
                propertyChanged(this, "taskComplete");
            }
        });
    }

    protected Class<?> getDriveClassType(IFile vaultDir) {
        if (vaultDir instanceof File)
            return Drive.class;
        else if (vaultDir instanceof HttpFile)
            return HttpDrive.class;
        else if (vaultDir instanceof WSFile)
            return WSDrive.class;
        throw new RuntimeException("Unknown drive type");
    }

    public void deleteSelectedFiles() {
        deleteFiles(selectedFiles.toArray(new AesFile[0]));
        clearSelectedFiles();
    }

    private void copySelectedFiles(boolean move) {
        copyFiles(copyFiles, currDir, move);
        clearSelectedFiles();
    }

    public void deleteFiles(AesFile[] files) {
        if (files == null)
            return;
        if (isJobRunning())
            throw new RuntimeException("Another job is running");
        executor.execute(() ->
        {
            setFileProgress(0);
            setFilesProgress(0);

            setTaskRunning(true);

            Exception[] exception = new Exception[]{null};
            int[] processedFiles = new int[]{-1};
            List<AesFile> failedFiles = new ArrayList<>();
            try {
                FileCommander.BatchDeleteOptions deleteOptions = new FileCommander.BatchDeleteOptions();
                deleteOptions.onProgressChanged = (taskProgress) ->
                {
                    if (processedFiles[0] < taskProgress.getProcessedFiles()) {
                        try {
                            if (taskProgress.getProcessedBytes() != taskProgress.getTotalBytes()) {
                                setTaskMessage("Deleting: " + taskProgress.getFile().getName()
                                        + " " + (taskProgress.getProcessedFiles() + 1) + "/" + taskProgress.getTotalFiles());
                            }
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                        processedFiles[0] = taskProgress.getProcessedFiles();
                    }
                    setFileProgress(taskProgress.getProcessedBytes() / (double) taskProgress.getTotalBytes());
                    setFilesProgress(taskProgress.getProcessedFiles() / (double) taskProgress.getTotalFiles());
                };
                deleteOptions.onFailed = (file, ex) ->
                {
                    failedFiles.add((AesFile) file);
                    exception[0] = ex;
                };
                fileCommander.deleteFiles(files, deleteOptions);
            } catch (Exception e) {
                if (!fileCommander.areJobsStopped()) {
                    e.printStackTrace();
                    SalmonDialog.promptDialog("Error", "Could not delete files: " + e.getMessage(), "Ok");
                }
            }
            if (fileCommander.areJobsStopped())
                setTaskMessage("Delete Stopped");
            else if (failedFiles.size() > 0) {
                exception[0].printStackTrace();
                SalmonDialog.promptDialog("Delete", "Some files failed: " + exception[0].getMessage());
            } else
                setTaskMessage("Delete Complete");
            setFileProgress(1);
            setFilesProgress(1);
            setTaskRunning(false);
            refresh();
            copyFiles = null;
            fileManagerMode = Mode.Browse;
        });
    }

    private void copyFiles(AesFile[] files, AesFile dir, boolean move) {
        if (files == null)
            return;
        if (isJobRunning())
            throw new RuntimeException("Another job is running");
        executor.execute(() ->
        {
            setFileProgress(0);
            setFilesProgress(0);

            setTaskRunning(true);
            String action = move ? "Moving" : "Copying";
            Exception[] exception = new Exception[]{null};
            int[] processedFiles = new int[]{-1};
            List<AesFile> failedFiles = new ArrayList<>();
            FileCommander.BatchCopyOptions copyOptions = new FileCommander.BatchCopyOptions();
            copyOptions.autoRename = AesFile.autoRename;
            copyOptions.autoRenameFolders = true;
            copyOptions.move = move;
            copyOptions.onProgressChanged = (taskProgress) ->
            {
                if (processedFiles[0] < taskProgress.getProcessedFiles()) {
                    try {
                        setTaskMessage(action + ": " + taskProgress.getFile().getName()
                                + " " + (taskProgress.getProcessedFiles() + 1) + "/" + taskProgress.getTotalFiles());
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                    processedFiles[0] = taskProgress.getProcessedFiles();
                }
                setFileProgress(taskProgress.getProcessedBytes() / (double) taskProgress.getTotalBytes());
                setFilesProgress(taskProgress.getProcessedFiles() / (double) taskProgress.getTotalFiles());
            };
            copyOptions.onFailed = (file, ex) ->
            {
                handleThrowException(ex);
                failedFiles.add((AesFile) file);
                exception[0] = ex;
            };

            try {
                fileCommander.copyFiles(files, dir, copyOptions);
            } catch (Exception e) {
                if (!fileCommander.areJobsStopped()) {
                    e.printStackTrace();
                    SalmonDialog.promptDialog("Error", "Could not copy files: " + e.getMessage(), "Ok");
                }
            }
            if (fileCommander.areJobsStopped())
                setTaskMessage(action + " Stopped");
            else if (failedFiles.size() > 0)
                SalmonDialog.promptDialog(action, "Some files failed: " + exception[0].getMessage());
            else
                setTaskMessage(action + " Complete");
            setFileProgress(1);
            setFilesProgress(1);
            setTaskRunning(false);
            refresh();
            copyFiles = null;
            fileManagerMode = Mode.Browse;
        });
    }

    public void exportSelectedFiles(IFile exportDir, boolean deleteSource) {
        if (this.drive == null)
            return;
        exportFiles(selectedFiles.toArray(new AesFile[0]), exportDir, deleteSource, (files) ->
        {
            refresh();
        });
        clearSelectedFiles();
    }

    private void clearSelectedFiles() {
        setSelectedFiles(new HashSet<>());
    }

    public boolean handleException(Exception exception) {
        return false;
    }

    public void closeVault() {
        try {
            setFileItemList(null);
            currDir = null;
            clearCopiedFiles();
            setPathText(null);
            if (this.drive != null) {
                this.drive.close();
                this.drive = null;
            }
        } catch (Exception ex) {
            ex.printStackTrace();
        }
    }

    public boolean openItem(AesFile selectedFile) {
        executor.execute(() ->
        {
            int position = fileItemList.indexOf(selectedFile);
            if (position < 0)
                return;
            if (selectedFile.isDirectory()) {
                if (checkFileSearcher())
                    return;
                currDir = (selectedFile);
                salmonFiles = currDir.listFiles();
                populateFileList(null);
                return;
            }
            AesFile item = fileItemList.get(position);
            openListItem.apply(item);
        });
        return true;
    }

    public void goBack() {
        if (fileManagerMode == Mode.Search && fileCommander.isFileSearcherRunning()) {
            fileCommander.stopFileSearch();
        } else if (fileManagerMode == Mode.Search) {
            executor.execute(() ->
            {
                fileManagerMode = Mode.Browse;
                salmonFiles = currDir.listFiles();
                populateFileList(null);
            });
        } else if (canGoBack()) {
            AesFile finalParent = currDir.getParent();
            executor.execute(() ->
            {
                if (checkFileSearcher())
                    return;
                AesFile parentDir = currDir;
                currDir = finalParent;
                salmonFiles = currDir.listFiles();
                populateFileList(parentDir);
            });
        } else if (promptExitOnBack) {
            SalmonDialogs.promptExit();
        }
    }

    private AesFile findCurrentItem(AesFile currentFile) {
        if (currentFile == null)
            return null;
        for (AesFile file : fileItemList) {
            if (file.getRealFile().getPath().equals(currentFile.getRealFile().getPath())) {
                selectedFiles.clear();
                selectedFiles.add(file);
                return file;
            }
        }
        return null;
    }

    @Override
    public HashSet<BiConsumer<Object, String>> getObservers() {
        return observers;
    }

    public void renameFile(AesFile file, String newFilename) {
        executor.execute(() -> {
            try {
                fileCommander.renameFile(file, newFilename);
                //FIXME: IFile is not reporting the correct length after rename
                // so we reset here
                file.getRealFile().reset();
                WindowUtils.runOnMainThread(() -> {
                    SalmonVaultManager.getInstance().updateListItem.accept(file);
                });
            } catch (IOException e) {
                e.printStackTrace();
                SalmonDialog.promptDialog("Error", "Could not rename file: " + e.getMessage());
            }
        });
    }

    protected void setSequencer(INonceSequencer sequencer) {
        this.sequencer = sequencer;
        if (this.drive != null)
            this.drive.setSequencer(sequencer);
    }

    protected INonceSequencer getSequencer() {
        return this.sequencer;
    }

    public void createDirectory(String folderName) {
        executor.submit(() -> {
            AesFile file = null;
            try {
                file = SalmonVaultManager.getInstance().getCurrDir().createDirectory(folderName);
            } catch (Exception exception) {
                exception.printStackTrace();
                if (!SalmonVaultManager.getInstance().handleException(exception)) {
                    SalmonDialog.promptDialog("Error", "Could not create folder: " + exception.getMessage());
                }
            } finally {
                if(file != null)
                    setSelectedFiles(new HashSet<>(List.of(file)));
                SalmonVaultManager.getInstance().refresh();
            }
        });
    }

    public void createFile(String fileName) {
        executor.submit(() -> {
            RandomAccessStream stream = null;
            AesFile file = null;
            try {
                file = SalmonVaultManager.getInstance().getCurrDir().createFile(fileName);
                file.setApplyIntegrity(true);
                stream = file.getOutputStream();
                stream.write("\n".getBytes(), 0, 1);
                stream.flush();
            } catch (Exception exception) {
                exception.printStackTrace();
                if (!SalmonVaultManager.getInstance().handleException(exception)) {
                    SalmonDialog.promptDialog("Error", "Could not create file: " + exception.getMessage());
                }
            } finally {
                try {
                    stream.close();
                } catch (IOException e) {
                    throw new RuntimeException(e);
                }
                if(file != null)
                    setSelectedFiles(new HashSet<>(List.of(file)));
                SalmonVaultManager.getInstance().refresh();
            }
        });
    }

    public void setPassword(String pass) {
        executor.submit(() -> {
            try {
                propertyChanged(this, "taskRunning");
                SalmonVaultManager.getInstance().getDrive().setPassword(pass);
                SalmonDialog.promptDialog("Password changed");
            } catch (Exception e) {
                SalmonDialog.promptDialog("Could not change password: " + e.getMessage());
            } finally {
                propertyChanged(this, "taskComplete");
            }
        });
    }

    public enum Mode {
        Browse, Search, Copy, Move
    }

    public void exportFiles(AesFile[] items, IFile exportDir, boolean deleteSource, Consumer<IFile[]> onFinished) {
        if (isJobRunning())
            throw new RuntimeException("Another job is running");
        executor.execute(() ->
        {
            setFileProgress(0);
            setFilesProgress(0);
            setTaskRunning(true);

            Exception[] exception = new Exception[]{null};
            int[] processedFiles = new int[]{-1};
            IFile[] files = null;
            List<AesFile> failedFiles = new ArrayList<>();
            try {
                FileCommander.BatchExportOptions exportOptions = new FileCommander.BatchExportOptions();
                exportOptions.deleteSource = deleteSource;
                exportOptions.integrity = true;
                exportOptions.autoRename = IFile.autoRename;
                exportOptions.onProgressChanged = (taskProgress) ->
                {
                    if (processedFiles[0] < taskProgress.getProcessedFiles()) {
                        try {
                            setTaskMessage("Exporting: " + taskProgress.getFile().getName()
                                    + " " + (taskProgress.getProcessedFiles() + 1)
                                    + "/" + taskProgress.getTotalFiles());
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                        processedFiles[0] = taskProgress.getProcessedFiles();
                    }
                    setFileProgress(taskProgress.getProcessedBytes() / (double) taskProgress.getTotalBytes());
                    setFilesProgress(taskProgress.getProcessedFiles() / (double) taskProgress.getTotalFiles());
                };
                exportOptions.onFailed = (file, ex) ->
                {
                    failedFiles.add((AesFile) file);
                    exception[0] = ex;
                };
                files = fileCommander.exportFiles(items, exportDir, exportOptions);
                if (onFinished != null)
                    onFinished.accept(files);
            } catch (Exception e) {
                e.printStackTrace();
                SalmonDialog.promptDialog("Error", "Error while exporting files: " + e.getMessage());
            }
            if (fileCommander.areJobsStopped())
                setTaskMessage("Export Stopped");
            else if (failedFiles.size() > 0)
                SalmonDialog.promptDialog("Export", "Some files failed: " + exception[0].getMessage());
            else if (files != null) {
                setTaskMessage("Export Complete");
            }
            setFileProgress(1);
            setFilesProgress(1);
            setTaskRunning(false);
            refresh();
        });
    }

    public void importFiles(IFile[] files, AesFile importDir, boolean deleteSource,
                            Consumer<AesFile[]> onFinished) {
        importFiles(files, importDir, deleteSource, onFinished, true);
    }

    public void importFiles(IFile[] files, AesFile importDir, boolean deleteSource,
                            Consumer<AesFile[]> onFinished, boolean autorename) {
        if (isJobRunning())
            throw new RuntimeException("Another job is running");
        executor.execute(() ->
        {
            setFileProgress(0);
            setFilesProgress(0);

            setTaskRunning(true);

            final Exception[] exception = {null};
            int[] processedFiles = new int[]{-1};
            AesFile[] aesFiles = null;
            List<IFile> failedFiles = new ArrayList<>();
            try {
                FileCommander.BatchImportOptions importOptions = new FileCommander.BatchImportOptions();
                if (autorename)
                    importOptions.autoRename = IFile.autoRename;
                importOptions.deleteSource = deleteSource;
                importOptions.integrity = true;
                importOptions.onProgressChanged = (taskProgress) ->
                {
                    if (processedFiles[0] < taskProgress.getProcessedFiles()) {
                        try {
                            setTaskMessage("Importing: " + taskProgress.getFile().getName()
                                    + " " + (taskProgress.getProcessedFiles() + 1) + "/" + taskProgress.getTotalFiles());
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                        processedFiles[0] = taskProgress.getProcessedFiles();
                    }
                    setFileProgress(taskProgress.getProcessedBytes() / (double) taskProgress.getTotalBytes());
                    setFilesProgress(taskProgress.getProcessedFiles() / (double) taskProgress.getTotalFiles());
                };
                importOptions.onFailed = (file, ex) ->
                {
                    handleThrowException(ex);
                    failedFiles.add(file);
                    exception[0] = ex;
                };
                aesFiles = fileCommander.importFiles(files, importDir, importOptions);
                if (onFinished != null)
                    onFinished.accept(aesFiles);
            } catch (Exception e) {
                e.printStackTrace();
                if (!handleException(e)) {
                    SalmonDialog.promptDialog("Error", "Error while importing files: " + e.getMessage());
                }
            }
            if (fileCommander.areJobsStopped())
                setTaskMessage("Import Stopped");
            else if (failedFiles.size() > 0)
                SalmonDialog.promptDialog("Import", "Some files failed: " + exception[0].getMessage());
            else if (aesFiles != null)
                setTaskMessage("Import Complete");
            setFileProgress(1);
            setFilesProgress(1);
            setTaskRunning(false);
            refresh();
        });
    }

    public void handleThrowException(Exception ex) {
    }

    public void search(String value, boolean any) {
        searchTerm = value;
        if (checkFileSearcher())
            return;
        executor.execute(() ->
        {
            fileManagerMode = Mode.Search;
            setFileProgress(0);
            setFilesProgress(0);
            try {
                salmonFiles = new AesFile[]{};
                populateFileList(null);
                // FIXME: wait till observers clear the previous list
                Thread.sleep(2000);
            } catch (Exception e) {
                e.printStackTrace();
            }

            setTaskRunning(true);
            setStatus("Searching");
            FileSearcher.SearchOptions searchOptions = new FileSearcher.SearchOptions();
            searchOptions.anyTerm = any;
            searchOptions.onResultFound = (IVirtualFile salmonFile) ->
            {
                int position = 0;
                for (AesFile file : fileItemList) {
                    if (((AesFile) salmonFile).getTag() != null &&
                            (file.getTag() == null || (int) ((AesFile) salmonFile).getTag() > (int) file.getTag()))
                        break;
                    position++;
                }
                try {
                    fileItemList.add(position, (AesFile) salmonFile);
                    onFileItemAdded.accept(position, (AesFile) salmonFile);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            };
            IVirtualFile[] files = fileCommander.search(currDir, value, searchOptions);
            this.salmonFiles = new AesFile[files.length];
            for (int i = 0; i < files.length; i++)
                this.salmonFiles[i] = (AesFile) files[i];
            if (!fileCommander.isFileSearcherStopped())
                setStatus("Search Complete");
            else
                setStatus("Search Stopped");
            setTaskRunning(false);
        });
    }

    public void createVault(IFile dir, String password) {
        executor.submit(() -> {
            try {
                propertyChanged(this, "taskRunning");
                if (!dir.exists()) {
                    dir.mkdir();
                }
                closeVault();
                this.drive = AesDrive.createDrive(dir, getDriveClassType(dir), password, this.sequencer);
                this.currDir = this.drive.getRoot();
                this.refresh();
                SalmonDialog.promptDialog("Action", "Vault created, you can start importing your files");
            } catch (Exception e) {
                e.printStackTrace();
                SalmonDialog.promptDialog("Error", "Could not create vault: " + e.getMessage() + ". " +
                        (e.getCause() != null ? e.getCause().getMessage() : ""));
            } finally {
                propertyChanged(this, "taskComplete");
            }
        });
    }

    public void clearCopiedFiles() {
        copyFiles = null;
        fileManagerMode = Mode.Browse;
        setTaskRunning(false, false);
        setTaskMessage("");
    }

    public String getFileProperties(AesFile item)
            throws IOException {
        String props = "Name: " + item.getName() + "\n" +
                "Path: " + item.getPath() + "\n" +
                (!item.isDirectory() ? ("Size: " + ByteUtils.getBytes(item.getLength(), 2)
                        + " (" + item.getLength() + " bytes)") : "Items: " + item.listFiles().length) + "\n" +
                "Encrypted Name: " + item.getRealFile().getName() + "\n" +
                "Encrypted Path: " + item.getRealFile().getDisplayPath() + "\n" +
                (!item.isDirectory() ? "Encrypted Size: " + ByteUtils.getBytes(item.getRealFile().getLength(), 2)
                        + " (" + item.getRealFile().getLength() + " bytes)" : "") + "\n";
        if (item.isFile()) {
            props += "Integrity enabled: " + (item.getFileChunkSize() > 0 ? "Yes" : "No") + "\n" +
                    (item.getFileChunkSize() > 0 ? "Integrity chunk size: " + item.getFileChunkSize() + " bytes" : "") + "\n";
        }
        return props;
    }

    public boolean canGoBack() {
        return currDir != null && currDir.getParent() != null;
    }

    public void setPromptExitOnBack(boolean promptExitOnBack) {
        this.promptExitOnBack = promptExitOnBack;
    }

    public void getDiskUsage(AesFile[] selectedFiles, BiConsumer<AtomicInteger, AtomicLong> updateUsage) {
        executor.submit(() -> {
            getDiskUsage(selectedFiles, updateUsage, new AtomicInteger(0), new AtomicLong(0));
        });
    }

    private long getDiskUsage(AesFile[] selectedFiles, BiConsumer<AtomicInteger, AtomicLong> updateUsage,
                              AtomicInteger totalItems, AtomicLong totalSize) {
        for (AesFile file : selectedFiles) {
            totalItems.incrementAndGet();
            if (file.isFile()) {
                totalSize.addAndGet(file.getRealFile().getLength());
            } else {
                getDiskUsage(file.listFiles(), updateUsage, totalItems, totalSize);
            }
            if (updateUsage != null)
                updateUsage.accept(totalItems, totalSize);
        }
        if (updateUsage != null)
            updateUsage.accept(totalItems, totalSize);
        return totalSize.get();
    }
}