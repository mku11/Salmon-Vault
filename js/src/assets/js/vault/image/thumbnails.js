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

import { FileUtils } from "../../lib/simple-fs/fs/drive/utils/file_utils.js";
import { MemoryStream } from "../../lib/simple-io/streams/memory_stream.js";

/**
 * Utility class that generates thumbnails for encrypted salmon files
 */
export class Thumbnails {
    static TMP_THUMB_DIR = "tmp";
    static TMP_VIDEO_THUMB_MAX_SIZE = 3 * 1024 * 1024;
    static TMP_GIF_THUMB_MAX_SIZE = 1 * 1024 * 1024;
    static ENC_BUFFER_SIZE = 512 * 1024;
    static THUMBNAIL_SIZE = 64;

    static MAX_CACHE_SIZE = 128 * 1024;
    static cache = new Map();
    static TINT_COLOR_ALPHA = 127;
    static cacheSize = 0;
    static enableCache = true;
    static objectURLs = new Set();


    static isAnimationEnabled() {
        return !Thumbnails.animationStopped;
    }

    static animationStopped = false;

    static enableAnimation(value) {
        Thumbnails.animationStopped = !value;
    }

    /**
     * Returns a bitmap thumbnail from an encrypted file
     * @param {AesFile} salmonFile The file
     * @param {number} position The position in seconds
     * @returns {Promise<>}
     */
    static async getVideoThumbnail(salmonFile, position = 3) {
        let blob = await Thumbnails.#getVideoTmpBlob(salmonFile);
        let imageUrl = Thumbnails.createObjectURL(blob);
        return new Promise((resolve, reject) => {
            let video = document.createElement('video');
            video.setAttribute('src', imageUrl);
            video.addEventListener('loadedmetadata', () => {
                video.addEventListener('seeked', () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    ctx.canvas.toBlob((blob) => {
                        const thumbnailImage = new Image();
                        let thumbnailImageUrl = Thumbnails.createObjectURL(blob);
                        thumbnailImage.src = thumbnailImageUrl;
                        resolve(thumbnailImage);
                    }, 'image/png', 0.75);
                });
                if (video.duration < position)
                    position = 0;
                video.currentTime = position;
            });
            video.load();
        });
    }

    static async #getVideoTmpBlob(salmonFile) {
        let ms = await Thumbnails.#getTempStream(salmonFile, Thumbnails.TMP_VIDEO_THUMB_MAX_SIZE);
        let blob = new Blob([ms.toArray().buffer]);
        await ms.close();
        return blob;    
    }

    static async #getTempStream(salmonFile, maxSize) {
        let ms = new MemoryStream();
        let ins = await salmonFile.getInputStream();
        let buffer = new Uint8Array(Thumbnails.ENC_BUFFER_SIZE);
        let bytesRead;
        let totalBytesRead = 0;
        while ((bytesRead = await ins.read(buffer, 0, buffer.length)) > 0
                && totalBytesRead < maxSize) {
            await ms.write(buffer, 0, bytesRead);
            totalBytesRead += bytesRead;
        }
        await ms.flush();
        await ins.close();
        await ms.setPosition(0);
        return ms;
    }

    /**
     * 
     * @param {AesFile} salmonFile The aes file
     * @param {number} width The width
     * @param {number} height The height
     * @param {number} position The position in seconds if file is media
     * @returns 
     */
    static async generateThumbnail(salmonFile, width, height, position = 3) {
        let image = null;
        let key = await Thumbnails.getHash(salmonFile) + ":" + width + ":" + height;
        if (await salmonFile.isFile() && FileUtils.isVideo(await salmonFile.getName())) {        
            key += ":" + position;
        }
        if (Thumbnails.cache.has(key)) {
            let size = 0;
            [image,size] = Thumbnails.cache.get(key);
            if(image.parentElement!=null)
                image.parentElement.removeChild(image);
            return image;
        }
        
        try {
            if (await salmonFile.isFile() && FileUtils.isImage(await salmonFile.getName())) {
                image = await Thumbnails.getImageThumbnail(salmonFile);
                image = await Thumbnails.#resize(image, width, height);
            } else if (await salmonFile.isFile() && FileUtils.isVideo(await salmonFile.getName())) {
                image = await Thumbnails.getVideoThumbnail(salmonFile, position);
                image = await Thumbnails.#resize(image, width, height);
            }
        } catch (e) {
            throw e;
        }
        if(image != null)
            Thumbnails.addCache(key, image);
        return image;
    }

    static async getIcon(salmonFile, width, height) {
        let icon = await salmonFile.isFile() ? 
        "assets/images/common-res/icons/file_item_small.png" : 
        "assets/images/common-res/icons/folder_small.png";
        let image = new Image();
        if (image.width > image.height) {
            image.width = width;
        } else {
            image.height = height;
        }
        image.src = icon;
        if (await salmonFile.isFile()) {
            try {
                let ext = FileUtils.getExtensionFromFileName(await salmonFile.getName()).toLowerCase();
                let hsv = await Thumbnails.getHSVFromExtension(ext);
                Thumbnails.addImage(image, hsv);
            } catch (ex) {
                console.error(ex);
            }
        }

        return image;
    }

    static addImage(image, hsv) {
        let [h, s, v] = hsv;
        let filter = `sepia(100%) saturate(${Math.trunc((s + 1) * 100)}%) 
            brightness(${Math.trunc((v + 0.4) * 100)}%) hue-rotate(${Math.trunc(h)}deg)`;
        image.style.filter = filter;
    }

    static addText(image, text) {
        if (image.complete) {
            this.addTextWhenLoaded(image, text);
        } else {
            image.onload = () => {
                this.addTextWhenLoaded(image, text);
            };
        }
    }

    static addTextWhenLoaded(image, text) {
        let parent = image.parentElement;
        let textElement = document.createElement("div");
        textElement.style.fontSize = "0.8em";
        textElement.style.position = "absolute";
        textElement.style.top = "50%";
        textElement.style.left = "50%";
        textElement.style.transform = "translate(-50%, -50%)";
        textElement.classList.add("image-text");
        textElement.innerText = text;
        if(parent)
            parent.appendChild(textElement);
    }

    static async #resize(image, width, height) {
        return new Promise((resolve, reject) => {
            image.onload = () => {
                let hOffset = 0;
                let vOffset = 0;
                if (image.width > image.height) {
                    vOffset = (height - width * image.height / image.width) / 2;
                } else {
                    hOffset = (width - height * image.width / image.height) / 2;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = "rgba(0, 0, 0, 0)";
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(image, hOffset, vOffset, width - hOffset * 2, height - vOffset * 2);
                ctx.canvas.toBlob((blob) => {
                    const resizedImage = new Image();
                    let resizedImageUrl = Thumbnails.createObjectURL(blob);
                    resizedImage.src = resizedImageUrl;
                    resolve(resizedImage);
                }, 'image/png', 0.75);
            }
        });
    }

    static async addCache(key, image) {
        if (!Thumbnails.enableCache)
            return;
        if (Thumbnails.cacheSize > Thumbnails.MAX_CACHE_SIZE)
            Thumbnails.resetCache();
        let blob = await fetch(image.src).then(r => r.blob());
        Thumbnails.cache.set(key,[image,blob.size]);
        Thumbnails.cacheSize += blob.size;
    }

    static async getHash(file) {
        return (await file.getRealPath() + ":" + await file.getLastDateModified());
    }

    static resetCache() {
        let reduceSize = 0;
        let keysToRemove = [];
        for (let key of Thumbnails.cache.keys()) {
            let [image,size] = Thumbnails.cache.get(key);
            if (image != null)
                reduceSize += size;
            if (reduceSize >= Thumbnails.MAX_CACHE_SIZE / 2)
                break;
            keysToRemove.push(key);
        }
        for (let key of keysToRemove) {
            let [image,size] = Thumbnails.cache.get(key);
            Thumbnails.cache.delete(key);
            if (image != null)
                Thumbnails.cacheSize -= size;
            Thumbnails.clearObjectURL(image.src);
        }
        
    }

    static async removeCache(file) {
        let key = await Thumbnails.getHash(file);
        if (Thumbnails.cache.has(key)) {
            if(Thumbnails.cache.get(key) != null) {
                let [image,size] = Thumbnails.cache.get(key);
                Thumbnails.cacheSize -= size;
            }
            Thumbnails.cache.delete(key);
        }
    }

    static async getImageThumbnail(file) {
        let stream = null;
        let image = new Image();
        let blob = null;
        let ms = null;
        try {
            stream = await file.getInputStream();
            ms = new MemoryStream();
            await stream.copyTo(ms);
            blob = new Blob([ms.toArray().buffer]);
            let imageUrl = Thumbnails.createObjectURL(blob);
            image.src = imageUrl;
        } catch (ex) {
            console.error(ex);
        } finally {
            if (ms != null) {
                await ms.close();
            }
            if (stream != null) {
                await stream.close();
            }
        }
        return image;
    }

    static async getHSVFromExtension(extension) {
        let bytes = new TextEncoder().encode(extension);
        let hashValue = await crypto.subtle.digest("SHA-256", bytes);
        let digest = new Uint8Array(hashValue);
        let [r, g, b] = [digest[0] / 256, digest[1] / 256, digest[2] / 256];
        let cmax = Math.max(r, g, b);
        let cmin = Math.min(r, g, b);
        let d = cmax - cmin;
        let h;
        if (cmax == r) h = (60 * ((g - b) / d % 6));
        else if (cmax == g) h = (60 * ((b - r) / d + 2));
        else if (cmax == b) h = (60 * ((r - g) / d + 4));
        let s = (cmax == 0) ? 0 : d / cmax;
        let v = cmax;
        return [h, s, v];
    }

    static createObjectURL(blob) {
        let url = URL.createObjectURL(blob);
        Thumbnails.objectURLs.add(url);
        return url;
    }

    static clearObjectURL(url = null) {
        if(url != null) {
            URL.revokeObjectURL(url);
            Thumbnails.objectURLs.delete(url);
        } else {
            for(let nUrl of Thumbnails.objectURLs) {
                if(nUrl != null)
                    Thumbnails.clearObjectURL(nUrl);
            }
        }
    }
}
