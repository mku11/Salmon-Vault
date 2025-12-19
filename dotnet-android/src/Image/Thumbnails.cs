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
using Android.Graphics;
using Android.Media;
using Android.Provider;
using Java.IO;
using Mku.Salmon.Streams;
using Mku.Android.SalmonFS.Media;
using Salmon.Vault.Main;
using System;
using Mku.SalmonFS.File;
using Mku.FS.Drive.Utils;

namespace Salmon.Vault.Image;

/// <summary>
/// Utility class that generates thumbnails for encrypted salmon files
/// </summary>
public class Thumbnails
{
    private static readonly string TMP_THUMB_DIR = "tmp";
    private static readonly int TMP_VIDEO_THUMB_MAX_SIZE = 5 * 1024 * 1024;
    private static readonly int TMP_GIF_THUMB_MAX_SIZE = 512 * 1024;
    private static readonly int BUFFER_SIZE = 256 * 1024;
	private static readonly int MEDIA_BUFFERS = 2;
    private static readonly int MEDIA_BUFFER_SIZE = 4 * 1024 * 1024;
    private static readonly int MEDIA_BACKOFFSET = 256 * 1024;
    private static readonly int MEDIA_THREADS = 1;
	
    private static Random random = new Random(DateTime.Now.Millisecond);
	private static bool checkIntegrity = true;

	public static Bitmap GetVideoThumbnail(AesFile file, long ms)
	{
        return getVideoThumbnailRetriever(file, ms);
    }

    public static void SetCheckIntegrity(bool checkIntegrity) {
        Thumbnails.checkIntegrity = checkIntegrity;
    }
	
    public static Bitmap getVideoThumbnailRetriever(AesFile file, long ms)
    {
        MediaMetadataRetriever retriever = null;
        Bitmap bitmap = null;
        try
        {
			file.SetVerifyIntegrity(Thumbnails.checkIntegrity);
            retriever = new MediaMetadataRetriever();
			AesMediaDataSource source = new AesMediaDataSource(file,
                    MEDIA_BUFFERS, MEDIA_BUFFER_SIZE, MEDIA_THREADS, MEDIA_BACKOFFSET);
            retriever.SetDataSource(source);
            bitmap = retriever.GetFrameAtTime(ms * 1000);
        }
        catch (Exception e)
        {
            System.Console.Error.WriteLine(e);
        }
        finally
        {
            try
            {
                retriever.Release();
				if (Android.OS.Build.VERSION.SdkInt >= Android.OS.BuildVersionCodes.Q) {
                    retriever.Close();
                }
            }
            catch (System.IO.IOException e)
            {
                System.Console.Error.WriteLine(e);
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
    private static System.IO.Stream GetTempStream(AesFile salmonFile, long maxSize)
    {
        System.IO.MemoryStream ms = new System.IO.MemoryStream();
        AesStream ins = salmonFile.GetInputStream();
        byte[] buffer = new byte[BUFFER_SIZE];
        int bytesRead;
        long totalBytesRead = 0;
        while ((bytesRead = ins.Read(buffer, 0, buffer.Length)) > 0
                && totalBytesRead < maxSize)
        {
            ms.Write(buffer, 0, bytesRead);
            totalBytesRead += bytesRead;
        }
        ms.Flush();
        ins.Close();
        ms.Position = 0;
        return ms;
    }

    /**
     * Create a bitmap from the unecrypted data contents of a media file
     * If the file is a gif we get only a certain amount of data from the beginning of the file
     * since we don't need to get the whole file.
     *
     * @param salmonFile
     */
    public static Bitmap GetImageThumbnail(AesFile salmonFile)
    {
        System.IO.Stream stream = null;
        Bitmap bitmap = null;
        try
        {
			salmonFile.SetVerifyIntegrity(Thumbnails.checkIntegrity);
            string ext = FileUtils.GetExtensionFromFileName(salmonFile.Name).ToLower();
            if (ext.Equals("gif") && salmonFile.Length > TMP_GIF_THUMB_MAX_SIZE)
                stream = new System.IO.BufferedStream(GetTempStream(salmonFile, TMP_GIF_THUMB_MAX_SIZE), BUFFER_SIZE);
            else
                stream = salmonFile.GetInputStream().AsReadStream();
            BitmapFactory.Options options = new BitmapFactory.Options();
            options.InSampleSize = 4;
            bitmap = BitmapFactory.DecodeStream(stream, null, options);
        }
        catch (System.Exception ex)
        {
            System.Console.Error.WriteLine(ex);
        }
        finally
        {
            if (stream != null)
                stream.Close();
        }
        return bitmap;
    }
}