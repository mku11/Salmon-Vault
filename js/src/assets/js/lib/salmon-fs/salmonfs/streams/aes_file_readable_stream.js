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
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _a, _AesFileReadableStream_DEFAULT_BUFFER_SIZE, _AesFileReadableStream_DEFAULT_THREADS, _AesFileReadableStream_DEFAULT_BUFFERS, _AesFileReadableStream_MAX_BUFFERS, _ReadableStreamFileReader_instances, _ReadableStreamFileReader_buffers, _ReadableStreamFileReader_stream, _ReadableStreamFileReader_promises, _ReadableStreamFileReader_workers, _ReadableStreamFileReader_position, _ReadableStreamFileReader_size, _ReadableStreamFileReader_lruBuffersIndex, _ReadableStreamFileReader_createStream, _ReadableStreamFileReader_createBuffers, _ReadableStreamFileReader_readStream, _ReadableStreamFileReader_fillBuffer, _ReadableStreamFileReader_fillBufferMulti, _ReadableStreamFileReader_getAvailCacheBuffer, _ReadableStreamFileReader_getCacheBuffer, _ReadableStreamFileReader_clearBuffers, _ReadableStreamFileReader_closeStream;
import { IOException } from "../../../salmon-core/streams/io_exception.js";
import { CacheBuffer, fillBufferPart } from "./aes_file_readable_stream_helper.js";
import { IntegrityException } from "../../../salmon-core/salmon/integrity/integrity_exception.js";
import { AuthException } from "../auth/auth_exception.js";
/**
 * Implementation of a javascript ReadableStream for seeking and reading a aesFile.
 * This class provides a seekable source with parallel substreams and cached buffers
 * for performance.
 * Make sure you use setWorkerPath() with the correct worker script.
 */
