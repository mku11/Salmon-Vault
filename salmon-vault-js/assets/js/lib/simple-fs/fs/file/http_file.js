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
import { HttpFileStream } from '../streams/http_file_stream.js';
import { IOException } from '../../../simple-io/streams/io_exception.js';
import { MemoryStream } from '../../../simple-io/streams/memory_stream.js';
import { HttpSyncClient } from './http_sync_client.js';
import { Base64Utils } from '../../../simple-io/encode/base64_utils.js';
/**
 * File implementation for Javascript.
 */
export class HttpFile {
    /**
     * Directory separator
     */
    static separator = "/";
    #filePath;
    #response = null;
    #credentials = null;
    /**
     * Get the user credentials
     * @return The credentials
     */
    getCredentials() {
        return this.#credentials;
    }
    /**
     * Instantiate a real file represented by the filepath provided.
     * @param {string} path The filepath.
     */
    constructor(path, credentials = null) {
        this.#filePath = path;
        this.#credentials = credentials;
    }
    async #getResponse() {
        if (this.#response == null) {
            let headers = new Headers();
            this.#setDefaultHeaders(headers);
            this.#setServiceAuth(headers);
            this.#response = await HttpSyncClient.getResponse(this.#filePath, { method: 'HEAD', headers: headers });
            await this.#checkStatus(this.#response, 200);
        }
        return this.#response;
    }
    /**
     * Create a directory under this directory.
     * @param {string} dirName The name of the new directory.
     * @returns The newly created directory.
     */
    async createDirectory(dirName) {
        throw new Error("Unsupported Operation, readonly filesystem");
    }
    /**
     * Create a file under this directory.
     * @param {string} filename The name of the new file.
     * @returns {Promise<IFile>} The newly created file.
     * @throws IOException Thrown if there is an IO error.
     */
    createFile(filename) {
        throw new Error("Unsupported Operation, readonly filesystem");
    }
    /**
     * Delete this file or directory.
     * @returns {Promise<boolean>} True if deletion is successful.
     */
    async delete() {
        throw new Error("Unsupported Operation, readonly filesystem");
    }
    /**
     * True if file or directory exists.
     * @returns {Promise<boolean>} True if exists
     */
    async exists() {
        return (await this.#getResponse()).status == 200 || (await this.#getResponse()).status == 206;
    }
    /**
     * Get the path of this file. For Javascript this is the same as the absolute filepath.
     * @returns {string} The path
     */
    getPath() {
        return this.#filePath;
    }
    /**
     * Get the absolute path on the physical disk. For javascript this is the same as the filepath.
     * @returns {string} The absolute path.
     */
    getDisplayPath() {
        return this.#filePath;
    }
    /**
     * Get the name of this file or directory.
     * @returns {string} The name of this file or directory.
     */
    getName() {
        if (this.#filePath == null)
            throw new Error("Filepath is not assigned");
        let nFilePath = this.#filePath;
        if (nFilePath.endsWith("/"))
            nFilePath = nFilePath.substring(0, nFilePath.length - 1);
        let basename = nFilePath.split(HttpFile.separator).pop();
        if (basename === undefined)
            throw new Error("Could not get basename");
        if (basename.includes("%")) {
            basename = decodeURIComponent(basename);
        }
        return basename;
    }
    /**
     * Get a stream for reading the file.
     * @returns {Promise<RandomAccessStream>} The stream to read from.
     * @throws FileNotFoundException
     */
    async getInputStream() {
        let fileStream = new HttpFileStream(this, "r");
        return fileStream;
    }
    /**
     * Get a stream for writing to this file.
     * @returns {Promise<RandomAccessStream>} The stream to write to.
     * @throws FileNotFoundException
     */
    async getOutputStream() {
        throw new Error("Unsupported Operation, readonly filesystem");
    }
    /**
     * Get the parent directory of this file or directory.
     * @returns {Promise<IFile>} The parent directory.
     */
    async getParent() {
        let path = this.#filePath;
        if (path.endsWith(HttpFile.separator))
            path = path.slice(0, -1);
        let parentFilePath = path.substring(0, path.lastIndexOf(HttpFile.separator));
        return new HttpFile(parentFilePath, this.#credentials);
    }
    /**
     * True if this is a directory.
     * @returns {Promise<boolean>} True if directory
     */
    async isDirectory() {
        let res = (await this.#getResponse());
        if (res == null)
            throw new Error("Could not get response");
        if (res.headers == null)
            throw new Error("Could not get headers");
        let contentType = res.headers.get("Content-Type");
        if (contentType == null)
            throw new Error("Could not get content type");
        return contentType.startsWith("text/html");
    }
    /**
     * True if this is a file.
     * @returns {Promise<boolean>} True if file
     */
    async isFile() {
        return !await this.isDirectory() && await this.exists();
    }
    /**
     * Get the last modified date on disk.
     * @returns {Promise<number>} The last date modified
     */
    async getLastDateModified() {
        let headers = (await this.#getResponse()).headers;
        let lastDateModified = headers.get("last-modified");
        if (lastDateModified == null) {
            lastDateModified = headers.get("date");
        }
        if (lastDateModified == null) {
            lastDateModified = "0";
        }
        let date = new Date(lastDateModified);
        let lastModified = date.getTime();
        return lastModified;
    }
    /**
     * Get the size of the file on disk.
     * @returns {Promise<number>} The size
     */
    async getLength() {
        let res = (await this.#getResponse());
        if (res == null)
            throw new IOException("Could not get response");
        let length = 0;
        let lenStr = res.headers.get("content-length");
        if (lenStr) {
            length = parseInt(lenStr);
        }
        return length;
    }
    /**
     * Get the count of files and subdirectories
     * @returns {Promise<number>} The number of files and subdirectories
     */
    async getChildrenCount() {
        return (await this.listFiles()).length;
    }
    /**
     * List all files under this directory.
     * @returns {Promise<IFile[]>} The list of files.
     */
    async listFiles() {
        if (await this.isDirectory()) {
            let files = [];
            let stream = await this.getInputStream();
            let ms = new MemoryStream();
            await stream.copyTo(ms);
            await ms.close();
            await stream.close();
            let contents = new TextDecoder().decode(ms.toArray());
            let matches = contents.matchAll(/HREF\=\"(.+?)\"/ig);
            for (const match of matches) {
                let filename = match[1];
                if (filename.includes(":") || filename.includes(".."))
                    continue;
                if (filename.includes("%")) {
                    filename = decodeURIComponent(filename);
                }
                let file = new HttpFile(this.#filePath + HttpFile.separator + filename, this.#credentials);
                files.push(file);
            }
            return files;
        }
        return [];
    }
    /**
     * Move this file or directory under a new directory. Not supported.
     * @param {IFile} newDir The target directory.
     * @param {MoveOptions} [options] The options
     * @returns {Promise<IFile>} The moved file. Use this file for subsequent operations instead of the original.
     */
    async move(newDir, options) {
        throw new Error("Unsupported Operation, readonly filesystem");
    }
    /**
     * Move this file or directory under a new directory. Not supported.
     * @param {IFile} newDir    The target directory.
     * @param {CopyOptions} [options] The options.
     * @returns {Promise<IFile>} The copied file. Use this file for subsequent operations instead of the original.
     * @throws IOException Thrown if there is an IO error.
     */
    async copy(newDir, options) {
        throw new Error("Unsupported Operation, readonly filesystem");
    }
    /**
     * Get the file or directory under this directory with the provided name.
     * @param {string} filename The name of the file or directory.
     * @returns {Promise<IFile | null>} The child
     */
    async getChild(filename) {
        if (await this.isFile())
            return null;
        let child = new HttpFile(this.#filePath + HttpFile.separator + filename, this.#credentials);
        return child;
    }
    /**
     * Rename the current file or directory. Not supported.
     * @param {string} newFilename The new name for the file or directory.
     * @returns {Promise<boolean>} True if successfully renamed.
     */
    async renameTo(newFilename) {
        throw new Error("Unsupported Operation, readonly filesystem");
    }
    /**
     * Create this directory under the current filepath. Not supported.
     * @returns {Promise<boolean>} True if created.
     */
    async mkdir() {
        throw new Error("Unsupported Operation, readonly filesystem");
    }
    /**
     * Reset cached properties
     */
    reset() {
        this.#response = null;
    }
    /**
     * Returns a string representation of this object
     * @returns {string} The string
     */
    toString() {
        return this.#filePath;
    }
    async #checkStatus(httpResponse, status) {
        if (httpResponse.status != status)
            throw new IOException(httpResponse.status
                + " " + httpResponse.statusText);
    }
    #setServiceAuth(headers) {
        if (!this.#credentials)
            return;
        headers.append('Authorization', 'Basic ' + Base64Utils.getBase64().encode(new TextEncoder().encode(this.#credentials.getServiceUser() + ":" + this.#credentials.getServicePassword())));
    }
    #setDefaultHeaders(headers) {
        headers.append("Cache", "no-store");
        headers.append("Connection", "close");
    }
}
