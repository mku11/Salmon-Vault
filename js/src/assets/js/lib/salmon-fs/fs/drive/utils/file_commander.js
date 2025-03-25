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
import { FileImportOptions } from "./file_importer.js";
import { FileExportOptions } from "./file_exporter.js";
import { VirtualRecursiveCopyOptions, VirtualRecursiveMoveOptions } from "../../file/ivirtual_file.js";
/**
 * Facade class for file operations.
 */
export class FileCommander {
    /**
     * Instantiate a new file commander object.
     *
     */
    constructor(fileImporter, fileExporter, fileSearcher) {
        this.stopJobs = false;
        this.fileImporter = fileImporter;
        this.fileExporter = fileExporter;
        this.fileSearcher = fileSearcher;
    }
    getFileImporter() {
        return this.fileImporter;
    }
    getFileExporter() {
        return this.fileExporter;
    }
    /**
     * Import files to the drive.
     *
     * @param {IFile[]} filesToImport     The files to import.
     * @param {IVirtualFile} importDir         The target directory.
     * @param {BatchImportOptions} [options] The options
     * @returns {Promise<IVirtualFile[]>} The imported files if completes successfully.
     * @throws Exception If there was an error during import
     */
    async importFiles(filesToImport, importDir, options) {
        if (!options)
            options = new BatchImportOptions();
        this.stopJobs = false;
        let importedFiles = [];
        let total = 0;
        for (let i = 0; i < filesToImport.length; i++) {
            if (this.stopJobs)
                break;
            total += await this.getRealFilesCountRecursively(filesToImport[i]);
        }
        let count = [0];
        let existingFiles = await this.getExistingIVirtualFiles(importDir);
        for (let i = 0; i < filesToImport.length; i++) {
            if (this.stopJobs)
                break;
            await this.importRecursively(filesToImport[i], importDir, options.deleteSource, options.integrity, options.onProgressChanged, options.autoRename, options.onFailed, importedFiles, count, total, existingFiles);
        }
        return importedFiles;
    }
    async getExistingIVirtualFiles(importDir) {
        let files = {};
        let realFiles = await importDir.listFiles();
        for (let i = 0; i < realFiles.length; i++) {
            if (this.stopJobs)
                break;
            let file = realFiles[i];
            try {
                files[await file.getName()] = file;
            }
            catch (ignored) {
            }
        }
        return files;
    }
    async importRecursively(fileToImport, importDir, deleteSource, integrity, onProgressChanged, autoRename, onFailed, importedFiles, count, total, existingFiles) {
        let sfile = fileToImport.getName() in existingFiles
            ? existingFiles[fileToImport.getName()] : null;
        if (await fileToImport.isDirectory()) {
            if (onProgressChanged)
                onProgressChanged(new RealFileTaskProgress(fileToImport, 0, 1, count[0], total));
            if (sfile == null || !await sfile.exists())
                sfile = await importDir.createDirectory(fileToImport.getName());
            else if (sfile && await sfile.exists() && await sfile.isFile() && autoRename)
                sfile = await importDir.createDirectory(await autoRename(fileToImport));
            if (onProgressChanged)
                onProgressChanged(new RealFileTaskProgress(fileToImport, 1, 1, count[0], total));
            count[0]++;
            if (sfile == null)
                throw new Error("Could not get import directory");
            let nExistingFiles = await this.getExistingIVirtualFiles(sfile);
            let lFiles = await fileToImport.listFiles();
            for (let i = 0; i < lFiles.length; i++) {
                if (this.stopJobs)
                    break;
                let child = lFiles[i];
                await this.importRecursively(child, sfile, deleteSource, integrity, onProgressChanged, autoRename, onFailed, importedFiles, count, total, nExistingFiles);
            }
            if (deleteSource && !this.stopJobs)
                await fileToImport.delete();
        }
        else {
            try {
                let filename = fileToImport.getName();
                if (sfile && (await sfile.exists() || await sfile.isDirectory()) && autoRename)
                    filename = await autoRename(fileToImport);
                let importOptions = new FileImportOptions();
                importOptions.filename = filename;
                importOptions.deleteSource = deleteSource;
                importOptions.integrity = integrity;
                importOptions.onProgressChanged = (bytes, totalBytes) => {
                    if (onProgressChanged) {
                        onProgressChanged(new RealFileTaskProgress(fileToImport, bytes, totalBytes, count[0], total));
                    }
                };
                sfile = await this.fileImporter.importFile(fileToImport, importDir, importOptions);
                if (sfile) {
                    existingFiles[await sfile.getName()] = sfile;
                    importedFiles.push(sfile);
                }
                count[0]++;
            }
            catch (ex) {
                if (!this.onError(ex)) {
                    if (onFailed)
                        onFailed(fileToImport, ex);
                }
            }
        }
    }
    /**
     * Export a file from a drive.
     *
     * @param {IVirtualFile[]} filesToExport     The files to export.
     * @param {IFile} exportDir         The export target directory
     * @param {BatchExportOptions} [options] The options
     * @returns {Promise<IFile[]>} The exported files
     * @throws Exception
     */
    async exportFiles(filesToExport, exportDir, options) {
        if (!options)
            options = new BatchExportOptions();
        this.stopJobs = false;
        let exportedFiles = [];
        let total = 0;
        for (let i = 0; i < filesToExport.length; i++) {
            if (this.stopJobs)
                break;
            total += await this.getIVirtualFilesCountRecursively(filesToExport[i]);
        }
        let existingFiles = await this.getExistingRealFiles(exportDir);
        let count = [0];
        for (let i = 0; i < filesToExport.length; i++) {
            if (this.stopJobs)
                break;
            await this.exportRecursively(filesToExport[i], exportDir, options.deleteSource, options.integrity, options.onProgressChanged, options.autoRename, options.onFailed, exportedFiles, count, total, existingFiles);
        }
        return exportedFiles;
    }
    async getExistingRealFiles(exportDir) {
        let files = {};
        let lFiles = await exportDir.listFiles();
        for (let i = 0; i < lFiles.length; i++) {
            if (this.stopJobs)
                break;
            let file = lFiles[i];
            files[file.getName()] = file;
        }
        return files;
    }
    async exportRecursively(fileToExport, exportDir, deleteSource, integrity, onProgressChanged, autoRename, onFailed, exportedFiles, count, total, existingFiles) {
        let rfile = await fileToExport.getName() in existingFiles
            ? existingFiles[await fileToExport.getName()] : null;
        if (await fileToExport.isDirectory()) {
            if (rfile == null || !await rfile.exists())
                rfile = await exportDir.createDirectory(await fileToExport.getName());
            else if (rfile && await rfile.isFile() && autoRename)
                rfile = await exportDir.createDirectory(await autoRename(rfile));
            if (onProgressChanged)
                onProgressChanged(new IVirtualFileTaskProgress(fileToExport, 1, 1, count[0], total));
            count[0]++;
            let nExistingFiles = await this.getExistingRealFiles(rfile);
            let lFiles = await fileToExport.listFiles();
            for (let i = 0; i < lFiles.length; i++) {
                if (this.stopJobs)
                    break;
                let child = lFiles[i];
                await this.exportRecursively(child, rfile, deleteSource, integrity, onProgressChanged, autoRename, onFailed, exportedFiles, count, total, nExistingFiles);
            }
            if (deleteSource && !this.stopJobs) {
                fileToExport.delete();
            }
        }
        else {
            try {
                let filename = await fileToExport.getName();
                if (rfile && await rfile.exists() && autoRename)
                    filename = await autoRename(rfile);
                let exportOptions = new FileExportOptions();
                exportOptions.filename = filename;
                exportOptions.deleteSource = deleteSource;
                exportOptions.integrity = integrity;
                exportOptions.onProgressChanged = (bytes, totalBytes) => {
                    if (onProgressChanged) {
                        onProgressChanged(new IVirtualFileTaskProgress(fileToExport, bytes, totalBytes, count[0], total));
                    }
                };
                rfile = await this.fileExporter.exportFile(fileToExport, exportDir, exportOptions);
                if (rfile) {
                    existingFiles[rfile.getName()] = rfile;
                    exportedFiles.push(rfile);
                }
                count[0]++;
            }
            catch (ex) {
                if (!this.onError(ex)) {
                    if (onFailed)
                        onFailed(fileToExport, ex);
                }
            }
        }
    }
    async getIVirtualFilesCountRecursively(file) {
        let count = 1;
        if (await file.isDirectory()) {
            let lFiles = await file.listFiles();
            for (let i = 0; i < lFiles.length; i++) {
                if (this.stopJobs)
                    break;
                let child = lFiles[i];
                count += await this.getIVirtualFilesCountRecursively(child);
            }
        }
        return count;
    }
    async getRealFilesCountRecursively(file) {
        let count = 1;
        if (await file.isDirectory()) {
            let lFiles = await file.listFiles();
            for (let i = 0; i < lFiles.length; i++) {
                if (this.stopJobs)
                    break;
                let child = lFiles[i];
                count += await this.getRealFilesCountRecursively(child);
            }
        }
        return count;
    }
    /**
     * Delete files from a drive.
     *
     * @param {IVirtualFile[]} filesToDelete The files to delete.
     * @param {BatchDeleteOptions} [options] The options.
     */
    async deleteFiles(filesToDelete, options) {
        if (!options)
            options = new BatchDeleteOptions();
        this.stopJobs = false;
        let count = [0];
        let total = 0;
        for (let i = 0; i < filesToDelete.length; i++) {
            if (this.stopJobs)
                break;
            total += await this.getIVirtualFilesCountRecursively(filesToDelete[i]);
        }
        for (let i = 0; i < filesToDelete.length; i++) {
            let fileToDelete = filesToDelete[i];
            if (this.stopJobs)
                break;
            let finalTotal = total;
            let deleteOptions = new VirtualRecursiveCopyOptions();
            deleteOptions.onFailed = options.onFailed;
            deleteOptions.onProgressChanged = (file, position, length) => {
                if (this.stopJobs)
                    throw new Error();
                if (options.onProgressChanged) {
                    try {
                        options.onProgressChanged(new IVirtualFileTaskProgress(file, position, length, count[0], finalTotal));
                    }
                    catch (ex) {
                    }
                }
                if (position == length)
                    count[0]++;
            };
            await fileToDelete.deleteRecursively(deleteOptions);
        }
    }
    /**
     * Copy files to another directory.
     *
     * @param {IVirtualFile[]} filesToCopy       The array of files to copy.
     * @param {IVirtualFile} dir               The target directory.
     * @param {BatchCopyOptions} [options] The options
     * @throws Exception When a error during copying occurs.
     */
    async copyFiles(filesToCopy, dir, options) {
        if (!options)
            options = new BatchCopyOptions();
        this.stopJobs = false;
        let count = [0];
        let total = 0;
        for (let i = 0; i < filesToCopy.length; i++) {
            if (this.stopJobs)
                break;
            total += await this.getIVirtualFilesCountRecursively(filesToCopy[i]);
        }
        const finalTotal = total;
        for (let i = 0; i < filesToCopy.length; i++) {
            if (this.stopJobs)
                break;
            let fileToCopy = filesToCopy[i];
            if (dir.getRealFile().getDisplayPath().startsWith(fileToCopy.getRealFile().getDisplayPath()))
                continue;
            if (this.stopJobs)
                break;
            if (options.move) {
                let moveOptions = new VirtualRecursiveMoveOptions();
                moveOptions.autoRename = options.autoRename;
                moveOptions.autoRenameFolders = options.autoRenameFolders;
                moveOptions.onFailed = options.onFailed;
                moveOptions.onProgressChanged = (file, position, length) => {
                    if (this.stopJobs)
                        throw new Error();
                    if (options.onProgressChanged) {
                        try {
                            options.onProgressChanged(new IVirtualFileTaskProgress(file, position, length, count[0], finalTotal));
                        }
                        catch (ex) {
                        }
                    }
                    if (position == length)
                        count[0]++;
                };
                await fileToCopy.moveRecursively(dir, moveOptions);
            }
            else {
                let copyOptions = new VirtualRecursiveCopyOptions();
                copyOptions.autoRename = options === null || options === void 0 ? void 0 : options.autoRename;
                copyOptions.autoRenameFolders = options.autoRenameFolders;
                copyOptions.onFailed = options === null || options === void 0 ? void 0 : options.onFailed;
                copyOptions.onProgressChanged = (file, position, length) => {
                    if (this.stopJobs)
                        throw new Error();
                    if (options.onProgressChanged) {
                        try {
                            options.onProgressChanged(new IVirtualFileTaskProgress(file, position, length, count[0], finalTotal));
                        }
                        catch (ignored) {
                        }
                    }
                    if (position == length)
                        count[0]++;
                };
                await fileToCopy.copyRecursively(dir, copyOptions);
            }
        }
    }
    /**
     * Cancel all jobs.
     */
    cancel() {
        this.stopJobs = true;
        this.fileImporter.stop();
        this.fileExporter.stop();
        this.fileSearcher.stop();
    }
    /**
     * Check if the file search is currently running.
     *
     * @returns {boolean} True if the file search is currently running.
     */
    isFileSearcherRunning() {
        return this.fileSearcher.isRunning();
    }
    /**
     * Check if jobs are currently running.
     *
     * @returns {boolean} True if jobs are currently running.
     */
    isRunning() {
        return this.fileSearcher.isRunning() || this.fileImporter.isRunning() || this.fileExporter.isRunning();
    }
    /**
     * Check if file search stopped.
     *
     * @returns {boolean} True if file search stopped.
     */
    isFileSearcherStopped() {
        return this.fileSearcher.isStopped();
    }
    /**
     * Stop file search.
     */
    stopFileSearch() {
        this.fileSearcher.stop();
    }
    /**
     * Search
     *
     * @param {IVirtualFile} dir           The directory to start the search.
     * @param {string} terms         The terms to search for.
     * @param {SearchOptions} [options] The options
     * @returns {Promise<IVirtualFile[]>} An array with all the results found.
     */
    async search(dir, terms, options) {
        return await this.fileSearcher.search(dir, terms, options);
    }
    /**
     * Check if all jobs are stopped.
     *
     * @returns {boolean} True if jobs are stopped
     */
    areJobsStopped() {
        return this.stopJobs;
    }
    /**
     * Get number of files recursively for the files provided.
     *
     * @param {IVirtualFile[]} files The files and directories.
     * @returns {Promise<number>} Total number of files and files under subdirectories.
     */
    async getFiles(files) {
        let total = 0;
        for (let i = 0; i < files.length; i++) {
            if (this.stopJobs)
                break;
            let file = files[i];
            total++;
            if (await file.isDirectory()) {
                total += await this.getFiles(await file.listFiles());
            }
        }
        return total;
    }
    /**
     * Close the commander and associated resources.
     */
    close() {
        this.fileImporter.close();
        this.fileExporter.close();
    }
    /**
     * Rename an encrypted file
     * @param {IVirtualFile} file The file
     * @param {string} newFilename The new filename
     */
    async renameFile(file, newFilename) {
        await file.rename(newFilename);
    }
    /**
     * Handle the error.
     * @param {Error | unknown | null} ex The error
     * @returns {boolean} True if handled
     */
    onError(ex) {
        return false;
    }
}
/**
 * File task progress.
 */
