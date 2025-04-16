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
var _ReadableStreamWrapper_instances, _ReadableStreamWrapper_buffers, _ReadableStreamWrapper_stream, _ReadableStreamWrapper_readableStream, _ReadableStreamWrapper_streamPosition, _ReadableStreamWrapper_totalSize, _ReadableStreamWrapper_buffersCount, _ReadableStreamWrapper_bufferSize, _ReadableStreamWrapper_backOffset, _ReadableStreamWrapper_alignSize, _ReadableStreamWrapper_createBuffers, _ReadableStreamWrapper_hasBackoffset, _ReadableStreamWrapper_getAvailCacheBuffer, _ReadableStreamWrapper_getCacheBuffer, _ReadableStreamWrapper_positionStart, _ReadableStreamWrapper_positionEnd, _ReadableStreamWrapper_clearBuffers, _ReadableStreamWrapper_closeStream;
import { SeekOrigin } from "./random_access_stream.js";
import { Buffer } from "./buffer.js";
/**
 * Fills a cache buffer with the decrypted data from a part of an encrypted file.
 * Do not use directly, use ReadableStreamWrapper.create() instead.
 *
 * @param {Buffer} cacheBuffer  The cache buffer that will store the decrypted contents
 * @param {Uint8Array} length   The length of the data requested
 * @param {RandomAccessStream} stream The stream that will be used to read from
 */
export async function fillBufferPart(cacheBuffer, start, offset, length, stream) {
    await stream.seek(start, SeekOrigin.Begin);
    let bytesRead = 0;
    let totalBytesRead = 0;
    while ((bytesRead = await stream.read(cacheBuffer.getData(), offset + totalBytesRead, length - totalBytesRead)) > 0) {
        totalBytesRead += bytesRead;
    }
    return totalBytesRead;
}
/***
 * ReadableStream wrapper for RandomAccessStream.
 * Use this class to wrap any RandomAccessStream to a JavaScript ReadableStream to use with 3rd party libraries.
 */
