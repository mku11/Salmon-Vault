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
using Mku.Utils;
using Mku.Salmon;
using BitConverter = Mku.Convert.BitConverter;
using System;
using System.Collections.Generic;
using Java.Lang;
using Android.Provider;
using Mku.Android.Salmon.Drive;
using Salmon.Vault.Model;
using Salmon.Vault.Services;
using Android.Database;
using static Android.Provider.DocumentsContract;
using Salmon.Vault.DotNetAndroid;
using System.IO;
using Android.Webkit;
using Mku.File;
using static Android.OS.ParcelFileDescriptor;
using Salmon.Vault.Main;

namespace Salmon.Vault.Provider;

public class SalmonFileProvider : DocumentsProvider
{
    public static readonly long MAX_FILE_SIZE_TO_SHARE = 50 * 1024 * 1024;
    public static readonly long MEDIUM_FILE_SIZE_TO_SHARE = 10 * 1024 * 1024;
    private static string rootPath = "/";

    private static Dictionary<string, bool> authorizedApps = new Dictionary<string, bool>();
    private static string[] rootProjection = new string[]{
            DocumentsContract.Root.ColumnRootId,
            DocumentsContract.Root.ColumnDocumentId,
            DocumentsContract.Root.ColumnIcon,
            DocumentsContract.Root.ColumnTitle,
            DocumentsContract.Root.ColumnFlags};

    private static string[] documentProjection = new string[]{
            DocumentsContract.Document.ColumnDocumentId,
            DocumentsContract.Document.ColumnDisplayName,
            DocumentsContract.Document.ColumnMimeType,
            DocumentsContract.Document.ColumnFlags,
            DocumentsContract.Document.ColumnSize,
            DocumentsContract.Document.ColumnLastModified,
            DocumentsContract.Document.ColumnIcon};

    private bool hasServices;

    public static void authorizeApp(string packageName)
    {
        if (packageName != null && authorizedApps.ContainsKey(packageName))
            authorizedApps[packageName] = true;
    }

    public static Java.IO.File CreateSharedFile(SalmonFile salmonFile)
    {
        Java.IO.File sharedFile = ((AndroidDrive)SalmonVaultManager.Instance.Drive)
                .CopyToSharedFolder(salmonFile);
        byte[] rand = SalmonGenerator.GetSecureRandomBytes(32);
        Java.IO.File dir = new Java.IO.File(sharedFile.ParentFile, BitConverter.ToHex(rand));
        if (!dir.Mkdir())
            throw new RuntimeException("Could not create dir");
        Java.IO.File nFile = new Java.IO.File(dir, sharedFile.Name);
        if (!sharedFile.RenameTo(nFile))
            throw new RuntimeException("Could not rename file");
        return nFile;
    }

    protected void setupServices()
    {
        if (hasServices)
            return;
        ServiceLocator.GetInstance().Register(typeof(ISettingsService), new AndroidSettingsService());
        hasServices = true;
    }

    public override ICursor QueryRoots(string[] projection)
    {
        MatrixCursor result = new MatrixCursor(rootProjection);
        MatrixCursor.RowBuilder row = result.NewRow();
        getRoot(row);
        return result;
    }

    private void getRoot(MatrixCursor.RowBuilder row)
    {
        row.Add(Root.ColumnRootId, rootPath);
        row.Add(Root.ColumnDocumentId, rootPath);
        row.Add(Root.ColumnTitle, "Salmon Files");
        row.Add(Root.ColumnIcon, Resource.Drawable.logo_128x128);
    }

    private void getRootDocument(MatrixCursor.RowBuilder row)
    {
        SalmonDrive drive = SalmonVaultManager.Instance.Drive;
        row.Add(DocumentsContract.Document.ColumnDocumentId, rootPath);
        row.Add(DocumentsContract.Document.ColumnDisplayName, rootPath);
        row.Add(DocumentsContract.Document.ColumnMimeType,
                DocumentsContract.Document.MimeTypeDir);
        row.Add(DocumentsContract.Document.ColumnFlags, 0);
        row.Add(DocumentsContract.Document.ColumnSize, 0);
        row.Add(DocumentsContract.Document.ColumnLastModified, DateTime.Now.Millisecond);
    }

