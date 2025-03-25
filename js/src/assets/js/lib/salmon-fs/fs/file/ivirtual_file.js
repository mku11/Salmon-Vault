/*
MIT License

Copyright (c) 2021 Max Kas

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions;

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
 * Directory copy options (recursively)
 */
export class VirtualRecursiveCopyOptions {
    constructor() {
        /**
         * Callback when file with same name exists
         * (file: IVirtualFile) => Promise<string>
         */
        this.autoRename = undefined;
        /**
         * True to autorename folders
         */
        this.autoRenameFolders = false;
        /**
         * Callback when file changes
         * (file: IVirtualFile, ex: Error) => void
         */
        this.onFailed = undefined;
        /**
         * Callback where progress changed
         * (file: IVirtualFile, position: number, length: number) => void
         */
        this.onProgressChanged = undefined;
    }
}
/**
 * Directory move options (recursively)
 */
export class VirtualRecursiveMoveOptions {
    constructor() {
        /**
         * Callback when file with the same name exists
         * (file: IVirtualFile) => Promise<string>
         */
        this.autoRename = undefined;
        /**
         * True to autorename folders
         */
        this.autoRenameFolders = false;
        /**
         * Callback when file failed
         * (file: IVirtualFile, ex: Error) => void
         */
        this.onFailed = undefined;
        /**
         * Callback when progress changes
         * (file: IVirtualFile, position: number, length: number) => void
         */
        this.onProgressChanged = undefined;
    }
}
/**
 * Directory move options (recursively)
 */
export class VirtualRecursiveDeleteOptions {
    constructor() {
        /**
         * Callback when file failed
         * (file: IVirtualFile, ex: Error) => void
         */
        this.onFailed = undefined;
        /**
         * Callback when progress changed
         * (file: IVirtualFile, position: number, length: number) => void
         */
        this.onProgressChanged = undefined;
    }
}
