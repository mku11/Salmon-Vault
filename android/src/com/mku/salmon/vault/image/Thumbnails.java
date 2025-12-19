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

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.MediaMetadataRetriever;
import android.media.ThumbnailUtils;
import android.os.Build;
import android.provider.MediaStore;

import com.mku.android.salmonfs.media.AesMediaDataSource;
import com.mku.fs.drive.utils.FileUtils;
import com.mku.func.Function;
import com.mku.salmonfs.file.AesFile;
import com.mku.streams.InputStreamWrapper;
import com.mku.streams.MemoryStream;
import com.mku.streams.RandomAccessStream;
import com.mku.salmon.streams.AesStream;
import com.mku.salmon.vault.main.SalmonApplication;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.IOException;
import java.util.Random;

/**
 * Utility class that generates thumbnails for encrypted salmon files
 */
public class Thumbnails {
    private static final String TMP_THUMB_DIR = "tmp";
    private static final int TMP_VIDEO_THUMB_MAX_SIZE = 5 * 1024 * 1024;
    private static final int TMP_GIF_THUMB_MAX_SIZE = 512 * 1024;
    private static final int BUFFER_SIZE = 256 * 1024;
    private static final int MEDIA_BUFFERS = 2;
    private static final int MEDIA_BUFFER_SIZE = 4 * 1024 * 1024;
    private static final int MEDIA_BACKOFFSET = 256 * 1024;
    private static final int MEDIA_THREADS = 1;

    private static final int THRESHOLD_SEEK = 30;

    private static Random random = new Random(System.currentTimeMillis());
    private static boolean checkIntegrity = true;

    /**
     * Returns a bitmap thumbnail from an encrypted file
     * @param file
     * @param ms
     * @return
     */
    public static Bitmap getVideoThumbnail(AesFile file, long ms) {
        return getVideoThumbnailRetriever(file, ms);
    }

    public static boolean isCheckIntegrity() {
        return checkIntegrity;
    }

    public static void setCheckIntegrity(boolean checkIntegrity) {
        Thumbnails.checkIntegrity = checkIntegrity;
    }

    public static Bitmap getVideoThumbnailRetriever(AesFile file, long ms) {
        MediaMetadataRetriever retriever = null;
        Bitmap bitmap = null;
        try {
            file.setVerifyIntegrity(Thumbnails.checkIntegrity);
            retriever = new MediaMetadataRetriever();
            AesMediaDataSource source = new AesMediaDataSource(file,
                    MEDIA_BUFFERS, MEDIA_BUFFER_SIZE, MEDIA_THREADS, MEDIA_BACKOFFSET);
            retriever.setDataSource(source);
            bitmap = retriever.getFrameAtTime(ms * 1000);
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            try {
                retriever.release();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    retriever.close();
                }
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
        return bitmap;
    }

    /**
     * Return a MemoryStream with the partial unencrypted file contents.
     * This will read only the beginning contents of the file since we don't need the whole file.
     *
     * @param salmonFile The encrypted file to be used
     * @param maxSize    The max content length that will be decrypted from the beginning of the file
     */
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

    /**
     * Create a bitmap from the unecrypted data contents of a media file
     * If the file is a gif we get only a certain amount of data from the beginning of the file
     * since we don't need to get the whole file.
     *
     * @param salmonFile
     */
    public static Bitmap getImageThumbnail(AesFile salmonFile) throws IOException {
        BufferedInputStream stream = null;
        Bitmap bitmap = null;
        try {
            salmonFile.setVerifyIntegrity(Thumbnails.checkIntegrity);
            String ext = FileUtils.getExtensionFromFileName(salmonFile.getName()).toLowerCase();
            if (ext.equals("gif") && salmonFile.getLength() > TMP_GIF_THUMB_MAX_SIZE)
                stream = new BufferedInputStream(new InputStreamWrapper(getTempStream(salmonFile, TMP_GIF_THUMB_MAX_SIZE)), BUFFER_SIZE);
            else
                stream = new BufferedInputStream(new InputStreamWrapper(salmonFile.getInputStream()), BUFFER_SIZE);
            BitmapFactory.Options options = new BitmapFactory.Options();
            options.inSampleSize = 4;
            bitmap = BitmapFactory.decodeStream(stream, null, options);
        } catch (Exception ex) {
            ex.printStackTrace();
        } finally {
            if (stream != null)
                stream.close();
        }
        return bitmap;
    }
}