export class AesFileReadableStream {
    /**
     * Instantiate a seekable stream from an encrypted file source
     *
     * @param {AesFile} aesFile   The source file.
     * @param {Uint8Array} buffersCount Number of buffers to use.
     * @param {Uint8Array} bufferSize   The length of each buffer.
     * @param {number} threads      The number of threads/streams to source the file in parallel.
     * @param {number} backOffset   The back offset.  Negative offset for the buffers. Some stream consumers might request data right before
     * the last request. We provide this offset so we don't make multiple requests for filling
     * the buffers ending up with too much overlapping data.
     */
    static create(aesFile, buffersCount = 0, bufferSize = 0, threads = 0, backOffset = 0) {
        if (buffersCount == 0)
            buffersCount = __classPrivateFieldGet(_a, _a, "f", _AesFileReadableStream_DEFAULT_BUFFERS);
        if (buffersCount > __classPrivateFieldGet(_a, _a, "f", _AesFileReadableStream_MAX_BUFFERS))
            buffersCount = __classPrivateFieldGet(_a, _a, "f", _AesFileReadableStream_MAX_BUFFERS);
        if (bufferSize == 0)
            bufferSize = __classPrivateFieldGet(_a, _a, "f", _AesFileReadableStream_DEFAULT_BUFFER_SIZE);
        if (backOffset > 0)
            bufferSize += backOffset;
        if (threads == 0)
            threads = __classPrivateFieldGet(_a, _a, "f", _AesFileReadableStream_DEFAULT_THREADS);
        let reader = new ReadableStreamFileReader(aesFile, buffersCount, bufferSize, threads, backOffset);
        let readableStream = new ReadableStream({
            type: 'bytes',
            async pull(controller) {
                let buff = await reader.read();
                if (buff)
                    controller.enqueue(buff);
                else
                    controller.close();
            },
            async cancel(reason) {
                await reader.cancel();
            }
        });
        readableStream.reset = function () {
            reader.reset();
        };
        readableStream.skip = async function (position) {
            return await reader.skip(position);
        };
        readableStream.getPositionStart = function () {
            return reader.getPositionStart();
        };
        readableStream.setPositionStart = async function (position) {
            await reader.setPositionStart(position);
        };
        readableStream.setPositionEnd = async function (position) {
            await reader.setPositionEnd(position);
        };
        readableStream.setWorkerPath = function (path) {
            reader.setWorkerPath(path);
        };
        readableStream.getWorkerPath = function () {
            return reader.getWorkerPath();
        };
        return readableStream;
    }
}
_a = AesFileReadableStream;
// Default cache buffer should be high enough for some mpeg videos to work
// the cache buffers should be aligned to the SalmonFile chunk size for efficiency
_AesFileReadableStream_DEFAULT_BUFFER_SIZE = { value: 512 * 1024 };
// default threads is one but you can increase it
_AesFileReadableStream_DEFAULT_THREADS = { value: 1 };
_AesFileReadableStream_DEFAULT_BUFFERS = { value: 3 };
_AesFileReadableStream_MAX_BUFFERS = { value: 6 };
export class ReadableStreamFileReader {
    /**
     * Construct a stream. Do not use this directly, use AesFileReadableStream.create() instead.
     */
    constructor(aesFile, buffersCount, bufferSize, threads, backOffset) {
        _ReadableStreamFileReader_instances.add(this);
        this.workerPath = './lib/salmon-fs/salmonfs/streams/aes_file_readable_stream_worker.js';
        _ReadableStreamFileReader_buffers.set(this, null);
        _ReadableStreamFileReader_stream.set(this, null);
        _ReadableStreamFileReader_promises.set(this, []);
        _ReadableStreamFileReader_workers.set(this, []);
        _ReadableStreamFileReader_position.set(this, 0);
        _ReadableStreamFileReader_size.set(this, 0);
        /**
         * We reuse the least recently used buffer. Since the buffer count is relative
         * small (see {@link #MAX_BUFFERS}) there is no need for a fast-access lru queue
         * so a simple linked list of keeping the indexes is adequately fast.
         */
        _ReadableStreamFileReader_lruBuffersIndex.set(this, []);
        this.positionStart = 0;
        this.positionEnd = 0;
        this.closed = Promise.resolve(undefined);
        this.aesFile = aesFile;
        this.buffersCount = buffersCount;
        this.cacheBufferSize = bufferSize;
        if (threads > 1 && this.aesFile.getRealFile().constructor.name === 'WSFile') {
            console.log("Multithreading for web service files is not supported, setting single thread");
            threads = 1;
        }
        this.threads = threads;
        this.backOffset = backOffset;
    }
    async initialize() {
        __classPrivateFieldSet(this, _ReadableStreamFileReader_size, await this.aesFile.getLength(), "f");
        this.positionStart = 0;
        this.positionEnd = __classPrivateFieldGet(this, _ReadableStreamFileReader_size, "f") - 1;
        __classPrivateFieldGet(this, _ReadableStreamFileReader_instances, "m", _ReadableStreamFileReader_createBuffers).call(this);
        if (this.threads == 1) {
            await __classPrivateFieldGet(this, _ReadableStreamFileReader_instances, "m", _ReadableStreamFileReader_createStream).call(this);
        }
    }
    /**
     * Read from the encrypted stream
     * @returns {Promise<Uint8Array | null>} The data read
     */
    async read() {
        if (__classPrivateFieldGet(this, _ReadableStreamFileReader_buffers, "f") == null)
            await this.initialize();
        let buff = new Uint8Array(this.cacheBufferSize);
        let bytesRead = await __classPrivateFieldGet(this, _ReadableStreamFileReader_instances, "m", _ReadableStreamFileReader_readStream).call(this, buff, 0, buff.length);
        if (bytesRead <= 0)
            return null;
        return buff.slice(0, bytesRead);
    }
    /**
     * Skip a number of bytes.
     *
     * @param {number} bytes the number of bytes to be skipped.
     * @returns {Promise<number>} The new position
     */
    async skip(bytes) {
        if (__classPrivateFieldGet(this, _ReadableStreamFileReader_buffers, "f") == null)
            await this.initialize();
        bytes += this.positionStart;
        let currPos = __classPrivateFieldGet(this, _ReadableStreamFileReader_position, "f");
        if (__classPrivateFieldGet(this, _ReadableStreamFileReader_position, "f") + bytes > __classPrivateFieldGet(this, _ReadableStreamFileReader_size, "f"))
            __classPrivateFieldSet(this, _ReadableStreamFileReader_position, __classPrivateFieldGet(this, _ReadableStreamFileReader_size, "f"), "f");
        else
            __classPrivateFieldSet(this, _ReadableStreamFileReader_position, __classPrivateFieldGet(this, _ReadableStreamFileReader_position, "f") + bytes, "f");
        return __classPrivateFieldGet(this, _ReadableStreamFileReader_position, "f") - currPos;
    }
    /**
     * Reset the stream
     */
    reset() {
        __classPrivateFieldSet(this, _ReadableStreamFileReader_position, 0, "f");
    }
    /**
     * Get the start position of the stream
     * @returns {number} The start position of the stream
     */
    getPositionStart() {
        return this.positionStart;
    }
    /**
     * Set the start position of the stream.
     * @param {number} pos The start position
     */
    async setPositionStart(pos) {
        if (__classPrivateFieldGet(this, _ReadableStreamFileReader_buffers, "f") == null)
            await this.initialize();
        this.positionStart = pos;
    }
    /**
     * Set the end position of the stream
     * @param {number} pos The end position of the stream
     */
    async setPositionEnd(pos) {
        if (__classPrivateFieldGet(this, _ReadableStreamFileReader_buffers, "f") == null)
            await this.initialize();
        this.positionEnd = pos;
    }
    /**
     * Cancel the stream
     * @param {any} [reason] The reason
     */
    async cancel(reason) {
        await __classPrivateFieldGet(this, _ReadableStreamFileReader_instances, "m", _ReadableStreamFileReader_closeStream).call(this);
        __classPrivateFieldGet(this, _ReadableStreamFileReader_instances, "m", _ReadableStreamFileReader_clearBuffers).call(this);
        for (let i = 0; i < __classPrivateFieldGet(this, _ReadableStreamFileReader_workers, "f").length; i++) {
            __classPrivateFieldGet(this, _ReadableStreamFileReader_workers, "f")[i].postMessage({ message: 'close' });
            __classPrivateFieldGet(this, _ReadableStreamFileReader_workers, "f")[i].terminate();
            __classPrivateFieldGet(this, _ReadableStreamFileReader_workers, "f")[i] = null;
        }
    }
    /**
     * Set the worker path
     * @param {string} path The worker path
     */
    setWorkerPath(path) {
        this.workerPath = path;
    }
    /**
     * Get the worker path used for parallel streaming
     * @returns {string} The worker path
     */
    getWorkerPath() {
        return this.workerPath;
    }
}
_ReadableStreamFileReader_buffers = new WeakMap(), _ReadableStreamFileReader_stream = new WeakMap(), _ReadableStreamFileReader_promises = new WeakMap(), _ReadableStreamFileReader_workers = new WeakMap(), _ReadableStreamFileReader_position = new WeakMap(), _ReadableStreamFileReader_size = new WeakMap(), _ReadableStreamFileReader_lruBuffersIndex = new WeakMap(), _ReadableStreamFileReader_instances = new WeakSet(), _ReadableStreamFileReader_createStream = 
/**
 * Method creates the parallel streams for reading from the file
 */
