package com.mku.salmon.vault.image;
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

import com.mku.convert.BitConverter;
import com.mku.fs.drive.utils.FileUtils;
import com.mku.salmon.streams.AesStream;
import com.mku.salmon.vault.io.AesSeekableByteChannel;
import com.mku.salmon.vault.utils.WindowUtils;
import com.mku.salmonfs.file.AesFile;
import com.mku.streams.InputStreamWrapper;
import com.mku.streams.MemoryStream;
import com.mku.streams.RandomAccessStream;

import javafx.embed.swing.SwingFXUtils;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.image.WritableImage;
import org.jcodec.api.FrameGrab;
import org.jcodec.common.model.Picture;
import org.jcodec.scale.AWTUtil;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.IOException;
import java.nio.charset.Charset;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashMap;
import java.util.concurrent.*;

/**
 * Utility class that generates thumbnails for encrypted salmon files
 */
public class Thumbnails {
    private static final String TMP_THUMB_DIR = "tmp";
    private static final int TMP_VIDEO_THUMB_MAX_SIZE = 3 * 1024 * 1024;
    private static final int TMP_GIF_THUMB_MAX_SIZE = 512 * 1024;
    private static final int BUFFER_SIZE = 256 * 1024;
    private static final int THUMBNAIL_SIZE = 128;
    private static final long VIDEO_THUMBNAIL_MSECS = 3000;

    private static final int MAX_CACHE_SIZE = 20 * 1024 * 1024;
    private static final HashMap<AesFile, Image> cache = new HashMap<>();
    private static int TINT_COLOR_ALPHA = 60;
    private static int cacheSize;


    private static final HashMap<AesFile, AesSeekableByteChannel> byteChannels = new HashMap<>();
    private static final Executor executor = Executors.newFixedThreadPool(2);
    private static final Executor videoThumbExecutor = Executors.newFixedThreadPool(2);
    private static final LinkedBlockingDeque<ThumbnailTask> tasks = new LinkedBlockingDeque<>();

    private static class ThumbnailTask {
        AesFile file;
        ImageView view;

        public ThumbnailTask(AesFile salmonFile, ImageView imageView) {
            this.file = salmonFile;
            this.view = imageView;
        }
    }

    /// <summary>
    /// Returns a bitmap thumbnail from an encrypted file
    /// </summary>
    /// <param name="salmonFile">The encrypted media file which will be used to get the thumbnail</param>
    /// <returns></returns>
    public static Image getVideoThumbnail(AesFile salmonFile) throws Exception {
        return getVideoThumbnail(salmonFile, VIDEO_THUMBNAIL_MSECS / 1000f);
    }

    public static boolean isAnimationEnabled() {
        return !animationStopped;
    }

    private static boolean animationStopped = false;

    public static void enableAnimation(boolean value) {
        animationStopped = !value;
    }

    public static synchronized Image getVideoThumbnail(AesFile salmonFile, double secs) throws Exception {
        if (animationStopped)
            return null;
        AesSeekableByteChannel byteChannel = byteChannels.getOrDefault(salmonFile, null);
        if (byteChannel == null) {
            byteChannel = new AesSeekableByteChannel(salmonFile);
            byteChannels.put(salmonFile, byteChannel);
        }
        byteChannel.setPosition(0);
        Picture picture = FrameGrab.getFrameFromChannelAtSec(byteChannel, secs);
        BufferedImage bufferedImage = AWTUtil.toBufferedImage(picture);
        WritableImage image = SwingFXUtils.toFXImage(bufferedImage, null);
        return image;
    }

