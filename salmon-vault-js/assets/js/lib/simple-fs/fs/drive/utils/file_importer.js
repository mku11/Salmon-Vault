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
import { importFilePart } from "./file_importer_helper.js";
import { IOException } from "../../../../simple-io/streams/io_exception.js";
import { Platform, PlatformType } from "../../../../simple-io/platform/platform.js";
/**
 * Abstract class for importing files to a drive.
 * Make sure you use setWorkerPath() with the correct worker script.
 */
export class FileImporter {
    #workerPath = "";
    static #DEFAULT_BUFFER_SIZE = 512 * 1024;
    static #DEFAULT_THREADS = 1;
    static #enableMultiThread = true;
    /**
     * Current buffer size.
     */
    #bufferSize = 0;
    /**
     * Current threads.
     */
    #threads = 1;
    /**
     * True if last job was stopped by the user.
     */
    #stopped = [true];
    /**
     * Failed if last job was failed.
     */
    #failed = false;
    /**
     * Last exception occurred.
     */
    #lastException = null;
    #promises = [];
    #workers = [];
    /**
     * Initiliazes a file importer that can be used to import files to the drive
     *
     * @param {Uint8Array} bufferSize Buffer size to be used when encrypting files.
     *                   If using integrity this value has to be a multiple of the Chunk size.
     *                   If not using integrity it should be a multiple of the AES block size for better performance
     * @param {number} threads The threads
     */
    initialize(bufferSize = 0, threads = 1) {
        this.#bufferSize = bufferSize;
        if (this.#bufferSize <= 0)
            this.#bufferSize = FileImporter.#DEFAULT_BUFFER_SIZE;
        this.#threads = threads;
        if (this.#threads <= 0)
            this.#threads = FileImporter.#DEFAULT_THREADS;
    }
    /**
     * Stops all current importing tasks
     */
    stop() {
        this.#stopped[0] = true;
        let msg = { message: 'stop' };
        for (let i = 0; i < this.#workers.length; i++) {
            this.#workers[i].postMessage(msg);
            // workaround for node since it doesn't remove previous pending close events
            this.#workers[i].terminate();
            this.#workers[i] = null;
        }
    }
    /**
     * True if importer is currently running a job.
     *
     * @returns {boolean} True if running
     */
    isRunning() {
        return !this.#stopped[0];
    }
    /**
     * Imports a real file into the drive.
     *
     * @param {IFile} fileToImport The source file that will be imported in to the drive.
     * @param {IFile} dir          The target directory in the drive that the file will be imported
     * @param {FileImportOptions} [options] Options
     * @returns {Promise<IVirtualFile | null>} A promise which resolves to a virtual file or null
     */
    async importFile(fileToImport, dir, options) {
        if (!options)
            options = new FileImportOptions();
        if (this.isRunning())
            throw new Error("Another import is running");
        if (await fileToImport.isDirectory())
            throw new Error("Cannot import directory, use FileCommander instead");
        let filename = options.filename ? options.filename : fileToImport.getName();
        let totalBytesRead = [0];
        let importedFile = null;
        try {
            if (!FileImporter.#enableMultiThread && this.#threads != 1)
                throw new Error("Multithreading is not supported");
            this.#stopped[0] = false;
            this.#lastException = null;
            this.#failed = false;
            this.#lastException = null;
            importedFile = await dir.createFile(filename);
            await this.onPrepare(importedFile, options.integrity);
            let fileSize = await fileToImport.getLength();
            let runningThreads = 1;
            let partSize = fileSize;
            // for js we make sure to allocate enough space for the file 
            // this will also create the header
            let targetStream = await importedFile.getOutputStream();
            await targetStream.setLength(fileSize);
            await targetStream.close();
            // if we want to check integrity we align to the chunk size otherwise to the AES Block
            let minPartSize = await this.getMinimumPartSize(fileToImport, importedFile);
            if (partSize > minPartSize && this.#threads > 1) {
                partSize = Math.ceil(fileSize / this.#threads);
                if (partSize > minPartSize)
                    partSize -= partSize % minPartSize;
                else
                    partSize = minPartSize;
                runningThreads = Math.floor(fileSize / partSize);
            }
            if (runningThreads == 1) {
                await importFilePart(fileToImport, importedFile, 0, fileSize, totalBytesRead, options.onProgressChanged, this.#bufferSize, this.#stopped);
            }
            else {
                await this.#submitImportJobs(runningThreads, partSize, fileToImport, importedFile, totalBytesRead, options.integrity, options.onProgressChanged);
            }
            if (this.#stopped[0])
                await importedFile.getRealFile().delete();
            else if (options.deleteSource)
                await fileToImport.delete();
            if (this.#lastException)
                throw this.#lastException;
        }
        catch (ex) {
            this.#failed = true;
            this.#stopped[0] = true;
            this.#lastException = ex;
            throw ex;
        }
        if (this.#stopped[0] || this.#failed) {
            this.#stopped[0] = true;
            return null;
        }
        this.#stopped[0] = true;
        return importedFile;
    }
    async #submitImportJobs(runningThreads, partSize, fileToImport, importedFile, totalBytesRead, integrity, onProgressChanged) {
        let fileSize = await fileToImport.getLength();
        let bytesRead = new Array(runningThreads);
        bytesRead.fill(0);
        this.#promises = [];
        if (!this.#workerPath)
            this.#workerPath = await Platform.getAbsolutePath("file_importer_worker.js", import.meta.url);
        for (let i = 0; i < runningThreads; i++) {
            this.#promises.push(new Promise(async (resolve, reject) => {
                if (Platform.getPlatform() == PlatformType.Browser) {
                    if (this.#workers[i] == null) {
                        this.#workers[i] = new Worker(this.#workerPath, { type: 'module' });
                    }
                    this.#workers[i].removeEventListener('error', null);
                    this.#workers[i].removeEventListener('message', null);
                    this.#workers[i].addEventListener('message', (event) => {
                        if (event.data.message == 'progress' && onProgressChanged) {
                            bytesRead[event.data.index] = event.data.position;
                            totalBytesRead[0] = 0;
                            for (let i = 0; i < bytesRead.length; i++) {
                                totalBytesRead[0] += bytesRead[i];
                            }
                            onProgressChanged(totalBytesRead[0], fileSize);
                        }
                        else if (event.data.message == 'complete') {
                            resolve(event.data);
                        }
                        else if (event.data.message == 'error') {
                            reject(event.data);
                        }
                    });
                    this.#workers[i].addEventListener('error', (event) => {
                        reject(event);
                    });
                }
                else {
                    const { Worker } = await import("worker_threads");
                    if (this.#workers[i] == null)
                        this.#workers[i] = new Worker(this.#workerPath);
                    this.#workers[i].removeAllListeners();
                    this.#workers[i].on('message', (event) => {
                        if (event.message == 'progress' && onProgressChanged) {
                            bytesRead[event.index] = event.position;
                            totalBytesRead[0] = 0;
                            for (let i = 0; i < bytesRead.length; i++) {
                                totalBytesRead[0] += bytesRead[i];
                            }
                            onProgressChanged(totalBytesRead[0], fileSize);
                        }
                        else if (event.message == 'complete') {
                            resolve(event);
                        }
                        else if (event.message == 'error') {
                            reject(event);
                        }
                    });
                    this.#workers[i].on('error', (event) => {
                        reject(event);
                    });
                }
                try {
                    let msg = await this.getWorkerMessage(i, fileToImport, importedFile, runningThreads, partSize, fileSize, this.#bufferSize, integrity);
                    this.#workers[i].postMessage(msg);
                }
                catch (ex) {
                    reject(ex);
                }
            }));
        }
        await Promise.all(this.#promises).then((results) => {
            totalBytesRead[0] = 0;
            for (let i = 0; i < results.length; i++) {
                totalBytesRead[0] += results[i].totalBytesRead;
            }
        }).catch((err) => {
            err = this.#getError(err);
            this.#failed = true;
            this.#lastException = err;
            this.stop();
            throw new IOException("Error during import", err);
        });
    }
    #getError(err) {
        return err;
    }
    /**
     * Close the importer and associated resources
     */
    close() {
        for (let i = 0; i < this.#workers.length; i++) {
            this.#workers[i].terminate();
            this.#workers[i] = null;
        }
        this.#promises = [];
    }
    /**
     * Set the path to the worker script to use
     * @param {string} path The path
     */
    setWorkerPath(path) {
        this.#workerPath = path;
    }
    /**
     * Get the current worker script path
     * @returns {string} The path
     */
    getWorkerPath() {
        return this.#workerPath;
    }
}
/**
 * File importer options
 */
export class FileImportOptions {
    /**
     * Override the filename
     */
    filename = undefined;
    /**
     * Delete the source file after completion.
     */
    deleteSource = false;
    /**
     * True to enable integrity.
     */
    integrity = false;
    /**
     * Callback when progress changes
     * (position: number, length: number) => void
     */
    onProgressChanged = undefined;
}