export class FileTaskProgress {
    /**
     * Get the total bytes.
     * @returns {number} The total bytes
     */
    getTotalBytes() {
        return this.totalBytes;
    }
    /**
     * Get the processed bytes
     * @returns {number} The processed bytes
     */
    getProcessedBytes() {
        return this.processedBytes;
    }
    /**
     * Get the processed files
     * @returns {number} The processed files
     */
    getProcessedFiles() {
        return this.processedFiles;
    }
    /**
     * Get the total files
     * @returns {number} The total files
     */
    getTotalFiles() {
        return this.totalFiles;
    }
    /**
     * Construct a file progress
     * @param {number} processedBytes The processed bytes
     * @param {number} totalBytes The total bytes
     * @param {number} processedFiles The processed files
     * @param {number} totalFiles The total files
     */
    constructor(processedBytes, totalBytes, processedFiles, totalFiles) {
        this.processedBytes = processedBytes;
        this.totalBytes = totalBytes;
        this.processedFiles = processedFiles;
        this.totalFiles = totalFiles;
    }
}
/**
 * Virtual file task progress.
 */
export class IVirtualFileTaskProgress extends FileTaskProgress {
    /**
     * Get the file
     * @returns {IVirtualFile} The virtual file
     */
    getFile() {
        return this.file;
    }
    /**
     * Construct a task progress.
     * @param {IVirtualFile} file The file
     * @param {number} processedBytes The processed bytes
     * @param {number} totalBytes  The total bytes
     * @param {number} processedFiles  The processed files
     * @param {number} totalFiles  The total files
     */
    constructor(file, processedBytes, totalBytes, processedFiles, totalFiles) {
        super(processedBytes, totalBytes, processedFiles, totalFiles);
        this.file = file;
    }
}
/**
 * Real file task progress.
 */
