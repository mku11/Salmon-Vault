package com.mku.salmon.vault.dialog;
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

import com.mku.fs.drive.utils.FileUtils;
import com.mku.fs.file.IFile;
import com.mku.fs.file.WSFile;
import com.mku.func.Consumer;
import com.mku.salmon.vault.config.SalmonConfig;
import com.mku.salmon.vault.model.SalmonSettings;
import com.mku.salmon.vault.model.SalmonVaultManager;
import com.mku.salmon.vault.services.IFileDialogService;
import com.mku.salmon.vault.services.IHttpFileService;
import com.mku.salmon.vault.services.IWSFileService;
import com.mku.salmon.vault.services.ServiceLocator;
import com.mku.salmon.vault.utils.ByteUtils;
import com.mku.salmon.vault.utils.URLUtils;
import com.mku.salmonfs.auth.AuthConfig;
import com.mku.salmonfs.drive.AesDrive;
import com.mku.salmonfs.file.AesFile;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

public class SalmonDialogs {
    public static void promptPassword(Consumer<String> onSubmit) {
        SalmonDialog.promptEdit("Vault", "Password", (password, option) -> {
            if (onSubmit != null)
                onSubmit.accept(password);
        }, "", false, false, true, null);
    }

    public static void promptSetPassword(Consumer<String> onPasswordChanged) {
        SalmonDialog.promptEdit("Password", "Type new password", (password, option) ->
        {
            if (password != null) {
                SalmonDialog.promptEdit("Password", "Retype password", (npassword, nOption) ->
                {
                    if (!npassword.equals(password)) {
                        SalmonDialog.promptDialog("Vault", "Passwords do not match", "Cancel");
                    } else {
                        if (onPasswordChanged != null)
                            onPasswordChanged.accept(password);
                    }
                }, "", false, false, true, null);
            }
        }, "", false, false, true, null);
    }

    public static void promptChangePassword() {
        if (!SalmonDialogs.isDriveLoaded())
            return;
        SalmonDialogs.promptSetPassword((pass) ->
        {
            SalmonVaultManager.getInstance().setPassword(pass);
        });
    }

    public static void promptImportAuth() {
        if (!SalmonDialogs.isDriveLoaded())
            return;
        String filename = AesDrive.getDefaultAuthConfigFilename();
        String ext = FileUtils.getExtensionFromFileName(filename);
        HashMap<String, String> filter = new HashMap<>();
        filter.put("Salmon Auth Files", ext);
        ServiceLocator.getInstance().resolve(IFileDialogService.class).openFile("Import Auth File",
                filename, filter, SalmonSettings.getInstance().getVaultLocation(), (file) ->
                {
                    try {
                        AuthConfig.importAuthFile(SalmonVaultManager.getInstance().getDrive(),
                                (IFile) file);
                        SalmonDialog.promptDialog("Auth", "Device is now Authorized");
                    } catch (Exception ex) {
                        ex.printStackTrace();
                        SalmonDialog.promptDialog("Auth", "Could Not Import Auth: " + ex.getMessage());
                    }
                }, SalmonVaultManager.REQUEST_IMPORT_AUTH_FILE);
    }

    public static void promptExportAuth() {
        if (!SalmonDialogs.isDriveLoaded())
            return;
        SalmonDialog.promptEdit("Export Auth File",
                "Enter the Auth ID for the device you want to authorize",
                (targetAuthID, option) ->
                {
                    String filename = AesDrive.getDefaultAuthConfigFilename();
                    String ext = FileUtils.getExtensionFromFileName(filename);
                    HashMap<String, String> filter = new HashMap<>();
                    filter.put("Salmon Auth Files", ext);
                    ServiceLocator.getInstance().resolve(IFileDialogService.class).saveFile("Export Auth file",
                            filename, filter, SalmonSettings.getInstance().getVaultLocation(), (fileResult) ->
                            {
                                try {
                                    AuthConfig.exportAuthFile(SalmonVaultManager.getInstance().getDrive(),
                                            targetAuthID, (IFile) fileResult);
                                    SalmonDialog.promptDialog("Auth", "Auth File Exported");
                                } catch (Exception ex) {
                                    ex.printStackTrace();
                                    SalmonDialog.promptDialog("Auth", "Could Not Export Auth: " + ex.getMessage());
                                }
                            }, SalmonVaultManager.REQUEST_EXPORT_AUTH_FILE);
                }, "", false, false, false, null);
    }

