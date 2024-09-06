package com.mku.salmon.vault.provider;

import android.content.res.AssetFileDescriptor;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.Handler;
import android.os.Parcel;
import android.os.ParcelFileDescriptor;
import android.provider.DocumentsContract;
import android.provider.DocumentsProvider;
import android.webkit.MimeTypeMap;

import static android.provider.DocumentsContract.Root;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.mku.salmon.SalmonDrive;
import com.mku.salmon.SalmonFile;
import com.mku.salmon.streams.SalmonFileInputStream;
import com.mku.salmon.streams.SalmonStream;
import com.mku.salmon.vault.android.R;
import com.mku.salmon.vault.model.SalmonVaultManager;
import com.mku.salmon.vault.services.AndroidBrowserService;
import com.mku.salmon.vault.services.AndroidFileDialogService;
import com.mku.salmon.vault.services.AndroidFileService;
import com.mku.salmon.vault.services.AndroidKeyboardService;
import com.mku.salmon.vault.services.AndroidSettingsService;
import com.mku.salmon.vault.services.IFileDialogService;
import com.mku.salmon.vault.services.IFileService;
import com.mku.salmon.vault.services.IKeyboardService;
import com.mku.salmon.vault.services.ISettingsService;
import com.mku.salmon.vault.services.IWebBrowserService;
import com.mku.salmon.vault.services.ServiceLocator;
import com.mku.utils.FileUtils;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.ArrayList;

public class SalmonFileProvider extends DocumentsProvider {
    private static final String MIME_TYPE = "salmon/encrypted";
    private static String rootPath = "/";
    private static String[] rootProjection = new String[]{
            DocumentsContract.Root.COLUMN_ROOT_ID,
            DocumentsContract.Root.COLUMN_DOCUMENT_ID,
            DocumentsContract.Root.COLUMN_ICON,
            DocumentsContract.Root.COLUMN_TITLE,
            DocumentsContract.Root.COLUMN_FLAGS};

    private static String[] documentProjection = new String[]{
            DocumentsContract.Document.COLUMN_DOCUMENT_ID,
            DocumentsContract.Document.COLUMN_DISPLAY_NAME,
            DocumentsContract.Document.COLUMN_MIME_TYPE,
            DocumentsContract.Document.COLUMN_FLAGS,
            DocumentsContract.Document.COLUMN_SIZE,
            DocumentsContract.Document.COLUMN_LAST_MODIFIED,
            DocumentsContract.Document.COLUMN_ICON};

    private boolean hasServices;

    protected void setupServices() {
        if (hasServices)
            return;
        ServiceLocator.getInstance().register(ISettingsService.class, new AndroidSettingsService());
        hasServices = true;
    }

    @Override
    public Cursor queryRoots(String[] projection) throws FileNotFoundException {
        final MatrixCursor result = new MatrixCursor(rootProjection);
        final MatrixCursor.RowBuilder row = result.newRow();
        getRoot(row);
        return result;
    }

    private void getRoot(MatrixCursor.RowBuilder row) {
        row.add(Root.COLUMN_ROOT_ID, rootPath);
        row.add(Root.COLUMN_DOCUMENT_ID, rootPath);
        row.add(Root.COLUMN_FLAGS, Root.FLAG_SUPPORTS_CREATE);
        row.add(Root.COLUMN_TITLE, "Salmon Files");
        row.add(Root.COLUMN_ICON, R.drawable.logo_128x128);
    }

    private void getRootDocument(MatrixCursor.RowBuilder row) {
        SalmonDrive drive = SalmonVaultManager.getInstance().getDrive();
        row.add(DocumentsContract.Document.COLUMN_DOCUMENT_ID, rootPath);
        row.add(DocumentsContract.Document.COLUMN_DISPLAY_NAME, rootPath);
        row.add(DocumentsContract.Document.COLUMN_MIME_TYPE,
                DocumentsContract.Document.MIME_TYPE_DIR);
        row.add(DocumentsContract.Document.COLUMN_FLAGS,
                DocumentsContract.Document.FLAG_DIR_SUPPORTS_CREATE);
        row.add(DocumentsContract.Document.COLUMN_SIZE, 0);
        row.add(DocumentsContract.Document.COLUMN_LAST_MODIFIED, drive.getRoot().getLastDateTimeModified());
    }

