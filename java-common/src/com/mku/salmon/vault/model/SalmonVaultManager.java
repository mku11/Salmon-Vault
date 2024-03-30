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

import com.mku.file.IRealFile;
import com.mku.file.IVirtualFile;
import com.mku.file.JavaFile;
import com.mku.func.BiConsumer;
import com.mku.func.Consumer;
import com.mku.func.Function;
import com.mku.salmon.SalmonAuthException;
import com.mku.salmon.SalmonDrive;
import com.mku.salmon.SalmonFile;
import com.mku.salmon.SalmonSecurityException;
import com.mku.salmon.drive.JavaDrive;
import com.mku.salmon.integrity.SalmonIntegrityException;
import com.mku.salmon.sequence.SalmonFileSequencer;
import com.mku.salmon.sequence.SalmonSequenceSerializer;
import com.mku.salmon.utils.SalmonFileCommander;
import com.mku.salmon.vault.config.SalmonConfig;
import com.mku.salmon.vault.dialog.SalmonDialog;
import com.mku.salmon.vault.dialog.SalmonDialogs;
import com.mku.salmon.vault.utils.ByteUtils;
import com.mku.salmon.vault.utils.IPropertyNotifier;
import com.mku.sequence.INonceSequenceSerializer;
import com.mku.sequence.INonceSequencer;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class SalmonVaultManager implements IPropertyNotifier {
    protected static final String SEQUENCER_DIR_NAME = ".salmon";
    protected static final String SERVICE_PIPE_NAME = "SalmonService";

    private static int bufferSize = 512 * 1024;
    private static int threads = 2;

    public static final int REQUEST_OPEN_VAULT_DIR = 1000;
    public static final int REQUEST_CREATE_VAULT_DIR = 1001;
    public static final int REQUEST_IMPORT_FILES = 1002;
    public static final int REQUEST_EXPORT_DIR = 1003;
    public static final int REQUEST_IMPORT_AUTH_FILE = 1004;
    public static final int REQUEST_EXPORT_AUTH_FILE = 1005;

    private static ExecutorService executor = Executors.newFixedThreadPool(2);

    private String sequencerDefaultDirPath = SalmonConfig.getPrivateDir() + File.separator + SEQUENCER_DIR_NAME;
    private HashSet<BiConsumer<Object, String>> observers = new HashSet<>();

    private boolean promptExitOnBack;
    private SalmonDrive drive;

    public SalmonDrive getDrive() {
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

    public Function<SalmonFile, Boolean> openListItem;
    public Consumer<SalmonFile> updateListItem;
    public BiConsumer<Integer, SalmonFile> onFileItemAdded;

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

    private List<SalmonFile> fileItemList;

    public List<SalmonFile> getFileItemList() {
        return fileItemList;
    }

    public void setFileItemList(List<SalmonFile> value) {
        if (fileItemList != value) {
            fileItemList = value;
            propertyChanged(this, "FileItemList");
        }
    }

    private HashSet<SalmonFile> selectedFiles = new HashSet<>();

    public HashSet<SalmonFile> getSelectedFiles() {
        return selectedFiles;
    }

    public void setSelectedFiles(HashSet<SalmonFile> value) {
        if (value != selectedFiles) {
            selectedFiles = value;
            propertyChanged(this, "SelectedFiles");
        }
    }

    private SalmonFile _currentItem;

    public SalmonFile getCurrentItem() {
        return _currentItem;
    }

    public void setCurrentItem(SalmonFile value) {
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

    public void setJobRunning(boolean value) {
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

    private SalmonFile currDir;

    public SalmonFile getCurrDir() {
        return currDir;
    }

    private SalmonFileCommander fileCommander;
    private SalmonFile[] copyFiles;
    private SalmonFile[] salmonFiles;
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
            SalmonFile selectedFile = fileItemList.get(selectedItem);
            return openItem(selectedFile);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return false;
    }

    public void setPathText(String value) {
        if (value.startsWith("/"))
            value = value.substring(1);
        setPath("fs://" + value);
    }

    public void stopOperation() {
        fileCommander.cancel();
        fileManagerMode = Mode.Browse;
        setTaskRunning(false);
    }

    public void copySelectedFiles() {
        fileManagerMode = Mode.Copy;
        copyFiles = selectedFiles.toArray(new SalmonFile[0]);
        setTaskRunning(true, false);
        setTaskMessage(copyFiles.length + " Items selected for copy");
    }

    public void cutSelectedFiles() {
        fileManagerMode = Mode.Move;
        copyFiles = selectedFiles.toArray(new SalmonFile[0]);
        setTaskRunning(true, false);
        setTaskMessage(copyFiles.length + " Items selected for move");
    }

    private void setupFileCommander() {
        fileCommander = new SalmonFileCommander(bufferSize, bufferSize, threads);
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
            SalmonFile selectedFile = selectedFiles.size() > 1 ? selectedFiles.iterator().next() : null;
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

    private void populateFileList(SalmonFile currentFile) {
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

            List<SalmonFile> list = new ArrayList<>();
            for (SalmonFile file : salmonFiles) {
                try {
                    list.add(file);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
            setFileItemList(list);
            SalmonFile currFile = findCurrentItem(currentFile);
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
        IRealFile dirFile = new JavaFile(getSequencerDefaultDirPath());
        if (!dirFile.exists())
            dirFile.mkdir();
        IRealFile seqFile = new JavaFile(getSequencerFilepath());
        this.sequencer = new SalmonFileSequencer(seqFile, createSerializer());
    }

    protected INonceSequenceSerializer createSerializer() {
        return new SalmonSequenceSerializer();
    }

    public void pasteSelected() {
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

    public void openVault(IRealFile dir, String password) {
        if (dir == null)
            return;

        try {
            closeVault();
            this.drive = SalmonDrive.openDrive(dir, JavaDrive.class, password, this.sequencer);
            this.currDir = this.drive.getRoot();
            SalmonSettings.getInstance().setVaultLocation(dir.getAbsolutePath());
        } catch (Exception e) {
            SalmonDialog.promptDialog("Error", "Could not open vault: " + e.getMessage());
        }
        refresh();
    }

    public void deleteSelectedFiles() {
        deleteFiles(selectedFiles.toArray(new SalmonFile[0]));
        clearSelectedFiles();
    }

    private void copySelectedFiles(boolean move) {
        copyFiles(copyFiles, currDir, move);
        clearSelectedFiles();
    }

    public void deleteFiles(SalmonFile[] files) {
        if (files == null)
            return;
        executor.execute(() ->
        {
            setFileProgress(0);
            setFilesProgress(0);

            setTaskRunning(true);

            Exception[] exception = new Exception[]{null};
            int[] processedFiles = new int[]{-1};
            List<SalmonFile> failedFiles = new ArrayList<>();
            try {
                fileCommander.deleteFiles(files,
                        (taskProgress) ->
                        {
                            if (processedFiles[0] < taskProgress.getProcessedFiles()) {
                                try {
                                    if (taskProgress.getProcessedBytes() != taskProgress.getTotalBytes()) {
                                        setTaskMessage("Deleting: " + taskProgress.getFile().getBaseName()
                                                + " " + (taskProgress.getProcessedFiles() + 1) + "/" + taskProgress.getTotalFiles());
                                    }
                                } catch (Exception e) {
                                    e.printStackTrace();
                                }
                                processedFiles[0] = taskProgress.getProcessedFiles();
                            }
                            setFileProgress(taskProgress.getProcessedBytes() / (double) taskProgress.getTotalBytes());
                            setFilesProgress(taskProgress.getProcessedFiles() / (double) taskProgress.getTotalFiles());
                        }, (file, ex) ->
                        {
                            failedFiles.add((SalmonFile) file);
                            exception[0] = ex;
                        });
            } catch (Exception e) {
                if (!fileCommander.areJobsStopped()) {
                    e.printStackTrace();
                    SalmonDialog.promptDialog("Error", "Could not delete files: " + e.getMessage(), "Ok");
                }
            }
            if (fileCommander.areJobsStopped())
                setTaskMessage("Delete Stopped");
            else if (failedFiles.size() > 0)
                SalmonDialog.promptDialog("Delete", "Some files failed: " + exception[0].getMessage());
            else
                setTaskMessage("Delete Complete");
            setFileProgress(1);
            setFilesProgress(1);
            refresh();
            setTaskRunning(false);
            copyFiles = null;
            fileManagerMode = Mode.Browse;
        });
    }

    private void copyFiles(SalmonFile[] files, SalmonFile dir, boolean move) {
        if (files == null)
            return;
        executor.execute(() ->
        {
            setFileProgress(0);
            setFilesProgress(0);

            setTaskRunning(true);
            String action = move ? "Moving" : "Copying";
            Exception[] exception = new Exception[]{null};
            int[] processedFiles = new int[]{-1};
            List<SalmonFile> failedFiles = new ArrayList<>();
            try {
                fileCommander.copyFiles(files, dir, move,
                        (taskProgress) ->
                        {
                            if (processedFiles[0] < taskProgress.getProcessedFiles()) {
                                try {
                                    setTaskMessage(action + ": " + taskProgress.getFile().getBaseName()
                                            + " " + (taskProgress.getProcessedFiles() + 1) + "/" + taskProgress.getTotalFiles());
                                } catch (Exception e) {
                                    e.printStackTrace();
                                }
                                processedFiles[0] = taskProgress.getProcessedFiles();
                            }
                            setFileProgress(taskProgress.getProcessedBytes() / (double) taskProgress.getTotalBytes());
                            setFilesProgress(taskProgress.getProcessedFiles() / (double) taskProgress.getTotalFiles());
                        }, SalmonFile.autoRename, true, (file, ex) ->
                        {
                            handleThrowException(ex);
                            failedFiles.add((SalmonFile) file);
                            exception[0] = ex;
                        });
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

    public void exportSelectedFiles(boolean deleteSource) {
        if (this.drive == null)
            return;
        exportFiles(selectedFiles.toArray(new SalmonFile[0]), (files) ->
        {
            refresh();
        }, deleteSource);
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
            setPathText("");
            if (this.drive != null)
                this.drive.close();
        } catch (Exception ex) {
            ex.printStackTrace();
        }
    }

    public boolean openItem(SalmonFile selectedFile) {
        int position = fileItemList.indexOf(selectedFile);
        if (position < 0)
            return true;
        if (selectedFile.isDirectory()) {
            executor.execute(() ->
            {
                if (checkFileSearcher())
                    return;
                currDir = (selectedFile);
                salmonFiles = currDir.listFiles();
                populateFileList(null);
            });
            return true;
        }
        SalmonFile item = fileItemList.get(position);
        return openListItem.apply(item);
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
            SalmonFile finalParent = currDir.getParent();
            executor.execute(() ->
            {
                if (checkFileSearcher())
                    return;
                SalmonFile parentDir = currDir;
                currDir = finalParent;
                salmonFiles = currDir.listFiles();
                populateFileList(parentDir);
            });
        } else if (promptExitOnBack) {
            SalmonDialogs.promptExit();
        }
    }

    private SalmonFile findCurrentItem(SalmonFile currentFile) {
        if (currentFile == null)
            return null;
        for (SalmonFile file : fileItemList) {
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

    public void renameFile(SalmonFile file, String newFilename)
            throws IOException {
        fileCommander.renameFile(file, newFilename);
    }

    protected void setSequencer(INonceSequencer sequencer) {
        this.sequencer = sequencer;
    }

    protected INonceSequencer getSequencer() {
        return this.sequencer;
    }

    public enum Mode {
        Browse, Search, Copy, Move
    }

    public void exportFiles(SalmonFile[] items, Consumer<IRealFile[]> onFinished, boolean deleteSource) {
        executor.execute(() ->
        {
            setFileProgress(0);
            setFilesProgress(0);
            setTaskRunning(true);

            Exception[] exception = new Exception[]{null};
            int[] processedFiles = new int[]{-1};
            IRealFile[] files = null;
            List<SalmonFile> failedFiles = new ArrayList<>();
            IRealFile exportDir = this.drive.getExportDir();
            try {
                files = fileCommander.exportFiles(items,
                        exportDir,
                        deleteSource, true,
                        (taskProgress) ->
                        {
                            if (processedFiles[0] < taskProgress.getProcessedFiles()) {
                                try {
                                    setTaskMessage("Exporting: " + taskProgress.getFile().getBaseName()
                                            + " " + (taskProgress.getProcessedFiles() + 1)
                                            + "/" + taskProgress.getTotalFiles());
                                } catch (Exception e) {
                                    e.printStackTrace();
                                }
                                processedFiles[0] = taskProgress.getProcessedFiles();
                            }
                            setFileProgress(taskProgress.getProcessedBytes() / (double) taskProgress.getTotalBytes());
                            setFilesProgress(taskProgress.getProcessedFiles() / (double) taskProgress.getTotalFiles());
                        }, IRealFile.autoRename, (file, ex) ->
                        {
                            failedFiles.add((SalmonFile) file);
                            exception[0] = ex;
                        });
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
                SalmonDialog.promptDialog("Export", "Files Exported To: "
                        + drive.getExportDir().getAbsolutePath());
            }
            setFileProgress(1);
            setFilesProgress(1);

            setTaskRunning(false);
        });
    }

    public void importFiles(IRealFile[] fileNames, SalmonFile importDir, boolean deleteSource,
                            Consumer<SalmonFile[]> onFinished) {
        executor.execute(() ->
        {
            setFileProgress(0);
            setFilesProgress(0);

            setTaskRunning(true);

            final Exception[] exception = {null};
            int[] processedFiles = new int[]{-1};
            SalmonFile[] files = null;
            List<IRealFile> failedFiles = new ArrayList<>();
            try {
                files = fileCommander.importFiles(fileNames, importDir,
                        deleteSource, true,
                        (taskProgress) ->
                        {
                            if (processedFiles[0] < taskProgress.getProcessedFiles()) {
                                try {
                                    setTaskMessage("Importing: " + taskProgress.getFile().getBaseName()
                                            + " " + (taskProgress.getProcessedFiles() + 1) + "/" + taskProgress.getTotalFiles());
                                } catch (Exception e) {
                                    e.printStackTrace();
                                }
                                processedFiles[0] = taskProgress.getProcessedFiles();
                            }
                            setFileProgress(taskProgress.getProcessedBytes() / (double) taskProgress.getTotalBytes());
                            setFilesProgress(taskProgress.getProcessedFiles() / (double) taskProgress.getTotalFiles());
                        }, IRealFile.autoRename, (file, ex) ->
                        {
                            handleThrowException(ex);
                            failedFiles.add(file);
                            exception[0] = ex;
                        });
                onFinished.accept(files);
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
            else if (files != null)
                setTaskMessage("Import Complete");
            setFileProgress(1);
            setFilesProgress(1);
            setTaskRunning(false);
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
                if (currDir.getPath() != null)
                    setPathText(currDir.getPath() + "?search=" + value);
            } catch (Exception e) {
                e.printStackTrace();
            }
            salmonFiles = new SalmonFile[]{};
            populateFileList(null);
            setTaskRunning(true);
            setStatus("Searching");
            salmonFiles = (SalmonFile[]) fileCommander.search(currDir, value, any, (IVirtualFile salmonFile) ->
            {
                int position = 0;
                for (SalmonFile file : fileItemList) {
                    if (((SalmonFile) salmonFile).getTag() != null &&
                            (file.getTag() == null || (int) ((SalmonFile) salmonFile).getTag() > (int) file.getTag()))
                        break;
                    position++;
                }
                try {
                    fileItemList.add(position, (SalmonFile) salmonFile);
                    onFileItemAdded.accept(position, (SalmonFile) salmonFile);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }, null);
            if (!fileCommander.isFileSearcherStopped())
                setStatus("Search Complete");
            else
                setStatus("Search Stopped");
            setTaskRunning(false);
        });
    }

    public void createVault(IRealFile dir, String password)
            throws IOException {
        this.drive = SalmonDrive.createDrive(dir, JavaDrive.class, password, this.sequencer);
        this.currDir = this.drive.getRoot();
        SalmonSettings.getInstance().setVaultLocation(dir.getAbsolutePath());
        this.refresh();
    }

    public void clearCopiedFiles() {
        copyFiles = null;
        fileManagerMode = Mode.Browse;
        setTaskRunning(false, false);
        setTaskMessage("");
    }

    public String getFileProperties(SalmonFile item)
            throws IOException {
        return "Name: " + item.getBaseName() + "\n" +
                "Path: " + item.getPath() + "\n" +
                (!item.isDirectory() ? ("Size: " + ByteUtils.getBytes(item.getSize(), 2)
                        + " (" + item.getSize() + " bytes)") : "Items: " + item.listFiles().length) + "\n" +
                "Encrypted Name: " + item.getRealFile().getBaseName() + "\n" +
                "Encrypted Path: " + item.getRealFile().getAbsolutePath() + "\n" +
                (!item.isDirectory() ? "Encrypted Size: " + ByteUtils.getBytes(item.getRealFile().length(), 2)
                        + " (" + item.getRealFile().length() + " bytes)" : "") + "\n";
    }

    public boolean canGoBack() {
        return currDir != null && currDir.getParent() != null;
    }

    public void setPromptExitOnBack(boolean promptExitOnBack) {
        this.promptExitOnBack = promptExitOnBack;
    }

}