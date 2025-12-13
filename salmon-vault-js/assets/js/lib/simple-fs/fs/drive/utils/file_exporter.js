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
import { exportFilePart } from "./file_exporter_helper.js";
import { IOException } from "../../../../simple-io/streams/io_exception.js";
import { Platform, PlatformType } from "../../../../simple-io/platform/platform.js";
/**
 * Abstract class for exporting files from a drive.
 * Make sure you use setWorkerPath() with the correct worker script.
 */
export class FileExporter {
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
    initialize(bufferSize = 0, threads = 1) {
        if (bufferSize <= 0)
            bufferSize = FileExporter.#DEFAULT_BUFFER_SIZE;
        if (threads <= 0)
            threads = FileExporter.#DEFAULT_THREADS;
        this.#bufferSize = bufferSize;
        this.#threads = threads;
    }
    isRunning() {
        return !this.#stopped[0];
    }
    /**
     *
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
     * Export a file from the drive to the external directory path
     *
     * @param {IVirtualFile} fileToExport The file that will be exported
     * @param {IFile} exportDir    The external directory the file will be exported to
     * @param {FileExportOptions} [options]     The options for the file export
     */
    async exportFile(fileToExport, exportDir, options) {
        if (!options)
            options = new FileExportOptions();
        if (this.isRunning())
            throw new Error("Another export is running");
        if (await fileToExport.isDirectory())
            throw new Error("Cannot export directory, use AesFileCommander instead");
        let exportFile;
        let filename = options.filename ? options.filename : await fileToExport.getName();
        try {
            if (!FileExporter.#enableMultiThread && this.#threads != 1)
                throw new Error("Multithreading is not supported");
            this.#stopped[0] = false;
            this.#lastException = null;
            let totalBytesWritten = [0];
            this.#failed = false;
            this.#lastException = null;
            if (!await exportDir.exists())
                await exportDir.mkdir();
            exportFile = await exportDir.createFile(filename);
            await this.onPrepare(fileToExport, options.integrity);
            let fileSize = await fileToExport.getLength();
            let runningThreads = 1;
            let partSize = fileSize;
            // for js we make sure to allocate enough space for the file
            let targetStream = await exportFile.getOutputStream();
            await targetStream.setLength(fileSize);
            await targetStream.close();
            // if we want to check integrity we align to the chunk size otherwise to the AES Block
            let minPartSize = await this.getMinimumPartSize(fileToExport, exportFile);
            if (partSize > minPartSize && this.#threads > 1) {
                partSize = Math.ceil(fileSize / this.#threads);
                if (partSize > minPartSize)
                    partSize -= partSize % minPartSize;
                else
                    partSize = minPartSize;
                runningThreads = Math.floor(fileSize / partSize);
            }
            if (runningThreads == 1) {
                await exportFilePart(fileToExport, exportFile, 0, fileSize, totalBytesWritten, options.onProgressChanged, this.#bufferSize, this.#stopped);
            }
            else {
                await this.#submitExportJobs(runningThreads, partSize, fileToExport, exportFile, totalBytesWritten, options.integrity, options.onProgressChanged);
            }
            if (this.#stopped[0])
                await exportFile.delete();
            else if (options.deleteSource)
                await fileToExport.getRealFile().delete();
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
        return exportFile;
    }
    async #submitExportJobs(runningThreads, partSize, fileToExport, exportedFile, totalBytesWritten, integrity, onProgressChanged) {
        let fileSize = await fileToExport.getLength();
        let bytesWritten = new Array(runningThreads);
        bytesWritten.fill(0);
        this.#promises = [];
        if (!this.#workerPath)
            this.#workerPath = await Platform.getAbsolutePath("file_exporter_worker.js", import.meta.url);
        for (let i = 0; i < runningThreads; i++) {
            this.#promises.push(new Promise(async (resolve, reject) => {
                if (Platform.getPlatform() == PlatformType.Browser) {
                    if (this.#workers[i] == null)
                        this.#workers[i] = new Worker(this.#workerPath, { type: 'module' });
                    this.#workers[i].removeEventListener('message', null);
                    this.#workers[i].removeEventListener('error', null);
                    this.#workers[i].addEventListener('message', (event) => {
                        if (event.data.message == 'progress' && onProgressChanged) {
                            bytesWritten[event.data.index] = event.data.position;
                            totalBytesWritten[0] = 0;
                            for (let i = 0; i < bytesWritten.length; i++) {
                                totalBytesWritten[0] += bytesWritten[i];
                            }
                            onProgressChanged(totalBytesWritten[0], fileSize);
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
                            bytesWritten[event.index] = event.position;
                            totalBytesWritten[0] = 0;
                            for (let i = 0; i < bytesWritten.length; i++) {
                                totalBytesWritten[0] += bytesWritten[i];
                            }
                            onProgressChanged(totalBytesWritten[0], fileSize);
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
                    let msg = await this.getWorkerMessage(i, fileToExport, exportedFile, runningThreads, partSize, fileSize, this.#bufferSize, integrity);
                    this.#workers[i].postMessage(msg);
                }
                catch (ex) {
                    reject(ex);
                }
            }));
        }
        await Promise.all(this.#promises).then((results) => {
            totalBytesWritten[0] = 0;
            for (let i = 0; i < results.length; i++) {
                totalBytesWritten[0] += results[i].totalBytesWritten;
            }
        }).catch((err) => {
            err = this.getError(err);
            this.#failed = true;
            this.#lastException = err;
            this.stop();
            throw new IOException("Error during export", err);
        });
    }
    /**
     * Override with your specific error transformation
     * @param {any} err The error
     * @returns {any} The transformed error
     */
    getError(err) {
        return err;
    }
    close() {
        for (let i = 0; i < this.#workers.length; i++) {
            this.#workers[i].terminate();
            this.#workers[i] = null;
        }
        this.#promises = [];
    }
    setWorkerPath(path) {
        this.#workerPath = path;
    }
    getWorkerPath() {
        return this.#workerPath;
    }
}
/**
 * File exporter options
 */
export class FileExportOptions {
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