export class ReadableStreamWrapper {
    constructor() {
        _ReadableStreamWrapper_instances.add(this);
        _ReadableStreamWrapper_buffers.set(this, null);
        _ReadableStreamWrapper_stream.set(this, null);
        _ReadableStreamWrapper_readableStream.set(this, null);
        _ReadableStreamWrapper_streamPosition.set(this, 0);
        _ReadableStreamWrapper_totalSize.set(this, 0);
        _ReadableStreamWrapper_buffersCount.set(this, 0);
        _ReadableStreamWrapper_bufferSize.set(this, 0);
        _ReadableStreamWrapper_backOffset.set(this, 0);
        _ReadableStreamWrapper_alignSize.set(this, 0);
        /**
         * We reuse the least recently used buffer. Since the buffer count is relative
         * small (see {@link #MAX_BUFFERS}) there is no need for a fast-access lru queue
         * so a simple linked list of keeping the indexes is adequately fast.
         */
        this.lruBuffersIndex = [];
        _ReadableStreamWrapper_positionStart.set(this, 0);
        _ReadableStreamWrapper_positionEnd.set(this, 0);
        this.closed = Promise.resolve(undefined);
    }
    setStream(stream) {
        __classPrivateFieldSet(this, _ReadableStreamWrapper_stream, stream, "f");
    }
    getStream() {
        return __classPrivateFieldGet(this, _ReadableStreamWrapper_stream, "f");
    }
    getBackOffset() {
        return __classPrivateFieldGet(this, _ReadableStreamWrapper_backOffset, "f");
    }
    setBackOffset(backOffset) {
        __classPrivateFieldSet(this, _ReadableStreamWrapper_backOffset, backOffset, "f");
    }
    getTotalSize() {
        return __classPrivateFieldGet(this, _ReadableStreamWrapper_totalSize, "f");
    }
    setTotalSize(totalSize) {
        __classPrivateFieldSet(this, _ReadableStreamWrapper_totalSize, totalSize, "f");
    }
    setAlignSize(alignSize) {
        __classPrivateFieldSet(this, _ReadableStreamWrapper_alignSize, alignSize, "f");
    }
    getBufferSize() {
        return __classPrivateFieldGet(this, _ReadableStreamWrapper_bufferSize, "f");
    }
    setBufferSize(bufferSize) {
        __classPrivateFieldSet(this, _ReadableStreamWrapper_bufferSize, bufferSize, "f");
    }
    getBufferCount() {
        return __classPrivateFieldGet(this, _ReadableStreamWrapper_buffersCount, "f");
    }
    setBufferCount(buffersCount) {
        __classPrivateFieldSet(this, _ReadableStreamWrapper_buffersCount, buffersCount, "f");
    }
    /**
     * Creates an ReadableStreamWrapper from a RandomAccessStream.
     * @param {RandomAccessStream | null} stream The stream that you want to wrap.
     */
    static createReadableStream(stream, buffersCount = ReadableStreamWrapper.DEFAULT_BUFFERS, bufferSize = ReadableStreamWrapper.DEFAULT_BUFFER_SIZE, backOffset = ReadableStreamWrapper.DEFAULT_BACK_OFFSET, alignSize = 0) {
        let readableStreamWrapper = new ReadableStreamWrapper();
        __classPrivateFieldSet(readableStreamWrapper, _ReadableStreamWrapper_stream, stream, "f");
        __classPrivateFieldSet(readableStreamWrapper, _ReadableStreamWrapper_buffersCount, buffersCount, "f");
        __classPrivateFieldSet(readableStreamWrapper, _ReadableStreamWrapper_bufferSize, bufferSize, "f");
        __classPrivateFieldSet(readableStreamWrapper, _ReadableStreamWrapper_backOffset, backOffset, "f");
        __classPrivateFieldSet(readableStreamWrapper, _ReadableStreamWrapper_alignSize, alignSize, "f");
        let readableStream = ReadableStreamWrapper.createReadableStreamReader(readableStreamWrapper);
        return readableStream;
    }
    static createReadableStreamReader(streamWrapper) {
        let resetting = false;
        let readableStream = new ReadableStream({
            type: 'bytes',
            async pull(controller) {
                if (resetting) {
                    controller.enqueue(new Uint8Array([0]));
                    return;
                }
                if (__classPrivateFieldGet(streamWrapper, _ReadableStreamWrapper_buffers, "f") == null)
                    await streamWrapper.initialize();
                let size = streamWrapper.getBufferSize();
                let buffer = new Uint8Array(size);
                let bytesRead = await streamWrapper.read(buffer, 0, buffer.length);
                if (bytesRead > 0)
                    controller.enqueue(buffer.slice(0, bytesRead));
                if (bytesRead <= 0) {
                    controller.close();
                }
            },
            async cancel(reason) {
                await streamWrapper.cancel(reason);
            }
        });
        let streamGetReader = readableStream.getReader;
        let reader;
        readableStream.getReader = function (options) {
            reader = streamGetReader.apply(readableStream, options);
            return reader;
        };
        readableStream.reset = async function () {
            // make sure the queue is emptied
            if (reader) {
                resetting = true;
                while (true) {
                    let chunk = await reader.read();
                    if (!chunk || !chunk.value
                        || (chunk.value.length == 1 && chunk.value[0] == 0))
                        break;
                }
                resetting = false;
            }
            await streamWrapper.reset();
        };
        readableStream.skip = async function (position) {
            return await streamWrapper.skip(position);
        };
        readableStream.getPositionStart = function () {
            return streamWrapper.getPositionStart();
        };
        readableStream.setPositionStart = async function (position) {
            await streamWrapper.setPositionStart(position);
        };
        readableStream.setPositionEnd = async function (position) {
            await streamWrapper.setPositionEnd(position);
        };
        __classPrivateFieldSet(streamWrapper, _ReadableStreamWrapper_readableStream, readableStream, "f");
        return readableStream;
    }
    async initialize() {
        if (__classPrivateFieldGet(this, _ReadableStreamWrapper_stream, "f") != null) {
            __classPrivateFieldSet(this, _ReadableStreamWrapper_totalSize, await __classPrivateFieldGet(this, _ReadableStreamWrapper_stream, "f").getLength(), "f");
            try {
                __classPrivateFieldSet(this, _ReadableStreamWrapper_streamPosition, await __classPrivateFieldGet(this, _ReadableStreamWrapper_stream, "f").getPosition(), "f");
            }
            catch (ex) {
                throw new Error("Could not get stream current position: " + ex);
            }
        }
        if (__classPrivateFieldGet(this, _ReadableStreamWrapper_buffersCount, "f") <= 0)
            __classPrivateFieldSet(this, _ReadableStreamWrapper_buffersCount, ReadableStreamWrapper.DEFAULT_BUFFERS, "f");
        if (__classPrivateFieldGet(this, _ReadableStreamWrapper_buffersCount, "f") > ReadableStreamWrapper.MAX_BUFFERS)
            __classPrivateFieldSet(this, _ReadableStreamWrapper_buffersCount, ReadableStreamWrapper.MAX_BUFFERS, "f");
        if (__classPrivateFieldGet(this, _ReadableStreamWrapper_bufferSize, "f") <= 0)
            __classPrivateFieldSet(this, _ReadableStreamWrapper_bufferSize, ReadableStreamWrapper.DEFAULT_BUFFER_SIZE, "f");
        if (__classPrivateFieldGet(this, _ReadableStreamWrapper_backOffset, "f") < 0)
            __classPrivateFieldSet(this, _ReadableStreamWrapper_backOffset, ReadableStreamWrapper.DEFAULT_BACK_OFFSET, "f");
        if (__classPrivateFieldGet(this, _ReadableStreamWrapper_alignSize, "f") <= 0 && __classPrivateFieldGet(this, _ReadableStreamWrapper_stream, "f") != null)
            __classPrivateFieldSet(this, _ReadableStreamWrapper_alignSize, __classPrivateFieldGet(this, _ReadableStreamWrapper_stream, "f").getAlignSize(), "f");
        // align the buffers for performance
        if (__classPrivateFieldGet(this, _ReadableStreamWrapper_alignSize, "f") > 0) {
            if (__classPrivateFieldGet(this, _ReadableStreamWrapper_backOffset, "f") > 0) {
                let nBackOffset = Math.floor(__classPrivateFieldGet(this, _ReadableStreamWrapper_backOffset, "f") / __classPrivateFieldGet(this, _ReadableStreamWrapper_alignSize, "f")) * __classPrivateFieldGet(this, _ReadableStreamWrapper_alignSize, "f");
                if (nBackOffset < __classPrivateFieldGet(this, _ReadableStreamWrapper_backOffset, "f"))
                    nBackOffset += __classPrivateFieldGet(this, _ReadableStreamWrapper_alignSize, "f");
                __classPrivateFieldSet(this, _ReadableStreamWrapper_backOffset, nBackOffset, "f");
            }
            let nBufferSize = Math.floor(__classPrivateFieldGet(this, _ReadableStreamWrapper_bufferSize, "f") / __classPrivateFieldGet(this, _ReadableStreamWrapper_alignSize, "f")) * __classPrivateFieldGet(this, _ReadableStreamWrapper_alignSize, "f");
            if (nBufferSize < __classPrivateFieldGet(this, _ReadableStreamWrapper_alignSize, "f")) {
                nBufferSize = __classPrivateFieldGet(this, _ReadableStreamWrapper_alignSize, "f");
            }
            if (nBufferSize < __classPrivateFieldGet(this, _ReadableStreamWrapper_bufferSize, "f")) {
                nBufferSize += __classPrivateFieldGet(this, _ReadableStreamWrapper_alignSize, "f");
            }
            __classPrivateFieldSet(this, _ReadableStreamWrapper_bufferSize, nBufferSize, "f");
        }
        if (__classPrivateFieldGet(this, _ReadableStreamWrapper_backOffset, "f") > 0) {
            __classPrivateFieldSet(this, _ReadableStreamWrapper_bufferSize, __classPrivateFieldGet(this, _ReadableStreamWrapper_bufferSize, "f") + __classPrivateFieldGet(this, _ReadableStreamWrapper_backOffset, "f"), "f");
            // we use a minimum 2 buffers since it is very likely
            // that the previous buffer in use will have the backoffset
            // data of the new one
            if (__classPrivateFieldGet(this, _ReadableStreamWrapper_buffersCount, "f") == 1)
                __classPrivateFieldSet(this, _ReadableStreamWrapper_buffersCount, 2, "f");
        }
        __classPrivateFieldSet(this, _ReadableStreamWrapper_positionStart, 0, "f");
        __classPrivateFieldSet(this, _ReadableStreamWrapper_positionEnd, __classPrivateFieldGet(this, _ReadableStreamWrapper_totalSize, "f") - 1, "f");
        __classPrivateFieldGet(this, _ReadableStreamWrapper_instances, "m", _ReadableStreamWrapper_createBuffers).call(this);
    }
    /**
     * Skip a number of bytes.
     *
     * @param {number} bytes the number of bytes to be skipped.
     * @returns {Promise<number>} The new position
     */
    async skip(bytes) {
        if (__classPrivateFieldGet(this, _ReadableStreamWrapper_buffers, "f") == null)
            await this.initialize();
        bytes += __classPrivateFieldGet(this, _ReadableStreamWrapper_positionStart, "f");
        let currPos = __classPrivateFieldGet(this, _ReadableStreamWrapper_streamPosition, "f");
        if (__classPrivateFieldGet(this, _ReadableStreamWrapper_streamPosition, "f") + bytes > __classPrivateFieldGet(this, _ReadableStreamWrapper_totalSize, "f"))
            __classPrivateFieldSet(this, _ReadableStreamWrapper_streamPosition, __classPrivateFieldGet(this, _ReadableStreamWrapper_totalSize, "f"), "f");
        else
            __classPrivateFieldSet(this, _ReadableStreamWrapper_streamPosition, __classPrivateFieldGet(this, _ReadableStreamWrapper_streamPosition, "f") + bytes, "f");
        return __classPrivateFieldGet(this, _ReadableStreamWrapper_streamPosition, "f") - currPos;
    }
    /**
     * Reset the stream
     */
    reset() {
        __classPrivateFieldSet(this, _ReadableStreamWrapper_streamPosition, 0, "f");
    }
    /**
     * Reads and decrypts the contents of an encrypted file
     */
    async read(buffer, offset, count) {
        if (__classPrivateFieldGet(this, _ReadableStreamWrapper_buffers, "f") == null)
            await this.initialize();
        if (__classPrivateFieldGet(this, _ReadableStreamWrapper_streamPosition, "f") >= __classPrivateFieldGet(this, _ReadableStreamWrapper_positionEnd, "f") + 1)
            return -1;
        let minCount;
        let bytesRead;
        // truncate the count so getCacheBuffer() reports the correct buffer
        count = Math.floor(Math.min(count, __classPrivateFieldGet(this, _ReadableStreamWrapper_totalSize, "f") - __classPrivateFieldGet(this, _ReadableStreamWrapper_streamPosition, "f")));
        let cacheBuffer = __classPrivateFieldGet(this, _ReadableStreamWrapper_instances, "m", _ReadableStreamWrapper_getCacheBuffer).call(this, __classPrivateFieldGet(this, _ReadableStreamWrapper_streamPosition, "f"), count);
        if (cacheBuffer == null) {
            cacheBuffer = __classPrivateFieldGet(this, _ReadableStreamWrapper_instances, "m", _ReadableStreamWrapper_getAvailCacheBuffer).call(this);
            // the stream is closed
            if (cacheBuffer == null)
                return 0;
            // for some applications like media players they make a second immediate request
            // in a position a few bytes before the first request. To make
            // sure we don't make 2 overlapping requests we start the buffer
            // a position ahead of the first request.
            let startPosition = __classPrivateFieldGet(this, _ReadableStreamWrapper_streamPosition, "f");
            if (__classPrivateFieldGet(this, _ReadableStreamWrapper_alignSize, "f") > 0) {
                startPosition = Math.floor(startPosition / __classPrivateFieldGet(this, _ReadableStreamWrapper_alignSize, "f")) * __classPrivateFieldGet(this, _ReadableStreamWrapper_alignSize, "f");
            }
            let length = __classPrivateFieldGet(this, _ReadableStreamWrapper_bufferSize, "f");
            // if we have the backoffset data in an existing buffer we don't include the backoffset
            // in the new request because we want to prevent network streams resetting.
            if (startPosition > 0 && !__classPrivateFieldGet(this, _ReadableStreamWrapper_instances, "m", _ReadableStreamWrapper_hasBackoffset).call(this, startPosition)) {
                startPosition -= __classPrivateFieldGet(this, _ReadableStreamWrapper_backOffset, "f");
            }
            else {
                length -= __classPrivateFieldGet(this, _ReadableStreamWrapper_backOffset, "f");
            }
            bytesRead = await this.fillBuffer(cacheBuffer, startPosition, length);
            if (bytesRead <= 0)
                return bytesRead;
            cacheBuffer.setStartPos(startPosition);
            cacheBuffer.setCount(bytesRead);
        }
        minCount = Math.min(count, Math.floor(cacheBuffer.getCount() - __classPrivateFieldGet(this, _ReadableStreamWrapper_streamPosition, "f") + cacheBuffer.getStartPos()));
        let cOffset = Math.floor(__classPrivateFieldGet(this, _ReadableStreamWrapper_streamPosition, "f") - cacheBuffer.getStartPos());
        for (let i = 0; i < minCount; i++)
            buffer[offset + i] = cacheBuffer.getData()[cOffset + i];
        __classPrivateFieldSet(this, _ReadableStreamWrapper_streamPosition, __classPrivateFieldGet(this, _ReadableStreamWrapper_streamPosition, "f") + minCount, "f");
        return minCount;
    }
    /**
     * Fills a cache buffer with the decrypted data from the encrypted source file.
     * @param { Buffer } cacheBuffer The cache buffer that will store the decrypted contents
     * @param { number } startPosition The start position
     * @param { number } length      The length of the data requested
     */
    async fillBuffer(cacheBuffer, startPosition, length) {
        let bytesRead;
        if (__classPrivateFieldGet(this, _ReadableStreamWrapper_stream, "f") == null)
            return 0;
        bytesRead = await fillBufferPart(cacheBuffer, startPosition, 0, length, __classPrivateFieldGet(this, _ReadableStreamWrapper_stream, "f"));
        return bytesRead;
    }
    /**
     * Get the start position of the stream
     * @returns {number} The start position of the stream
     */
    getPositionStart() {
        return __classPrivateFieldGet(this, _ReadableStreamWrapper_positionStart, "f");
    }
    /**
     * Set the start position of the stream.
     * @param {number} pos The start position
     */
    async setPositionStart(pos) {
        if (__classPrivateFieldGet(this, _ReadableStreamWrapper_buffers, "f") == null)
            await this.initialize();
        __classPrivateFieldSet(this, _ReadableStreamWrapper_positionStart, pos, "f");
    }
    /**
     * Set the end position of the stream
     * @param {number} pos The end position of the stream
     */
    async setPositionEnd(pos) {
        if (__classPrivateFieldGet(this, _ReadableStreamWrapper_buffers, "f") == null)
            await this.initialize();
        __classPrivateFieldSet(this, _ReadableStreamWrapper_positionEnd, pos, "f");
    }
    /**
     * Cancel the stream
     * @param {any} [reason] The reason
     */
    async cancel(reason) {
        await __classPrivateFieldGet(this, _ReadableStreamWrapper_instances, "m", _ReadableStreamWrapper_closeStream).call(this);
        __classPrivateFieldGet(this, _ReadableStreamWrapper_instances, "m", _ReadableStreamWrapper_clearBuffers).call(this);
    }
}
_ReadableStreamWrapper_buffers = new WeakMap(), _ReadableStreamWrapper_stream = new WeakMap(), _ReadableStreamWrapper_readableStream = new WeakMap(), _ReadableStreamWrapper_streamPosition = new WeakMap(), _ReadableStreamWrapper_totalSize = new WeakMap(), _ReadableStreamWrapper_buffersCount = new WeakMap(), _ReadableStreamWrapper_bufferSize = new WeakMap(), _ReadableStreamWrapper_backOffset = new WeakMap(), _ReadableStreamWrapper_alignSize = new WeakMap(), _ReadableStreamWrapper_positionStart = new WeakMap(), _ReadableStreamWrapper_positionEnd = new WeakMap(), _ReadableStreamWrapper_instances = new WeakSet(), _ReadableStreamWrapper_createBuffers = function _ReadableStreamWrapper_createBuffers() {
    __classPrivateFieldSet(this, _ReadableStreamWrapper_buffers, new Array(__classPrivateFieldGet(this, _ReadableStreamWrapper_buffersCount, "f")), "f");
    for (let i = 0; i < __classPrivateFieldGet(this, _ReadableStreamWrapper_buffers, "f").length; i++)
        __classPrivateFieldGet(this, _ReadableStreamWrapper_buffers, "f")[i] = new Buffer(__classPrivateFieldGet(this, _ReadableStreamWrapper_bufferSize, "f"));
}, _ReadableStreamWrapper_hasBackoffset = function _ReadableStreamWrapper_hasBackoffset(startPosition) {
    let pos = startPosition - __classPrivateFieldGet(this, _ReadableStreamWrapper_backOffset, "f");
    if (__classPrivateFieldGet(this, _ReadableStreamWrapper_buffers, "f") == null)
        throw new Error("Buffers are not initialized");
    for (let i = 0; i < __classPrivateFieldGet(this, _ReadableStreamWrapper_buffers, "f").length; i++) {
        let buffer = __classPrivateFieldGet(this, _ReadableStreamWrapper_buffers, "f")[i];
        if (buffer != null && buffer.getCount() > 0
            && buffer.getStartPos() <= pos
            && startPosition <= buffer.getStartPos() + buffer.getCount()) {
            return true;
        }
    }
    return false;
}, _ReadableStreamWrapper_getAvailCacheBuffer = function _ReadableStreamWrapper_getAvailCacheBuffer() {
    if (__classPrivateFieldGet(this, _ReadableStreamWrapper_buffers, "f") == null)
        throw new Error("No buffers found");
    let index = -1;
    if (this.lruBuffersIndex.length == __classPrivateFieldGet(this, _ReadableStreamWrapper_buffersCount, "f")) {
        index = this.lruBuffersIndex[this.lruBuffersIndex.length - 1];
        this.lruBuffersIndex.pop();
    }
    else {
        for (let i = 0; i < __classPrivateFieldGet(this, _ReadableStreamWrapper_buffers, "f").length; i++) {
            let buff = __classPrivateFieldGet(this, _ReadableStreamWrapper_buffers, "f")[i];
            if (buff && buff.getCount() == 0) {
                index = i;
                break;
            }
        }
    }
    if (index < 0)
        index = __classPrivateFieldGet(this, _ReadableStreamWrapper_buffers, "f").length - 1;
    this.lruBuffersIndex.unshift(index);
    return __classPrivateFieldGet(this, _ReadableStreamWrapper_buffers, "f")[index];
}, _ReadableStreamWrapper_getCacheBuffer = function _ReadableStreamWrapper_getCacheBuffer(position, count) {
    if (__classPrivateFieldGet(this, _ReadableStreamWrapper_buffers, "f") == null)
        return null;
    for (let i = 0; i < __classPrivateFieldGet(this, _ReadableStreamWrapper_buffers, "f").length; i++) {
        let buffer = __classPrivateFieldGet(this, _ReadableStreamWrapper_buffers, "f")[i];
        if (buffer && position >= buffer.getStartPos() && position + count <= buffer.getStartPos() + buffer.getCount()) {
            // promote buffer to the front
            let index = -1;
            for (let k = 0; k < this.lruBuffersIndex.length; k++) {
                if (this.lruBuffersIndex[k] == i) {
                    index = k;
                    break;
                }
            }
            if (index >= 0)
                this.lruBuffersIndex.splice(index, 1);
            this.lruBuffersIndex.unshift(i);
            return buffer;
        }
    }
    return null;
}, _ReadableStreamWrapper_clearBuffers = function _ReadableStreamWrapper_clearBuffers() {
    if (__classPrivateFieldGet(this, _ReadableStreamWrapper_buffers, "f") == null)
        return;
    for (let i = 0; i < __classPrivateFieldGet(this, _ReadableStreamWrapper_buffers, "f").length; i++) {
        let buffer = __classPrivateFieldGet(this, _ReadableStreamWrapper_buffers, "f")[i];
        if (buffer)
            buffer.clear();
        __classPrivateFieldGet(this, _ReadableStreamWrapper_buffers, "f")[i] = null;
    }
}, _ReadableStreamWrapper_closeStream = 
/**
 * Close all back streams.
 *
 * @throws IOException Thrown if there is an IO error.
 */
async function _ReadableStreamWrapper_closeStream() {
    if (__classPrivateFieldGet(this, _ReadableStreamWrapper_stream, "f"))
        await __classPrivateFieldGet(this, _ReadableStreamWrapper_stream, "f").close();
    __classPrivateFieldSet(this, _ReadableStreamWrapper_stream, null, "f");
};
// Default cache buffer should be high enough for some mpeg videos to work
// the cache buffers should be aligned to the SalmonFile chunk size for efficiency
ReadableStreamWrapper.DEFAULT_BUFFER_SIZE = 512 * 1024;
/**
 * The default buffer count
 */
ReadableStreamWrapper.DEFAULT_BUFFERS = 1;
/**
 * The default backwards buffer offset
 */
ReadableStreamWrapper.DEFAULT_BACK_OFFSET = 32768;
/**
 * The maximum allowed buffer count
 */
ReadableStreamWrapper.MAX_BUFFERS = 6;
