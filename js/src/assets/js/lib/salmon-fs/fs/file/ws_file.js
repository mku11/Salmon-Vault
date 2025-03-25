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
var _WSFile_instances, _a, _WSFile_PATH, _WSFile_DEST_DIR, _WSFile_FILENAME, _WSFile_filePath, _WSFile_servicePath, _WSFile_credentials, _WSFile_getResponse, _WSFile_getChildPath, _WSFile_setServiceAuth, _WSFile_checkStatus, _WSFile_setDefaultHeaders, _Credentials_serviceUser, _Credentials_servicePassword;
import { Base64 } from '../../../salmon-core/convert/base64.js';
import { CopyOptions, MoveOptions } from './ifile.js';
import { WSFileStream } from '../streams/ws_file_stream.js';
import { IOException } from '../../../salmon-core/streams/io_exception.js';
/**
 * Salmon RealFile implementation for Web Service files.
 */
export class WSFile {
    getServicePath() {
        return __classPrivateFieldGet(this, _WSFile_servicePath, "f");
    }
    /**
     * Get the web service credentials
     * @returns {Credentials | null } The credentials
     */
    getCredentials() {
        return __classPrivateFieldGet(this, _WSFile_credentials, "f");
    }
    /**
     * Set the web service credentials
     * @param {Credentials} credentials The credentials
     */
    setCredentials(credentials) {
        __classPrivateFieldSet(this, _WSFile_credentials, credentials, "f");
    }
    /**
     * Instantiate a real file represented by the filepath provided.
     * @param {string} path The filepath.
     */
    constructor(path, servicePath, credentials) {
        _WSFile_instances.add(this);
        _WSFile_filePath.set(this, void 0);
        _WSFile_servicePath.set(this, void 0);
        _WSFile_credentials.set(this, void 0);
        __classPrivateFieldSet(this, _WSFile_servicePath, servicePath, "f");
        if (!path.startsWith(_a.separator))
            path = _a.separator + path;
        __classPrivateFieldSet(this, _WSFile_filePath, path, "f");
        __classPrivateFieldSet(this, _WSFile_credentials, credentials, "f");
    }
    /**
     * Create a directory under this directory.
     * @param {string} dirName The name of the new directory.
     * @returns {Promise<IFile>} The newly created directory.
     */
    async createDirectory(dirName) {
        let nDirPath = __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_getChildPath).call(this, dirName);
        let headers = new Headers();
        __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_setDefaultHeaders).call(this, headers);
        __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_setServiceAuth).call(this, headers);
        let params = new URLSearchParams();
        params.append(__classPrivateFieldGet(_a, _a, "f", _WSFile_PATH), nDirPath);
        let httpResponse = null;
        httpResponse = (await fetch(__classPrivateFieldGet(this, _WSFile_servicePath, "f") + "/api/mkdir", { method: 'POST', keepalive: true, body: params, headers: headers }));
        await __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_checkStatus).call(this, httpResponse, 200);
        let dir = new _a(nDirPath, __classPrivateFieldGet(this, _WSFile_servicePath, "f"), __classPrivateFieldGet(this, _WSFile_credentials, "f"));
        return dir;
    }
    /**
     * Create a file under this directory.
     * @param {string} filename The name of the new file.
     * @returns {Promise<IFile>} The newly created file.
     * @throws IOException Thrown if there is an IO error.
     */
    async createFile(filename) {
        let nFilePath = __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_getChildPath).call(this, filename);
        let headers = new Headers();
        __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_setDefaultHeaders).call(this, headers);
        __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_setServiceAuth).call(this, headers);
        let params = new URLSearchParams();
        params.append(__classPrivateFieldGet(_a, _a, "f", _WSFile_PATH), nFilePath);
        let httpResponse = null;
        httpResponse = (await fetch(__classPrivateFieldGet(this, _WSFile_servicePath, "f") + "/api/create", { method: 'POST', keepalive: true, body: params, headers: headers }));
        await __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_checkStatus).call(this, httpResponse, 200);
        let nFile = new _a(nFilePath, __classPrivateFieldGet(this, _WSFile_servicePath, "f"), __classPrivateFieldGet(this, _WSFile_credentials, "f"));
        return nFile;
    }
    /**
     * Delete this file or directory.
     * @returns {Promise<boolean>} True if deletion is successful.
     */
    async delete() {
        this.reset();
        if (await this.isDirectory()) {
            let files = await this.listFiles();
            for (let file of files) {
                let headers = new Headers();
                __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_setDefaultHeaders).call(this, headers);
                __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_setServiceAuth).call(this, headers);
                let params = new URLSearchParams();
                params.append(__classPrivateFieldGet(_a, _a, "f", _WSFile_PATH), file.getPath());
                let httpResponse = null;
                httpResponse = (await fetch(__classPrivateFieldGet(this, _WSFile_servicePath, "f") + "/api/delete", { method: 'DELETE', keepalive: true, body: params, headers: headers }));
                await __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_checkStatus).call(this, httpResponse, 200);
            }
        }
        let headers = new Headers();
        __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_setDefaultHeaders).call(this, headers);
        __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_setServiceAuth).call(this, headers);
        let params = new URLSearchParams();
        params.append(__classPrivateFieldGet(_a, _a, "f", _WSFile_PATH), __classPrivateFieldGet(this, _WSFile_filePath, "f"));
        let httpResponse = null;
        httpResponse = (await fetch(__classPrivateFieldGet(this, _WSFile_servicePath, "f") + "/api/delete", { method: 'DELETE', keepalive: true, body: params, headers: headers }));
        await __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_checkStatus).call(this, httpResponse, 200);
        this.reset();
        return true;
    }
    /**
     * True if file or directory exists.
     * @returns {Promise<boolean>} True if exists
     */
    async exists() {
        return (await __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_getResponse).call(this)).present;
    }
    /**
     * Get the path of this file. For javascript this is the same as the absolute filepath.
     * @returns {string} The path
     */
    getPath() {
        return __classPrivateFieldGet(this, _WSFile_filePath, "f");
    }
    /**
     * Get the display path on the physical disk. For javascript this is the same as the filepath.
     * @returns {string} The display path.
     */
    getDisplayPath() {
        return __classPrivateFieldGet(this, _WSFile_filePath, "f");
    }
    /**
     * Get the name of this file or directory.
     * @returns {string} The name of this file or directory.
     */
    getName() {
        if (__classPrivateFieldGet(this, _WSFile_filePath, "f") == null)
            throw new Error("Filepath is not assigned");
        let nFilePath = __classPrivateFieldGet(this, _WSFile_filePath, "f");
        if (nFilePath.endsWith("/"))
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
        let path = __classPrivateFieldGet(this, _WSFile_filePath, "f");
        if (path.endsWith(_a.separator))
            path = path.slice(0, -1);
        let parentFilePath = path.substring(0, path.lastIndexOf(_a.separator));
        return new _a(parentFilePath, __classPrivateFieldGet(this, _WSFile_servicePath, "f"), __classPrivateFieldGet(this, _WSFile_credentials, "f"));
    }
    /**
     * Check if this is a directory.
     * @returns {Promise<boolean>} True if directory
     */
    async isDirectory() {
        return (await __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_getResponse).call(this)).directory;
    }
    /**
     * Check if this is a file.
     * @returns {Promise<boolean>} True if file
     */
    async isFile() {
        return (await __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_getResponse).call(this)).file;
    }
    /**
     * Get the last modified date on disk.
     * @returns {Promise<number>} The last date modified
     */
    async getLastDateModified() {
        return (await __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_getResponse).call(this)).lastModified;
    }
    /**
     * Get the size of the file on disk.
     * @returns {Promise<number>} The length
     */
    async getLength() {
        return (await __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_getResponse).call(this)).length;
    }
    /**
     * Get the count of files and subdirectories
     * @returns {Promise<number>} The number of files and subdirectories
     */
    async getChildrenCount() {
        if (await this.isDirectory()) {
            let headers = new Headers();
            __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_setDefaultHeaders).call(this, headers);
            __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_setServiceAuth).call(this, headers);
            let httpResponse = null;
            httpResponse = (await fetch(__classPrivateFieldGet(this, _WSFile_servicePath, "f") + "/api/list"
                + "?" + __classPrivateFieldGet(_a, _a, "f", _WSFile_PATH) + "=" + encodeURIComponent(this.getPath()), { method: 'GET', keepalive: true, headers: headers }));
            await __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_checkStatus).call(this, httpResponse, 200);
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
            __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_setDefaultHeaders).call(this, headers);
            __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_setServiceAuth).call(this, headers);
            let httpResponse = null;
            httpResponse = (await fetch(__classPrivateFieldGet(this, _WSFile_servicePath, "f") + "/api/list"
                + "?" + __classPrivateFieldGet(_a, _a, "f", _WSFile_PATH) + "=" + encodeURIComponent(this.getPath()), { method: 'GET', keepalive: true, headers: headers }));
            await __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_checkStatus).call(this, httpResponse, 200);
            let realFiles = [];
            let realDirs = [];
            for (let resFile of await httpResponse.json()) {
                let file = new _a(resFile.path, __classPrivateFieldGet(this, _WSFile_servicePath, "f"), __classPrivateFieldGet(this, _WSFile_credentials, "f"));
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
            __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_setDefaultHeaders).call(this, headers);
            __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_setServiceAuth).call(this, headers);
            let params = new URLSearchParams();
            params.append(__classPrivateFieldGet(_a, _a, "f", _WSFile_PATH), __classPrivateFieldGet(this, _WSFile_filePath, "f"));
            params.append(__classPrivateFieldGet(_a, _a, "f", _WSFile_DEST_DIR), newDir.getPath());
            params.append(__classPrivateFieldGet(_a, _a, "f", _WSFile_FILENAME), newName);
            let httpResponse = null;
            httpResponse = (await fetch(__classPrivateFieldGet(this, _WSFile_servicePath, "f") + "/api/move", { method: 'PUT', keepalive: true, body: params, headers: headers }));
            await __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_checkStatus).call(this, httpResponse, 200);
            newFile = new _a((await httpResponse.json()).path, __classPrivateFieldGet(this, _WSFile_servicePath, "f"), __classPrivateFieldGet(this, _WSFile_credentials, "f"));
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
            __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_setDefaultHeaders).call(this, headers);
            __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_setServiceAuth).call(this, headers);
            let params = new URLSearchParams();
            params.append(__classPrivateFieldGet(_a, _a, "f", _WSFile_PATH), __classPrivateFieldGet(this, _WSFile_filePath, "f"));
            params.append(__classPrivateFieldGet(_a, _a, "f", _WSFile_DEST_DIR), newDir.getPath());
            params.append(__classPrivateFieldGet(_a, _a, "f", _WSFile_FILENAME), newName);
            let httpResponse = null;
            httpResponse = (await fetch(__classPrivateFieldGet(this, _WSFile_servicePath, "f") + "/api/copy", { method: 'POST', keepalive: true, body: params, headers: headers }));
            await __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_checkStatus).call(this, httpResponse, 200);
            newFile = new _a((await httpResponse.json()).path, __classPrivateFieldGet(this, _WSFile_servicePath, "f"), __classPrivateFieldGet(this, _WSFile_credentials, "f"));
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
        let nFilepath = __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_getChildPath).call(this, filename);
        let child = new _a(nFilepath, __classPrivateFieldGet(this, _WSFile_servicePath, "f"), __classPrivateFieldGet(this, _WSFile_credentials, "f"));
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
        __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_setDefaultHeaders).call(this, headers);
        __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_setServiceAuth).call(this, headers);
        let params = new URLSearchParams();
        params.append(__classPrivateFieldGet(_a, _a, "f", _WSFile_PATH), __classPrivateFieldGet(this, _WSFile_filePath, "f"));
        params.append(__classPrivateFieldGet(_a, _a, "f", _WSFile_FILENAME), newFilename);
        let httpResponse = null;
        httpResponse = (await fetch(__classPrivateFieldGet(this, _WSFile_servicePath, "f") + "/api/rename", { method: 'PUT', keepalive: true, body: params, headers: headers }));
        await __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_checkStatus).call(this, httpResponse, 200);
        return true;
    }
    /**
     * Create this directory under the current filepath.
     * @returns {Promise<boolean>} True if created.
     */
    async mkdir() {
        this.reset();
        let headers = new Headers();
        __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_setDefaultHeaders).call(this, headers);
        __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_setServiceAuth).call(this, headers);
        let params = new URLSearchParams();
        params.append(__classPrivateFieldGet(_a, _a, "f", _WSFile_PATH), __classPrivateFieldGet(this, _WSFile_filePath, "f"));
        let httpResponse = null;
        httpResponse = (await fetch(__classPrivateFieldGet(this, _WSFile_servicePath, "f") + "/api/mkdir", { method: 'POST', keepalive: true, body: params, headers: headers }));
        await __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_checkStatus).call(this, httpResponse, 200);
        return true;
    }
    /**
     * Reset cached properties
     */
    reset() {
        this.response = null;
    }
    /**
     * Returns a string representation of this object
     * @returns {string} The string
     */
    toString() {
        return __classPrivateFieldGet(this, _WSFile_filePath, "f");
    }
}
_a = WSFile, _WSFile_filePath = new WeakMap(), _WSFile_servicePath = new WeakMap(), _WSFile_credentials = new WeakMap(), _WSFile_instances = new WeakSet(), _WSFile_getResponse = async function _WSFile_getResponse() {
    if (this.response == null) {
        let headers = new Headers();
        __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_setDefaultHeaders).call(this, headers);
        __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_setServiceAuth).call(this, headers);
        let httpResponse = null;
        httpResponse = (await fetch(__classPrivateFieldGet(this, _WSFile_servicePath, "f") + "/api/info"
            + "?" + __classPrivateFieldGet(_a, _a, "f", _WSFile_PATH) + "=" + encodeURIComponent(this.getPath()), { method: 'GET', keepalive: true, headers: headers }));
        await __classPrivateFieldGet(this, _WSFile_instances, "m", _WSFile_checkStatus).call(this, httpResponse, 200);
        this.response = await httpResponse.json();
    }
    return this.response;
}, _WSFile_getChildPath = function _WSFile_getChildPath(filename) {
    let nFilepath = __classPrivateFieldGet(this, _WSFile_filePath, "f");
    if (!nFilepath.endsWith(_a.separator))
        nFilepath += _a.separator;
    nFilepath += filename;
    return nFilepath;
}, _WSFile_setServiceAuth = function _WSFile_setServiceAuth(headers) {
    if (!__classPrivateFieldGet(this, _WSFile_credentials, "f"))
        return;
    headers.append('Authorization', 'Basic ' + new Base64().encode(new TextEncoder().encode(__classPrivateFieldGet(this, _WSFile_credentials, "f").getServiceUser() + ":" + __classPrivateFieldGet(this, _WSFile_credentials, "f").getServicePassword())));
}, _WSFile_checkStatus = async function _WSFile_checkStatus(httpResponse, status) {
    if (httpResponse.status != status)
        throw new IOException(httpResponse.status
            + " " + httpResponse.statusText + "\n"
            + await httpResponse.text());
}, _WSFile_setDefaultHeaders = function _WSFile_setDefaultHeaders(headers) {
    headers.append("Cache", "no-store");
    headers.append("Connection", "keep-alive");
};
_WSFile_PATH = { value: "path" };
_WSFile_DEST_DIR = { value: "destDir" };
_WSFile_FILENAME = { value: "filename" };
/**
 * The directory separator
 */
WSFile.separator = "/";
export class Credentials {
    /**
     * Get the user name
     * @returns {string} The user name
     */
    getServiceUser() {
        return __classPrivateFieldGet(this, _Credentials_serviceUser, "f");
    }
    /**
     * Get the password
     * @returns {string} The password
     */
    getServicePassword() {
        return __classPrivateFieldGet(this, _Credentials_servicePassword, "f");
    }
    /**
     * Construct a credentials object.
     * @param {string} serviceUser The user name
     * @param {string} servicePassword The password
     */
    constructor(serviceUser, servicePassword) {
        _Credentials_serviceUser.set(this, void 0);
        _Credentials_servicePassword.set(this, void 0);
        __classPrivateFieldSet(this, _Credentials_serviceUser, serviceUser, "f");
        __classPrivateFieldSet(this, _Credentials_servicePassword, servicePassword, "f");
    }
}
_Credentials_serviceUser = new WeakMap(), _Credentials_servicePassword = new WeakMap();