    public static void promptRevokeAuth() {
        if (!SalmonDialogs.isDriveLoaded())
            return;
        SalmonDialog.promptDialog("Revoke Auth",
                "Revoke Auth for this drive? You will still be able to decrypt and view your files but you won't be able to import any more files in this drive.",
                "Ok",
                () ->
                {
                    try {
                        SalmonVaultManager.getInstance().getDrive().revokeAuthorization();
                        SalmonDialog.promptDialog("Action", "Revoke Auth Successful");
                    } catch (Exception e) {
                        e.printStackTrace();
                        SalmonDialog.promptDialog("Action", "Could Not Revoke Auth: " + e.getMessage());
                    }
                },
                "Cancel", null);
    }

    public static void onDisplayAuthID() {
        if (!SalmonDialogs.isDriveLoaded())
            return;
        try {
            String driveID = SalmonVaultManager.getInstance().getDrive().getAuthId();
            SalmonDialog.promptEdit("Auth", "Salmon Auth App ID",
                    null, driveID, false, true, false, null);
        } catch (Exception ex) {
            SalmonDialog.promptDialog("Error", ex.getMessage());
        }
    }

    public static void showProperties(AesFile item) {
        try {
            SalmonDialog.promptDialog("Properties", SalmonVaultManager.getInstance().getFileProperties(item));
        } catch (Exception exception) {
            SalmonDialog.promptDialog("Properties", "Could not get file properties: "
                    + exception.getMessage());
            exception.printStackTrace();
        }
    }

    public static String getFormattedDiskUsage(int items, long size) {
        return "Total items: " + items + "\n"
                + "Size on disk: " + ByteUtils.getBytes(size, 2);
    }

    public static void promptSequenceReset(Consumer<Boolean> resetSequencer) {
        SalmonDialog.promptDialog("Warning", "The nonce sequencer file seems to be tampered.\n" +
                        "This could be a sign of a malicious attack. " +
                        "The recommended action is to press Reset to de-authorize all drives.\n" +
                        "Otherwise only if you know what you're doing press Continue.",
                "Reset", () ->
                {
                    resetSequencer.accept(false);
                },
                "Continue", () ->
                {
                    resetSequencer.accept(true);
                });
    }

    public static void promptDelete() {
        if (!SalmonDialogs.isDriveLoaded())
            return;
        String itemsString = "item(s)?";
        for (AesFile file : SalmonVaultManager.getInstance().getSelectedFiles()) {
            if (file.isDirectory()) {
                itemsString = "item(s) and subfolders?";
                break;
            }
        }
        SalmonDialog.promptDialog(
                "Delete", "Delete " + SalmonVaultManager.getInstance().getSelectedFiles().size() + " " + itemsString,
                "Ok",
                () -> {
                    try {
                        SalmonVaultManager.getInstance().deleteSelectedFiles();
                    } catch (Exception e) {
                        SalmonDialog.promptDialog("Error", "Could not delete files: " + e);
                    }
                },
                "Cancel", null);
    }

    public static void promptExit() {
        SalmonDialog.promptDialog("Exit",
                "Exit App?",
                "Ok",
                () ->
                {
                    SalmonVaultManager.getInstance().closeVault();
                    System.exit(0);
                }, "Cancel", null);
    }

    public static void promptAnotherProcessRunning() {
        SalmonDialog.promptDialog("File Search", "Another process is running");
    }

    public static void promptSearch() {
        if (!SalmonDialogs.isDriveLoaded())
            return;
        SalmonDialog.promptEdit("Search", "Keywords",
                (value, isChecked) ->
                {
                    SalmonVaultManager.getInstance().search(value, isChecked);
                }, "", false, false, false, "Any Term");
    }

    public static void promptAbout() {
        SalmonDialog.promptDialog("About", SalmonConfig.APP_NAME
                        + " v" + SalmonConfig.getVersion() + "\n" + SalmonConfig.ABOUT_TEXT,
                "Project Website", () -> {
                    try {
                        URLUtils.goToUrl(SalmonConfig.SourceCodeURL);
                    } catch (Exception ex) {
                        SalmonDialog.promptDialog("Error", "Could not open Url: "
                                + SalmonConfig.SourceCodeURL);
                    }
                }, "Ok", null);
    }

    public static void promptCreateVault() {
        List<String> vaultTypes = new ArrayList<>(List.of("Local", "Web Service"));
        SalmonDialog.promptSingleValue("Vault Type", vaultTypes,-1,
                (Integer which) ->
                {
                    switch(which) {
                        case 0:
                            promptCreateLocalVault();
                            break;
                        case 1:
                            promptCreateWSVault();
                            break;
                    }
                }
        );
    }

