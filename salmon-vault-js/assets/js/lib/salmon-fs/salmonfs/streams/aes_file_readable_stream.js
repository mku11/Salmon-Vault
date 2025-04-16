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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _AesFileReadableStream_instances, _a, _AesFileReadableStream_DEFAULT_THREADS, _AesFileReadableStream_workerPath, _AesFileReadableStream_aesFile, _AesFileReadableStream_threads, _AesFileReadableStream_promises, _AesFileReadableStream_workers, _AesFileReadableStream_fillBufferMulti;
import { IOException } from "../../../salmon-core/streams/io_exception.js";
import { ReadableStreamWrapper, fillBufferPart } from "../../../salmon-core/streams/readable_stream_wrapper.js";
import { IntegrityException } from "../../../salmon-core/salmon/integrity/integrity_exception.js";
import { AuthException } from "../auth/auth_exception.js";
import { Generator } from "../../../salmon-core/salmon/generator.js";
/**
 * ReadableStream wrapper for seeking and reading an encrypted AesFile.
 * This class provides a seekable source with parallel streams and cached buffers
 * for performance.
 */
export class AesFileReadableStream extends ReadableStreamWrapper {
    constructor() {
        super(...arguments);
        _AesFileReadableStream_instances.add(this);
        _AesFileReadableStream_workerPath.set(this, './lib/salmon-fs/salmonfs/streams/aes_file_readable_stream_worker.js');
        _AesFileReadableStream_aesFile.set(this, null);
        _AesFileReadableStream_threads.set(this, 0);
        _AesFileReadableStream_promises.set(this, []);
        _AesFileReadableStream_workers.set(this, []);
    }
    /**
     * Creates a seekable stream from an encrypted file source
     *
     * @param {AesFile} aesFile   The source file.
     * @param {Uint8Array} buffersCount Number of buffers to use.
     * @param {Uint8Array} bufferSize   The length of each buffer.
     * @param {number} threads      The number of threads/streams to source the file in parallel.
     * @param {number} backOffset   The back offset.  Negative offset for the buffers. Some stream consumers might request data right before
     * the last request. We provide this offset so we don't make multiple requests for filling
     * the buffers ending up with too much overlapping data.
     */
    static createFileReadableStream(aesFile, buffersCount = ReadableStreamWrapper.DEFAULT_BUFFERS, bufferSize = ReadableStreamWrapper.DEFAULT_BUFFER_SIZE, threads = 1, backOffset = ReadableStreamWrapper.DEFAULT_BACK_OFFSET) {
        let fileReadableStream = new _a();
        fileReadableStream.setBufferCount(buffersCount);
        fileReadableStream.setBufferSize(bufferSize);
        fileReadableStream.setBackOffset(backOffset);
        __classPrivateFieldSet(fileReadableStream, _AesFileReadableStream_aesFile, aesFile, "f");
        __classPrivateFieldSet(fileReadableStream, _AesFileReadableStream_threads, threads, "f");
        let readableStream = ReadableStreamWrapper.createReadableStreamReader(fileReadableStream);
        readableStream.setWorkerPath = function (path) {
            fileReadableStream.setWorkerPath(path);
        };
        readableStream.getWorkerPath = function () {
            return fileReadableStream.getWorkerPath();
        };
        return readableStream;
    }
    async initialize() {
        if (__classPrivateFieldGet(this, _AesFileReadableStream_aesFile, "f") == null)
            throw new Error("File is missing");
        this.setAlignSize(await __classPrivateFieldGet(this, _AesFileReadableStream_aesFile, "f").getFileChunkSize() > 0 ?
            await __classPrivateFieldGet(this, _AesFileReadableStream_aesFile, "f").getFileChunkSize() : Generator.BLOCK_SIZE);
        this.setTotalSize(await __classPrivateFieldGet(this, _AesFileReadableStream_aesFile, "f").getLength());
        await super.initialize();
        if (__classPrivateFieldGet(this, _AesFileReadableStream_threads, "f") == 0)
            __classPrivateFieldSet(this, _AesFileReadableStream_threads, __classPrivateFieldGet(_a, _a, "f", _AesFileReadableStream_DEFAULT_THREADS), "f");
        if ((__classPrivateFieldGet(this, _AesFileReadableStream_threads, "f") & (__classPrivateFieldGet(this, _AesFileReadableStream_threads, "f") - 1)) != 0)
            throw new Error("Threads needs to be a power of 2 (ie 1,2,4,8)");
        if (__classPrivateFieldGet(this, _AesFileReadableStream_threads, "f") > 1 && __classPrivateFieldGet(this, _AesFileReadableStream_aesFile, "f").getRealFile().constructor.name === 'WSFile') {
            console.log("Multithreading for web service files is not supported, setting single thread");
            __classPrivateFieldSet(this, _AesFileReadableStream_threads, 1, "f");
        }
        if (__classPrivateFieldGet(this, _AesFileReadableStream_threads, "f") == 1)
            this.setStream(await __classPrivateFieldGet(this, _AesFileReadableStream_aesFile, "f").getInputStream());
        await this.setPositionEnd(this.getTotalSize() - 1);
    }
    /**
     * Fills a cache buffer with the decrypted data from the encrypted source file.
     * @param { Buffer } cacheBuffer The cache buffer that will store the decrypted contents
     * @param { number } startPosition The start position
     * @param { number } length      The length of the data requested
     */
    async fillBuffer(cacheBuffer, startPosition, length) {
        let bytesRead;
        if (__classPrivateFieldGet(this, _AesFileReadableStream_threads, "f") == 1) {
            let stream = this.getStream();
            if (stream == null)
                return 0;
            bytesRead = await fillBufferPart(cacheBuffer, startPosition, 0, length, stream);
        }
        else {
            bytesRead = await __classPrivateFieldGet(this, _AesFileReadableStream_instances, "m", _AesFileReadableStream_fillBufferMulti).call(this, cacheBuffer, startPosition, length);
        }
        return bytesRead;
    }
    /**
     * Cancel the stream
     * @param {any} [reason] The reason
     */
    async cancel(reason) {
        for (let i = 0; i < __classPrivateFieldGet(this, _AesFileReadableStream_workers, "f").length; i++) {
            __classPrivateFieldGet(this, _AesFileReadableStream_workers, "f")[i].postMessage({ message: 'close' });
            __classPrivateFieldGet(this, _AesFileReadableStream_workers, "f")[i].terminate();
            __classPrivateFieldGet(this, _AesFileReadableStream_workers, "f")[i] = null;
        }
        await super.cancel(reason);
    }
    /**
     * Set the worker path
     * @param {string} path The worker path
     */
    setWorkerPath(path) {
        __classPrivateFieldSet(this, _AesFileReadableStream_workerPath, path, "f");
    }
    /**
     * Get the worker path used for parallel streaming
     * @returns {string} The worker path
     */
    getWorkerPath() {
        return __classPrivateFieldGet(this, _AesFileReadableStream_workerPath, "f");
    }
}
_a = AesFileReadableStream, _AesFileReadableStream_workerPath = new WeakMap(), _AesFileReadableStream_aesFile = new WeakMap(), _AesFileReadableStream_threads = new WeakMap(), _AesFileReadableStream_promises = new WeakMap(), _AesFileReadableStream_workers = new WeakMap(), _AesFileReadableStream_instances = new WeakSet(), _AesFileReadableStream_fillBufferMulti = 
/**
 * Fill the buffer using parallel streams for performance
 */