export class RealFileTaskProgress extends FileTaskProgress {
    /**
     *
     * @returns {IFile} The real file
     */
    getFile() {
        return this.file;
    }
    /**
     *
     * @param {IFile} file The file
     * @param {number} processedBytes The processed bytes
     * @param {number} totalBytes The total bytes
     * @param {number} processedFiles The processed files
     * @param {number} totalFiles The total files
     */
    constructor(file, processedBytes, totalBytes, processedFiles, totalFiles) {
        super(processedBytes, totalBytes, processedFiles, totalFiles);
        this.file = file;
    }
}
/**
 * Batch delete options
 */
export class BatchDeleteOptions {
    constructor() {
        /**
         * Callback when delete fails
         * (file: IVirtualFile, error: Error | unknown) => void
         */
        this.onFailed = undefined;
        /**
         * Callback when progress changes
         * (progress: IVirtualFileTaskProgress) => void
         */
        this.onProgressChanged = undefined;
    }
}
/**
 * Batch import options
 */
export class BatchImportOptions {
    constructor() {
        /**
         * Delete the source file when complete.
         */
        this.deleteSource = false;
        /**
         * True to enable integrity
         */
        this.integrity = false;
        /**
         * Callback when a file with the same name exists
         * (file: IFile) => Promise<string>
         */
        this.autoRename = undefined;
        /**
         * Callback when import fails
         * (file: IFile, error: Error | unknown) => void
         */
        this.onFailed = undefined;
        /**
         * Callback when progress changes
         * (progress: RealFileTaskProgress) => void
         */
        this.onProgressChanged = undefined;
    }
}
/**
 * Batch export options
 */