    public static void promptCreateLocalVault() {
        ServiceLocator.getInstance().resolve(IFileDialogService.class).openFolder("Select the vault",
                SalmonSettings.getInstance().getVaultLocation(), (file) -> {
                    SalmonDialogs.promptSetPassword((String pass) ->
                    {
                        SalmonVaultManager.getInstance().createVault((IFile) file, pass);
                    });
                },
                SalmonVaultManager.REQUEST_CREATE_VAULT_DIR);
    }

    public static void promptCreateWSVault() {
        SalmonDialog.promptCredentialsEdit("Open Web Service",
                "Type in the credentials for the Web Service",
                new String[]{"Web Service URL", "User name", "Password"},
                new String[]{"http://192.168.1.4:8080", "user", "password"},
                new boolean[]{false, false, true},
                (texts) -> {
                    SalmonDialog.promptEdit("Create Vault",
                            "Type in the file path for the vault",
                            (path, isChecked) -> {
                                IFile dir = ServiceLocator.getInstance().resolve(IWSFileService.class)
                                        .getFile(path, false, texts[0],
                                                new WSFile.Credentials(texts[1], texts[2]));
                                SalmonDialogs.promptSetPassword((String pass) ->
                                {
                                    SalmonVaultManager.getInstance().createVault(dir, pass);
                                });
                            }, "/tv3", false, false, false, null);
                });
    }

    public static void promptOpenVault() {
        List<String> vaultTypes = new ArrayList<>(List.of("Local", "HTTP", "Web Service"));
        SalmonDialog.promptSingleValue("Vault Type", vaultTypes, -1,
                (Integer which) ->
                {
                    switch(which) {
                        case 0:
                            promptOpenLocalVault();
                            break;
                        case 1:
                            promptOpenHttpVault();
                            break;
                        case 2:
                            promptOpenWSVault();
                            break;
                    }
                }
        );
    }

    public static void promptOpenLocalVault() {
        ServiceLocator.getInstance().resolve(IFileDialogService.class).openFolder("Select the vault",
                SalmonSettings.getInstance().getVaultLocation(),
                (dir) -> {
                    SalmonDialogs.promptPassword((String password) -> {
                        try {
                            SalmonVaultManager.getInstance().openVault((IFile) dir, password);
                        } catch (Exception ex) {
                            SalmonDialog.promptDialog("Error", "Could not create vault: "
                                    + ex.getMessage());
                        }
                    });
                },
                SalmonVaultManager.REQUEST_OPEN_VAULT_DIR);
    }

    public static void promptOpenHttpVault() {
        SalmonDialog.promptEdit("Open Http Vault",
                "Type in the HTTP URL for the remote vault",
                (url, isChecked) -> {
                    IFile dir = ServiceLocator.getInstance().resolve(IHttpFileService.class).getFile(url, false);
                    SalmonDialogs.promptPassword((password) -> {
                        password = "test";
                        SalmonVaultManager.getInstance().openVault(dir, password);
                    });
                }, "http://192.168.1.4/testvaultc", false, false, false, null);
    }

    public static void promptOpenWSVault() {
        SalmonDialog.promptCredentialsEdit("Open Web Service",
                "Type in the credentials for the Web Service",
                new String[]{"Web Service URL", "User name", "Password"},
                new String[]{"http://192.168.1.4:8080", "user", "password"},
                new boolean[]{false, false, true},
                (texts) -> {
                    SalmonDialog.promptEdit("Open Vault",
                            "Type in the file path for the vault",
                            (path, isChecked) -> {
                                IFile dir = ServiceLocator.getInstance().resolve(IWSFileService.class)
                                        .getFile(path, false, texts[0],
                                                new WSFile.Credentials(texts[1], texts[2]));
                                SalmonDialogs.promptPassword((password) -> {
                                    SalmonVaultManager.getInstance().openVault(dir, password);
                                });
                            }, "/tv3", false, false, false, null);
                });
    }

    public static void promptImportFiles(String text, int requestCode) {
        if (!SalmonDialogs.isDriveLoaded())
            return;
        ServiceLocator.getInstance().resolve(IFileDialogService.class).openFiles(text,
                null, SalmonSettings.getInstance().getLastImportDir(), (obj) ->
                {
                    try {
                        IFile[] filesToImport = (IFile[]) obj;
                        if (filesToImport.length == 0)
                            return;

                        IFile parent = filesToImport[0].getParent();
                        if (parent != null && parent.getPath() != null)
                            SalmonSettings.getInstance().setLastImportDir(parent.getPath());
                        SalmonVaultManager.getInstance().importFiles(filesToImport,
                                SalmonVaultManager.getInstance().getCurrDir(), SalmonSettings.getInstance().isDeleteAfterImport(), (AesFile[] importedFiles) ->
                                {
                                    SalmonVaultManager.getInstance().refresh();
                                });
                    } catch (Exception e) {
                        SalmonDialog.promptDialog("Error", "Could not import files: " + e);
                    }
                }, requestCode);
    }

