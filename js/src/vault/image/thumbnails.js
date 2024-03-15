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

import { SalmonFileUtils } from "../../lib/salmon-fs/utils/salmon_file_utils.js";
import { MemoryStream } from "../../lib/salmon-core/io/memory_stream.js";


/**
 * Utility class that generates thumbnails for encrypted salmon files
 */
export class Thumbnails {
    static TMP_THUMB_DIR = "tmp";
    static TMP_VIDEO_THUMB_MAX_SIZE = 3 * 1024 * 1024;
    static TMP_GIF_THUMB_MAX_SIZE = 1 * 1024 * 1024;
    static ENC_BUFFER_SIZE = 128 * 1024;
    static THUMBNAIL_SIZE = 128;

    static MAX_CACHE_SIZE = 20 * 1024 * 1024;
    static cache = {};
    static TINT_COLOR_ALPHA = 127;
    static cacheSize;
    static enableCache = false;

    /// <summary>
    /// Returns a bitmap thumbnail from an encrypted file
    /// </summary>
    /// <param name="salmonFile">The encrypted media file which will be used to get the thumbnail</param>
    /// <returns></returns>
    static getVideoThumbnail(salmonFile) {
        return getVideoThumbnail(salmonFile, 0);
    }

    static getVideoThumbnail(salmonFile, ms) {
        throw new UnsupportedOperationException();
    }

    static getVideoThumbnailMedia(file, ms) {
        throw new UnsupportedOperationException();
    }

    /// <summary>
    /// Create a partial temp file from an encrypted file that will be used to get the thumbnail
    /// </summary>
    /// <param name="salmonFile">The encrypted file that will be used to get the temp file</param>
    /// <returns></returns>
    static getVideoTmpFile(salmonFile) {
        throw new UnsupportedOperationException();
    }

    /// <summary>
    /// Create a bitmap from the unencrypted data contents of a media file
    /// If the file is a gif we get only a certain amount of data from the beginning of the file
    /// since we don't need to get the whole file.
    /// </summary>
    /// <param name="salmonFile"></param>
    /// <returns></returns>
    static async generateThumbnail(salmonFile, width, height) {

        if (salmonFile in Thumbnails.cache) {
            return Thumbnails.cache[salmonFile];
        }
        let image = null;
        try {
            if (await salmonFile.isFile() && SalmonFileUtils.isImage(await salmonFile.getBaseName())) {
                image = await Thumbnails.fromFile(salmonFile);
                image = await Thumbnails.resize(image, width, height);
            }
            if (image == null) {
                image = await Thumbnails.getIcon(salmonFile, width, height);
            }
            Thumbnails.addCache(salmonFile, image);
        } catch (e) {
            throw e;
        }
        return image;
    }

    static async getIcon(salmonFile, width, height) {
        let icon = await salmonFile.isFile() ? "common-res/icons/file_small.png" : "common-res/icons/folder_small.png";
        let image = new Image();
        if (image.width > image.height) {
            image.width = width;
        } else {
            image.height = height;
        }
        image.src = icon;
        if (await salmonFile.isFile()) {
            try {
                // let ext = SalmonFileUtils.getExtensionFromFileName(salmonFile.getBaseName()).toLowerCase();
                // BufferedImage bufferedImage = ImageIO.read(Thumbnails.class.getResourceAsStream(icon));
                // BufferedImage nimage = new BufferedImage(
                //         bufferedImage.getWidth(),
                //         bufferedImage.getHeight(),
                //         BufferedImage.TYPE_INT_ARGB_PRE);
                // Graphics g = nimage.getGraphics();
                // Color tintColor = Thumbnails.getFileColorFromExtension(ext);
                // addImage(g, bufferedImage, tintColor);
                // addText(g, ext, bufferedImage.getWidth() / 2, bufferedImage.getHeight() / 2);
                // g.dispose();
                // image = SwingFXUtils.toFXImage(nimage, null);
            } catch (ex) {
                console.error(ex);
            }
        }
        // if (image == null)
        //     image = new Image(Thumbnails.class.getResourceAsStream(icon));
        return image;
    }

    static addImage(g, bufferedImage, tintColor) {
        // g.setXORMode(tintColor);
        // g.drawImage(bufferedImage, 0, 0, null);
        // // reset the tint
        // g.setXORMode(Color.decode("#00000000"));
    }

    static addText(g, text, width, height) {
        // g.setColor(Color.WHITE);
        // g.setFont(new Font("Comic sans MS", Font.BOLD, 96));
        // FontMetrics fontMetrics = g.getFontMetrics();
        // int textWidth = fontMetrics.stringWidth(text);
        // int textHeight = fontMetrics.getHeight();
        // g.drawString(text, width - textWidth / 2, height + textHeight / 4);
    }

    static async resize(image, width, height) {
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
                    let resizedImageUrl = URL.createObjectURL(blob);
                    resizedImage.src = resizedImageUrl;
                    resolve(resizedImage);
                }, 'image/png', 1);
            }
        });
    }

    static addCache(file, image) {
        if (!Thumbnails.enableCache)
            return;
        if (Thumbnails.cacheSize > Thumbnails.MAX_CACHE_SIZE)
            Thumbnails.resetCache();
        Thumbnails.cache[file] = image;
        Thumbnails.cacheSize += image.Width * image.Height * 4;
    }

    static resetCache() {
        Thumbnails.cacheSize = 0;
        Thumbnails.cache.clear();
    }

    static async fromFile(file) {
        let stream = null;
        let image = new Image();
        let blob = null;
        let ms = null;
        try {
            let ext = SalmonFileUtils.getExtensionFromFileName(await file.getBaseName()).toLowerCase();
            stream = await file.getInputStream();
            ms = new MemoryStream();
            await stream.copyTo(ms);
            blob = new Blob([ms.toArray().buffer]);
            let imageUrl = URL.createObjectURL(blob);
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

    static getFileColorFromExtension(extension) {
        // MessageDigest md = MessageDigest.getInstance("MD5");
        // byte[] bytes = extension.getBytes(Charset.defaultCharset());
        // byte[] hashValue = md.digest(bytes);
        // StringBuilder sb = new StringBuilder();
        // sb.append(BitConverter.toHex(hashValue));
        // Color color = Color.decode("#" + sb.substring(0, 6));
        // color = new Color(255 - color.getRed(), 255 - color.getGreen(),
        //         255 - color.getBlue(), Thumbnails.TINT_COLOR_ALPHA);
        // return color;
    }
}
