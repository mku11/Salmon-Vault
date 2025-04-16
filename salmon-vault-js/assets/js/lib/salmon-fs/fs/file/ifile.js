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
/**
 * Copy contents of a file to another file.
 *
 * @param {IFile} src              The source directory
 * @param {IFile} dest             The target directory
 * @param {CopyContentOptions} [options] The options
 * @returns {Promise<boolean>} True if files are copied successfully
 * @throws IOException Thrown if there is an IO error.
 */
export async function copyFileContents(src, dest, options) {
    let source = await src.getInputStream();
    let target = await dest.getOutputStream();
    try {
        await source.copyTo(target, 0, options === null || options === void 0 ? void 0 : options.onProgressChanged);
    }
    catch (ex) {
        await dest.delete();
        return false;
    }
    finally {
        await source.close();
        await target.close();
    }
    return true;
}
/**
 * Copy a directory recursively
 *
 * @param {IFile} src Source directory
 * @param {IFile} destDir Destination directory to copy into.
 * @param {RecursiveCopyOptions} [options] The options.
 * @throws IOException Thrown if there is an IO error.
 */
export async function copyRecursively(src, destDir, options) {
    if (!options)
        options = new RecursiveCopyOptions();
    let newFilename = src.getName();
    let newFile;
    newFile = await destDir.getChild(newFilename);
    if (await src.isFile()) {
        if (newFile && await newFile.exists()) {
            if (options.autoRename) {
                newFilename = await options.autoRename(src);
            }
            else {
                if (options.onFailed)
                    options.onFailed(src, new Error("Another file exists"));
                return;
            }
        }
        let copyOptions = new CopyOptions();
        copyOptions.newFilename = newFilename;
        copyOptions.onProgressChanged = (position, length) => {
            if (options.onProgressChanged) {
                options.onProgressChanged(src, position, length);
            }
        };
        await src.copy(destDir, copyOptions);
    }
    else if (await src.isDirectory()) {
        if (options.onProgressChanged)
            options.onProgressChanged(src, 0, 1);
        if (destDir.getDisplayPath().startsWith(src.getDisplayPath())) {
            if (options.onProgressChanged)
                options.onProgressChanged(src, 1, 1);
            return;
        }
        if (newFile && await newFile.exists() && options.autoRename && options.autoRenameFolders)
            newFile = await destDir.createDirectory(await options.autoRename(src));
        else if (newFile == null || !await newFile.exists())
            newFile = await destDir.createDirectory(newFilename);
        if (options.onProgressChanged)
            options.onProgressChanged(src, 1, 1);
        for (let child of await src.listFiles()) {
            if (newFile == null)
                throw new Error("Could not get new file");
            await copyRecursively(child, newFile, options);
        }
    }
}
/**
 * Move a directory recursively
 *
 * @param {IFile} file Source directory
 * @param {IFile} destDir Destination directory to move into.
 * @param {RecursiveMoveOptions} [options] The options
 */
export async function moveRecursively(file, destDir, options) {
    if (!options)
        options = new RecursiveMoveOptions();
    // target directory is the same
    let parent = await file.getParent();
    if (parent && parent.getDisplayPath() == destDir.getDisplayPath()) {
        if (options.onProgressChanged) {
            options.onProgressChanged(file, 0, 1);
            options.onProgressChanged(file, 1, 1);
        }
        return;
    }
    let newFilename = file.getName();
    let newFile;
    newFile = await destDir.getChild(newFilename);
    if (await file.isFile()) {
        if (newFile && await newFile.exists()) {
            if (newFile.getDisplayPath() == file.getDisplayPath())
                return;
            if (options.autoRename) {
                newFilename = await options.autoRename(file);
            }
            else {
                if (options.onFailed)
                    options.onFailed(file, new Error("Another file exists"));
                return;
            }
        }
        let moveOptions = new MoveOptions();
        moveOptions.newFilename = newFilename;
        moveOptions.onProgressChanged = (position, length) => {
            if (options.onProgressChanged) {
                options.onProgressChanged(file, position, length);
            }
        };
        await file.move(destDir, moveOptions);
    }
    else if (await file.isDirectory()) {
        if (options.onProgressChanged)
            options.onProgressChanged(file, 0, 1);
        if (destDir.getDisplayPath().startsWith(file.getDisplayPath())) {
            if (options.onProgressChanged)
                options.onProgressChanged(file, 1, 1);
            return;
        }
        if ((newFile && await newFile.exists() && options.autoRename && options.autoRenameFolders)
            || newFile == null || !await newFile.exists()) {
            if (options.autoRename) {
                let moveOptions = new MoveOptions();
                moveOptions.newFilename = await options.autoRename(file);
                newFile = await file.move(destDir, moveOptions);
            }
            return;
        }
        if (options.onProgressChanged)
            options.onProgressChanged(file, 1, 1);
        for (let child of await file.listFiles()) {
            if (newFile == null)
                throw new Error("Could not get new file");
            await moveRecursively(child, newFile, options);
        }
        if (!await file.delete()) {
            if (options.onFailed)
                options.onFailed(file, new Error("Could not delete source directory"));
        }
    }
}
/**
 * Delete a directory recursively
 * @param {RecursiveDeleteOptions} [options] The options
 */