    public static void promptImportFolder(String text, int requestCode) {
        if (!SalmonDialogs.isDriveLoaded())
            return;
        ServiceLocator.getInstance().resolve(IFileDialogService.class).openFolder(text,
                SalmonSettings.getInstance().getLastImportDir(), (obj) ->
                {
                    try {
                        IFile folder = (IFile) obj;
                        if (folder == null)
                            return;
                        if (SalmonSettings.getInstance().isDeleteAfterImport()) {
                            IFile parent = folder.getParent();
                            if (parent != null && parent.getPath() != null)
                                SalmonSettings.getInstance().setLastImportDir(parent.getPath());
                        } else {
                            SalmonSettings.getInstance().setLastImportDir(folder.getPath());
                        }
                        SalmonVaultManager.getInstance().importFiles(new IFile[]{folder},
                                SalmonVaultManager.getInstance().getCurrDir(), SalmonSettings.getInstance().isDeleteAfterImport(), (AesFile[] importedFiles) ->
                                {
                                    SalmonVaultManager.getInstance().refresh();
                                });
                    } catch (Exception e) {
                        SalmonDialog.promptDialog("Error", "Could not import folder: " + e);
                    }
                }, requestCode);
    }

    public static void promptNewFolder() {
        if (!SalmonDialogs.isDriveLoaded())
            return;
        SalmonDialog.promptEdit("Create Folder",
                "Folder Name",
                (folderName, isChecked) ->
                {
                    SalmonVaultManager.getInstance().createDirectory(folderName);
                }, "New Folder", true, false, false, null);
    }

    public static void promptNewFile() {
        if (!SalmonDialogs.isDriveLoaded())
            return;
        SalmonDialog.promptEdit("Create File",
                "File Name",
                (folderName, isChecked) ->
                {
                    SalmonVaultManager.getInstance().createFile(folderName);
                }, "New Document.txt", true, false, false, null);
    }

    public static void promptRenameFile(AesFile ifile) {
        String currentFilename = "";
        try {
            currentFilename = ifile.getName();
        } catch (Exception ex) {
            ex.printStackTrace();
        }

        try {
            SalmonDialog.promptEdit("Rename",
                    "New filename",
                    (newFilename, isChecked) ->
                    {
                        if (newFilename == null)
                            return;
                        try {
                            SalmonVaultManager.getInstance().renameFile(ifile, newFilename);
                        } catch (Exception exception) {
                            exception.printStackTrace();
                            if (!SalmonVaultManager.getInstance().handleException(exception)) {
                                SalmonDialog.promptDialog("Error: " + exception.getMessage());
                            }
                        }

                    }, currentFilename, true, false, false, null);
        } catch (Exception exception) {
            exception.printStackTrace();
        }
    }

    static boolean isDriveLoaded() {
        if (SalmonVaultManager.getInstance().getDrive() == null) {
            SalmonDialog.promptDialog("Error", "No Drive Loaded");
            return false;
        }
        return true;
    }

    public static void promptExportFolder(String text, int requestCode, boolean delete) {
        if (!delete) {
            promptExport(text, requestCode, delete);
            return;
        }

        if (!SalmonDialogs.isDriveLoaded())
            return;
        String itemsString = "item(s)?";
        for (AesFile file : SalmonVaultManager.getInstance().getSelectedFiles()) {
            if (file.isDirectory()) {
                itemsString = "item(s) and subfolders?";
                break;
            }
        }
        SalmonDialog.promptDialog(
                "Export", "Export " + (delete ? "and delete " : "") + SalmonVaultManager.getInstance().getSelectedFiles().size() + " " + itemsString,
                "Ok",
                () -> {
                    promptExport(text, requestCode, delete);
                },
                "Cancel", null);
    }

    private static void promptExport(String text, int requestCode, boolean delete) {
        if (!SalmonDialogs.isDriveLoaded())
            return;
        ServiceLocator.getInstance().resolve(IFileDialogService.class).openFolder(text,
                SalmonSettings.getInstance().getLastExportDir(), (obj) ->
                {
                    try {
                        IFile folder = (IFile) obj;
                        if (folder == null)
                            return;
                        SalmonSettings.getInstance().setLastImportDir(folder.getPath());
                        SalmonVaultManager.getInstance().exportSelectedFiles(folder, delete);
                    } catch (Exception e) {
                        SalmonDialog.promptDialog("Error", "Could not export folder: " + e);
                    }
                }, requestCode);
    }
}
