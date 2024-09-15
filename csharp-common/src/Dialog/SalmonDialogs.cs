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

using Mku.File;
using Mku.Salmon;
using Mku.Utils;
using Salmon.Vault.Config;
using Salmon.Vault.Extensions;
using Salmon.Vault.Model;
using Salmon.Vault.Services;
using Salmon.Vault.Settings;
using Salmon.Vault.Utils;
using System;
using System.Collections.Generic;
using System.Reflection;

namespace Salmon.Vault.Dialog;

public class SalmonDialogs
{
    public static void PromptPassword(Action<string> OnSubmit)
    {
        SalmonDialog.PromptEdit("Vault", "Password", (password, option) =>
        {
            if (OnSubmit != null)
                OnSubmit(password);
        }, isPassword: true);
    }

    public static void PromptSetPassword(Action<string> OnPasswordChanged)
    {
        SalmonDialog.PromptEdit("Password", "Type new password", (password, option) =>
        {
            if (password != null)
            {
                SalmonDialog.PromptEdit("Password", "Retype password", (npassword, option) =>
                {
                    if (!npassword.Equals(password))
                    {
                        SalmonDialog.PromptDialog("Vault", "Passwords do not match", "Cancel");
                    }
                    else
                    {
                        if (OnPasswordChanged != null)
                            OnPasswordChanged(password);
                    }
                }, isPassword: true);
            }
        }, isPassword: true);
    }

    public static void PromptChangePassword()
    {
        if (!SalmonDialogs.IsDriveLoaded())
            return;

        SalmonDialogs.PromptSetPassword((pass) =>
        {
            try
            {
                SalmonVaultManager.Instance.Drive.SetPassword(pass);
                SalmonDialog.PromptDialog("Password changed");
            }
            catch (Exception e)
            {
                SalmonDialog.PromptDialog("Could not change password: " + e.Message);
            }
        });
    }

    public static void PromptImportAuth()
    {
        if (!SalmonDialogs.IsDriveLoaded())
            return;

        string filename = SalmonVaultManager.Instance.Drive.GetDefaultAuthConfigFilename();
        string ext = FileUtils.GetExtensionFromFileName(filename);
        Dictionary<string, string> filter = new Dictionary<string, string>();
        filter["Salmon Auth Files"] = ext;
        ServiceLocator.GetInstance().Resolve<IFileDialogService>().OpenFile("Import Auth File",
            filename, filter, SalmonSettings.GetInstance().VaultLocation, (filePath) =>
        {
            try
            {
                SalmonAuthConfig.ImportAuthFile(SalmonVaultManager.Instance.Drive, (IRealFile)filePath);
                SalmonDialog.PromptDialog("Auth", "Device is now Authorized");
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                SalmonDialog.PromptDialog("Auth", "Could Not Import Auth: " + ex.Message);
            }
        }, SalmonVaultManager.REQUEST_IMPORT_AUTH_FILE);
    }

    public static void PromptExportAuth()
    {
        if (!SalmonDialogs.IsDriveLoaded())
            return;
        SalmonDialog.PromptEdit("Export Auth File",
            "Enter the Auth ID for the device you want to authorize",
            (targetAuthID, option) =>
            {
                string filename = SalmonVaultManager.Instance.Drive.GetDefaultAuthConfigFilename();
                string ext = FileUtils.GetExtensionFromFileName(filename);
                Dictionary<string, string> filter = new Dictionary<string, string>();
                filter["Salmon Auth Files"] = ext;
                ServiceLocator.GetInstance().Resolve<IFileDialogService>().SaveFile("Export Auth file",
                    filename, filter, SalmonSettings.GetInstance().VaultLocation, (fileResult) =>
                    {
                        try
                        {
                            SalmonAuthConfig.ExportAuthFile(SalmonVaultManager.Instance.Drive, targetAuthID, (IRealFile)fileResult);
                            SalmonDialog.PromptDialog("Auth", "Auth File Exported");
                        }
                        catch (Exception ex)
                        {
                            Console.Error.WriteLine(ex);
                            SalmonDialog.PromptDialog("Auth", "Could Not Export Auth: " + ex.Message);
                        }
                    }, SalmonVaultManager.REQUEST_EXPORT_AUTH_FILE);
            });
    }

    public static void PromptRevokeAuth()
    {
        if (!SalmonDialogs.IsDriveLoaded())
            return;
        SalmonDialog.PromptDialog("Revoke Auth",
            "Revoke Auth for this drive? You will still be able to decrypt and view your files but you won't be able to import any more files in this drive.",
            "Ok",
            () =>
            {
                try
                {
                    SalmonVaultManager.Instance.Drive.RevokeAuthorization();
                    SalmonDialog.PromptDialog("Action", "Revoke Auth Successful");
                }
                catch (Exception e)
                {
                    Console.Error.WriteLine(e);
                    SalmonDialog.PromptDialog("Action", "Could Not Revoke Auth: " + e.Message);
                }
            },
            "Cancel");
    }

