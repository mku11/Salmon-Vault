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

import { IPropertyNotifier } from "../../common/binding/iproperty_notifier.js";
import { SalmonConfig } from "../../vault/config/salmon_config.js";
import { SalmonSettings } from "../../common/model/salmon_settings.js";
import { AesFileCommander } from "../../lib/salmon-fs/salmonfs/drive/utils/aes_file_commander.js";
import { autoRenameFile as SalmonFileAutoRename } from "../../lib/salmon-fs/salmonfs/file/aes_file.js";
import { AesDrive } from "../../lib/salmon-fs/salmonfs/drive/aes_drive.js";
import { SalmonDialog } from "../../vault/dialog/salmon_dialog.js";
import { SalmonDialogs } from "../dialog/salmon_dialogs.js";
import { autoRenameFile as IRealFileAutoRename } from "../../lib/salmon-fs/fs/file/ifile.js";
import { File } from "../../lib/salmon-fs/fs/file/file.js";
import { HttpFile } from "../../lib/salmon-fs/fs/file/http_file.js";
import { WSFile } from "../../lib/salmon-fs/fs/file/ws_file.js";
import { Drive } from "../../lib/salmon-fs/salmonfs/drive/drive.js";
import { HttpDrive } from "../../lib/salmon-fs/salmonfs/drive/http_drive.js";
import { WSDrive } from "../../lib/salmon-fs/salmonfs/drive/ws_drive.js";
import { LocalStorageFile } from "../../lib/salmon-fs/fs/file/ls_file.js";
import { FileSequencer } from "../../lib/salmon-fs/salmonfs/sequence/file_sequencer.js";
import { SequenceSerializer } from "../../lib/salmon-core/salmon/sequence/sequence_serializer.js";
import { ByteUtils } from "../../common/utils/byte_utils.js";
import { BatchCopyOptions, BatchDeleteOptions, BatchExportOptions, BatchImportOptions } from "../../lib/salmon-fs/fs/drive/utils/file_commander.js";
import { SearchOptions } from "../../lib/salmon-fs/fs/drive/utils/file_searcher.js";

export class SalmonVaultManager extends IPropertyNotifier {
    static SEQUENCER_DIR_NAME = ".salmon";
    static SERVICE_PIPE_NAME = "SalmonService";

    static bufferSize = 512 * 1024;
    static threads = 2;

    static REQUEST_OPEN_VAULT_DIR = 1000;
    static REQUEST_CREATE_VAULT_DIR = 1001;
    static REQUEST_IMPORT_FILES = 1002;
    static REQUEST_EXPORT_DIR = 1003;
    static REQUEST_IMPORT_AUTH_FILE = 1004;
    static REQUEST_EXPORT_AUTH_FILE = 1005;

    sequencerDefaultDirPath = SalmonConfig.getPrivateDir() + File.separator + SalmonVaultManager.SEQUENCER_DIR_NAME;
    observers = {};

    promptExitOnBack = false;
    drive = null;

    async getExportDir(self) {
        if (self == null)
            self == this;
        return await self.drive.getExportDir();
    }

    getDrive() {
        return this.drive;
    }

    getSequencerDefaultDirPath() {
        return this.sequencerDefaultDirPath;
    }

    setSequencerDefaultDirPath(value) {
        this.sequencerDefaultDirPath = value;
    }

    getSequencerFilepath() {
        return this.sequencerDefaultDirPath + File.separator
            + SalmonConfig.FILE_SEQ_FILENAME;
    }

    openListItem = null;
    updateListItem = null;
    onFileItemAdded = null;
    sequencer = null;
    static instance = null;

    /**
     * Get the instance
     * @returns {SalmonVaultManager} The vault manager
     */
    static getInstance() {
        if (SalmonVaultManager.instance == null) {
            SalmonVaultManager.instance = new SalmonVaultManager();
        }
        return SalmonVaultManager.instance;
    }

    static getBufferSize() {
        return SalmonVaultManager.bufferSize;
    }

    static setBufferSize(bufferSize) {
        SalmonVaultManager.bufferSize = bufferSize;
    }