    private void getDocument(MatrixCursor.RowBuilder row, SalmonFile file) throws IOException {
        row.add(DocumentsContract.Document.COLUMN_DOCUMENT_ID, file.getPath());
        row.add(DocumentsContract.Document.COLUMN_DISPLAY_NAME, file.getBaseName());
        if (file.isDirectory())
            row.add(DocumentsContract.Document.COLUMN_MIME_TYPE, DocumentsContract.Document.MIME_TYPE_DIR);
        else {
            String ext = FileUtils.getExtensionFromFileName(file.getBaseName()).toLowerCase();
            String mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
            if(mimeType == null)
                mimeType = "application/octet-stream";
            row.add(DocumentsContract.Document.COLUMN_MIME_TYPE, mimeType);
        }
        int flags = 0;
        if (file.isDirectory())
            flags |= DocumentsContract.Document.FLAG_DIR_SUPPORTS_CREATE;
        else {
            flags |= DocumentsContract.Document.FLAG_SUPPORTS_WRITE;
        }
        row.add(DocumentsContract.Document.COLUMN_FLAGS, flags);
        row.add(DocumentsContract.Document.COLUMN_SIZE, file.getRealFile().length());
        row.add(DocumentsContract.Document.COLUMN_LAST_MODIFIED, file.getLastDateTimeModified());
        if (file.isDirectory())
            row.add(DocumentsContract.Document.COLUMN_ICON, R.drawable.folder);
        else
            row.add(DocumentsContract.Document.COLUMN_ICON, R.drawable.file_item_small);
    }

    @Override
    public Cursor queryDocument(String documentId, String[] projection) throws FileNotFoundException {
        setupServices();
        final MatrixCursor result = new MatrixCursor(documentProjection);
        SalmonDrive drive = getManager().getDrive();
        if (drive == null)
            return result;
        final MatrixCursor.RowBuilder row = result.newRow();
        if (documentId.equals(rootPath))
            getRootDocument(row);
        else {
            SalmonFile file = null;
            try {
                file = parsePath(documentId);
                getDocument(row, file);
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        }
        return result;
    }

    @Override
    public Cursor queryChildDocuments(String parentDocumentId, String[] projection, String sortOrder) throws FileNotFoundException {
        final MatrixCursor result = new MatrixCursor(documentProjection);
        if(getManager().getDrive() == null)
            return result;
        try {
            SalmonFile dir = parsePath(parentDocumentId);
            SalmonFile[] files = dir.listFiles();
            for (SalmonFile file : files) {
                MatrixCursor.RowBuilder row = result.newRow();
                getDocument(row, file);
            }
        } catch (IOException e) {
            throw new FileNotFoundException(e.toString());
        }
        return result;
    }

    private SalmonFile parsePath(String documentId) throws IOException {
        String[] parts = documentId.split("/");
        SalmonFile file = getManager().getDrive().getRoot();
        for (int i = 1; i < parts.length; i++) {
            file = file.getChild(parts[i]);
        }
        return file;
    }

    @Override
    public ParcelFileDescriptor openDocument(String documentId, String mode,
                                             @Nullable CancellationSignal signal)
            throws FileNotFoundException {
        // TODO: check the CancellationSignal periodically
        final File file;
        try {
            file = createFileDocument(documentId);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        final int accessMode = ParcelFileDescriptor.parseMode(mode);

        final boolean isWrite = (mode.indexOf('w') != -1);
        if(isWrite) {
            try {
                Handler handler = new Handler(getContext().getMainLooper());
                return ParcelFileDescriptor.open(file, accessMode, handler,
                        new ParcelFileDescriptor.OnCloseListener() {
                            @Override
                            public void onClose(IOException e) {
                                // re-import file into the vault
                            }
                        });
            } catch (IOException e) {
                throw new FileNotFoundException("Failed to open document with id"
                        + documentId + " and mode " + mode);
            }
        } else {
            return ParcelFileDescriptor.open(file, accessMode);
        }
    }

    private File createFileDocument(String documentId) throws IOException {
        SalmonFile file = parsePath(documentId);
        File sharedFile = null;
        return sharedFile;
    }

    @Override
    public boolean onCreate() {
        return false;
    }

    protected SalmonVaultManager getManager() {
        return SalmonVaultManager.getInstance();
    }

    private class SalmonAssetFileDescriptor extends AssetFileDescriptor {
        private SalmonFile file;
        public SalmonAssetFileDescriptor(SalmonFile file) throws IOException {
            super(null, 0, file.getSize());
            String ext = FileUtils.getExtensionFromFileName(file.getBaseName()).toLowerCase();
            String mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
            if(mimeType == null)
                mimeType = "*/*";
            this.file = file;
        }

        public FileInputStream createInputStream() throws IOException {
            return new SalmonInputStream(file);
        }
    }

    private class SalmonInputStream extends FileInputStream {
        private SalmonFile file;
        private SalmonStream stream;
        public SalmonInputStream(SalmonFile file) throws FileNotFoundException {
            super((String) null);
            this.file = file;
        }

        public int read(byte buffer[], int offset, int length) throws IOException {
            return stream.read(buffer, offset, length);
        }

        public void close() throws IOException {
            stream.close();
        }
    }
}
