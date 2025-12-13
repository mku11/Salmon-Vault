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
/**
 * Utility class for platform specifics.
 */
export class Platform {
    /**
     * Returns the running platform.
     * @returns {PlatformType} The current version
     */
    static getPlatform() {
        // @ts-ignore
        if (typeof process === 'object')
            return PlatformType.NodeJs;
        else
            return PlatformType.Browser;
    }
    /**
     * Returns the running operating system.
     * @returns {OSType} The operating system
     */
    static getOS() {
        // @ts-ignore
        if (typeof process === 'object') {
            // @ts-ignore
            switch (process.platform) {
                case "win32":
                    return OSType.Windows;
                case "linux":
                    return OSType.Linux;
                case "darwin":
                    return OSType.Darwin;
            }
        }
        return OSType.Unknown;
    }
    /**
     * Imports CommonJS node libraries. Do not use in the browser.
     * @returns {any} The module export
     */
    static async require(moduleName) {
        if (Platform.getPlatform() == PlatformType.NodeJs) {
            // @ts-ignore
            const { createRequire } = await import('module');
            let requireModule = createRequire(import.meta.url);
            return requireModule(moduleName);
        }
        return null;
    }
    /**
     * Get the absolute path to a js module ie: getAbsolutePath("file.js", import.meta.url);
     * @param path The path
     * @param modulePath The module path, ie: import.meta.url
     * @returns {Promise<string>} The absolute path
     */
    static async getAbsolutePath(path, modulePath) {
        if (Platform.getPlatform() == PlatformType.NodeJs) {
            const { fileURLToPath } = await import('node:url');
            modulePath = fileURLToPath(modulePath);
        }
        let idx = modulePath.lastIndexOf("\\");
        if (idx < 0)
            idx = modulePath.lastIndexOf("/");
        let currDir = "";
        if (idx >= 0)
            currDir = modulePath.substring(0, idx);
        let absPath = currDir + "/" + path;
        return absPath;
    }
}
/**
 * The platform the script is running on.
 */
export var PlatformType;
(function (PlatformType) {
    /**
     * Browser
     */
    PlatformType[PlatformType["Browser"] = 0] = "Browser";
    /**
     * NodeJs
     */
    PlatformType[PlatformType["NodeJs"] = 1] = "NodeJs";
})(PlatformType || (PlatformType = {}));
/**
 * The operating system the script is running on.
 */
export var OSType;
(function (OSType) {
    /**
     * Windows
     */
    OSType[OSType["Windows"] = 0] = "Windows";
    /**
     * Linux
     */
    OSType[OSType["Linux"] = 1] = "Linux";
    /**
     * Darwin (MacOS)
     */
    OSType[OSType["Darwin"] = 2] = "Darwin";
    /**
     * Unknown
     */
    OSType[OSType["Unknown"] = 3] = "Unknown";
})(OSType || (OSType = {}));