async function _ReadableStreamFileReader_createStream() {
    __classPrivateFieldSet(this, _ReadableStreamFileReader_stream, await this.aesFile.getInputStream(), "f");
}, _ReadableStreamFileReader_createBuffers = function _ReadableStreamFileReader_createBuffers() {
    __classPrivateFieldSet(this, _ReadableStreamFileReader_buffers, new Array(this.buffersCount), "f");
    for (let i = 0; i < __classPrivateFieldGet(this, _ReadableStreamFileReader_buffers, "f").length; i++)
        __classPrivateFieldGet(this, _ReadableStreamFileReader_buffers, "f")[i] = new CacheBuffer(this.cacheBufferSize);
}, _ReadableStreamFileReader_readStream = 
/**
 * Reads and decrypts the contents of an encrypted file
 */
async function _ReadableStreamFileReader_readStream(buffer, offset, count) {
    if (__classPrivateFieldGet(this, _ReadableStreamFileReader_position, "f") >= this.positionEnd + 1)
        return -1;
    let minCount;
    let bytesRead;
    // truncate the count so getCacheBuffer() reports the correct buffer
    count = Math.floor(Math.min(count, __classPrivateFieldGet(this, _ReadableStreamFileReader_size, "f") - __classPrivateFieldGet(this, _ReadableStreamFileReader_position, "f")));
    let cacheBuffer = __classPrivateFieldGet(this, _ReadableStreamFileReader_instances, "m", _ReadableStreamFileReader_getCacheBuffer).call(this, __classPrivateFieldGet(this, _ReadableStreamFileReader_position, "f"), count);
    if (cacheBuffer == null) {
        cacheBuffer = __classPrivateFieldGet(this, _ReadableStreamFileReader_instances, "m", _ReadableStreamFileReader_getAvailCacheBuffer).call(this);
        // the stream is closed
        if (cacheBuffer == null)
            return -1;
        // for some applications like media players they make a second immediate request
        // in a position a few bytes before the first request. To make
        // sure we don't make 2 overlapping requests we start the buffer
        // a position ahead of the first request.
        let startPosition = __classPrivateFieldGet(this, _ReadableStreamFileReader_position, "f") - this.backOffset;
        if (startPosition < 0)
            startPosition = 0;
        bytesRead = await __classPrivateFieldGet(this, _ReadableStreamFileReader_instances, "m", _ReadableStreamFileReader_fillBuffer).call(this, cacheBuffer, startPosition, this.cacheBufferSize);
        if (bytesRead <= 0)
            return -1;
        cacheBuffer.startPos = startPosition;
        cacheBuffer.count = bytesRead;
    }
    minCount = Math.min(count, Math.floor(cacheBuffer.count - __classPrivateFieldGet(this, _ReadableStreamFileReader_position, "f") + cacheBuffer.startPos));
    let cOffset = Math.floor(__classPrivateFieldGet(this, _ReadableStreamFileReader_position, "f") - cacheBuffer.startPos);
    for (let i = 0; i < minCount; i++)
        buffer[offset + i] = cacheBuffer.buffer[cOffset + i];
    __classPrivateFieldSet(this, _ReadableStreamFileReader_position, __classPrivateFieldGet(this, _ReadableStreamFileReader_position, "f") + minCount, "f");
    return minCount;
}, _ReadableStreamFileReader_fillBuffer = 
/**
 * Fills a cache buffer with the decrypted data from the encrypted source file.
 */
