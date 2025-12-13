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
import { RandomAccessStream, SeekOrigin } from "../../../simple-io/streams/random_access_stream.js";
// File operations on the local file system may be slow due to
// web browser specificallly Chrome malware scans
// see: https://issues.chromium.org/issues/40743502
/**
 * An advanced file stream implementation for FileSystemFileHandle.
 * This class can be used for random file access of local files using the browser.
 */
export class FileStream extends RandomAccessStream {
    /**
     * The FileSystemFileHandle file associated with this stream.
     */
    #file;
    #fileBlob = null;
    #writablefileStream = null;
    #_position = 0;
    #canWrite = false;
    /**
     * Construct a file stream from an File.
     * This will create a wrapper stream that will route read() and write() to the FileChannel
     *
     * @param {IFile} file The File that will be used to get the read/write stream
     * @param {string} mode The mode "r" for read "rw" for write
     */
    constructor(file, mode) {
        super();
        this.#file = file;
        if (mode == "rw") {
            this.#canWrite = true;
        }
    }
    async #getBlob() {
        if (this.#fileBlob == null) {
            let fileHandle = await this.#file.getPath();
            this.#fileBlob = await fileHandle.getFile();
        }
        return this.#fileBlob;
    }
    async #getStream() {
        if (this.#writablefileStream == null) {
            let fileHandle = await this.#file.getPath();
            let exists = await this.#file.exists();
            if (exists) {
                this.#writablefileStream = await fileHandle.createWritable({ keepExistingData: true });
            }
            else {
                let parent = await this.#file.getParent();
                if (parent == null)
                    throw new Error("Could not get parent");
                await parent.createFile(this.#file.getName());
                this.#writablefileStream = await fileHandle.createWritable();
            }
        }
        return this.#writablefileStream;
    }
    /**
     * True if stream can read from file.
     * @returns {Promise<boolean>} True if it can read
     */
    async canRead() {
        return !this.#canWrite;
    }
    /**
     * True if stream can write to file.
     * @returns {Promise<boolean>} True if it can write
     */
    async canWrite() {
        return this.#canWrite;
    }
    /**
     * True if stream can seek.
     * @returns {Promise<boolean>} True if it can seek
     */
    async canSeek() {
        return true;
    }
    /**
     * Get the length of the stream. This is the same as the file size.
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
        if (await this.canWrite()) {
            let stream = (await this.#getStream());
            try {
                if (await this.#file.getLength() < value)
                    await stream.truncate(value);
                await stream.seek(this.#_position);
            }
            catch (ex) {
                console.error(ex);
                throw ex;
            }
        }
    }
    /**
     * Set the length of the stream. This is applicable for write streams only.
     * @param {number} value The new length.
     * @throws IOException Thrown if there is an IO error.
     */
    async setLength(value) {
        if (await this.canWrite()) {
            let stream = await this.#getStream();
            await stream.truncate(0);
        }
        else {
            throw new Error("Stream is not writable");
        }
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
        let len = Math.min(count, buffer.length - offset);
        let blob = await this.#getBlob();
        len = Math.min(len, blob.size - this.#_position);
        let arr = blob.slice(this.#_position, this.#_position + len);
        let buff = new Uint8Array(await arr.arrayBuffer());
        for (let i = 0; i < buff.length; i++) {
            buffer[offset + i] = buff[i];
        }
        this.#_position += buff.length;
        return buff.length;
    }
    /**
     * Write the data from the buffer provided into the stream.
     * @param {Uint8Array} buffer The buffer to read the data from.
     * @param {number} offset The offset of the buffer to start reading the data.
     * @param {number} count The maximum number of bytes to read from the buffer.
     * @throws IOException Thrown if there is an IO error.
     */
    async write(buffer, offset, count) {
        let stream = await this.#getStream();
        await stream.write(buffer.slice(offset, offset + count));
        this.#_position += count;
    }
    /**
     * Seek to the offset provided.
     * @param {number} offset The position to seek to.
     * @param {SeekOrigin} origin The type of origin {@link SeekOrigin}
     * @returns {number} The new position after seeking.
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
    }
    /**
     * Close this stream and associated resources.
     * @throws IOException Thrown if there is an IO error.
     */
    async close() {
        if (this.#writablefileStream)
            await this.#writablefileStream.close();
    }
}
