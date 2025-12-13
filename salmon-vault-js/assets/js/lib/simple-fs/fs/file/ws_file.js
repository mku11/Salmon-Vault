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
var _a;
import { CopyOptions, MoveOptions } from './ifile.js';
import { WSFileStream } from '../streams/ws_file_stream.js';
import { IOException } from '../../../simple-io/streams/io_exception.js';
import { HttpSyncClient } from './http_sync_client.js';
import { Base64Utils } from '../../../simple-io/encode/base64_utils.js';
/**
 * File implementation for Web Service files.
 */
export class WSFile {
    static #PATH = "path";
    static #DEST_DIR = "destDir";
    static #FILENAME = "filename";
    /**
     * The directory separator
     */
    static separator = "/";
    #filePath;
    #servicePath;
    response;
    getServicePath() {
        return this.#servicePath;
    }
    /**
     * Get the web service credentials
     * @returns {Credentials | null } The credentials
     */
    getCredentials() {
        return this.#credentials;
    }
    #credentials;
    /**
     * Instantiate a real file represented by the filepath provided.
     * @param {string} path The filepath.
     */
    constructor(path, servicePath, credentials) {
        if (!path.startsWith(_a.separator))
            path = _a.separator + path;
        this.#servicePath = servicePath;
        this.#filePath = path;
        this.#credentials = credentials;
    }
    async #getResponse() {
        if (this.response == null) {
            let headers = new Headers();
            this.#setDefaultHeaders(headers);
            this.#setServiceAuth(headers);
            let httpResponse = null;
            httpResponse = await HttpSyncClient.getResponse(this.#servicePath + "/api/info"
                + "?" + _a.#PATH + "=" + encodeURIComponent(this.getPath()), { method: 'GET', headers: headers });
            await this.#checkStatus(httpResponse, 200);
            this.response = await httpResponse.json();
        }
        return this.response;
    }
    /**
     * Create a directory under this directory.
     * @param {string} dirName The name of the new directory.
     * @returns {Promise<IFile>} The newly created directory.
     */
    async createDirectory(dirName) {
        let nDirPath = this.#getChildPath(dirName);
        let headers = new Headers();
        this.#setDefaultHeaders(headers);
        this.#setServiceAuth(headers);
        let params = new URLSearchParams();
        params.append(_a.#PATH, nDirPath);
        let httpResponse = await HttpSyncClient.getResponse(this.#servicePath + "/api/mkdir", { method: 'POST', body: params, headers: headers });
        await this.#checkStatus(httpResponse, 200);
        let dir = new _a(nDirPath, this.#servicePath, this.#credentials);
        return dir;
    }
    /**
     * Create a file under this directory.
     * @param {string} filename The name of the new file.
     * @returns {Promise<IFile>} The newly created file.
     * @throws IOException Thrown if there is an IO error.
     */
    async createFile(filename) {
        let nFilePath = this.#getChildPath(filename);
        let headers = new Headers();
        this.#setDefaultHeaders(headers);
        this.#setServiceAuth(headers);
        let params = new URLSearchParams();
        params.append(_a.#PATH, nFilePath);
        let httpResponse = await HttpSyncClient.getResponse(this.#servicePath + "/api/create", { method: 'POST', body: params, headers: headers });
        await this.#checkStatus(httpResponse, 200);
        let nFile = new _a(nFilePath, this.#servicePath, this.#credentials);
        return nFile;
    }
    /**
     * Delete this file or directory.
     * @returns {Promise<boolean>} True if deletion is successful.
     */
    async delete() {
        if (await this.isDirectory()) {
            let files = await this.listFiles();
            for (let file of files) {
                let headers = new Headers();
                this.#setDefaultHeaders(headers);
                this.#setServiceAuth(headers);
                let params = new URLSearchParams();
                params.append(_a.#PATH, file.getPath());
                let httpResponse = await HttpSyncClient.getResponse(this.#servicePath + "/api/delete", { method: 'DELETE', body: params, headers: headers });
                await this.#checkStatus(httpResponse, 200);
            }
        }
        let headers = new Headers();
        this.#setDefaultHeaders(headers);
        this.#setServiceAuth(headers);
        let params = new URLSearchParams();
        params.append(_a.#PATH, this.#filePath);
        let httpResponse = await HttpSyncClient.getResponse(this.#servicePath + "/api/delete", { method: 'DELETE', body: params, headers: headers });
        await this.#checkStatus(httpResponse, 200);
        this.reset();
        return true;
    }
    /**
     * True if file or directory exists.
     * @returns {Promise<boolean>} True if exists
     */
    async exists() {
        return (await this.#getResponse()).present;
    }
    /**
     * Get the path of this file. For javascript this is the same as the absolute filepath.
     * @returns {string} The path
     */
    getPath() {
        return this.#filePath;
    }
    /**
     * Get the display path on the physical disk. For javascript this is the same as the filepath.
     * @returns {string} The display path.
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
        if (nFilePath.endsWith(_a.separator))
            nFilePath = nFilePath.substring(0, nFilePath.length - 1);
        let basename = nFilePath.split(_a.separator).pop();
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
        this.reset();
        let fileStream = new WSFileStream(this, "r");
        return fileStream;
    }
    /**
     * Get a stream for writing to this file.
     * @returns {Promise<RandomAccessStream>} The stream to write to.
     * @throws FileNotFoundException
     */
    async getOutputStream() {
        this.reset();
        let fileStream = new WSFileStream(this, "rw");
        return fileStream;
    }
    /**
     * Get the parent directory of this file or directory.
     * @returns {Promise<IFile>} The parent directory.
     */
    async getParent() {
        if (this.#filePath.length == 0 || this.#filePath == _a.separator)
            return null;
        let path = this.#filePath;
        if (path.endsWith(_a.separator))
            path = path.slice(0, -1);
        let parentFilePath = path.substring(0, path.lastIndexOf(_a.separator));
        return new _a(parentFilePath, this.#servicePath, this.#credentials);
    }
    /**
     * Check if this is a directory.
     * @returns {Promise<boolean>} True if directory
     */
    async isDirectory() {
        return (await this.#getResponse()).directory;
    }
    /**
     * Check if this is a file.
     * @returns {Promise<boolean>} True if file
     */
    async isFile() {
        return (await this.#getResponse()).file;
    }
    /**
     * Get the last modified date on disk.
     * @returns {Promise<number>} The last date modified
     */
    async getLastDateModified() {
        return (await this.#getResponse()).lastModified;
    }
    /**
     * Get the size of the file on disk.
     * @returns {Promise<number>} The length
     */
    async getLength() {
        return (await this.#getResponse()).length;
    }
    /**
     * Get the count of files and subdirectories
     * @returns {Promise<number>} The number of files and subdirectories
     */
    async getChildrenCount() {
        if (await this.isDirectory()) {
            let headers = new Headers();
            this.#setDefaultHeaders(headers);
            this.#setServiceAuth(headers);
            let httpResponse = await HttpSyncClient.getResponse(this.#servicePath + "/api/list"
                + "?" + _a.#PATH + "=" + encodeURIComponent(this.getPath()), { method: 'GET', headers: headers });
            await this.#checkStatus(httpResponse, 200);
            let res = (await httpResponse.json()).length;
            return res;
        }
        return 0;
    }
    /**
     * List all files under this directory.
     * @returns {Promise<IFile[]>} The list of files and subdirectories
     */
    async listFiles() {
        if (await this.isDirectory()) {
            let headers = new Headers();
            this.#setDefaultHeaders(headers);
            this.#setServiceAuth(headers);
            let httpResponse = await HttpSyncClient.getResponse(this.#servicePath + "/api/list"
                + "?" + _a.#PATH + "=" + encodeURIComponent(this.getPath()), { method: 'GET', headers: headers });
            await this.#checkStatus(httpResponse, 200);
            let realFiles = [];
            let realDirs = [];
            for (let resFile of await httpResponse.json()) {
                let file = new _a(resFile.path, this.#servicePath, this.#credentials);
                if (resFile.directory)
                    realDirs.push(file);
                else
                    realFiles.push(file);
            }
            realDirs.push(...realFiles);
            return realDirs;
        }
        return [];
    }
    /**
     * Move this file or directory under a new directory.
     * @param {IFile} newDir The target directory.
     * @param {MoveOptions} options The options
     * @returns {Promise<IFile>} The moved file. Use this file for subsequent operations instead of the original.
     */
    async move(newDir, options) {
        if (!options)
            options = new MoveOptions();
        let newName = options.newFilename ? options.newFilename : this.getName();
        if (newDir == null || !newDir.exists())
            throw new IOException("Target directory does not exist");
        let newFile = await newDir.getChild(newName);
        if (newFile && await newFile.exists())
            throw new IOException("Another file/directory already exists");
        if (await this.isDirectory()) {
            throw new IOException("Could not move directory use IFile moveRecursively() instead");
        }
        else {
            let headers = new Headers();
            this.#setDefaultHeaders(headers);
            this.#setServiceAuth(headers);
            let params = new URLSearchParams();
            params.append(_a.#PATH, this.#filePath);
            params.append(_a.#DEST_DIR, newDir.getPath());
            params.append(_a.#FILENAME, newName);
            let httpResponse = null;
            httpResponse = await HttpSyncClient.getResponse(this.#servicePath + "/api/move", { method: 'PUT', body: params, headers: headers });
            await this.#checkStatus(httpResponse, 200);
            newFile = new _a((await httpResponse.json()).path, this.#servicePath, this.#credentials);
            this.reset();
            return newFile;
        }
    }
    /**
     * Move this file or directory under a new directory.
     * @param {IFile} newDir    The target directory.
     * @param {CopyOptions} options The options
     * @returns {Promise<IFile>} The copied file. Use this file for subsequent operations instead of the original.
     * @throws IOException Thrown if there is an IO error.
     */
    async copy(newDir, options) {
        if (!options)
            options = new CopyOptions();
        let newName = options.newFilename ? options.newFilename : this.getName();
        if (newDir == null || !newDir.exists())
            throw new IOException("Target directory does not exists");
        let newFile = await newDir.getChild(newName);
        if (newFile && await newFile.exists())
            throw new IOException("Another file/directory already exists");
        if (await this.isDirectory()) {
            throw new IOException("Could not copy directory use IFile copyRecursively() instead");
        }
        else {
            let headers = new Headers();
            this.#setDefaultHeaders(headers);
            this.#setServiceAuth(headers);
            let params = new URLSearchParams();
            params.append(_a.#PATH, this.#filePath);
            params.append(_a.#DEST_DIR, newDir.getPath());
            params.append(_a.#FILENAME, newName);
            let httpResponse = await HttpSyncClient.getResponse(this.#servicePath + "/api/copy", { method: 'POST', body: params, headers: headers });
            await this.#checkStatus(httpResponse, 200);
            newFile = new _a((await httpResponse.json()).path, this.#servicePath, this.#credentials);
            this.reset();
            return newFile;
        }
    }
    /**
     * Get the file or directory under this directory with the provided name.
     * @param {string} filename The name of the file or directory.
     * @returns {Promise<IFile | null>} The child
     */
    async getChild(filename) {
        if (await this.isFile())
            return null;
        let nFilepath = this.#getChildPath(filename);
        let child = new _a(nFilepath, this.#servicePath, this.#credentials);
        return child;
    }
    /**
     * Rename the current file or directory.
     * @param {string} newFilename The new name for the file or directory.
     * @returns {Promise<boolean>} True if successfully renamed.
     */
    async renameTo(newFilename) {
        this.reset();
        let headers = new Headers();
        this.#setDefaultHeaders(headers);
        this.#setServiceAuth(headers);
        let params = new URLSearchParams();
        params.append(_a.#PATH, this.#filePath);
        params.append(_a.#FILENAME, newFilename);
        let httpResponse = await HttpSyncClient.getResponse(this.#servicePath + "/api/rename", { method: 'PUT', body: params, headers: headers });
        await this.#checkStatus(httpResponse, 200);
        this.response = await httpResponse.json();
        this.#filePath = this.response.path;
        return this.response.name == newFilename;
    }
    /**
     * Create this directory under the current filepath.
     * @returns {Promise<boolean>} True if created.
     */
    async mkdir() {
        this.reset();
        let headers = new Headers();
        this.#setDefaultHeaders(headers);
        this.#setServiceAuth(headers);
        let params = new URLSearchParams();
        params.append(_a.#PATH, this.#filePath);
        let httpResponse = await HttpSyncClient.getResponse(this.#servicePath + "/api/mkdir", { method: 'POST', body: params, headers: headers });
        await this.#checkStatus(httpResponse, 200);
        return true;
    }
    /**
     * Reset cached properties
     */
    reset() {
        this.response = null;
    }
    #getChildPath(filename) {
        let nFilepath = this.#filePath;
        if (!nFilepath.endsWith(_a.separator))
            nFilepath += _a.separator;
        nFilepath += filename;
        return nFilepath;
    }
    /**
     * Returns a string representation of this object
     * @returns {string} The string
     */
    toString() {
        return this.#filePath;
    }
    #setServiceAuth(headers) {
        if (!this.#credentials)
            return;
        headers.append('Authorization', 'Basic ' + Base64Utils.getBase64().encode(new TextEncoder().encode(this.#credentials.getServiceUser() + ":" + this.#credentials.getServicePassword())));
    }
    async #checkStatus(httpResponse, status) {
        if (httpResponse.status != status)
            throw new IOException(httpResponse.status
                + " " + httpResponse.statusText + "\n"
                + await httpResponse.text());
    }
    #setDefaultHeaders(headers) {
        headers.append("Cache", "no-store");
        headers.append("Connection", "close");
    }
}
_a = WSFile;