    static getThreads() {
        return SalmonVaultManager.threads;
    }

    static setThreads(threads) {
        SalmonVaultManager.threads = threads;
    }

    fileItemList = null;

    getFileItemList() {
        return this.fileItemList;
    }

    setFileItemList(value) {
        if (this.fileItemList != value) {
            this.fileItemList = value;
            this.propertyChanged(this, "FileItemList");
        }
    }

    selectedFiles = new Set();

    getSelectedFiles() {
        return this.selectedFiles;
    }

    setSelectedFiles(value) {
        if (value != this.selectedFiles) {
            this.selectedFiles = value;
            this.propertyChanged(this, "SelectedFiles");
        }
    }

    _currentItem = null;

    getCurrentItem() {
        return this._currentItem;
    }

    setCurrentItem(value) {
        if (value != this._currentItem) {
            this._currentItem = value;
            this.propertyChanged(this, "CurrentItem");
        }
    }

    status = "";

    getStatus() {
        return this.status;
    }

    setStatus(value) {
        if (value != this.status) {
            this.status = value;
            this.propertyChanged(this, "Status");
        }
    }

    #isJobRunning = false;

    isJobRunning() {
        return this.#isJobRunning;
    }

    setJobRunning(value) {
        if (value != this.#isJobRunning) {
            this.#isJobRunning = value;
            this.propertyChanged(this, "IsJobRunning");
        }
    }

    path = null;

    getPath() {
        return this.path;
    }

    setPath(value) {
        if (value != this.path) {
            this.path = value;
            this.propertyChanged(this, "Path");
        }
    }

    fileProgress = 0;

    getFileProgress() {
        return this.fileProgress;
    }

    setFileProgress(value) {
        if (value != this.fileProgress) {
            this.fileProgress = value;
            this.propertyChanged(this, "FileProgress");
        }
    }

    filesProgress = 0;

    getFilesProgress() {
        return this.filesProgress;
    }

    setFilesProgress(value) {
        if (value != this.filesProgress) {
            this.filesProgress = value;
            this.propertyChanged(this, "FilesProgress");
        }
    }

    currDir = null;

    getCurrDir() {
        return this.currDir;
    }

    fileCommander;
    copyFiles;
    salmonFiles;
    searchTerm;
    fileManagerMode = SalmonVaultManager.Mode.Browse;

    getFileManagerMode() {
        return this.fileManagerMode;
    }

    constructor() {
        super();
        SalmonSettings.getInstance().load();
        this.setupFileCommander();
        this.setupSalmonManager();
    }

    async initialize() {

    }

    onOpenItem(selectedItem) {
        try {
            let selectedFile = this.fileItemList[selectedItem];
            return this.openItem(selectedFile);
        } catch (e) {
            console.error(e);
        }
        return false;
    }

    setPathText(value) {
        if (value.startsWith("/"))
            value = value.substring(1);
        this.setPath("fs://" + value);
    }

    stopOperation() {
        this.fileCommander.cancel();
        this.fileManagerMode = SalmonVaultManager.Mode.Browse;
        this.setTaskRunning(false);
    }

    copySelectedFiles() {
        if (this.selectedFiles.size == 0)
            return;
        this.fileManagerMode = SalmonVaultManager.Mode.Copy;
        this.copyFiles = Array.from(this.selectedFiles);
        this.setTaskRunning(true, false);
        this.setTaskMessage(this.copyFiles.length + " Items selected for copy");
    }

    cutSelectedFiles() {
        if (this.selectedFiles.size == 0)
            return;
        this.fileManagerMode = SalmonVaultManager.Mode.Move;
        this.copyFiles = Array.from(this.selectedFiles);
        this.setTaskRunning(true, false);
        this.setTaskMessage(this.copyFiles.length + " Items selected for move");
    }

    setupFileCommander() {
        this.fileCommander = new AesFileCommander(SalmonVaultManager.bufferSize, SalmonVaultManager.bufferSize, SalmonVaultManager.threads);
        // set the correct worker paths when using parallel operations
        this.fileCommander.getFileImporter().setWorkerPath('./assets/js/lib/salmon-fs/salmonfs/drive/utils/aes_file_importer_worker.js');
        this.fileCommander.getFileExporter().setWorkerPath('./assets/js/lib/salmon-fs/salmonfs/drive/utils/aes_file_exporter_worker.js');
    }