    public static void OnDisplayAuthID()
    {
        if (!SalmonDialogs.IsDriveLoaded())
            return;
        try
        {
            if (SalmonVaultManager.Instance.Drive == null || SalmonVaultManager.Instance.Drive.DriveId == null)
            {
                SalmonDialog.PromptDialog("Error", "No Drive Loaded");
                return;
            }
            string driveID = SalmonVaultManager.Instance.Drive.GetAuthId();
            SalmonDialog.PromptEdit("Auth", "Salmon Auth App ID", null, driveID, false, true);
        }
        catch (Exception ex)
        {
            SalmonDialog.PromptDialog("Error", ex.Message);
        }
    }

    public static void ShowProperties(SalmonFile item)
    {
        try
        {
            SalmonDialog.PromptDialog("Properties", SalmonVaultManager.Instance.GetFileProperties(item), "Ok");
        }
        catch (Exception exception)
        {
            SalmonDialog.PromptDialog("Properties", "Could not get file properties: " + exception.Message);
            Console.Error.WriteLine(exception);
        }
    }

    public static string GetFormattedDiskUsage(int items, long size)
    {
        return "Total items: " + items + "\n"
                + "Size on disk: " + ByteUtils.GetBytes(size, 2);
    }

    internal static void PromptSequenceReset(Action<bool> ResetSequencer)
    {

        SalmonDialog.PromptDialog("Warning", "The nonce sequencer file seems to be tampered.\n" +
            "This could be a sign of a malicious attack. The recommended action is to press Reset to de-authorize all drives.\n" +
            "Otherwise only if you know what you're doing press Continue.",
            "Reset", () =>
            {
                ResetSequencer(false);
            },
            "Continue", () =>
            {
                ResetSequencer(true);
            });
    }

    public static void PromptDelete()
    {
        if (!SalmonDialogs.IsDriveLoaded())
            return;
        string itemsString = "item(s)?";
        foreach (SalmonFile file in SalmonVaultManager.Instance.SelectedFiles)
        {
            if (file.IsDirectory)
            {
                itemsString = "item(s) and subfolders?";
                break;
            }
        }
        SalmonDialog.PromptDialog(
                "Delete", "Delete " + SalmonVaultManager.Instance.SelectedFiles.Count + " " + itemsString,
                "Ok",
                () => {
                    try
                    {
                        SalmonVaultManager.Instance.DeleteSelectedFiles();
                    }
                    catch (Exception e)
                    {
                        SalmonDialog.PromptDialog("Error", "Could not delete files: " + e);
                    }
                },
                "Cancel", null);
    }

    public static void PromptExit()
    {
        SalmonDialog.PromptDialog("Exit",
            "Exit App",
            "Ok",
            () =>
            {
                SalmonVaultManager.Instance.CloseVault();
                Environment.Exit(0);
            },
            "Cancel"
        );
    }

    public static void PromptAnotherProcessRunning()
    {
        SalmonDialog.PromptDialog("File Search", "Another process is running");
    }

    public static void PromptSearch()
    {
        if (!SalmonDialogs.IsDriveLoaded())
            return;
        SalmonDialog.PromptEdit("Search", "Keywords",
            (value, isChecked) =>
            {
                SalmonVaultManager.Instance.Search(value, isChecked);
            }, option: "Any Term");
    }

    public static void PromptAbout()
    {
        SalmonDialog.PromptDialog("About", SalmonConfig.APP_NAME
            + " v" + Assembly.GetExecutingAssembly().GetName().Version.ToString() + "\n" +
            SalmonConfig.ABOUT_TEXT,
            "Project Website", () =>
            {
                try
                {
                    URLUtils.GoToUrl(SalmonConfig.SourceCodeURL);
                }
                catch (Exception)
                {
                    SalmonDialog.PromptDialog("Error", "Could not open Url: " + SalmonConfig.SourceCodeURL);
                }
            }, "Ok");
    }

    public static void PromptCreateVault()
    {
        ServiceLocator.GetInstance().Resolve<IFileDialogService>().OpenFolder("Select the vault",
                SalmonSettings.GetInstance().VaultLocation, (file) =>
                {
                    SalmonDialogs.PromptSetPassword((string pass) =>
                                {
                                    try
                                    {
                                        SalmonVaultManager.Instance.CreateVault((IRealFile)file, pass);
                                        SalmonDialog.PromptDialog("Action", "Vault created, you can start importing your files");
                                    }
                                    catch (Exception e)
                                    {
                                        SalmonDialog.PromptDialog("Error", "Could not create vault: " + e.Message);
                                    }
                                });
                },
                SalmonVaultManager.REQUEST_CREATE_VAULT_DIR);
    }