export async function deleteRecursively(file, options) {
    if (!options)
        options = new RecursiveDeleteOptions();
    if (await file.isFile()) {
        if (options.onProgressChanged)
            options.onProgressChanged(file, 0, 1);
        if (!file.delete()) {
            if (options.onFailed)
                options.onFailed(file, new Error("Could not delete file"));
        }
        if (options.onProgressChanged)
            options.onProgressChanged(file, 1, 1);
    }
    else if (await file.isDirectory()) {
        for (let child of await file.listFiles()) {
            await deleteRecursively(child, options);
        }
        if (await !file.delete()) {
            if (options.onFailed)
                options.onFailed(file, new Error("Could not delete directory"));
        }
    }
}
/**
 * Get an auto generated copy of the name for a file.
 * @param {IFile} file The file
 * @returns {Promise<string>} The new file name
 */
export async function autoRenameFile(file) {
    return autoRename(file.getName());
}
;
/**
 * Get an auto generated copy of a file name
 *
 * @param {string} filename The current file name
 * @returns {string} The new file name
 */
export function autoRename(filename) {
    let ext = getExtension(filename);
    let filenameNoExt;
    if (ext.length > 0)
        filenameNoExt = filename.substring(0, filename.length - ext.length - 1);
    else
        filenameNoExt = filename;
    let date = new Date();
    let newFilename = filenameNoExt + " (" + date.getHours().toString().padStart(2, "0")
        + date.getHours().toString().padStart(2, "0") + date.getMinutes().toString().padStart(2, "0")
        + date.getSeconds().toString().padStart(2, "0") + date.getMilliseconds().toString().padStart(3, "0") + ")";
    if (ext.length > 0)
        newFilename += "." + ext;
    return newFilename;
}
/**
 * Get extension from file name
 * @param {string} fileName The file name
 * @returns {string} The extension
 */
export function getExtension(fileName) {
    if (fileName == null)
        return "";
    let index = fileName.lastIndexOf(".");
    if (index >= 0) {
        return fileName.substring(index + 1);
    }
    else
        return "";
}
/**
 * File copy options
 */
export class CopyOptions {
    constructor() {
        /**
         * Override filename
         */
        this.newFilename = undefined;
        /**
         * Callback where progress changed
         * (position: number, length: number) => void
         */
        this.onProgressChanged = undefined;
    }
}
/**
 * File move options
 */
export class MoveOptions {
    constructor() {
        /**
         * Override filename
         */
        this.newFilename = undefined;
        /**
         * Callback where progress changed
         * (position: number, length: number) => void
         */
        this.onProgressChanged = undefined;
    }
}
/**
 * Directory copy options (recursively)
 */
export class RecursiveCopyOptions {
    constructor() {
        /**
         * Callback when file with same name exists
         * (file: IFile) => Promise<string>
         */
        this.autoRename = undefined;
        /**
         * True to autorename folders
         */
        this.autoRenameFolders = false;
        /**
         * Callback when file changes
         * (file: IFile, ex: Error) => void
         */
        this.onFailed = undefined;
        /**
         * Callback where progress changed
         * (file: IFile, position: number, length: number) => void
         */
        this.onProgressChanged = undefined;
    }
}
/**
 * Directory move options (recursively)
 */
export class RecursiveMoveOptions {
    constructor() {
        /**
         * Callback when file with the same name exists
         * (file: IFile) => Promise<string>
         */
        this.autoRename = undefined;
        /**
         * True to autorename folders
         */
        this.autoRenameFolders = false;
        /**
         * Callback when file failed
         */
        this.onFailed = undefined;
        /**
         * Callback when progress changes
         * (file: IFile, position: number, length: number) => void
         */
        this.onProgressChanged = undefined;
    }
}
/**
 * Directory move options (recursively)
 */
export class RecursiveDeleteOptions {
    constructor() {
        /**
         * Callback when file failed
         * (file: IFile, ex: Error) => void
         */
        this.onFailed = undefined;
        /**
         * Callback when progress changed
         * (file: IFile, position: number, length: number) => void
         */
        this.onProgressChanged = undefined;
    }
}
/**
 * Directory move options (recursively)
 */
export class CopyContentsOptions {
    constructor() {
        /**
          * Callback when progress changed
          * (position: number, length: number) => void
          */
        this.onProgressChanged = undefined;
    }
}