    async refresh() {
        if (this.checkFileSearcher())
            return;
        if (this.drive == null)
            return;
        setTimeout(async () => {
            if (this.fileManagerMode != SalmonVaultManager.Mode.Search)
                this.salmonFiles = await this.currDir.listFiles();
            let selectedFile = this.selectedFiles.size > 1 ? this.selectedFiles.values().next().value : null;
            this.populateFileList(selectedFile);
        });
    }

    checkFileSearcher() {
        if (this.fileCommander.isFileSearcherRunning()) {
            SalmonDialogs.promptAnotherProcessRunning();
            return true;
        }
        return false;
    }

    populateFileList(currentFile) {
        setTimeout(async () => {
            this.selectedFiles.clear();
            try {
                if (this.fileManagerMode == SalmonVaultManager.Mode.Search)
                    this.setPathText(await this.currDir.getPath() + "?search=" + this.searchTerm);
                else
                    this.setPathText(await this.currDir.getPath());
            } catch (exception) {
                console.error(exception);
                SalmonDialog.promptDialog("Error", exception);
            }

            let list = [];
            for (let file of this.salmonFiles) {
                try {
                    list.push(file);
                } catch (e) {
                    console.error(e);
                }
            }
            this.setFileItemList(list);
            let currFile = this.findCurrentItem(currentFile);
            this.setCurrentItem(currFile);
        });
    }

    setupSalmonManager() {
        try {
            this.setupFileSequencer();
        } catch (e) {
            console.error(e);
            SalmonDialog.promptDialog("Error", "Error during initializing: " + e);
        }
    }

    setupFileSequencer() {
        if (this.sequencer != null)
            this.sequencer.close();
        let seqFile = new LocalStorageFile(this.getSequencerFilepath());
        this.sequencer = new FileSequencer(seqFile, this.createSerializer());
    }

    createSerializer() {
        return new SequenceSerializer();
    }

    pasteSelected() {
        this.#copySelectedFiles(this.fileManagerMode == SalmonVaultManager.Mode.Move);
    }

    setTaskRunning(value, progress = true) {
        if (progress)
            this.setJobRunning(value);
    }

    setTaskMessage(msg) {
        this.setStatus(msg != null ? msg : "");
    }

    /**
     * Open vault
     * @param {IFile} dir 
     * @param {string} password 
     * @returns 
     */
    async openVault(dir, password) {
        if (dir == null)
            return;

        try {
            this.propertyChanged(this, "taskRunning");
            this.closeVault();
            this.drive = await AesDrive.openDrive(dir, this.getDriveClassType(dir), password, this.sequencer);
            this.currDir = await this.drive.getRoot();
            SalmonSettings.getInstance().setVaultLocation(dir.getDisplayPath());
            this.refresh();
        } catch (e) {
            console.error(e);
            SalmonDialog.promptDialog("Error", "Could not open vault: " + e.message + ". " +
                (e.getCause && e.getCause() != null ? e.getCause().getMessage() : ""));
        } finally {
            this.propertyChanged(this, "taskComplete");
        }
    }

    /**
     * 
     * @param {IFile} vaultDir The vault dir
     * @returns The drive class type
     */
    getDriveClassType(vaultDir) {
		if(vaultDir instanceof File)
            return Drive;
        else if (vaultDir instanceof HttpFile)
            return HttpDrive;
        else if (vaultDir instanceof WSFile)
            return WSDrive;
        throw new RuntimeException("Unknown drive type");
    }

    deleteSelectedFiles() {
        this.deleteFiles(Array.from(this.selectedFiles));
        this.clearSelectedFiles();
    }

