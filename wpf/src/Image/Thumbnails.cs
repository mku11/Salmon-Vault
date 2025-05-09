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

using Mku.Salmon.Streams;
using Salmon.Vault.ViewModel;
using Salmon.Vault.Utils;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using BitConverter = Mku.Convert.BitConverter;
using Mku.SalmonFS.File;
using Mku.FS.Drive.Utils;
using Mku.FS.File;
using System.Diagnostics;
using System.Threading;

namespace Salmon.Vault.Image;

/// <summary>
/// Utility for thumbnail generation
/// </summary>
public class Thumbnails
{
    private static readonly int TMP_VIDEO_THUMB_MAX_SIZE = 5 * 1024 * 1024;
    private static readonly int TMP_GIF_THUMB_MAX_SIZE = 512 * 1024;
    private static readonly int BUFFER_SIZE = 256 * 1024;
    private static readonly int THUMBNAIL_SIZE = 128;
    private static readonly int MAX_CACHE_SIZE = 20 * 1024 * 1024;

    private static readonly ConcurrentDictionary<AesFile, BitmapImage> cache = new ConcurrentDictionary<AesFile, BitmapImage>();
    private static int cacheSize;
    private static object _lock = new object();

    /// <summary>
    /// Returns a bitmap thumbnail from an encrypted file
    /// </summary>
    /// <param name="salmonFile">The encrypted media file which will be used to get the thumbnail</param>
    /// <returns></returns>
    public static BitmapImage GetVideoThumbnail(AesFile salmonFile)
    {
        return GetVideoThumbnail(salmonFile, 0);
    }

    public static BitmapImage GetVideoThumbnail(AesFile salmonFile, long ms)
    {
        throw new NotSupportedException();
    }

    public static BitmapImage GetVideoThumbnailMedia(IFile file, long ms)
    {
        throw new NotSupportedException();
    }

    /// <summary>
    /// Create a partial temp file from an encrypted file that will be used to get the thumbnail
    /// </summary>
    /// <param name="salmonFile">The encrypted file that will be used to get the temp file</param>
    /// <returns></returns>
    private static IFile GetVideoTmpFile(AesFile salmonFile)
    {
        throw new NotSupportedException();
    }

