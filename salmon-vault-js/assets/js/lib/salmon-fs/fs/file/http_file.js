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
var _HttpFile_instances, _HttpFile_filePath, _HttpFile_response, _HttpFile_credentials, _HttpFile_getResponse, _HttpFile_checkStatus, _HttpFile_setServiceAuth, _HttpFile_setDefaultHeaders;
import { HttpFileStream } from '../streams/http_file_stream.js';
import { IOException } from '../../../salmon-core/streams/io_exception.js';
import { MemoryStream } from '../../../salmon-core/streams/memory_stream.js';
import { HttpSyncClient } from './http_sync_client.js';
import { Base64Utils } from '../../../salmon-core/salmon/encode/base64_utils.js';
/**
 * Salmon RealFile implementation for Javascript.
 */
export class HttpFile {
    /**
     * Get the user credentials
     * @return The credentials
     */
    getCredentials() {
        return __classPrivateFieldGet(this, _HttpFile_credentials, "f");
    }
    /**
     * Instantiate a real file represented by the filepath provided.
     * @param {string} path The filepath.
     */
    constructor(path, credentials = null) {
        _HttpFile_instances.add(this);
        _HttpFile_filePath.set(this, void 0);
        _HttpFile_response.set(this, null);
        _HttpFile_credentials.set(this, null);
        __classPrivateFieldSet(this, _HttpFile_filePath, path, "f");
        __classPrivateFieldSet(this, _HttpFile_credentials, credentials, "f");
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
        return (await __classPrivateFieldGet(this, _HttpFile_instances, "m", _HttpFile_getResponse).call(this)).status == 200 || (await __classPrivateFieldGet(this, _HttpFile_instances, "m", _HttpFile_getResponse).call(this)).status == 206;
    }
    /**
     * Get the path of this file. For Javascript this is the same as the absolute filepath.
     * @returns {string} The path
     */
    getPath() {
        return __classPrivateFieldGet(this, _HttpFile_filePath, "f");
    }
    /**
     * Get the absolute path on the physical disk. For javascript this is the same as the filepath.
     * @returns {string} The absolute path.
     */
    getDisplayPath() {
        return __classPrivateFieldGet(this, _HttpFile_filePath, "f");
    }
    /**
     * Get the name of this file or directory.
     * @returns {string} The name of this file or directory.
     */
    getName() {
        if (__classPrivateFieldGet(this, _HttpFile_filePath, "f") == null)
            throw new Error("Filepath is not assigned");
        let nFilePath = __classPrivateFieldGet(this, _HttpFile_filePath, "f");
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
        let path = __classPrivateFieldGet(this, _HttpFile_filePath, "f");
        if (path.endsWith(HttpFile.separator))
            path = path.slice(0, -1);
        let parentFilePath = path.substring(0, path.lastIndexOf(HttpFile.separator));
        return new HttpFile(parentFilePath, __classPrivateFieldGet(this, _HttpFile_credentials, "f"));
    }
    /**
     * True if this is a directory.
     * @returns {Promise<boolean>} True if directory
     */
    async isDirectory() {
        let res = (await __classPrivateFieldGet(this, _HttpFile_instances, "m", _HttpFile_getResponse).call(this));
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
        let headers = (await __classPrivateFieldGet(this, _HttpFile_instances, "m", _HttpFile_getResponse).call(this)).headers;
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
        let res = (await __classPrivateFieldGet(this, _HttpFile_instances, "m", _HttpFile_getResponse).call(this));
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
                let file = new HttpFile(__classPrivateFieldGet(this, _HttpFile_filePath, "f") + HttpFile.separator + filename, __classPrivateFieldGet(this, _HttpFile_credentials, "f"));
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
        let child = new HttpFile(__classPrivateFieldGet(this, _HttpFile_filePath, "f") + HttpFile.separator + filename, __classPrivateFieldGet(this, _HttpFile_credentials, "f"));
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
        __classPrivateFieldSet(this, _HttpFile_response, null, "f");
    }
    /**
     * Returns a string representation of this object
     * @returns {string} The string
     */
    toString() {
        return __classPrivateFieldGet(this, _HttpFile_filePath, "f");
    }
}
_HttpFile_filePath = new WeakMap(), _HttpFile_response = new WeakMap(), _HttpFile_credentials = new WeakMap(), _HttpFile_instances = new WeakSet(), _HttpFile_getResponse = async function _HttpFile_getResponse() {
    if (__classPrivateFieldGet(this, _HttpFile_response, "f") == null) {
        let headers = new Headers();
        __classPrivateFieldGet(this, _HttpFile_instances, "m", _HttpFile_setDefaultHeaders).call(this, headers);
        __classPrivateFieldGet(this, _HttpFile_instances, "m", _HttpFile_setServiceAuth).call(this, headers);
        __classPrivateFieldSet(this, _HttpFile_response, await HttpSyncClient.getResponse(__classPrivateFieldGet(this, _HttpFile_filePath, "f"), { method: 'HEAD', headers: headers }), "f");
        await __classPrivateFieldGet(this, _HttpFile_instances, "m", _HttpFile_checkStatus).call(this, __classPrivateFieldGet(this, _HttpFile_response, "f"), 200);
    }
    return __classPrivateFieldGet(this, _HttpFile_response, "f");
}, _HttpFile_checkStatus = async function _HttpFile_checkStatus(httpResponse, status) {
    if (httpResponse.status != status)
        throw new IOException(httpResponse.status
            + " " + httpResponse.statusText);
}, _HttpFile_setServiceAuth = function _HttpFile_setServiceAuth(headers) {
    if (!__classPrivateFieldGet(this, _HttpFile_credentials, "f"))
        return;
    headers.append('Authorization', 'Basic ' + Base64Utils.getBase64().encode(new TextEncoder().encode(__classPrivateFieldGet(this, _HttpFile_credentials, "f").getServiceUser() + ":" + __classPrivateFieldGet(this, _HttpFile_credentials, "f").getServicePassword())));
}, _HttpFile_setDefaultHeaders = function _HttpFile_setDefaultHeaders(headers) {
    headers.append("Cache", "no-store");
    headers.append("Connection", "close");
};
/**
 * Directory separator
 */
HttpFile.separator = "/";
