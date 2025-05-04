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
import { HttpSyncClient } from "../../../fs/file/http_sync_client.js";
import { IntegrityException } from "../../../../salmon-core/salmon/integrity/integrity_exception.js";
import { AuthException } from "../../auth/auth_exception.js";
import { FileImporter } from "../../../fs/drive/utils/file_importer.js";
import { FileUtils } from "../../../fs/drive/utils/file_utils.js";
/**
 * Imports files to a drive.
 * Make sure you use setWorkerPath() with the correct worker script.
 */
export class AesFileImporter extends FileImporter {
    /**
     * Constructs a file importer that can be used to import files to the drive
     *
     * @param {number} bufferSize Buffer size to be used when encrypting files.
     *                   If using integrity this value has to be a multiple of the Chunk size.
     *                   If not using integrity it should be a multiple of the AES block size for better performance
     * @param {number} threads The threads to use
     */
    constructor(bufferSize = 0, threads = 1) {
        super();
        super.setWorkerPath('./lib/salmon-fs/salmonfs/drive/utils/aes_file_importer_worker.js');
        super.initialize(bufferSize, threads);
    }
    /**
     * Called during preparation of import.
     * @param {IVirtualFile} targetFile The target file
     * @param {boolean} integrity True if integrity enabled
     */
    async onPrepare(targetFile, integrity) {
        targetFile.setAllowOverwrite(true);
        // we use default chunk file size
        await targetFile.setApplyIntegrity(integrity);
    }
    /**
     * Get the minimum part of a file that can run under a thread.
     * @param {IFile} sourceFile The source file.
     * @param {IVirtualFile} targetFile The target file
     * @returns {Promise<number>} The minimum file part.
     */
    async getMinimumPartSize(sourceFile, targetFile) {
        // we force the whole content to use 1 thread if:
        if (
        // we are in the browser and the target is a local file (chromes crswap clash between writers)
        targetFile.getRealFile().constructor.name === 'File' && typeof process !== 'object') {
            return await sourceFile.getLength();
        }
        return await targetFile.getMinimumPartSize();
    }
    /**
     * Tranform an error that can be thrown from a web worker.
     * @param {any} err The original error
     * @returns {any} The transformed error
     */
    getError(err) {
        // deserialize the error
        if (err.error != undefined) {
            if (err.type == 'IntegrityException')
                err = new IntegrityException(err.error);
            else if (err.type == 'SalmonAuthException')
                err = new AuthException(err.error);
            else
                err = new Error(err.error);
        }
        return err;
    }
    /**
     * Create a message for the web worker.
     * @param {number} index The worker index
     * @param {IFile} sourceFile The source file
     * @param {IVirtualFile} targetFile The target file
     * @param {number} runningThreads The number of threads scheduled
     * @param {number} partSize The length of the file part that will be imported
     * @param {number} fileSize The file size
     * @param {number} bufferSize The buffer size
     * @param {boolean} integrity True if integrity is enabled.
     * @returns {any} The message to be sent to the worker
     */
    async getWorkerMessage(index, sourceFile, targetFile, runningThreads, partSize, fileSize, bufferSize, integrity) {
        let realSourceFileHandle = await sourceFile.getPath();
        let realSourceFileType = sourceFile.constructor.name;
        let realSourceServicePath = await FileUtils.getServicePath(sourceFile);
        let realSourceFileCredentials = sourceFile.getCredentials();
        let targetFileToImport = targetFile;
        let realTargetFile = targetFileToImport.getRealFile();
        let realTargetFileHandle = await realTargetFile.getPath();
        let realTargetFileType = realTargetFile.constructor.name;
        let realTargetServicePath = await FileUtils.getServicePath(realTargetFile);
        let realTargetFileCredentials = realTargetFile.getCredentials();
        let start = partSize * index;
        let length;
        if (index == runningThreads - 1)
            length = fileSize - start;
        else
            length = partSize;
        return {
            message: 'start',
            index: index,
            realSourceFileHandle: realSourceFileHandle,
            realSourceFileType: realSourceFileType,
            realSourceServicePath: realSourceServicePath,
            realSourceServiceUser: realSourceFileCredentials === null || realSourceFileCredentials === void 0 ? void 0 : realSourceFileCredentials.getServiceUser(),
            realSourceServicePassword: realSourceFileCredentials === null || realSourceFileCredentials === void 0 ? void 0 : realSourceFileCredentials.getServicePassword(),
            realTargetFileHandle: realTargetFileHandle,
            realTargetFileType: realTargetFileType,
            realTargetServicePath: realTargetServicePath,
            realTargetServiceUser: realTargetFileCredentials === null || realTargetFileCredentials === void 0 ? void 0 : realTargetFileCredentials.getServiceUser(),
            realTargetServicePassword: realTargetFileCredentials === null || realTargetFileCredentials === void 0 ? void 0 : realTargetFileCredentials.getServicePassword(),
            start: start, length: length,
            key: targetFileToImport.getEncryptionKey(),
            integrity: integrity,
            hash_key: targetFileToImport.getHashKey(),
            chunk_size: targetFileToImport.getRequestedChunkSize(),
            bufferSize: bufferSize,
            allowClearTextTraffic: HttpSyncClient.getAllowClearTextTraffic()
        };
    }
}