    private void getErrorDocument(MatrixCursor.RowBuilder row, string text)
    {
        row.Add(DocumentsContract.Document.ColumnDocumentId, "0");
        row.Add(DocumentsContract.Document.ColumnDisplayName, text);
        row.Add(DocumentsContract.Document.ColumnMimeType, "application/octetstream");
        row.Add(DocumentsContract.Document.ColumnFlags, 0);
        row.Add(DocumentsContract.Document.ColumnSize, 0);
        row.Add(DocumentsContract.Document.ColumnLastModified, DateTime.Now.Millisecond);
        row.Add(DocumentsContract.Document.ColumnIcon, Resource.Drawable.info_small);
    }

    private void getDocument(MatrixCursor.RowBuilder row, SalmonFile file)
    {
        row.Add(DocumentsContract.Document.ColumnDocumentId, file.Path);
        row.Add(DocumentsContract.Document.ColumnDisplayName, file.BaseName);
        if (file.IsDirectory)
            row.Add(DocumentsContract.Document.ColumnMimeType, DocumentsContract.Document.MimeTypeDir);
        else
        {
            string ext = FileUtils.GetExtensionFromFileName(file.BaseName).ToLower();
            string mimeType = MimeTypeMap.Singleton.GetMimeTypeFromExtension(ext);
            if (mimeType == null)
                mimeType = "application/octetstream";
            row.Add(DocumentsContract.Document.ColumnMimeType, mimeType);
        }
        int? flags = null;
        if (file.IsFile)
            flags = (int?)DocumentContractFlags.SupportsWrite;
        row.Add(DocumentsContract.Document.ColumnFlags, flags);
        row.Add(DocumentsContract.Document.ColumnSize, file.RealFile.Length);
        row.Add(DocumentsContract.Document.ColumnLastModified, file.LastDateTimeModified);
        if (file.IsDirectory)
            row.Add(DocumentsContract.Document.ColumnIcon, Resource.Drawable.folder);
        else
            row.Add(DocumentsContract.Document.ColumnIcon, Resource.Drawable.file_item_small);
    }

    public override ICursor QueryDocument(string documentId, string[] projection)
    {
        setupServices();
        MatrixCursor result = new MatrixCursor(documentProjection);
        SalmonDrive drive = GetManager().Drive;
        MatrixCursor.RowBuilder row = result.NewRow();
        if (drive == null)
        {
            getErrorDocument(row, "No opened vaults");
            return result;
        }

        if (documentId.Equals(rootPath))
            getRootDocument(row);
        else
        {
            if (!CheckAppAuthorized())
            {
                return result;
            }
            try
            {
                SalmonFile file = ParsePath(documentId);
                getDocument(row, file);
            }
            catch (IOException e)
            {
                throw new RuntimeException(e.Message);
            }
        }
        return result;
    }

    public override ICursor QueryChildDocuments(string parentDocumentId, string[] projection, string sortOrder)
    {
        MatrixCursor result = new MatrixCursor(documentProjection);
        if (GetManager().Drive == null)
        {
            MatrixCursor.RowBuilder row = result.NewRow();
            getErrorDocument(row, "No opened vaults");
            return result;
        }
        if (!CheckAppAuthorized())
        {
            MatrixCursor.RowBuilder row = result.NewRow();
            getErrorDocument(row, "App not authorized");
            return result;
        }
        try
        {
            SalmonFile dir = ParsePath(parentDocumentId);
            SalmonFile[] files = dir.ListFiles();
            foreach (SalmonFile file in files)
            {
                MatrixCursor.RowBuilder row = result.NewRow();
                getDocument(row, file);
            }
        }
        catch (IOException e)
        {
            throw new FileNotFoundException(e.ToString());
        }
        return result;
    }

