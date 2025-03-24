package com.mku.salmon.vault.provider;

import static android.provider.DocumentsContract.Root;

import android.database.Cursor;
import android.database.MatrixCursor;
import android.os.CancellationSignal;
import android.os.Handler;
import android.os.Parcel;
import android.os.ParcelFileDescriptor;
import android.provider.DocumentsContract;
import android.provider.DocumentsProvider;
import android.webkit.MimeTypeMap;

import androidx.annotation.Nullable;

import com.mku.android.salmonfs.drive.AndroidDrive;
import com.mku.convert.BitConverter;
import com.mku.fs.drive.utils.FileUtils;
import com.mku.fs.file.File;
import com.mku.fs.file.IFile;
import com.mku.salmon.Generator;
import com.mku.salmon.vault.android.R;
import com.mku.salmon.vault.main.SalmonApplication;
import com.mku.salmon.vault.model.SalmonVaultManager;
import com.mku.salmon.vault.services.AndroidSettingsService;
import com.mku.salmon.vault.services.ISettingsService;
import com.mku.salmon.vault.services.ServiceLocator;
import com.mku.salmonfs.drive.AesDrive;
import com.mku.salmonfs.file.AesFile;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;

public class SalmonFileProvider extends DocumentsProvider {
    public static final long MAX_FILE_SIZE_TO_SHARE = 128 * 1024 * 1024;
    public static final long MEDIUM_FILE_SIZE_TO_SHARE = 10 * 1024 * 1024;
    private static String rootPath = "/";

    private static HashMap<String, Boolean> authorizedApps = new HashMap<>();
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

    public static void authorizeApp(String packageName) {
        if (packageName != null && authorizedApps.containsKey(packageName))
            authorizedApps.put(packageName, true);
    }

    public static java.io.File createSharedFile(AesFile salmonFile) throws Exception {
        java.io.File sharedFile = ((AndroidDrive) SalmonVaultManager.getInstance().getDrive())
                .copyToSharedFolder(salmonFile);
        byte[] rand = Generator.getSecureRandomBytes(32);
        java.io.File dir = new java.io.File(sharedFile.getParentFile(), BitConverter.toHex(rand));
        if(!dir.mkdir())
            throw new RuntimeException("Could not create dir");
        java.io.File nFile = new java.io.File(dir, sharedFile.getName());
        if(!sharedFile.renameTo(nFile))
            throw new RuntimeException("Could not rename file");
        return nFile;
    }

    protected void setupServices() {
        if (hasServices)
            return;
        ServiceLocator.getInstance().register(ISettingsService.class, new AndroidSettingsService());
        hasServices = true;
    }

    @Override
    public Cursor queryRoots(String[] projection) {
        final MatrixCursor result = new MatrixCursor(rootProjection);
        final MatrixCursor.RowBuilder row = result.newRow();
        getRoot(row);
        return result;
    }

    private void getRoot(MatrixCursor.RowBuilder row) {
        row.add(Root.COLUMN_ROOT_ID, rootPath);
        row.add(Root.COLUMN_DOCUMENT_ID, rootPath);
        row.add(Root.COLUMN_TITLE, "Salmon Files");
        row.add(Root.COLUMN_ICON, R.drawable.logo_128x128);
    }

    private void getRootDocument(MatrixCursor.RowBuilder row) {
        AesDrive drive = SalmonVaultManager.getInstance().getDrive();
        row.add(DocumentsContract.Document.COLUMN_DOCUMENT_ID, rootPath);
        row.add(DocumentsContract.Document.COLUMN_DISPLAY_NAME, rootPath);
        row.add(DocumentsContract.Document.COLUMN_MIME_TYPE,
                DocumentsContract.Document.MIME_TYPE_DIR);
        row.add(DocumentsContract.Document.COLUMN_FLAGS, 0);
        row.add(DocumentsContract.Document.COLUMN_SIZE, 0);
        row.add(DocumentsContract.Document.COLUMN_LAST_MODIFIED, System.currentTimeMillis());
    }

    private void getErrorDocument(MatrixCursor.RowBuilder row, String text) {
        row.add(DocumentsContract.Document.COLUMN_DOCUMENT_ID, "0");
        row.add(DocumentsContract.Document.COLUMN_DISPLAY_NAME, text);
        row.add(DocumentsContract.Document.COLUMN_MIME_TYPE, "application/octetstream");
        row.add(DocumentsContract.Document.COLUMN_FLAGS, 0);
        row.add(DocumentsContract.Document.COLUMN_SIZE, 0);
        row.add(DocumentsContract.Document.COLUMN_LAST_MODIFIED, System.currentTimeMillis());
        row.add(DocumentsContract.Document.COLUMN_ICON, R.drawable.info_small);
    }

