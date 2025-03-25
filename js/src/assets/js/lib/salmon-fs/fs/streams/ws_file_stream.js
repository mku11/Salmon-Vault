/*
MIT License

Copyright (c) 2025 Max Kas

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
var _WSFileStream_instances, _a, _WSFileStream_PATH, _WSFileStream_POSITION, _WSFileStream_LENGTH, _WSFileStream_canWrite, _WSFileStream_getWriter, _WSFileStream_setServiceAuth, _WSFileStream_checkStatus, _WSFileStream_setDefaultHeaders;
import { IOException } from "../../../salmon-core/streams/io_exception.js";
import { Base64 } from '../../../salmon-core/convert/base64.js';
import { MemoryStream } from '../../../salmon-core/streams/memory_stream.js';
import { RandomAccessStream, SeekOrigin } from "../../../salmon-core/streams/random_access_stream.js";
/**
 * File stream implementation for Web Service files.
 * This class can be used for random file access of remote files.
 */
export class WSFileStream extends RandomAccessStream {
    /**
     * Construct a file stream from an WSFile.
     * This will create a wrapper stream that will route read() and write() to the FileChannel
     *
     * @param {WSFile} file The WSFile that will be used to get the read/write stream
     * @param {string} mode The mode "r" for read "rw" for write
     */
    constructor(file, mode) {
        super();
        _WSFileStream_instances.add(this);
        _WSFileStream_canWrite.set(this, false);
        this.position = 0;
        this.end_position = 0;
        this.buffer = null;
        this.bufferPosition = 0;
        this.readStream = null;
        this.writeStream = null;
        this.reader = null;
        this.writer = null;
        this.closed = false;
        this.file = file;
        __classPrivateFieldSet(this, _WSFileStream_canWrite, mode == "rw", "f");
    }
    async getInputStream() {
        if (this.closed)
            throw new IOException("Stream is closed");
        if (this.readStream == null) {
            let headers = new Headers();
            __classPrivateFieldGet(this, _WSFileStream_instances, "m", _WSFileStream_setDefaultHeaders).call(this, headers);
            __classPrivateFieldGet(this, _WSFileStream_instances, "m", _WSFileStream_setServiceAuth).call(this, headers);
            let end = await this.getLength() - 1;
            if (end >= this.position + _a.MAX_LEN_PER_REQUEST) {
                end = this.position + _a.MAX_LEN_PER_REQUEST - 1;
            }
            let httpResponse = null;
            httpResponse = await fetch(this.file.getServicePath() + "/api/get"
                + "?" + __classPrivateFieldGet(_a, _a, "f", _WSFileStream_PATH) + "=" + encodeURIComponent(this.file.getPath())
                + "&" + __classPrivateFieldGet(_a, _a, "f", _WSFileStream_POSITION) + "=" + this.position.toString(), { method: 'GET', keepalive: true, headers: headers });
            await __classPrivateFieldGet(this, _WSFileStream_instances, "m", _WSFileStream_checkStatus).call(this, httpResponse, this.position > 0 ? 206 : 200);
            this.readStream = httpResponse.body;
            this.end_position = end;
        }
        if (this.readStream == null)
            throw new IOException("Could not retrieve stream");
        return this.readStream;
    }
    async getReader() {
        if (this.reader == null) {
            this.reader = (await this.getInputStream()).getReader();
        }
        return this.reader;
    }
    async getOutputStream() {
        if (this.closed)
            throw new IOException("Stream is closed");
        if (this.writeStream == null) {
            let startPosition = await this.getPosition();
            const boundary = "*******";
            let header = "--" + boundary + "\r\n";
            header += "Content-Disposition: form-data; name=\"file\"; filename=\"" + this.file.getName() + "\"\r\n";
            header += "\r\n";
            let headerData = new TextEncoder().encode(header);
            let footer = "\r\n--" + boundary + "--";
            let footerData = new TextEncoder().encode(footer);
            // the new js stream API with HTTP2 doesn't seem very reliable 
            // especially when we use a ReadableStream with push controller
            // so we manually chunk it to blobs	
            let body = new MemoryStream();
            await body.write(headerData, 0, headerData.length);
            let sstream = this;
            async function send() {
                await body.write(footerData, 0, footerData.length);
                let headers = new Headers();
                __classPrivateFieldGet(sstream, _WSFileStream_instances, "m", _WSFileStream_setDefaultHeaders).call(sstream, headers);
                headers.append("Content-Type", "multipart/form-data;boundary=" + boundary);
                __classPrivateFieldGet(sstream, _WSFileStream_instances, "m", _WSFileStream_setServiceAuth).call(sstream, headers);
                let httpResponse = null;
                let data = body.toArray();
                httpResponse = await fetch(sstream.file.getServicePath() + "/api/upload"
                    + "?" + __classPrivateFieldGet(_a, _a, "f", _WSFileStream_PATH) + "=" + encodeURIComponent(sstream.file.getPath())
                    + "&" + __classPrivateFieldGet(_a, _a, "f", _WSFileStream_POSITION) + "=" + startPosition.toString(), { method: 'POST', body: new Blob([data]), headers: headers });
                await __classPrivateFieldGet(sstream, _WSFileStream_instances, "m", _WSFileStream_checkStatus).call(sstream, httpResponse, startPosition > 0 ? 206 : 200);
                body = new MemoryStream();
                await body.write(headerData, 0, headerData.length);
                startPosition += data.length - headerData.length - footerData.length;
            }
            this.writeStream = new WritableStream({
                async write(data) {
                    await body.write(data, 0, data.length);
                    if (await body.getLength() - headerData.length >= _a.MAX_LEN_PER_REQUEST) {
                        await send();
                    }
                },
                abort() {
                },
                async close() {
                    if (await body.getLength() - headerData.length > 0) {
                        await send();
                    }
                }
            });
        }
        if (this.writeStream == null)
            throw new IOException("Could not retrieve stream");
        return this.writeStream;
    }
    /**
     * True if stream can read from file.
     * @returns {Promise<boolean>} True if it can read
     */
    async canRead() {
        return !__classPrivateFieldGet(this, _WSFileStream_canWrite, "f");
        ;
    }
    /**
     * True if stream can write to file.
     * @returns {Promise<boolean>} True if it can write
     */
    async canWrite() {
        return __classPrivateFieldGet(this, _WSFileStream_canWrite, "f");
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
        return this.position;
    }
    /**
     * Set the current position of the stream.
     * @param {number} value The new position.
     * @throws IOException Thrown if there is an IO error.
     */
    async setPosition(value) {
        if (this.position != value)
            await this.reset();
        this.position = value;
    }
    /**
     * Set the length of the stream. This is applicable for write streams only.
     * @param {number} value The new length.
     * @throws IOException Thrown if there is an IO error.
     */
    async setLength(value) {
        let headers = new Headers();
        __classPrivateFieldGet(this, _WSFileStream_instances, "m", _WSFileStream_setDefaultHeaders).call(this, headers);
        __classPrivateFieldGet(this, _WSFileStream_instances, "m", _WSFileStream_setServiceAuth).call(this, headers);
        let params = new URLSearchParams();
        params.append(__classPrivateFieldGet(_a, _a, "f", _WSFileStream_PATH), this.file.getPath());
        params.append(__classPrivateFieldGet(_a, _a, "f", _WSFileStream_LENGTH), value.toString());
        let httpResponse = null;
        httpResponse = await fetch(this.file.getServicePath() + "/api/setLength", { method: 'PUT', keepalive: true, body: params, headers: headers });
        await __classPrivateFieldGet(this, _WSFileStream_instances, "m", _WSFileStream_checkStatus).call(this, httpResponse, 200);
        await this.reset();
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
        let bytesRead = 0;
        if (this.buffer && this.bufferPosition < this.buffer.length) {
            for (; this.bufferPosition < this.buffer.length;) {
                buffer[offset + bytesRead++] = this.buffer[this.bufferPosition++];
                if (bytesRead == count)
                    break;
            }
            this.position += bytesRead;
        }
        if (bytesRead < count && this.position == this.end_position + 1 && this.position < await this.file.getLength()) {
            await this.reset();
        }
        let reader = await this.getReader();
        let res = null;
        while (bytesRead < count) {
            res = await reader.read();
            if (res.value !== undefined) {
                let i = 0;
                let len = Math.min(res.value.length, count - bytesRead);
                for (; i < len; i++) {
                    buffer[offset + bytesRead++] = res.value[i];
                }
                this.position += len;
                if (count == bytesRead) {
                    this.buffer = res.value;
                    this.bufferPosition = i;
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
        let writer = await __classPrivateFieldGet(this, _WSFileStream_instances, "m", _WSFileStream_getWriter).call(this);
        await writer.write(buffer.slice(offset, offset + count));
        this.position += Math.min(buffer.length, count);
    }
    /**
     * Seek to the offset provided.
     * @param {number} offset The position to seek to.
     * @param {SeekOrigin} origin The type of origin {@link SeekOrigin}
     * @returns {Promise<number>} The new position after seeking.
     * @throws IOException Thrown if there is an IO error.
     */
    async seek(offset, origin) {
        let pos = this.position;
        if (origin == SeekOrigin.Begin)
            pos = offset;
        else if (origin == SeekOrigin.Current)
            pos += offset;
        else if (origin == SeekOrigin.End)
            pos = await this.file.getLength() - offset;
        await this.setPosition(pos);
        return this.position;
    }
    /**
     * Flush the buffers to the associated file.
     */
    async flush() {
    }
    /**
     * Close this stream and associated resources.
     * @throws IOException Thrown if there is an IO error.
     */
    async close() {
        await this.reset();
        this.closed = true;
    }
    /**
     * Reset the stream
     */
    async reset() {
        var _b, _c;
        if (this.reader) {
            if ((_b = this.readStream) === null || _b === void 0 ? void 0 : _b.locked)
                this.reader.releaseLock();
        }
        this.reader = null;
        if (this.readStream)
            await this.readStream.cancel();
        this.readStream = null;
        if (this.writer) {
            if ((_c = this.writeStream) === null || _c === void 0 ? void 0 : _c.locked)
                this.writer.releaseLock();
        }
        this.writer = null;
        if (this.writeStream)
            await this.writeStream.close();
        this.writeStream = null;
        this.buffer = null;
        this.bufferPosition = 0;
        this.file.reset();
    }
}
_a = WSFileStream, _WSFileStream_canWrite = new WeakMap(), _WSFileStream_instances = new WeakSet(), _WSFileStream_getWriter = async function _WSFileStream_getWriter() {
    if (this.writer == null) {
        this.writer = (await this.getOutputStream()).getWriter();
    }
    return this.writer;
}, _WSFileStream_setServiceAuth = function _WSFileStream_setServiceAuth(headers) {
    var _b, _c;
    if (!this.file.getCredentials())
        return;
    headers.append('Authorization', 'Basic ' + new Base64().encode(new TextEncoder().encode(((_b = this.file.getCredentials()) === null || _b === void 0 ? void 0 : _b.getServiceUser()) + ":" + ((_c = this.file.getCredentials()) === null || _c === void 0 ? void 0 : _c.getServicePassword()))));
}, _WSFileStream_checkStatus = async function _WSFileStream_checkStatus(httpResponse, status) {
    if (httpResponse.status != status)
        throw new IOException(httpResponse.status
            + " " + httpResponse.statusText);
}, _WSFileStream_setDefaultHeaders = function _WSFileStream_setDefaultHeaders(headers) {
    headers.append("Cache", "no-store");
    headers.append("Connection", "keep-alive");
};
_WSFileStream_PATH = { value: "path" };
_WSFileStream_POSITION = { value: "position" };
_WSFileStream_LENGTH = { value: "length" };
WSFileStream.MAX_LEN_PER_REQUEST = 8 * 1024 * 1024;