    private SalmonFile ParsePath(string documentId)
    {
        string[] parts = documentId.Split("/");
        SalmonFile file = GetManager().Drive.Root;
        for (int i = 1; i < parts.Length; i++)
        {
            if (parts[i] == "")
                continue;
            file = file.GetChild(parts[i]);
        }
        return file;
    }

    class OnCloseListener : Java.Lang.Object, IOnCloseListener
    {
        SalmonFile file;
        IRealFile importFile;
        SalmonFileProvider provider;
        string filename;

        public OnCloseListener(SalmonFileProvider provider, SalmonFile file, IRealFile importFile, string filename)
        {
            this.file = file;
            this.importFile = importFile;
            this.provider = provider;
            this.filename = filename;
        }

        public void OnClose(Java.IO.IOException? ex)
        {
            SalmonFile parentDir = file.Parent;
            provider.GetManager().ImportFiles(new IRealFile[] { importFile }, parentDir, false,
                (SalmonFile[] importedSalmonFiles) =>
                {
                    try
                    {
                        if (!importedSalmonFiles[0].Exists)
                            return;
                        importedSalmonFiles[0].Rename(filename);
                        file.Delete();
                        if (provider.GetManager().Drive != null)
                            provider.GetManager().Refresh();
                    }
                    catch (Java.Lang.Exception ex)
                    {
                        ex.PrintStackTrace();
                        throw new RuntimeException("Could not reimport file: " + ex.Message);
                    }
                });
        }
    }

    public override Android.OS.ParcelFileDescriptor OpenDocument(string documentId, string mode, Android.OS.CancellationSignal signal)
    {
        if (!CheckAppAuthorized())
        {
            // App not authorized
            return null;
        }
        // TODO: check the CancellationSignal periodically
        SalmonFile salmonFile;
        Java.IO.File sharedFile;
        string filename;
        Android.OS.ParcelFileMode accessMode = Android.OS.ParcelFileDescriptor.ParseMode(mode);
        try
        {
            salmonFile = ParsePath(documentId);
            if (salmonFile.Size > MAX_FILE_SIZE_TO_SHARE)
            {
                throw new RuntimeException(SalmonApplication.GetInstance().GetString(Resource.String.FileSizeTooLarge));
            }
            filename = salmonFile.BaseName;
            sharedFile = CreateSharedFile(salmonFile);
        }
        catch (System.Exception e)
        {
            throw new RuntimeException(e.Message);
        }

        Android.OS.ParcelFileDescriptor descriptor;
        bool isWrite = (mode.IndexOf('w') != -1);
        if (isWrite)
        {
            try
            {
                Android.OS.Handler handler = new Android.OS.Handler(Context.MainLooper);
                SalmonFile file = salmonFile;
                IRealFile importFile = new DotNetFile(sharedFile.Path);
                descriptor = Android.OS.ParcelFileDescriptor.Open(sharedFile, accessMode, handler, new OnCloseListener(this, file, importFile, filename));
            }
            catch (IOException e)
            {
                throw new FileNotFoundException("Could not reimport shared file: " + e.Message);
            }
        }
        else
        {
            descriptor = Android.OS.ParcelFileDescriptor.Open(sharedFile, accessMode);
        }
        return descriptor;
    }

    private bool CheckAppAuthorized()
    {
        string callingPackageName = CallingPackage;
        bool allowed = false;
        if (callingPackageName == null)
            return false;
        if (!authorizedApps.ContainsKey(callingPackageName))
        {
            authorizedApps[callingPackageName] = false;
        }
        else
        {
            bool res = authorizedApps[callingPackageName];
            allowed = res == null ? false : res;
        }
        return allowed;
    }

    public static List<string> GetApps(bool authorized)
    {
        List<string> list = new List<string>();
        foreach (string packageName in authorizedApps.Keys)
        {
            bool allowed = authorizedApps[packageName];
            if (packageName != null && allowed != null && authorized == allowed)
                list.Add(packageName);
        }
        return list;
    }

    public override bool OnCreate()
    {
        return false;
    }

    protected SalmonVaultManager GetManager()
    {
        return SalmonVaultManager.Instance;
    }
}
