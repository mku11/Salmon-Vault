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
import { LocalStorageFileStream } from '../streams/ls_file_stream.js';
/**
 * LocalStorage implementation. This can be used to store small files.
 */
export class LocalStorageFile {
    /**
     * Directory separator
     */
    static separator = "/";
    #filePath;
    /**
     * Instantiate a real file represented by the filepath provided.
     * @param {string} path The filepath.
     */
    constructor(path) {
        this.#filePath = path;
    }
    /**
     * Create a directory under this directory. Not supported.
     * @param {string} dirName The name of the new directory.
     * @returns {Promise<IFile>} The newly created directory.
     */
    async createDirectory(dirName) {
        throw new Error("Not supported");
    }
    /**
     * Create a file under this directory.
     * @param {string} filename The name of the new file.
     * @returns {Promise<IFile>} The newly created file.
     * @throws IOException Thrown if there is an IO error.
     */
    async createFile(filename) {
        let child = new LocalStorageFile(this.#filePath + LocalStorageFile.separator + filename);
        return child;
    }
    /**
     * Delete this file or directory.
     * @returns {Promise<boolean>} True if deletion is successful.
     */
    async delete() {
        localStorage.removeItem(this.#filePath);
        return true;
    }
    /**
     * True if file or directory exists.
     * @returns {Promise<boolean>} True if exists
     */
    async exists() {
        return localStorage.getItem(this.#filePath) != null;
    }
    /**
     * Get the path of this file. For local storage this is the same as the absolute filepath.
     * @returns {string}  The file path
     */
    getPath() {
        return this.#filePath;
    }
    /**
     * Get the display path on the physical disk. For local storage this is the same as the filepath.
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
        return this.#filePath.split(LocalStorageFile.separator).pop();
    }
    /**
     * Get a stream for reading the file.
     * @returns {Promise<RandomAccessStream>} The stream to read from.
     * @throws FileNotFoundException
     */
    async getInputStream() {
        let fileStream = new LocalStorageFileStream(this, "r");
        return fileStream;
    }
    /**
     * Get a stream for writing to this file.
     * @returns {Promise<RandomAccessStream>} The stream to write to.
     * @throws FileNotFoundException
     */
    async getOutputStream() {
        let fileStream = new LocalStorageFileStream(this, "rw");
        return fileStream;
    }
    /**
     * Get the parent directory of this file or directory.
     * @returns {Promise<IFile>} The parent directory.
     */
    async getParent() {
        let index = this.#filePath.lastIndexOf(LocalStorageFile.separator);
        let dirPath = this.#filePath.substring(0, index);
        let dir = new LocalStorageFile(dirPath);
        return dir;
    }
    /**
     * True if this is a directory.
     * @returns {Promise<boolean>} True if directory
     */
    async isDirectory() {
        return false;
    }
    /**
     * True if this is a file.
     * @returns {Promise<boolean>} True if file
     */
    async isFile() {
        return true;
    }
    /**
     * Get the last modified date on disk. Not supported.
     * @returns {Promise<number>} Last date modified
     */
    async getLastDateModified() {
        throw new Error("Not supported");
    }
    /**
     * Get the size of the file on disk.
     * @returns {Promise<number>} The size
     */
    async getLength() {
        let contents = localStorage.getItem(this.#filePath);
        if (contents == null)
            return 0;
        return btoa(contents).length;
    }
    /**
     * Get the count of files and subdirectories. Not supported.
     * @returns {Promise<number>} The number of files and subdirectories.
     */
    async getChildrenCount() {
        throw new Error("Not supported");
    }
    /**
     * List all files under this directory. Not supported.
     * @returns {Promise<IFile[]>} The list of files.
     */
    async listFiles() {
        throw new Error("Not supported");
    }
    /**
     * Move this file or directory under a new directory. Not supported.
     * @param {IFile} newDir The target directory.
     * @param {MoveOptions} [options] The options.
     * @returns {Promise<IFile>} The moved file. Use this file for subsequent operations instead of the original.
     */
    async move(newDir, options) {
        throw new Error("Not supported");
    }
    /**
     * Move this file or directory under a new directory. Not supported.
     * @param {IFile} newDir    The target directory.
     * @param {CopyOptions} [options] The options
     * @returns {Promise<IFile | null>} The copied file. Use this file for subsequent operations instead of the original.
     * @throws IOException Thrown if there is an IO error.
     */
    async copy(newDir, options) {
        throw new Error("Not supported");
    }
    /**
     * Get the file or directory under this directory with the provided name.
     * @param {string} filename The name of the file or directory.
     * @returns {Promise<IFile | null>} The child
     */
    async getChild(filename) {
        let child = new LocalStorageFile(this.#filePath + LocalStorageFile.separator + filename);
        return child;
    }
    /**
     * Rename the current file or directory. Not supported.
     * @param {string} newFilename The new name for the file or directory.
     * @returns {Promise<boolean>} True if successfully renamed.
     */
    async renameTo(newFilename) {
        throw new Error("Not supported");
    }
    /**
     * Create this directory under the current filepath.
     * @returns {boolean} True if created.
     */
    async mkdir() {
        // no-op
        return true;
    }
    /**
     * Reset cached properties
     */
    reset() {
    }
    /**
     * Get the credentials
     * @return The credentials
     */
    getCredentials() {
        return null;
    }
    /**
     * Returns a string representation of this object
     * @returns {string} The string
     */
    toString() {
        return this.#filePath;
    }
}