    public synchronized static void clearVideoThumbnails() {
        for (AesSeekableByteChannel byteChannel : byteChannels.values()) {
            try {
                byteChannel.close();
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        }
        byteChannels.clear();
    }

    /// <summary>
    /// Create a partial temp file from an encrypted file that will be used to get the thumbnail
    /// </summary>
    /// <param name="salmonFile">The encrypted file that will be used to get the temp file</param>
    /// <returns></returns>
    private static File getVideoTmpFile(AesFile salmonFile) {
        throw new UnsupportedOperationException();
    }

    /// <summary>
    /// Return a MemoryStream with the partial unencrypted file contents.
    /// This will read only the beginning contents of the file since we don't need the whole file.
    /// </summary>
    /// <param name="salmonFile">The encrypted file to be used</param>
    /// <param name="maxSize">The max content length that will be decrypted from the beginning of the file</param>
    /// <returns></returns>
    private static RandomAccessStream getTempStream(AesFile salmonFile, long maxSize) throws Exception {
        MemoryStream ms = new MemoryStream();
        AesStream ins = salmonFile.getInputStream();
        byte[] buffer = new byte[BUFFER_SIZE];
        int bytesRead;
        long totalBytesRead = 0;
        while ((bytesRead = ins.read(buffer, 0, buffer.length)) > 0
                && totalBytesRead < maxSize) {
            ms.write(buffer, 0, bytesRead);
            totalBytesRead += bytesRead;
        }
        ms.flush();
        ins.close();
        ms.setPosition(0);
        return ms;
    }

    /// <summary>
    /// Create a bitmap from the unencrypted data contents of a media file
    /// If the file is a gif we get only a certain amount of data from the beginning of the file
    /// since we don't need to get the whole file.
    /// </summary>
    /// <param name="salmonFile"></param>
    /// <returns></returns>
    public static Image generateThumbnail(AesFile salmonFile, ImageView imageView) {

        if (cache.containsKey(salmonFile)) {
            return cache.get(salmonFile);
        }

        ThumbnailTask task = null;
        for (ThumbnailTask t : tasks) {
            if (t.file == salmonFile) {
                task = t;
                break;
            }
        }
        if (task != null) {
            // if there is an older task for this file remove it
            // since we will insert a new task to the front of the queue
            tasks.remove(task);
        }
        task = new ThumbnailTask(salmonFile, imageView);
        tasks.addFirst(task);
        executor.execute(() -> {
            try {
                ThumbnailTask task1 = tasks.take();
                if (FileUtils.isVideo(task1.file.getName()))
                    videoThumbExecutor.execute(() -> {
                        generateThumbnail(task1);
                    });
                else
                    generateThumbnail(task1);
            } catch (Exception e) {
                System.err.println("Could not generate thumbnail: " + e);
            }
        });
        return null;
    }

    private static Image getIcon(AesFile salmonFile) {
        String icon = salmonFile.isFile() ? "/icons/file_item.png" : "/icons/folder.png";
        Image image = null;
        if (salmonFile.isFile()) {
            try {
                String ext = FileUtils.getExtensionFromFileName(salmonFile.getName()).toLowerCase();
                BufferedImage bufferedImage = ImageIO.read(Thumbnails.class.getResourceAsStream(icon));
                BufferedImage nimage = new BufferedImage(
                        bufferedImage.getWidth(),
                        bufferedImage.getHeight(),
                        BufferedImage.TYPE_INT_ARGB_PRE);
                Graphics g = nimage.getGraphics();
                // FIXME: issue with Linux and rendering the tint color
                if (WindowUtils.isLinux()) {
                    addImage(g, bufferedImage, null);
                    addText(g, ext, bufferedImage.getWidth() / 2,
                            bufferedImage.getHeight() / 2, Color.BLACK);
                } else {
                    Color tintColor = getFileColorFromExtension(ext);
                    addImage(g, bufferedImage, tintColor);
                    addText(g, ext, bufferedImage.getWidth() / 2,
                            bufferedImage.getHeight() / 2, Color.WHITE);
                }
                g.dispose();
                image = SwingFXUtils.toFXImage(nimage, null);
            } catch (Exception ex) {
                ex.printStackTrace();
            }
        }
        if (image == null)
            image = new Image(Thumbnails.class.getResourceAsStream(icon));
        return image;
    }

    private static void addImage(Graphics g, BufferedImage bufferedImage, Color tintColor) {
        if(tintColor != null)
            g.setXORMode(tintColor);
        g.drawImage(bufferedImage, 0, 0, null);
        // reset the tint
        if(tintColor != null)
            g.setXORMode(Color.decode("#00000000"));
    }

    private static void addText(Graphics g, String text, int width, int height, Color color) {
        g.setColor(color);
        g.setFont(new Font("Arial", Font.PLAIN, 128));
        FontMetrics fontMetrics = g.getFontMetrics();
        int textWidth = fontMetrics.stringWidth(text);
        int textHeight = fontMetrics.getHeight();
        g.drawString(text, width - (int) Math.ceil(textWidth / 2f), height + (int) Math.ceil(textHeight / 2f));
    }

    private static void generateThumbnail(ThumbnailTask task) {
        Image image = null;
        try {
            if (task.file.isFile()
                    && (FileUtils.isImage(task.file.getName()) || FileUtils.isVideo(task.file.getName()))) {
                image = Thumbnails.fromFile(task.file);
            }
            if (image == null)
                image = getIcon(task.file);
            addCache(task.file, image);
            Image finalImage = image;
            WindowUtils.runOnMainThread(() -> {
                task.view.setImage(finalImage);
            });
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private static void addCache(AesFile file, Image image) {
        if (cacheSize > MAX_CACHE_SIZE)
            resetCache();
        cache.put(file, image);
        cacheSize += image.getWidth() * image.getHeight() * 4;
    }

    public static void resetCache() {
        cacheSize = 0;
        cache.clear();
    }

    public static void resetCache(AesFile file) {
        if (cache.containsKey(file)) {
            Image image = cache.get(file);
            cacheSize -= image.getWidth() * image.getHeight() * 4;
            cache.remove(file);
        }
    }

    private static Image fromFile(AesFile file) {
        BufferedInputStream stream = null;
        Image image = null;
        try {
            String ext = FileUtils.getExtensionFromFileName(file.getName()).toLowerCase();
            if (FileUtils.isImage(file.getName())) {
                if (ext.equals("gif") && file.getLength() > TMP_GIF_THUMB_MAX_SIZE)
                    stream = new BufferedInputStream(new InputStreamWrapper(getTempStream(file, TMP_GIF_THUMB_MAX_SIZE)), BUFFER_SIZE);
                else
                    stream = new BufferedInputStream(new InputStreamWrapper(file.getInputStream()), BUFFER_SIZE);
                image = new Image(stream, THUMBNAIL_SIZE, THUMBNAIL_SIZE, true, true);
            } else {
                image = getVideoThumbnail(file);
            }
        } catch (Exception ex) {
            ex.printStackTrace();
        } finally {
            if (stream != null) {
                try {
                    stream.close();
                } catch (IOException e) {
                    throw new RuntimeException(e);
                }
            }
        }
        return image;
    }

    private static Color getFileColorFromExtension(String extension) throws NoSuchAlgorithmException {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] bytes = extension.getBytes(Charset.defaultCharset());
        byte[] hashValue = md.digest(bytes);
        StringBuilder sb = new StringBuilder();
        sb.append(BitConverter.toHex(hashValue));
        Color color = Color.decode("#" + sb.substring(0, 6));
        color = new Color(255 - color.getRed(), 255 - color.getGreen(),
                255 - color.getBlue(), TINT_COLOR_ALPHA);
        return color;
    }
}
