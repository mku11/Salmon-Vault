package com.mku.salmon.vault.provider;

import static android.provider.DocumentsContract.Root;

import android.database.Cursor;
import android.database.MatrixCursor;
import android.os.CancellationSignal;
import android.os.Handler;
import android.os.ParcelFileDescriptor;
import android.provider.DocumentsContract;
import android.provider.DocumentsProvider;
import android.webkit.MimeTypeMap;

import androidx.annotation.Nullable;

import com.mku.android.salmon.drive.AndroidDrive;
import com.mku.file.IRealFile;
import com.mku.file.JavaFile;
import com.mku.salmon.SalmonDrive;
import com.mku.salmon.SalmonFile;
import com.mku.salmon.vault.android.R;
import com.mku.salmon.vault.main.SalmonApplication;
import com.mku.salmon.vault.model.SalmonVaultManager;
import com.mku.salmon.vault.services.AndroidSettingsService;
import com.mku.salmon.vault.services.ISettingsService;
import com.mku.salmon.vault.services.ServiceLocator;
import com.mku.utils.FileUtils;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;

public class SalmonFileProvider extends DocumentsProvider {
    public static final long MAX_FILE_SIZE_TO_SHARE = 50 * 1024 * 1024;
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
            if (mimeType == null)
                mimeType = "application/octetstream";
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
    public Cursor queryDocument(String documentId, String[] projection) {
        setupServices();
        final MatrixCursor result = new MatrixCursor(documentProjection);
        SalmonDrive drive = getManager().getDrive();
        if (drive == null)
            return result;
        final MatrixCursor.RowBuilder row = result.newRow();
        if (documentId.equals(rootPath))
            getRootDocument(row);
        else {
            try {
                SalmonFile file = parsePath(documentId);
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
        if (getManager().getDrive() == null)
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
        SalmonFile salmonFile = null;
        File sharedFile = null;
        String filename = null;
        final int accessMode = ParcelFileDescriptor.parseMode(mode);
        try {
            salmonFile = parsePath(documentId);
            if (salmonFile.getSize() > MAX_FILE_SIZE_TO_SHARE) {
                throw new RuntimeException(SalmonApplication.getInstance().getString(R.string.FileSizeTooLarge));
            }
            filename = salmonFile.getBaseName();
            sharedFile = ((AndroidDrive) SalmonVaultManager.getInstance().getDrive())
                    .copyToSharedFolder(salmonFile);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        final boolean isWrite = (mode.indexOf('w') != -1);
        if (isWrite) {
            try {
                Handler handler = new Handler(getContext().getMainLooper());
                SalmonFile file = salmonFile;
                IRealFile importFile = new JavaFile(sharedFile.getPath());
                String finalFilename = filename;
                return ParcelFileDescriptor.open(sharedFile, accessMode, handler,
                        new ParcelFileDescriptor.OnCloseListener() {
                            @Override
                            public void onClose(IOException e) {
                                SalmonFile parentDir = file.getParent();
                                getManager().importFiles(new IRealFile[]{importFile}, parentDir, false,
                                        (SalmonFile[] importedSalmonFiles) ->
                                        {
                                            try {
                                                if (!importedSalmonFiles[0].exists())
                                                    return;
                                                importedSalmonFiles[0].rename(finalFilename);
                                                file.delete();
                                                if (getManager().getDrive() != null)
                                                    getManager().refresh();
                                            } catch (Exception ex) {
                                                ex.printStackTrace();
                                                throw new RuntimeException("Could not reimport file: " + ex.getMessage());
                                            }
                                        });
                            }
                        });
            } catch (IOException e) {
                throw new FileNotFoundException("Could not reimport shared file: " + e.getMessage());
            }
        } else {
            return ParcelFileDescriptor.open(sharedFile, accessMode);
        }
    }

    @Override
    public boolean onCreate() {
        return false;
    }

    protected SalmonVaultManager getManager() {
        return SalmonVaultManager.getInstance();
    }
}