async function _AesFileReadableStream_fillBufferMulti(cacheBuffer, startPosition, totalBufferLength) {
    if (__classPrivateFieldGet(this, _AesFileReadableStream_aesFile, "f") == null)
        throw new Error("File is missing");
    let needsBackOffset = totalBufferLength == this.getBufferSize();
    let partSize;
    if (needsBackOffset) {
        partSize = Math.ceil((totalBufferLength - this.getBackOffset()) / __classPrivateFieldGet(this, _AesFileReadableStream_threads, "f"));
    }
    else {
        partSize = Math.ceil(totalBufferLength / __classPrivateFieldGet(this, _AesFileReadableStream_threads, "f"));
    }
    let bytesRead = 0;
    __classPrivateFieldSet(this, _AesFileReadableStream_promises, [], "f");
    for (let i = 0; i < __classPrivateFieldGet(this, _AesFileReadableStream_threads, "f"); i++) {
        __classPrivateFieldGet(this, _AesFileReadableStream_promises, "f").push(new Promise(async (resolve, reject) => {
            if (__classPrivateFieldGet(this, _AesFileReadableStream_aesFile, "f") == null)
                throw new Error("File is missing");
            let fileToReadHandle = await __classPrivateFieldGet(this, _AesFileReadableStream_aesFile, "f").getRealFile().getPath();
            if (typeof process !== 'object') {
                if (__classPrivateFieldGet(this, _AesFileReadableStream_workers, "f")[i] == null)
                    __classPrivateFieldGet(this, _AesFileReadableStream_workers, "f")[i] = new Worker(this.getWorkerPath(), { type: 'module' });
                __classPrivateFieldGet(this, _AesFileReadableStream_workers, "f")[i].addEventListener('message', (event) => {
                    resolve(event.data);
                });
                __classPrivateFieldGet(this, _AesFileReadableStream_workers, "f")[i].addEventListener('error', (event) => {
                    reject(event);
                });
            }
            else {
                const { Worker } = await import("worker_threads");
                if (__classPrivateFieldGet(this, _AesFileReadableStream_workers, "f")[i] == null)
                    __classPrivateFieldGet(this, _AesFileReadableStream_workers, "f")[i] = new Worker(this.getWorkerPath());
                __classPrivateFieldGet(this, _AesFileReadableStream_workers, "f")[i].on('message', (event) => {
                    if (event.message == 'complete') {
                        resolve(event);
                    }
                    else if (event.message == 'error') {
                        reject(event);
                    }
                });
                __classPrivateFieldGet(this, _AesFileReadableStream_workers, "f")[i].on('error', (event) => {
                    reject(event);
                });
            }
            let start = partSize * i;
            if (i > 0 && needsBackOffset) {
                start += this.getBackOffset();
            }
            let length;
            if (i == 0 && needsBackOffset) {
                length = partSize + this.getBackOffset();
            }
            else if (i == __classPrivateFieldGet(this, _AesFileReadableStream_threads, "f") - 1)
                length = this.getBufferSize() - start;
            else
                length = partSize;
            __classPrivateFieldGet(this, _AesFileReadableStream_workers, "f")[i].postMessage({
                message: 'start',
                index: i,
                startPosition: startPosition,
                fileToReadHandle: fileToReadHandle,
                readFileClassType: __classPrivateFieldGet(this, _AesFileReadableStream_aesFile, "f").getRealFile().constructor.name,
                start: start, length: length,
                key: __classPrivateFieldGet(this, _AesFileReadableStream_aesFile, "f").getEncryptionKey(),
                integrity: __classPrivateFieldGet(this, _AesFileReadableStream_aesFile, "f").isIntegrityEnabled(),
                hash_key: __classPrivateFieldGet(this, _AesFileReadableStream_aesFile, "f").getHashKey(),
                chunk_size: __classPrivateFieldGet(this, _AesFileReadableStream_aesFile, "f").getRequestedChunkSize(),
                cacheBufferSize: this.getBufferSize()
            });
        }));
    }
    await Promise.all(__classPrivateFieldGet(this, _AesFileReadableStream_promises, "f")).then((results) => {
        for (let i = 0; i < results.length; i++) {
            bytesRead += results[i].chunkBytesRead;
            let chunkStart = results[i].start;
            for (let j = 0; j < results[i].chunkBytesRead; j++)
                cacheBuffer.getData()[chunkStart + j] = results[i].cacheBuffer[chunkStart + j];
        }
    }).catch((err) => {
        // deserialize the error
        if (err.error != undefined) {
            if (err.type == 'IntegrityException')
                err = new IntegrityException(err.error);
            else if (err.type == 'SalmonAuthException')
                err = new AuthException(err.error);
            else
                err = new Error(err.error);
        }
        console.error(err);
        throw new IOException("Error during read", err);
    });
    return bytesRead;
};
// default threads is one but you can increase it
_AesFileReadableStream_DEFAULT_THREADS = { value: 1 };