    /// <summary>
    /// Return a MemoryStream with the partial unencrypted file contents.
    /// This will read only the beginning contents of the file since we don't need the whole file.
    /// </summary>
    /// <param name="salmonFile">The encrypted file to be used</param>
    /// <param name="maxSize">The max content length that will be decrypted from the beginning of the file</param>
    /// <returns></returns>
    private static Stream GetTempStream(AesFile salmonFile, long maxSize)
    {
        MemoryStream ms = new MemoryStream();
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

    /// <summary>
    /// Create a bitmap from the unencrypted data contents of a media file
    /// If the file is a gif we get only a certain amount of data from the beginning of the file
    /// since we don't need to get the whole file.
    /// </summary>
    /// <param name="salmonFile"></param>
    /// <returns></returns>
    public static void GenerateThumbnailAsync(SalmonFileViewModel item)
    {
        if (cache.ContainsKey(item.GetAesFile()))
        {
            BitmapImage bitmapImage = cache[item.GetAesFile()];
            WindowUtils.RunOnMainThread(() =>
            {
                item.Image = bitmapImage;
            });
            return;
        }
        Task.Run(() =>
        {
            
            try
            {
                lock (_lock)
                {
                    GenerateThumbnail(item);
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine(ex);
                Console.Error.WriteLine(ex);
                WindowUtils.RunOnMainThread(() =>
                {
                    SetDefaultIcon(item);
                });
            }
        }).ConfigureAwait(false);
    }

    private static void SetDefaultIcon(SalmonFileViewModel item)
    {
        BitmapImage bitmapImage = GetIcon(item.GetAesFile());
        AddCache(item.GetAesFile(), bitmapImage);
        item.Image = bitmapImage;
    }

    private static void GenerateThumbnail(SalmonFileViewModel item)
    {

        bool isDirectory = false;
        string name = "";
        isDirectory = item.GetAesFile().IsDirectory;
        name = item.GetAesFile().Name;
        
        BitmapImage bitmapImage;
        if (isDirectory || !FileUtils.IsImage(name))
        {
            WindowUtils.RunOnMainThread(() =>
            {
                SetDefaultIcon(item);
            });
        }
        else
        {
            // we might have multiple requests so we make sure we process only once
            AddCache(item.GetAesFile(), null);

            Stream nStream = GenerateThumbnail(item.GetAesFile());
            if(nStream == null)
            {
                SetDefaultIcon(item);
                return;
            }
            WindowUtils.RunOnMainThread(() =>
            {
                try
                {
                    bitmapImage = new BitmapImage();
                    bitmapImage.BeginInit();
                    bitmapImage.CacheOption = BitmapCacheOption.OnLoad;
                    bitmapImage.StreamSource = nStream;
                    bitmapImage.EndInit();
                    bitmapImage.Freeze();
                    item.Image = bitmapImage;
                    AddCache(item.GetAesFile(), bitmapImage);
                }
                catch (Exception ex)
                {
                    Debug.WriteLine(ex);
                    Console.Error.WriteLine(ex);
                    SetDefaultIcon(item);
                }
            });
        }
    }

    private static BitmapImage GetIcon(AesFile salmonFile)
    {
        string icon = salmonFile.IsFile ? "Icons/file_item_small.png" : "Icons/folder_small.png";
        Uri uri = new Uri("pack://application:,,,/"
            + Assembly.GetAssembly(typeof(Thumbnails)).GetName().Name
            + ";component/" + icon, UriKind.RelativeOrAbsolute);
        BitmapImage bitmapImage = new BitmapImage(uri);
        return bitmapImage;
    }

    private static Stream GenerateThumbnail(AesFile file)
    {
        Stream stream = FromFile(file);
        if (stream == null)
            return null;
        System.Drawing.Bitmap bitmap = new System.Drawing.Bitmap(stream);
        stream.Close();
        bitmap = ResizeBitmap(bitmap, THUMBNAIL_SIZE);
        return FromBitmap(bitmap);
    }

    private static Stream FromBitmap(System.Drawing.Bitmap bitmap)
    {
        MemoryStream ms = new MemoryStream();
        bitmap.Save(ms, System.Drawing.Imaging.ImageFormat.Bmp);
        ms.Position = 0;
        return ms;
    }

    private static System.Drawing.Bitmap ResizeBitmap(System.Drawing.Bitmap bitmap, int size)
    {
        float ratio = bitmap.Width / (float)bitmap.Height;
        int nWidth = ratio > 1 ? size : (int)(size * ratio);
        int nHeight = ratio < 1 ? size : (int)(size / ratio);
        return new System.Drawing.Bitmap(bitmap, new System.Drawing.Size(nWidth, nHeight));
    }

    private static void AddCache(AesFile file, BitmapImage image)
    {
        if (cacheSize > MAX_CACHE_SIZE)
            ResetCache();
        cache[file] = image;
        try
        {
            if (image != null)
                cacheSize += (int)(image.Width * image.Height * 4);
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex);
        }
    }

    public static void ResetCache()
    {
        int reduceSize = 0;
        List<AesFile> keysToRemove = new List<AesFile>();
        foreach (AesFile key in cache.Keys)
        {
            BitmapImage bitmap = cache[key];
            if (bitmap != null)
                reduceSize += (int)(bitmap.Width * bitmap.Height * 4);
            if (reduceSize >= MAX_CACHE_SIZE / 2)
                break;
            keysToRemove.Add(key);
        }
        foreach (AesFile key in keysToRemove)
        {
            cache.Remove(key, out BitmapImage bitmap);
            if (bitmap != null)
                cacheSize -= (int)(bitmap.Width * bitmap.Height * 4);
        }
    }

    public static void ResetCache(AesFile file)
    {
        if (cache.ContainsKey(file))
        {
            BitmapImage image = cache[file];
            cacheSize -= (int)(image.Width * image.Height * 4);
            cache.Remove(file, out _);
        }
    }

    private static Stream FromFile(AesFile file)
    {
        Stream stream = null;
        try
        {
            string ext = FileUtils.GetExtensionFromFileName(file.Name).ToLower();
            if (ext.Equals("gif") && file.RealFile.Length > TMP_GIF_THUMB_MAX_SIZE)
            {
                stream = GetTempStream(file, TMP_GIF_THUMB_MAX_SIZE);
            }
            else
            {
                stream = GetTempStream(file, long.MaxValue);
            }
            stream.Position = 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex);
            if (stream != null)
                stream.Close();
            throw ex;
        }
        return stream;
    }

    public static Color GetTintColor(AesFile salmonFile)
    {
        if (!salmonFile.IsFile || FileUtils.IsImage(salmonFile.Name))
            return Colors.Transparent;

        SHA256 sha256 = SHA256.Create();
        string ext = GetExt(salmonFile);
        byte[] hashValue = sha256.ComputeHash(Encoding.UTF8.GetBytes(ext));
        string hashstring = BitConverter.ToHex(hashValue);
        Color color = (Color)ColorConverter.ConvertFromString("#" + hashstring.Substring(0, 6));
        return color;
    }

    public static string GetExt(AesFile salmonFile)
    {
        if (!salmonFile.IsFile || FileUtils.IsImage(salmonFile.Name))
            return "";
        return FileUtils.GetExtensionFromFileName(salmonFile.Name).ToLower();
    }
}