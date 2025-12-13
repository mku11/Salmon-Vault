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
import { IOException } from "../../../simple-io/streams/io_exception.js";
import { RandomAccessStream, SeekOrigin } from "../../../simple-io/streams/random_access_stream.js";
import { truncate } from 'node:fs/promises';
import { openSync } from "node:fs";
import fs from "fs";
/**
 * An advanced file stream implementation for local files.
 * This class can be used for random file access of local files using node js.
 */
export class NodeFileStream extends RandomAccessStream {
    #file;
    #_position = 0;
    #fd = 0;
    #_closed = false;
    #canWrite = false;
    /**
     * Construct a file stream from an NodeFile.
     * This will create a wrapper stream that will route read() and write() to the FileChannel
     *
     * @param {IFile} file The NodeFile that will be used to get the read/write stream
     * @param {string} mode The mode "r" for read "rw" for write
     */
    constructor(file, mode) {
        super();
        this.#file = file;
        if (mode == "rw") {
            this.#canWrite = true;
        }
    }
    async #getFd() {
        if (this.#_closed)
            throw new IOException("Stream is closed");
        if (this.#fd == 0) {
            if (await this.canRead()) {
                this.#fd = openSync(this.#file.getPath(), "r");
            }
            else if (await this.canWrite()) {
                if (!await this.#file.exists()) {
                    let fdt = openSync(this.#file.getPath(), 'a');
                    fs.closeSync(fdt);
                }
                this.#fd = openSync(this.#file.getPath(), "r+");
            }
        }
        if (this.#fd == null)
            throw new IOException("Could not retrieve file descriptor");
        return this.#fd;
    }
    /**
     * True if stream can read from file.
     * @returns {Promise<boolean>} True if can read
     */
    async canRead() {
        return !this.#canWrite;
    }
    /**
     * True if stream can write to file.
     * @returns {Promise<boolean>} True if can write
     */
    async canWrite() {
        return this.#canWrite;
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
        return await this.#file.getLength();
    }
    /**
     * Get the current position of the stream.
     * @returns {Promise<number>} The position
     * @throws IOException Thrown if there is an IO error.
     */
    async getPosition() {
        return this.#_position;
    }
    /**
     * Set the current position of the stream.
     * @param {number} value The new position.
     * @throws IOException Thrown if there is an IO error.
     */
    async setPosition(value) {
        this.#_position = value;
    }
    /**
     * Set the length of the stream. This is applicable for write streams only.
     * @param {number} value The new length.
     * @throws IOException Thrown if there is an IO error.
     */
    async setLength(value) {
        await truncate(this.#file.getDisplayPath(), value);
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
        let fd = await this.#getFd();
        let bytesRead = fs.readSync(fd, buffer, offset, count, this.#_position);
        this.#_position += bytesRead;
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
        let fd = await this.#getFd();
        let bytesWritten = fs.writeSync(fd, buffer, offset, count, this.#_position);
        this.#_position += bytesWritten;
    }
    /**
     * Seek to the offset provided.
     * @param {number} offset The position to seek to.
     * @param {SeekOrigin} origin The type of origin {@link SeekOrigin}
     * @returns {Promise<number>} The new position after seeking.
     * @throws IOException Thrown if there is an IO error.
     */
    async seek(offset, origin) {
        let pos = this.#_position;
        if (origin == SeekOrigin.Begin)
            pos = offset;
        else if (origin == SeekOrigin.Current)
            pos += offset;
        else if (origin == SeekOrigin.End)
            pos = await this.#file.getLength() - offset;
        await this.setPosition(pos);
        return this.#_position;
    }
    /**
     * Flush the buffers to the associated file.
     */
    async flush() {
        if (await this.canWrite()) {
            if (this.#fd) {
                // nop
            }
        }
    }
    /**
     * Close this stream and associated resources.
     * @throws IOException Thrown if there is an IO error.
     */
    async close() {
        if (this.#fd)
            fs.close(this.#fd);
        this.#_closed = true;
    }
}