async function _ReadableStreamFileReader_fillBuffer(cacheBuffer, startPosition, bufferSize) {
    let bytesRead;
    if (this.threads == 1) {
        if (__classPrivateFieldGet(this, _ReadableStreamFileReader_stream, "f") == null)
            return 0;
        bytesRead = await fillBufferPart(cacheBuffer, startPosition, 0, bufferSize, __classPrivateFieldGet(this, _ReadableStreamFileReader_stream, "f"));
    }
    else {
        bytesRead = await __classPrivateFieldGet(this, _ReadableStreamFileReader_instances, "m", _ReadableStreamFileReader_fillBufferMulti).call(this, cacheBuffer, startPosition, bufferSize);
    }
    return bytesRead;
}, _ReadableStreamFileReader_fillBufferMulti = 
/**
 * Fill the buffer using parallel streams for performance
 */
async function _ReadableStreamFileReader_fillBufferMulti(cacheBuffer, startPosition, bufferSize) {
    let partSize = Math.ceil(bufferSize / this.threads);
    let bytesRead = 0;
    __classPrivateFieldSet(this, _ReadableStreamFileReader_promises, [], "f");
    for (let i = 0; i < this.threads; i++) {
        __classPrivateFieldGet(this, _ReadableStreamFileReader_promises, "f").push(new Promise(async (resolve, reject) => {
            let fileToReadHandle = await this.aesFile.getRealFile().getPath();
            if (typeof process !== 'object') {
                if (__classPrivateFieldGet(this, _ReadableStreamFileReader_workers, "f")[i] == null)
                    __classPrivateFieldGet(this, _ReadableStreamFileReader_workers, "f")[i] = new Worker(this.getWorkerPath(), { type: 'module' });
                __classPrivateFieldGet(this, _ReadableStreamFileReader_workers, "f")[i].addEventListener('message', (event) => {
                    resolve(event.data);
                });
                __classPrivateFieldGet(this, _ReadableStreamFileReader_workers, "f")[i].addEventListener('error', (event) => {
                    reject(event);
                });
            }
            else {
                const { Worker } = await import("worker_threads");
                if (__classPrivateFieldGet(this, _ReadableStreamFileReader_workers, "f")[i] == null)
                    __classPrivateFieldGet(this, _ReadableStreamFileReader_workers, "f")[i] = new Worker(this.getWorkerPath());
                __classPrivateFieldGet(this, _ReadableStreamFileReader_workers, "f")[i].on('message', (event) => {
                    if (event.message == 'complete') {
                        resolve(event);
                    }
                    else if (event.message == 'error') {
                        reject(event);
                    }
                });
                __classPrivateFieldGet(this, _ReadableStreamFileReader_workers, "f")[i].on('error', (event) => {
                    reject(event);
                });
            }
            let start = partSize * i;
            let length;
            if (i == this.threads - 1)
                length = bufferSize - start;
            else
                length = partSize;
            __classPrivateFieldGet(this, _ReadableStreamFileReader_workers, "f")[i].postMessage({
                message: 'start',
                index: i,
                startPosition: startPosition,
                fileToReadHandle: fileToReadHandle,
                readFileClassType: this.aesFile.getRealFile().constructor.name,
                start: start, length: length,
                key: this.aesFile.getEncryptionKey(),
                integrity: this.aesFile.isIntegrityEnabled(),
                hash_key: this.aesFile.getHashKey(),
                chunk_size: this.aesFile.getRequestedChunkSize(),
                cacheBufferSize: this.cacheBufferSize
            });
        }));
    }
    await Promise.all(__classPrivateFieldGet(this, _ReadableStreamFileReader_promises, "f")).then((results) => {
        for (let i = 0; i < results.length; i++) {
            bytesRead += results[i].chunkBytesRead;
            let chunkStart = results[i].start;
            for (let j = 0; j < results[i].chunkBytesRead; j++)
                cacheBuffer.buffer[chunkStart + j] = results[i].cacheBuffer[chunkStart + j];
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
}, _ReadableStreamFileReader_getAvailCacheBuffer = function _ReadableStreamFileReader_getAvailCacheBuffer() {
    if (__classPrivateFieldGet(this, _ReadableStreamFileReader_buffers, "f") == null)
        return null;
    if (__classPrivateFieldGet(this, _ReadableStreamFileReader_lruBuffersIndex, "f").length == this.buffersCount) {
        // getting least recently used buffer
        let index = __classPrivateFieldGet(this, _ReadableStreamFileReader_lruBuffersIndex, "f").pop();
        // promote to the top
        delete __classPrivateFieldGet(this, _ReadableStreamFileReader_lruBuffersIndex, "f")[index];
        __classPrivateFieldGet(this, _ReadableStreamFileReader_lruBuffersIndex, "f").unshift(index);
        return __classPrivateFieldGet(this, _ReadableStreamFileReader_buffers, "f")[__classPrivateFieldGet(this, _ReadableStreamFileReader_lruBuffersIndex, "f").pop()];
    }
    for (let i = 0; i < __classPrivateFieldGet(this, _ReadableStreamFileReader_buffers, "f").length; i++) {
        let buffer = __classPrivateFieldGet(this, _ReadableStreamFileReader_buffers, "f")[i];
        if (buffer && buffer.count == 0) {
            __classPrivateFieldGet(this, _ReadableStreamFileReader_lruBuffersIndex, "f").unshift(i);
            return buffer;
        }
    }
    if (__classPrivateFieldGet(this, _ReadableStreamFileReader_buffers, "f")[__classPrivateFieldGet(this, _ReadableStreamFileReader_buffers, "f").length - 1])
        return __classPrivateFieldGet(this, _ReadableStreamFileReader_buffers, "f")[__classPrivateFieldGet(this, _ReadableStreamFileReader_buffers, "f").length - 1];
    else
        return null;
}, _ReadableStreamFileReader_getCacheBuffer = function _ReadableStreamFileReader_getCacheBuffer(position, count) {
    if (__classPrivateFieldGet(this, _ReadableStreamFileReader_buffers, "f") == null)
        return null;
    for (let i = 0; i < __classPrivateFieldGet(this, _ReadableStreamFileReader_buffers, "f").length; i++) {
        let buffer = __classPrivateFieldGet(this, _ReadableStreamFileReader_buffers, "f")[i];
        if (buffer && position >= buffer.startPos && position + count <= buffer.startPos + buffer.count) {
            // promote buffer to the front
            delete __classPrivateFieldGet(this, _ReadableStreamFileReader_lruBuffersIndex, "f")[i];
            __classPrivateFieldGet(this, _ReadableStreamFileReader_lruBuffersIndex, "f").unshift(i);
            return buffer;
        }
    }
    return null;
}, _ReadableStreamFileReader_clearBuffers = function _ReadableStreamFileReader_clearBuffers() {
    if (__classPrivateFieldGet(this, _ReadableStreamFileReader_buffers, "f") == null)
        return;
    for (let i = 0; i < __classPrivateFieldGet(this, _ReadableStreamFileReader_buffers, "f").length; i++) {
        let buffer = __classPrivateFieldGet(this, _ReadableStreamFileReader_buffers, "f")[i];
        if (buffer)
            buffer.clear();
        __classPrivateFieldGet(this, _ReadableStreamFileReader_buffers, "f")[i] = null;
    }
}, _ReadableStreamFileReader_closeStream = 
/**
 * Close all back streams.
 *
 * @throws IOException Thrown if there is an IO error.
 */
async function _ReadableStreamFileReader_closeStream() {
    if (__classPrivateFieldGet(this, _ReadableStreamFileReader_stream, "f"))
        await __classPrivateFieldGet(this, _ReadableStreamFileReader_stream, "f").close();
    __classPrivateFieldSet(this, _ReadableStreamFileReader_stream, null, "f");
};
