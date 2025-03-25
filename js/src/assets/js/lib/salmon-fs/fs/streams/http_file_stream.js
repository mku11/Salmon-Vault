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
var _HttpFileStream_instances, _a, _HttpFileStream_position, _HttpFileStream_end_position, _HttpFileStream_buffer, _HttpFileStream_bufferPosition, _HttpFileStream_stream, _HttpFileStream_reader, _HttpFileStream_closed, _HttpFileStream_getStream, _HttpFileStream_getReader, _HttpFileStream_checkStatus, _HttpFileStream_setDefaultHeaders;
import { IOException } from "../../../salmon-core/streams/io_exception.js";
import { RandomAccessStream, SeekOrigin } from "../../../salmon-core/streams/random_access_stream.js";
/**
 * An advanced file stream implementation for remote HTTP files.
 * This class can be used for random file access of remote files.
 */
export class HttpFileStream extends RandomAccessStream {
    /**
     * Construct a file stream from an HttpFile.
     * This will create a wrapper stream that will route read() and write() to the FileChannel
     *
     * @param {IFile} file The HttpFile that will be used to get the read/write stream
     * @param {string} mode The mode "r" for read "rw" for write
     */
    constructor(file, mode) {
        super();
        _HttpFileStream_instances.add(this);
        _HttpFileStream_position.set(this, 0);
        _HttpFileStream_end_position.set(this, 0);
        // fetch will response will download the whole contents internally
        // so we use our own "chunked" implementation with our own buffer
        _HttpFileStream_buffer.set(this, null);
        _HttpFileStream_bufferPosition.set(this, 0);
        _HttpFileStream_stream.set(this, null);
        _HttpFileStream_reader.set(this, null);
        _HttpFileStream_closed.set(this, false);
        this.file = file;
        if (mode == "rw") {
            throw new Error("Unsupported Operation, readonly filesystem");
        }
    }
    /**
     * True if stream can read from file.
     * @returns {Promise<boolean>} True if it can read.
     */
    async canRead() {
        return true;
    }
    /**
     * True if stream can write to file.
     * @returns {Promise<boolean>} True if it can write
     */
    async canWrite() {
        return false;
    }
    /**
     * True if stream can seek.
     * @returns {Promise<boolean>} True if it can seek
     */
    async canSeek() {
        return true;
    }
    /**
     * Get the length of the stream. This is the same as the backed file.
     * @returns {Promise<number>} The length
     */
    async getLength() {
        return await this.file.getLength();
    }
    /**
     * Get the current position of the stream.
     * @returns {Promise<number>} The position
     * @throws IOException Thrown if there is an IO error.
     */
    async getPosition() {
        return __classPrivateFieldGet(this, _HttpFileStream_position, "f");
    }
    /**
     * Set the current position of the stream.
     * @param {number} value The new position.
     * @throws IOException Thrown if there is an IO error.
     */
    async setPosition(value) {
        if (__classPrivateFieldGet(this, _HttpFileStream_position, "f") != value)
            await this.reset();
        __classPrivateFieldSet(this, _HttpFileStream_position, value, "f");
    }
    /**
     * Set the length of the stream. This is applicable for write streams only.
     * @param {number} value The new length.
     * @throws IOException Thrown if there is an IO error.
     */
    async setLength(value) {
        throw new Error("Unsupported Operation, readonly filesystem");
    }
    /**
     * Read data from the file stream into the buffer provided.
     * @param {Uint8Array} buffer The buffer to write the data.
     * @param {number} offset The offset of the buffer to start writing the data.
     * @param {number} count The maximum number of bytes to read from.
     * @returns {Promise<number>} The number of bytes read
     * @throws IOException Thrown if there is an IO error.
     */
    async read(buffer, offset, count) {
        var _b, _c;
        let bytesRead = 0;
        if (__classPrivateFieldGet(this, _HttpFileStream_buffer, "f") && __classPrivateFieldGet(this, _HttpFileStream_bufferPosition, "f") < __classPrivateFieldGet(this, _HttpFileStream_buffer, "f").length) {
            for (; __classPrivateFieldGet(this, _HttpFileStream_bufferPosition, "f") < __classPrivateFieldGet(this, _HttpFileStream_buffer, "f").length;) {
                buffer[offset + bytesRead++] = __classPrivateFieldGet(this, _HttpFileStream_buffer, "f")[__classPrivateFieldSet(this, _HttpFileStream_bufferPosition, (_c = __classPrivateFieldGet(this, _HttpFileStream_bufferPosition, "f"), _b = _c++, _c), "f"), _b];
                if (bytesRead == count)
                    break;
            }
            __classPrivateFieldSet(this, _HttpFileStream_position, __classPrivateFieldGet(this, _HttpFileStream_position, "f") + bytesRead, "f");
        }
        if (bytesRead < count && __classPrivateFieldGet(this, _HttpFileStream_position, "f") == __classPrivateFieldGet(this, _HttpFileStream_end_position, "f") + 1 && __classPrivateFieldGet(this, _HttpFileStream_position, "f") < await this.file.getLength()) {
            await this.reset();
        }
        let reader = await __classPrivateFieldGet(this, _HttpFileStream_instances, "m", _HttpFileStream_getReader).call(this);
        let res = null;
        while (bytesRead < count) {
            res = await reader.read();
            if (res.value !== undefined) {
                let i = 0;
                let len = Math.min(res.value.length, count - bytesRead);
                for (; i < len; i++) {
                    buffer[offset + bytesRead++] = res.value[i];
                }
                __classPrivateFieldSet(this, _HttpFileStream_position, __classPrivateFieldGet(this, _HttpFileStream_position, "f") + len, "f");
                if (count == bytesRead) {
                    __classPrivateFieldSet(this, _HttpFileStream_buffer, res.value, "f");
                    __classPrivateFieldSet(this, _HttpFileStream_bufferPosition, i, "f");
                }
            }
            else {
                break;
            }
        }
        return bytesRead;
    }
    /**
     * Write the data from the buffer provided into the stream.
     * @param {Uint8Array} buffer The buffer to read the data from.
     * @param {number} offset The offset of the buffer to start reading the data.
     * @param {number} count The maximum number of bytes to read from the buffer.
     * @throws IOException Thrown if there is an IO error.
     */
    async write(buffer, offset, count) {
        throw new Error("Unsupported Operation, readonly filesystem");
    }
    /**
     * Seek to the offset provided.
     * @param {number} offset The position to seek to.
     * @param {SeekOrigin} origin The type of origin {@link SeekOrigin}
     * @returns {Promise<number>} The new position after seeking.
     * @throws IOException Thrown if there is an IO error.
     */
    async seek(offset, origin) {
        let pos = __classPrivateFieldGet(this, _HttpFileStream_position, "f");
        if (origin == SeekOrigin.Begin)
            pos = offset;
        else if (origin == SeekOrigin.Current)
            pos += offset;
        else if (origin == SeekOrigin.End)
            pos = await this.file.getLength() - offset;
        await this.setPosition(pos);
        return __classPrivateFieldGet(this, _HttpFileStream_position, "f");
    }
    /**
     * Flush the buffers to the associated file.
     */
    flush() {
        throw new Error("Unsupported Operation, readonly filesystem");
    }
    /**
     * Close this stream and associated resources.
     * @throws IOException Thrown if there is an IO error.
     */
    async close() {
        await this.reset();
        __classPrivateFieldSet(this, _HttpFileStream_closed, true, "f");
    }
    /**
     * Reset the stream.
     */
    async reset() {
        var _b;
        if (__classPrivateFieldGet(this, _HttpFileStream_reader, "f")) {
            if ((_b = __classPrivateFieldGet(this, _HttpFileStream_stream, "f")) === null || _b === void 0 ? void 0 : _b.locked)
                __classPrivateFieldGet(this, _HttpFileStream_reader, "f").releaseLock();
        }
        __classPrivateFieldSet(this, _HttpFileStream_reader, null, "f");
        if (__classPrivateFieldGet(this, _HttpFileStream_stream, "f"))
            await __classPrivateFieldGet(this, _HttpFileStream_stream, "f").cancel();
        __classPrivateFieldSet(this, _HttpFileStream_stream, null, "f");
        __classPrivateFieldSet(this, _HttpFileStream_buffer, null, "f");
        __classPrivateFieldSet(this, _HttpFileStream_bufferPosition, 0, "f");
    }
}
_a = HttpFileStream, _HttpFileStream_position = new WeakMap(), _HttpFileStream_end_position = new WeakMap(), _HttpFileStream_buffer = new WeakMap(), _HttpFileStream_bufferPosition = new WeakMap(), _HttpFileStream_stream = new WeakMap(), _HttpFileStream_reader = new WeakMap(), _HttpFileStream_closed = new WeakMap(), _HttpFileStream_instances = new WeakSet(), _HttpFileStream_getStream = async function _HttpFileStream_getStream() {
    if (__classPrivateFieldGet(this, _HttpFileStream_closed, "f"))
        throw new IOException("Stream is closed");
    if (__classPrivateFieldGet(this, _HttpFileStream_stream, "f") == null) {
        let headers = new Headers();
        __classPrivateFieldGet(this, _HttpFileStream_instances, "m", _HttpFileStream_setDefaultHeaders).call(this, headers);
        let end = await this.getLength() - 1;
        let requestLength = _a.MAX_LEN_PER_REQUEST;
        if (end == -1 || end >= __classPrivateFieldGet(this, _HttpFileStream_position, "f") + requestLength) {
            end = __classPrivateFieldGet(this, _HttpFileStream_position, "f") + requestLength - 1;
        }
        // fetch will read the whole content without streaming
        // so we want to specify the end if it's a range request
        // or it's a full request but we don't know the end
        if (__classPrivateFieldGet(this, _HttpFileStream_position, "f") > 0 || end == _a.MAX_LEN_PER_REQUEST - 1)
            headers.append("Range", "bytes=" + __classPrivateFieldGet(this, _HttpFileStream_position, "f") + "-" + end);
        let httpResponse = await fetch(this.file.getPath(), { cache: "no-store", keepalive: true, headers: headers });
        await __classPrivateFieldGet(this, _HttpFileStream_instances, "m", _HttpFileStream_checkStatus).call(this, httpResponse, new Set([200, 206]));
        __classPrivateFieldSet(this, _HttpFileStream_stream, httpResponse.body, "f");
        __classPrivateFieldSet(this, _HttpFileStream_end_position, end, "f");
    }
    if (__classPrivateFieldGet(this, _HttpFileStream_stream, "f") == null)
        throw new IOException("Could not retrieve stream");
    return __classPrivateFieldGet(this, _HttpFileStream_stream, "f");
}, _HttpFileStream_getReader = async function _HttpFileStream_getReader() {
    if (__classPrivateFieldGet(this, _HttpFileStream_reader, "f") == null) {
        __classPrivateFieldSet(this, _HttpFileStream_reader, (await __classPrivateFieldGet(this, _HttpFileStream_instances, "m", _HttpFileStream_getStream).call(this)).getReader(), "f");
    }
    return __classPrivateFieldGet(this, _HttpFileStream_reader, "f");
}, _HttpFileStream_checkStatus = async function _HttpFileStream_checkStatus(httpResponse, status) {
    if (!status.has(httpResponse.status)) {
        throw new IOException(httpResponse.status
            + " " + httpResponse.statusText);
    }
}, _HttpFileStream_setDefaultHeaders = function _HttpFileStream_setDefaultHeaders(headers) {
    headers.append("Cache", "no-store");
    headers.append("Connection", "keep-alive");
};
HttpFileStream.MAX_LEN_PER_REQUEST = 8 * 1024 * 1024;
