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
var _NodeFileStream_instances, _NodeFileStream_file, _NodeFileStream__position, _NodeFileStream_fd, _NodeFileStream__closed, _NodeFileStream_canWrite, _NodeFileStream_getFd;
import { IOException } from "../../../salmon-core/streams/io_exception.js";
import { RandomAccessStream, SeekOrigin } from "../../../salmon-core/streams/random_access_stream.js";
import { truncate } from 'node:fs/promises';
import { openSync } from "node:fs";
import fs from "fs";
/**
 * An advanced file stream implementation for local files.
 * This class can be used for random file access of local files using node js.
 */
export class NodeFileStream extends RandomAccessStream {
    /**
     * Construct a file stream from an NodeFile.
     * This will create a wrapper stream that will route read() and write() to the FileChannel
     *
     * @param {IFile} file The NodeFile that will be used to get the read/write stream
     * @param {string} mode The mode "r" for read "rw" for write
     */
    constructor(file, mode) {
        super();
        _NodeFileStream_instances.add(this);
        _NodeFileStream_file.set(this, void 0);
        _NodeFileStream__position.set(this, 0);
        _NodeFileStream_fd.set(this, 0);
        _NodeFileStream__closed.set(this, false);
        _NodeFileStream_canWrite.set(this, false);
        __classPrivateFieldSet(this, _NodeFileStream_file, file, "f");
        if (mode == "rw") {
            __classPrivateFieldSet(this, _NodeFileStream_canWrite, true, "f");
        }
    }
    /**
     * True if stream can read from file.
     * @returns {Promise<boolean>} True if can read
     */
    async canRead() {
        return !__classPrivateFieldGet(this, _NodeFileStream_canWrite, "f");
    }
    /**
     * True if stream can write to file.
     * @returns {Promise<boolean>} True if can write
     */
    async canWrite() {
        return __classPrivateFieldGet(this, _NodeFileStream_canWrite, "f");
    }
    /**
     * True if stream can seek.
     * @returns {Promise<boolean>} True if can seek
     */
    async canSeek() {
        return true;
    }
    /**
     * Get the length of the stream. This is the same as the backed file.
     * @returns {Promise<number>} The length
     */
    async getLength() {
        return await __classPrivateFieldGet(this, _NodeFileStream_file, "f").getLength();
    }
    /**
     * Get the current position of the stream.
     * @returns {Promise<number>} The position
     * @throws IOException Thrown if there is an IO error.
     */
    async getPosition() {
        return __classPrivateFieldGet(this, _NodeFileStream__position, "f");
    }
    /**
     * Set the current position of the stream.
     * @param {number} value The new position.
     * @throws IOException Thrown if there is an IO error.
     */
    async setPosition(value) {
        __classPrivateFieldSet(this, _NodeFileStream__position, value, "f");
    }
    /**
     * Set the length of the stream. This is applicable for write streams only.
     * @param {number} value The new length.
     * @throws IOException Thrown if there is an IO error.
     */
    async setLength(value) {
        await truncate(__classPrivateFieldGet(this, _NodeFileStream_file, "f").getDisplayPath(), value);
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
        let fd = await __classPrivateFieldGet(this, _NodeFileStream_instances, "m", _NodeFileStream_getFd).call(this);
        let bytesRead = fs.readSync(fd, buffer, offset, count, __classPrivateFieldGet(this, _NodeFileStream__position, "f"));
        __classPrivateFieldSet(this, _NodeFileStream__position, __classPrivateFieldGet(this, _NodeFileStream__position, "f") + bytesRead, "f");
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
        let fd = await __classPrivateFieldGet(this, _NodeFileStream_instances, "m", _NodeFileStream_getFd).call(this);
        let bytesWritten = fs.writeSync(fd, buffer, offset, count, __classPrivateFieldGet(this, _NodeFileStream__position, "f"));
        __classPrivateFieldSet(this, _NodeFileStream__position, __classPrivateFieldGet(this, _NodeFileStream__position, "f") + bytesWritten, "f");
    }
    /**
     * Seek to the offset provided.
     * @param {number} offset The position to seek to.
     * @param {SeekOrigin} origin The type of origin {@link SeekOrigin}
     * @returns {Promise<number>} The new position after seeking.
     * @throws IOException Thrown if there is an IO error.
     */
    async seek(offset, origin) {
        let pos = __classPrivateFieldGet(this, _NodeFileStream__position, "f");
        if (origin == SeekOrigin.Begin)
            pos = offset;
        else if (origin == SeekOrigin.Current)
            pos += offset;
        else if (origin == SeekOrigin.End)
            pos = await __classPrivateFieldGet(this, _NodeFileStream_file, "f").getLength() - offset;
        await this.setPosition(pos);
        return __classPrivateFieldGet(this, _NodeFileStream__position, "f");
    }
    /**
     * Flush the buffers to the associated file.
     */
    async flush() {
        if (await this.canWrite()) {
            if (__classPrivateFieldGet(this, _NodeFileStream_fd, "f")) {
                // nop
            }
        }
    }
    /**
     * Close this stream and associated resources.
     * @throws IOException Thrown if there is an IO error.
     */
    async close() {
        if (__classPrivateFieldGet(this, _NodeFileStream_fd, "f"))
            fs.close(__classPrivateFieldGet(this, _NodeFileStream_fd, "f"));
        __classPrivateFieldSet(this, _NodeFileStream__closed, true, "f");
    }
}
_NodeFileStream_file = new WeakMap(), _NodeFileStream__position = new WeakMap(), _NodeFileStream_fd = new WeakMap(), _NodeFileStream__closed = new WeakMap(), _NodeFileStream_canWrite = new WeakMap(), _NodeFileStream_instances = new WeakSet(), _NodeFileStream_getFd = async function _NodeFileStream_getFd() {
    if (__classPrivateFieldGet(this, _NodeFileStream__closed, "f"))
        throw new IOException("Stream is closed");
    if (__classPrivateFieldGet(this, _NodeFileStream_fd, "f") == 0) {
        if (await this.canRead()) {
            __classPrivateFieldSet(this, _NodeFileStream_fd, openSync(__classPrivateFieldGet(this, _NodeFileStream_file, "f").getPath(), "r"), "f");
        }
        else if (await this.canWrite()) {
            if (!await __classPrivateFieldGet(this, _NodeFileStream_file, "f").exists()) {
                let fdt = openSync(__classPrivateFieldGet(this, _NodeFileStream_file, "f").getPath(), 'a');
                fs.closeSync(fdt);
            }
            __classPrivateFieldSet(this, _NodeFileStream_fd, openSync(__classPrivateFieldGet(this, _NodeFileStream_file, "f").getPath(), "r+"), "f");
        }
    }
    if (__classPrivateFieldGet(this, _NodeFileStream_fd, "f") == null)
        throw new IOException("Could not retrieve file descriptor");
    return __classPrivateFieldGet(this, _NodeFileStream_fd, "f");
};