    private void getDocument(MatrixCursor.RowBuilder row, AesFile file) throws IOException {
        row.add(DocumentsContract.Document.COLUMN_DOCUMENT_ID, file.getPath());
        row.add(DocumentsContract.Document.COLUMN_DISPLAY_NAME, file.getName());
        if (file.isDirectory())
            row.add(DocumentsContract.Document.COLUMN_MIME_TYPE, DocumentsContract.Document.MIME_TYPE_DIR);
        else {
            String ext = FileUtils.getExtensionFromFileName(file.getName()).toLowerCase();
            String mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
            if (mimeType == null)
                mimeType = "application/octetstream";
            row.add(DocumentsContract.Document.COLUMN_MIME_TYPE, mimeType);
        }
        int flags = 0;
        if (file.isFile())
            flags |= DocumentsContract.Document.FLAG_SUPPORTS_WRITE;
        row.add(DocumentsContract.Document.COLUMN_FLAGS, flags);
        row.add(DocumentsContract.Document.COLUMN_SIZE, file.getRealFile().getLength());
        row.add(DocumentsContract.Document.COLUMN_LAST_MODIFIED, file.getLastDateModified());
        if (file.isDirectory())
            row.add(DocumentsContract.Document.COLUMN_ICON, R.drawable.folder);
        else
            row.add(DocumentsContract.Document.COLUMN_ICON, R.drawable.file_item_small);
    }

    @Override
    public Cursor queryDocument(String documentId, String[] projection) {
        setupServices();
        final MatrixCursor result = new MatrixCursor(documentProjection);
        AesDrive drive = getManager().getDrive();
        final MatrixCursor.RowBuilder row = result.newRow();
		if (drive == null) {
            getErrorDocument(row, "No opened vaults");
            return result;
        }

        if (documentId.equals(rootPath))
            getRootDocument(row);
        else {
            if (!checkAppAuthorized()) {
                return result;
            }
            try {
                AesFile file = parsePath(documentId);
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
        if (getManager().getDrive() == null) {
            MatrixCursor.RowBuilder row = result.newRow();
            getErrorDocument(row, "No opened vaults");
            return result;
        }
        if (!checkAppAuthorized()) {
            MatrixCursor.RowBuilder row = result.newRow();
            getErrorDocument(row, "App not authorized");
            return result;
        }
        try {
            AesFile dir = parsePath(parentDocumentId);
            AesFile[] files = dir.listFiles();
            for (AesFile file : files) {
                MatrixCursor.RowBuilder row = result.newRow();
                getDocument(row, file);
            }
        } catch (IOException e) {
            throw new FileNotFoundException(e.toString());
        }
        return result;
    }

    private AesFile parsePath(String documentId) throws IOException {
        String[] parts = documentId.split("/");
        AesFile file = getManager().getDrive().getRoot();
        for (int i = 1; i < parts.length; i++) {
            file = file.getChild(parts[i]);
        }
        return file;
    }

    @Override
    public ParcelFileDescriptor openDocument(String documentId, String mode,
                                             @Nullable CancellationSignal signal)
            throws FileNotFoundException {
        if (!checkAppAuthorized()) {
            throw new FileNotFoundException("App not authorized, use Salmon Vault app to allow access");
        }
        // TODO: check the CancellationSignal periodically
        AesFile salmonFile;
        java.io.File sharedFile;
        String filename;
        final int accessMode = ParcelFileDescriptor.parseMode(mode);
        try {
            salmonFile = parsePath(documentId);
            if (salmonFile.getLength() > MAX_FILE_SIZE_TO_SHARE) {
                throw new RuntimeException(SalmonApplication.getInstance().getString(R.string.FileSizeTooLarge));
            }
            filename = salmonFile.getName();
            sharedFile = createSharedFile(salmonFile);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        ParcelFileDescriptor descriptor;
        final boolean isWrite = (mode.indexOf('w') != -1);
        if (isWrite) {
            try {
                Handler handler = new Handler(getContext().getMainLooper());
                AesFile file = salmonFile;
                IFile importFile = new File(sharedFile.getPath());
                String finalFilename = filename;
                descriptor = ParcelFileDescriptor.open(sharedFile, accessMode, handler,
                        e -> {
                            AesFile parentDir = file.getParent();
                            getManager().importFiles(new IFile[]{importFile}, parentDir, false,
                                    (AesFile[] importedAesFiles) ->
                                    {
                                        try {
                                            if (!importedAesFiles[0].exists())
                                                return;
                                            importedAesFiles[0].rename(finalFilename);
                                            file.delete();
                                            if (getManager().getDrive() != null)
                                                getManager().refresh();
                                        } catch (Exception ex) {
                                            ex.printStackTrace();
                                            throw new RuntimeException("Could not reimport file: " + ex.getMessage());
                                        }
                                    });
                        });
            } catch (IOException e) {
                throw new FileNotFoundException("Could not reimport shared file: " + e.getMessage());
            }
        } else {
            descriptor = ParcelFileDescriptor.open(sharedFile, accessMode);
        }
        return descriptor;
    }

    private boolean checkAppAuthorized() {
        String callingPackageName = getCallingPackage();
        boolean allowed = false;
        if (!authorizedApps.containsKey(callingPackageName)) {
            authorizedApps.put(callingPackageName, false);
        } else {
            Boolean res = authorizedApps.get(callingPackageName);
            allowed = res == null ? false : res;
        }
        return allowed;
    }

    public static ArrayList<String> getApps(boolean authorized) {
        ArrayList<String> list = new ArrayList<>();
        for (String packageName : authorizedApps.keySet()) {
            Boolean allowed = authorizedApps.get(packageName);
            if (packageName != null && allowed != null && authorized == allowed)
                list.add(packageName);
        }
        return list;
    }

    @Override
    public boolean onCreate() {
        return false;
    }

    protected SalmonVaultManager getManager() {
        return SalmonVaultManager.getInstance();
    }
}