    public static void PromptOpenVault()
    {
        ServiceLocator.GetInstance().Resolve<IFileDialogService>().OpenFolder("Select the vault",
                SalmonSettings.GetInstance().VaultLocation, (dir) =>
                {
                    SalmonDialogs.PromptPassword((string password) =>
                    {
                        try
                        {
                            SalmonVaultManager.Instance.OpenVault((IRealFile)dir, password);
                        }
                        catch (Exception ex)
                        {
                            SalmonDialog.PromptDialog("Error", "Could not create vault: "
                                    + ex.Message);
                        }
                    });
                },
        SalmonVaultManager.REQUEST_OPEN_VAULT_DIR);
    }

    public static void PromptImportFiles(string text, int requestCode)
    {
        if (!SalmonDialogs.IsDriveLoaded())
            return;
        ServiceLocator.GetInstance().Resolve<IFileDialogService>().OpenFiles(text,
                    null, SalmonSettings.GetInstance().LastImportDir, (obj) =>
                    {
                        IRealFile[] filesToImport = (IRealFile[])obj;
                        if (filesToImport.Length == 0)
                            return;
                        IRealFile parent = filesToImport[0].Parent;
                        if (parent != null && parent.Path != null)
                            SalmonSettings.GetInstance().LastImportDir = parent.Path;
                        SalmonVaultManager.Instance.ImportFiles(filesToImport,
                            SalmonVaultManager.Instance.CurrDir, SalmonSettings.GetInstance().DeleteAfterImport, (SalmonFile[] importedFiles) =>
                            {
                                SalmonVaultManager.Instance.Refresh();
                            });
                    }, requestCode);
    }

    public static void PromptImportFolder(string text, int requestCode)
    {
        if (!SalmonDialogs.IsDriveLoaded())
            return;
        ServiceLocator.GetInstance().Resolve<IFileDialogService>().OpenFolder(text,
                    SalmonSettings.GetInstance().LastImportDir, (obj) =>
                    {
                        IRealFile folder = (IRealFile)obj;
                        if (folder == null)
                            return;
                        IRealFile parent = folder.Parent;
                        if (parent != null && parent.Path != null)
                            SalmonSettings.GetInstance().LastImportDir = parent.Path;
                        SalmonVaultManager.Instance.ImportFiles(new IRealFile[] { folder },
                            SalmonVaultManager.Instance.CurrDir, SalmonSettings.GetInstance().DeleteAfterImport, (SalmonFile[] importedFiles) =>
                            {
                                SalmonVaultManager.Instance.Refresh();
                            });
                    }, requestCode);
    }

    public static void PromptNewFolder()
    {
        if (!SalmonDialogs.IsDriveLoaded())
            return;
        SalmonDialog.PromptEdit("Create Folder",
                "Folder Name",
                (folderName, isChecked) =>
                {
                    try
                    {
                        SalmonVaultManager.Instance.CurrDir.CreateDirectory(folderName, null, null);
                        SalmonVaultManager.Instance.Refresh();
                    }
                    catch (Exception exception)
                    {
                        exception.PrintStackTrace();
                        if (!SalmonVaultManager.Instance.HandleException(exception))
                        {
                            SalmonDialog.PromptDialog("Error", "Could Not Create Folder: " + exception.Message);
                        }
                    }
                }, "New Folder", true, false, false, null);
    }

    public static void PromptRenameFile(SalmonFile ifile)
    {
        string currentFilename = "";
        try
        {
            currentFilename = ifile.BaseName;
        }
        catch (Exception ex)
        {
            ex.PrintStackTrace();
        }

        try
        {
            SalmonDialog.PromptEdit("Rename",
                    "New filename",
                    (newFilename, isChecked) =>
                    {
                        if (newFilename == null)
                            return;
                        try
                        {
                            SalmonVaultManager.Instance.RenameFile(ifile, newFilename);
                        }
                        catch (Exception exception)
                        {
                            exception.PrintStackTrace();
                            if (!SalmonVaultManager.Instance.HandleException(exception))
                            {
                                SalmonDialog.PromptDialog("Error: " + exception.Message);
                            }
                        }
                        SalmonVaultManager.Instance.UpdateListItem(ifile);
                    }, currentFilename, true, false, false, null);
        }
        catch (Exception exception)
        {
            exception.PrintStackTrace();
        }
    }

    static bool IsDriveLoaded()
    {
        if (SalmonVaultManager.Instance.Drive == null)
        {
            SalmonDialog.PromptDialog("Error", "No Drive Loaded");
            return false;
        }
        return true;
    }
}