    #copySelectedFiles(move) {
        this.#copyFiles(this.copyFiles, this.currDir, move);
        this.clearSelectedFiles();
    }

    deleteFiles(files) {
        if (files == null)
            return;
        setTimeout(async () => {
            this.setFileProgress(0);
            this.setFilesProgress(0);
            this.setTaskRunning(true);

            let exception = null;
            let processedFiles = [-1];
            let failedFiles = [];
            try {
                let deleteOptions = new BatchDeleteOptions();
                deleteOptions.onProgressChanged = async (taskProgress) => {
                    if (processedFiles[0] < taskProgress.getProcessedFiles()) {
                        try {
                            if (taskProgress.getProcessedBytes() != taskProgress.getTotalBytes()) {
                                this.setTaskMessage("Deleting: " + await taskProgress.getFile().getName()
                                    + " " + (taskProgress.getProcessedFiles() + 1) + "/" + taskProgress.getTotalFiles());
                            }
                        } catch (e) {
                            console.error(e);
                        }
                        processedFiles[0] = taskProgress.getProcessedFiles();
                    }
                    this.setFileProgress(taskProgress.getProcessedBytes() / taskProgress.getTotalBytes());
                    this.setFilesProgress(taskProgress.getProcessedFiles() / taskProgress.getTotalFiles());
                };
                deleteOptions.onFailed = (file, ex) => {
                    failedFiles.push(file);
                    exception = ex;
                };
                await this.fileCommander.deleteFiles(files, deleteOptions);
            } catch (e) {
                if (!this.fileCommander.areJobsStopped()) {
                    console.error(e);
                    SalmonDialog.promptDialog("Error", "Could not delete files: " + e, "Ok");
                }
            }
            if (this.fileCommander.areJobsStopped())
                this.setTaskMessage("Delete Stopped");
            else if (failedFiles.length > 0)
                SalmonDialog.promptDialog("Delete", "Some files failed: " + exception);
            else
                this.setTaskMessage("Delete Complete");
            this.setFileProgress(1);
            this.setFilesProgress(1);
            await this.refresh();
            this.setTaskRunning(false);
            this.copyFiles = null;
            this.fileManagerMode = SalmonVaultManager.Mode.Browse;
        });
    }

    #copyFiles(files, dir, move) {
        if (files == null)
            return;
        setTimeout(async () => {
            this.setFileProgress(0);
            this.setFilesProgress(0);
            this.setTaskRunning(true);

            let action = move ? "Moving" : "Copying";
            let exception = null;
            let processedFiles = [-1];
            let failedFiles = [];
            try {
                let copyOptions = new BatchCopyOptions();
                copyOptions.autoRename = SalmonFileAutoRename;
                copyOptions.move = move;
                copyOptions.autoRenameFolders = true;
                copyOptions.onProgressChanged = async (taskProgress) => {
                    if (processedFiles[0] < taskProgress.getProcessedFiles()) {
                        try {
                            this.setTaskMessage(action + ": " + await taskProgress.getFile().getName()
                                + " " + (taskProgress.getProcessedFiles() + 1) + "/" + taskProgress.getTotalFiles());
                        } catch (e) {
                            console.error(e);
                        }
                        processedFiles[0] = taskProgress.getProcessedFiles();
                    }
                    this.setFileProgress(taskProgress.getProcessedBytes() / taskProgress.getTotalBytes());
                    this.setFilesProgress(taskProgress.getProcessedFiles() / taskProgress.getTotalFiles());
                };
                copyOptions.onFailed = (file, ex) => {
                    this.handleThrowException(ex);
                    failedFiles.push(file);
                    exception = ex;
                };
                await this.fileCommander.copyFiles(files, dir, copyOptions);
            } catch (e) {
                if (!this.fileCommander.areJobsStopped()) {
                    console.error(e);
                    SalmonDialog.promptDialog("Error", "Could not copy files: " + e, "Ok");
                }
            }
            if (this.fileCommander.areJobsStopped())
                this.setTaskMessage(action + " Stopped");
            else if (failedFiles.length > 0)
                SalmonDialog.promptDialog(action, "Some files failed: " + exception);
            else
                this.setTaskMessage(action + " Complete");
            this.setFileProgress(1);
            this.setFilesProgress(1);
            this.setTaskRunning(false);
            await this.refresh();
            this.copyFiles = null;
            this.fileManagerMode = SalmonVaultManager.Mode.Browse;
        });
    }

    async exportSelectedFiles(exportDir, deleteSource) {
        if (this.drive == null)
            return;
        await this.exportFiles(Array.from(this.selectedFiles), exportDir,
            async (files) => {
                await this.refresh();
            }, deleteSource);
        this.clearSelectedFiles();
    }

    clearSelectedFiles() {
        this.setSelectedFiles(new Set());
    }

    handleException(exception) {
        return false;
    }

    closeVault() {
        try {
            this.setFileItemList(null);
            this.currDir = null;
            this.clearCopiedFiles();
            this.setPathText("");
            if (this.drive != null) {
                this.drive.close();
                this.drive = null;
            }
        } catch (ex) {
            console.error(ex);
        }
    }

    async openItem(selectedFile) {
        let position = this.fileItemList.indexOf(selectedFile);
        if (position < 0)
            return true;
        if (await selectedFile.isDirectory()) {
            setTimeout(async () => {
                if (this.checkFileSearcher())
                    return;
                this.currDir = selectedFile;
                this.salmonFiles = await this.currDir.listFiles();
                this.populateFileList(null);
            });
            return true;
        }
        let item = this.fileItemList[position];
        return await this.openListItem(item);
    }

    async goBack() {
        if (this.fileManagerMode == SalmonVaultManager.Mode.Search && this.fileCommander.isFileSearcherRunning()) {
            this.fileCommander.stopFileSearch();
        } else if (this.fileManagerMode == SalmonVaultManager.Mode.Search) {
            setTimeout(async () => {
                this.fileManagerMode = SalmonVaultManager.Mode.Browse;
                this.salmonFiles = await this.currDir.listFiles();
                this.populateFileList(null);
            });
        } else if (await this.canGoBack()) {
            let finalParent = await this.currDir.getParent();
            setTimeout(async () => {
                if (this.checkFileSearcher())
                    return;
                let parentDir = this.currDir;
                this.currDir = finalParent;
                this.salmonFiles = await this.currDir.listFiles();
                this.populateFileList(parentDir);
            });
        } else if (this.promptExitOnBack) {
            SalmonDialogs.promptExit();
        }
    }

    findCurrentItem(currentFile) {
        if (currentFile == null)
            return null;
        for (let file of this.fileItemList) {
            if (file.getRealFile().getPath() == currentFile.getRealFile().getPath()) {
                this.selectedFiles.clear();
                this.selectedFiles.add(file);
                return file;
            }
        }
        return null;
    }

    getObservers() {
        return this.observers;
    }

    async renameFile(file, newFilename) {
        if (await file.getName() == newFilename)
            return;
        try {
            await this.fileCommander.renameFile(file, newFilename);
            await SalmonVaultManager.getInstance().updateListItem(file);
        } catch (e) {
            console.error(e);
            SalmonDialog.promptDialog("Error", "Could not rename file: " + e.message);
        }
    }

    /**
     * Create a directory
     * @param {string} folderName 
     */
    async createDirectory(folderName) {
        try {
            await SalmonVaultManager.getInstance().getCurrDir().createDirectory(folderName);
            await SalmonVaultManager.getInstance().refresh();
        } catch (exception) {
            console.error(exception);
            if (!SalmonVaultManager.getInstance().handleException(exception)) {
                SalmonDialog.promptDialog("Error", "Could not create folder: " + exception.message);
            }
        }
    }

    /**
     * Create a file
     * @param {string} fileName 
     */
    async createFile(fileName) {
        try {
            await SalmonVaultManager.getInstance().getCurrDir().createFile(fileName);
            await SalmonVaultManager.getInstance().refresh();
        } catch (exception) {
            console.error(exception);
            if (!SalmonVaultManager.getInstance().handleException(exception)) {
                SalmonDialog.promptDialog("Error", "Could not create file: " + exception.message);
            }
        }
    }

    async setPassword(pass) {
        try {
            this.propertyChanged(this, "taskRunning");
            await SalmonVaultManager.getInstance().getDrive().setPassword(pass);
            SalmonDialog.promptDialog("Password changed");
        } catch (e) {
            SalmonDialog.promptDialog("Could not change password: " + e.message);
        } finally {
            this.propertyChanged(this, "taskComplete");
        }
    }

    static Mode = {
        Browse: 'Browse',
        Search: 'Search',
        Copy: 'Copy',
        Move: 'Move'
    }

    exportFiles(items, exportDir, onFinished, deleteSource) {
        setTimeout(async () => {
            this.setFileProgress(0);
            this.setFilesProgress(0);
            this.setTaskRunning(true);

            let exception = null;
            let processedFiles = [-1];
            let files = null;
            let failedFiles = [];
            try {
                let exportOptions = new BatchExportOptions();
                exportOptions.deleteSource = deleteSource;
                exportOptions.integrity = true;
                exportOptions.autoRenameFile = IRealFileAutoRename;
                exportOptions.onProgressChanged = async (taskProgress) => {
                    if (processedFiles[0] < taskProgress.getProcessedFiles()) {
                        try {
                            this.setTaskMessage("Exporting: " + await taskProgress.getFile().getName()
                                + " " + (taskProgress.getProcessedFiles() + 1)
                                + "/" + taskProgress.getTotalFiles());
                        } catch (e) {
                            console.error(e);
                        }
                        processedFiles[0] = taskProgress.getProcessedFiles();
                    }
                    this.setFileProgress(taskProgress.getProcessedBytes() / taskProgress.getTotalBytes());
                    this.setFilesProgress(taskProgress.getProcessedFiles() / taskProgress.getTotalFiles());
                };
                exportOptions.onFailed = (file, ex) => {
                    failedFiles.push(file);
                    exception = ex;
                };
                files = await this.fileCommander.exportFiles(items, exportDir, exportOptions);
                if (onFinished != null)
                    onFinished(files);
            } catch (e) {
                console.error(e);
                SalmonDialog.promptDialog("Error", "Error while exporting files: " + e);
            }
            if (this.fileCommander.areJobsStopped())
                this.setTaskMessage("Export Stopped");
            else if (failedFiles.length > 0)
                SalmonDialog.promptDialog("Export", "Some files failed: " + exception);
            else if (files != null) {
                this.setTaskMessage("Export Complete");
                SalmonDialog.promptDialog("Export", "Files Exported To: " + exportDir.getDisplayPath());
            }
            this.setFileProgress(1);
            this.setFilesProgress(1);

            this.setTaskRunning(false);
        });
    }

    importFiles(fileNames, importDir, deleteSource, onFinished) {
        setTimeout(async () => {
            this.setFileProgress(0);
            this.setFilesProgress(0);
            this.setTaskRunning(true);

            let exception = null;
            let processedFiles = [-1];
            let files = null;
            let failedFiles = [];
            try {
                let importOptions = new BatchImportOptions();
                importOptions.autoRename = IRealFileAutoRename;
                importOptions.deleteSource = deleteSource;
                importOptions.integrity = true;
                importOptions.onProgressChanged = async (taskProgress) => {
                    if (processedFiles[0] < taskProgress.getProcessedFiles()) {
                        try {
                            this.setTaskMessage("Importing: " + await taskProgress.getFile().getName()
                                + " " + (taskProgress.getProcessedFiles() + 1) + "/" + taskProgress.getTotalFiles());
                        } catch (e) {
                            console.error(e);
                        }
                        processedFiles[0] = taskProgress.getProcessedFiles();
                    }
                    this.setFileProgress(taskProgress.getProcessedBytes() / taskProgress.getTotalBytes());
                    this.setFilesProgress(taskProgress.getProcessedFiles() / taskProgress.getTotalFiles());
                };
                importOptions.onFailed = (file, ex) => {
                    this.handleThrowException(ex);
                    failedFiles.push(file);
                    exception = ex;
                };
                files = await this.fileCommander.importFiles(fileNames, importDir, importOptions);
                onFinished(files);
            } catch (e) {
                console.error(e);
                if (!this.handleException(e)) {
                    SalmonDialog.promptDialog("Error", "Error while importing files: " + e);
                }
            }
            if (this.fileCommander.areJobsStopped())
                this.setTaskMessage("Import Stopped");
            else if (failedFiles.length > 0)
                SalmonDialog.promptDialog("Import", "Some files failed: " + exception);
            else if (files != null)
                this.setTaskMessage("Import Complete");
            this.setFileProgress(1);
            this.setFilesProgress(1);
            this.setTaskRunning(false);
        });
    }

    handleThrowException(ex) {
    }

    search(value, any) {
        this.searchTerm = value;
        if (this.checkFileSearcher())
            return;
        setTimeout(async () => {
            this.fileManagerMode = SalmonVaultManager.Mode.Search;
            this.setFileProgress(0);
            this.setFilesProgress(0);
            try {
                if (await this.currDir.getPath() != null)
                    this.setPathText(await this.currDir.getPath() + "?search=" + this.searchTerm);
            } catch (e) {
                console.error(e);
            }
            this.salmonFiles = [];
            this.populateFileList(null);
            this.setTaskRunning(true);
            this.setStatus("Searching");
            let searchOptions = new SearchOptions();
            searchOptions.anyTerm = any;
            searchOptions.onResultFound = (salmonFile) => {
                let position = 0;
                for (let file of this.fileItemList) {
                    if (salmonFile.getTag() != null &&
                        (file.getTag() == null || salmonFile.getTag() > file.getTag()))
                        break;
                    position++;
                }
                try {
                    this.fileItemList[position] = salmonFile;
                    this.onFileItemAdded(position, salmonFile);
                } catch (e) {
                    console.error(e);
                }
            };
            this.salmonFiles = await this.fileCommander.search(this.currDir, value, searchOptions);
            if (!this.fileCommander.isFileSearcherStopped())
                this.setStatus("Search Complete");
            else
                this.setStatus("Search Stopped");
            this.setTaskRunning(false);
        });
    }

    /**
     * 
     * @param {IFile} dir The vault directory
     * @param {string} password The password
     */
    async createVault(dir, password) {
        try {
            this.propertyChanged(this, "taskRunning");
            if (!(dir instanceof HttpFile) && !(await dir.exists())) {
                await dir.mkdir();
            }
            this.closeVault();
            this.drive = await AesDrive.createDrive(dir, this.getDriveClassType(dir), password, this.sequencer);
            this.currDir = await this.drive.getRoot();
            SalmonSettings.getInstance().setVaultLocation(dir.getPath());
            await this.refresh();
            SalmonDialog.promptDialog("Action", "Vault created, you can start importing your files");
        } catch (e) {
            console.error(e);
            SalmonDialog.promptDialog("Error", "Could not create vault: " + e.message + ". " +
                (e.getCause && e.getCause() != null ? e.getCause().getMessage() : ""));
        } finally {
            this.propertyChanged(this, "taskComplete");
        }
    }

    clearCopiedFiles() {
        this.copyFiles = null;
        this.fileManagerMode = SalmonVaultManager.Mode.Browse;
        this.setTaskRunning(false, false);
        this.setTaskMessage("");
    }

    async getFileProperties(item) {
        let fileChunkSize = await item.getFileChunkSize();
        return "Name: " + await item.getName() + "\n" +
            "Path: " + await item.getPath() + "\n" +
            (!await item.isDirectory() ? ("Size: " + ByteUtils.getBytes(await item.getLength(), 2)
                + " (" + await item.getLength() + " bytes)") : "Items: " + (await item.listFiles()).length) + "\n" +
            "Encrypted name: " + item.getRealFile().getName() + "\n" +
            "Encrypted path: " + item.getRealFile().getDisplayPath() + "\n" +
            (!await item.isDirectory() ? "Encrypted size: " + ByteUtils.getBytes(item.getRealFile().getLength(), 2)
                + " (" + await item.getRealFile().getLength() + " bytes)" : "") + "\n" +
            "Integrity chunk size: " + (fileChunkSize == 0 ? "None" : fileChunkSize) + "\n";
    }

    async canGoBack() {
        return this.currDir != null && await this.currDir.getParent() != null;
    }

    setPromptExitOnBack(promptExitOnBack) {
        this.promptExitOnBack = promptExitOnBack;
    }

}