export class BatchExportOptions {
    constructor() {
        /**
         * Delete the source file when complete.
         */
        this.deleteSource = false;
        /**
         * True to enable integrity
         */
        this.integrity = false;
        /**
         * Callback when a file with the same name exists
         * (file: IFile) => Promise<string>
         */
        this.autoRename = undefined;
        /**
         * Callback when import fails
         * (file: IVirtualFile, error: Error | unknown) => void
         */
        this.onFailed = undefined;
        /**
         * Callback when progress changes
         * (progress: IVirtualFileTaskProgress) => void
         */
        this.onProgressChanged = undefined;
    }
}
/**
 * Batch copy options
 */
export class BatchCopyOptions {
    constructor() {
        /**
         * True to move, false to copy
         */
        this.move = false;
        /**
         * Callback when another file with the same name exists.
         * (file: IVirtualFile) => Promise<string>
         */
        this.autoRename = undefined;
        /**
         * True to autorename folders
         */
        this.autoRenameFolders = false;
        /**
         * Callback when copy fails.
         * (file: IVirtualFile, error: Error | unknown) => void
         */
        this.onFailed = undefined;
        /**
         * Callback when progress changes.
         * (progress: IVirtualFileTaskProgress) => void
         */
        this.onProgressChanged = undefined;
    }
}
