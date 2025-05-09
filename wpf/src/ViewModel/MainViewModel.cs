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

using Salmon.Vault.Utils;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Linq;
using Salmon.Vault.Dialog;
using Salmon.Vault.Model;
using Salmon.Vault.Config;
using System.Windows.Input;
using System.Runtime.CompilerServices;
using Salmon.Vault.Model.Win;
using System.Diagnostics;
using Mku.FS.Drive.Utils;
using Mku.SalmonFS.File;
using Mku.FS.File;
using System.Security.Principal;

namespace Salmon.Vault.ViewModel;

public class MainViewModel : INotifyPropertyChanged
{
    private static readonly int THREADS = 1;

    public delegate void OpenTextEditorView(SalmonFileViewModel item);
    public OpenTextEditorView OpenTextEditor;

    public delegate void OpenImageViewerView(SalmonFileViewModel item);
    public OpenImageViewerView OpenImageViewer;

    public delegate void OpenMediaPlayerView(SalmonFileViewModel item);
    public OpenMediaPlayerView OpenMediaPlayer;

    public delegate void OpenContentViewerWindow(SalmonFileViewModel item);
    public OpenContentViewerWindow OpenContentViewer;

    public delegate void OpenSettingsView();
    public OpenSettingsView OpenSettingsViewer;

    private ObservableCollection<SalmonFileViewModel> _fileItemList;
    public ObservableCollection<SalmonFileViewModel> FileItemList
    {
        get => _fileItemList;
        set
        {
            if (value != _fileItemList)
            {
                _fileItemList = value;
                if (manager.FileItemList != null)
                {
                    manager.FileItemList.Clear();
                    manager.FileItemList.AddRange(value.Select(x => x.GetAesFile()).ToList());
                }
                PropertyChanged(this, new PropertyChangedEventArgs("FileItemList"));
            }
        }
    }

    private SalmonFileViewModel _currentItem;
    public SalmonFileViewModel CurrentItem
    {
        get => _currentItem;
        set
        {
            if (value != _currentItem)
            {
                _currentItem = value;
                PropertyChanged(this, new PropertyChangedEventArgs("CurrentItem"));
            }
        }
    }

    private SalmonFileViewModel _selectedItem;
    public SalmonFileViewModel SelectedItem
    {
        get => _selectedItem;
        set
        {
            if (value != _selectedItem)
            {
                _selectedItem = value;
                PropertyChanged(this, new PropertyChangedEventArgs("SelectedItem"));
            }
        }
    }

    private string _status = "";
    public string Status
    {
        get => _status;
        set
        {
            if (value != _status)
            {
                _status = value;
                PropertyChanged(this, new PropertyChangedEventArgs("Status"));
            }
        }
    }

    private bool _stopVisibility;
    public bool StopVisibility
    {
        get => _stopVisibility;
        set
        {
            if (value != _stopVisibility)
            {
                _stopVisibility = value;
                PropertyChanged(this, new PropertyChangedEventArgs("StopVisibility"));
            }
        }
    }

    private bool _progressVisibility;
    public bool ProgressVisibility
    {
        get => _progressVisibility;
        set
        {
            if (value != _progressVisibility)
            {
                _progressVisibility = value;
                PropertyChanged(this, new PropertyChangedEventArgs("ProgressVisibility"));
            }
        }
    }

    private string _path;
    public string Path
    {
        get => _path;
        set
        {
            if (value != _path)
            {
                _path = value;
                PropertyChanged(this, new PropertyChangedEventArgs("Path"));
            }
        }
    }

    private int _fileProgress;
    public int FileProgress
    {
        get => _fileProgress;
        set
        {
            if (value != _fileProgress)
            {
                _fileProgress = value;
                PropertyChanged(this, new PropertyChangedEventArgs("FileProgress"));
            }
        }
    }

    private int _filesProgress;
    public int FilesProgress
    {
        get => _filesProgress;
        set
        {
            if (value != _filesProgress)
            {
                _filesProgress = value;
                PropertyChanged(this, new PropertyChangedEventArgs("FilesProgress"));
            }
        }
    }

    public event PropertyChangedEventHandler PropertyChanged;
    private SalmonWinVaultManager manager;

    public MainViewModel()
    {
        SalmonVaultManager.SetThreads(THREADS);
        manager = SalmonWinVaultManager.Instance;
        manager.OpenListItem = OpenListItem;
        manager.PropertyChanged += Manager_PropertyChanged;
        manager.UpdateListItem = UpdateListItem;
        manager.OnFileItemAdded = FileItemAdded;
    }

    private void FileItemAdded(int position, AesFile file)
    {
        WindowUtils.RunOnMainThread(() =>
        {
            FileItemList.Insert(position, new SalmonFileViewModel(file));
        });
    }

    private void Manager_PropertyChanged(object sender, PropertyChangedEventArgs e)
    {
        if (e.PropertyName == "FileItemList")
        {
            UpdateFileViewModels();
        }
        else if (e.PropertyName == "CurrentItem")
        {
            CurrentItem = GetViewModel(manager.CurrentItem);
        }
        else if (e.PropertyName == "Status")
        {
            Status = manager.Status;
        }
        else if (e.PropertyName == "IsJobRunning")
        {
            WindowUtils.RunOnMainThread(() =>
            {
                if (manager.FileManagerMode != SalmonVaultManager.Mode.Search)
                {
                    ProgressVisibility = manager.IsJobRunning;
                    StopVisibility = manager.IsJobRunning;
                }
                if (!manager.IsJobRunning)
                    Status = "";
            }, manager.IsJobRunning ? 0 : 1000);
        }
        else if (e.PropertyName == "Path") Path = manager.Path;
        else if (e.PropertyName == "FileProgress") FileProgress = (int)(manager.FileProgress * 100);
        else if (e.PropertyName == "FilesProgress") FilesProgress = (int)(manager.FilesProgress * 100);
    }

    private void UpdateFileViewModels()
    {
        WindowUtils.RunOnMainThread(() =>
        {
            if (manager.FileItemList == null)
                FileItemList = new ObservableCollection<SalmonFileViewModel>();
            else
                FileItemList = new ObservableCollection<SalmonFileViewModel>(manager.FileItemList
                    .Select(x => new SalmonFileViewModel(x)));
        });
    }

    private SalmonFileViewModel GetViewModel(AesFile item)
    {
        foreach (SalmonFileViewModel vm in FileItemList)
        {
            if (vm.GetAesFile() == item)
                return vm;
        }
        return null;
    }

    private ICommand _clickCommand;
    public ICommand ClickCommand
    {
        get
        {
            if (_clickCommand == null)
            {
                _clickCommand = new RelayCommand<ActionType>(OnCommandClicked);
            }
            return _clickCommand;
        }
    }

    public class RelayCommand<T> : ICommand
    {
        readonly Action<T> command;

        public RelayCommand(Action<T> command)
        {
            this.command = command;
        }

        public event EventHandler CanExecuteChanged;

        public bool CanExecute(object parameter)
        {
            return true;
        }

        public void Execute(object parameter)
        {
            if (command != null)
            {
                command((T)parameter);
            }
        }
    }

    public void OnCommandClicked(ActionType actionType)
    {
        switch (actionType)
        {
            case ActionType.VIEW:
                manager.OpenItem(SelectedItem.GetAesFile());
                break;
            case ActionType.REFRESH:
                manager.Refresh();
                break;
            case ActionType.SETTINGS:
                OpenSettings();
                break;
            case ActionType.STOP:
                manager.StopOperation();
                SelectedItem = null;
                break;
            case ActionType.IMPORT_FILES:
                SalmonDialogs.PromptImportFiles("Import Files", SalmonVaultManager.REQUEST_IMPORT_FILES);
                break;
            case ActionType.IMPORT_FOLDER:
                SalmonDialogs.PromptImportFolder("Import Folder", SalmonVaultManager.REQUEST_IMPORT_FOLDER);
                break;
            case ActionType.EXPORT:
                OnExport();
                break;
            case ActionType.EXPORT_AND_DELETE:
                OnExportAndDelete();
                break;
            case ActionType.SEARCH:
                SalmonDialogs.PromptSearch();
                break;
            case ActionType.NEW_FOLDER:
                SalmonDialogs.PromptNewFolder();
                break;
            case ActionType.NEW_FILE:
                SalmonDialogs.PromptNewFile();
                break;
            case ActionType.COPY:
                OnCopy();
                break;
            case ActionType.CUT:
                OnCut();
                break;
            case ActionType.DELETE:
                OnDelete();
                break;
            case ActionType.PASTE:
                OnPaste();
                break;
            case ActionType.ABOUT:
                SalmonDialogs.PromptAbout();
                break;
            case ActionType.EXIT:
                SalmonDialogs.PromptExit();
                break;
            case ActionType.OPEN_VAULT:
                SalmonDialogs.PromptOpenVault();
                break;
            case ActionType.CREATE_VAULT:
                SalmonDialogs.PromptCreateVault();
                break;
            case ActionType.CLOSE_VAULT:
                manager.CloseVault();
                break;
            case ActionType.IMPORT_AUTH:
                SalmonDialogs.PromptImportAuth();
                break;
            case ActionType.EXPORT_AUTH:
                SalmonDialogs.PromptExportAuth();
                break;
            case ActionType.REVOKE_AUTH:
                SalmonDialogs.PromptRevokeAuth();
                break;
            case ActionType.DISPLAY_AUTH_ID:
                SalmonDialogs.OnDisplayAuthID();
                break;
            case ActionType.BACK:
                manager.GoBack();
                break;
            default:
                break;
        }
    }

    public void StartTextEditor(SalmonFileViewModel item)
    {
        WindowUtils.RunOnMainThread(() =>
        {
            if (item == null)
                return;
            if (item.GetAesFile().Length > 1 * 1024 * 1024)
            {
                SalmonDialog.PromptDialog("Error", "File too large");
                return;
            }
            OpenTextEditor(item);
            SelectedItem = null;
            SelectedItem = item;
        });
    }

    private void StartImageViewer(SalmonFileViewModel item)
    {
        WindowUtils.RunOnMainThread(() =>
        {
            OpenImageViewer(item);
        });
    }

    private void StartContentViewer(SalmonFileViewModel item)
    {
        WindowUtils.RunOnMainThread(() =>
        {
            OpenContentViewer(item);
        });
    }

    private void StartMediaPlayer(SalmonFileViewModel item)
    {
        WindowUtils.RunOnMainThread(() =>
        {
            OpenMediaPlayer(item);
        });
    }

    public void OpenSettings()
    {
        WindowUtils.RunOnMainThread(() =>
        {
            OpenSettingsViewer();
        });
    }

    private void UpdateListItem(AesFile file)
    {
        SalmonFileViewModel vm = GetViewModel(file);
        vm.Update();
    }

    private bool OpenListItem(AesFile file)
    {
        SalmonFileViewModel vm = GetViewModel(file);

        try
        {
            if (FileUtils.IsVideo(file.Name) || FileUtils.IsAudio(file.Name))
            {
                if (!SalmonConfig.USE_CONTENT_VIEWER && MediaPlayerViewModel.HasFFMPEG())
                    StartMediaPlayer(vm);
                else
                    StartContentViewer(vm);
                return true;
            }
            else if (FileUtils.IsImage(file.Name))
            {
                if (!SalmonConfig.USE_CONTENT_VIEWER)
                    StartImageViewer(vm);
                else
                    StartContentViewer(vm);
                return true;
            }
            else if (FileUtils.IsPdf(file.Name))
            {
                StartContentViewer(vm);
                return true;
            }
            else if (FileUtils.IsText(file.Name))
            {
                StartTextEditor(vm);
                return true;
            }
            else
            {
                PromptOpenExternalApp(file, "No internal viewers found.");
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex);
            SalmonDialog.PromptDialog("Error", "Could not open: " + ex.Message);
        }
        return false;
    }


    public void PromptOpenExternalApp(AesFile file, string msg)
    {
        SalmonDialog.PromptDialog("Open External", (msg != null ? msg + " " : "")
            + "Press Ok to export the file temporarily and " +
            "open it with an external app. \n",
                "Ok", () =>
                {
                    try
                    {
                        OpenWith(file);
                    }
                    catch (Exception e)
                    {
                        new SalmonDialog("Could not open file: " + e).Show();
                    }
                }, "Cancel", null);
    }

    private void OpenWith(AesFile salmonFile)
    {
        SalmonDialogs.PromptShare("Export and Share File", SalmonVaultManager.REQUEST_EXPORT_DIR, (sharedDir) =>
        {
            OpenWith(salmonFile, sharedDir);
        });
    }

    private void OpenWith(AesFile salmonFile, IFile sharedDir)
    {
        AesFile parentDir = salmonFile.Parent;
        if (manager.IsJobRunning)
            throw new Exception("Another job is running");
        IFile[] sharedFiles = new IFile[1];
        manager.ExportFiles(new AesFile[] { salmonFile }, sharedDir, false, (files) =>
        {
            WindowUtils.RunOnMainThread(() =>
            {
                try
                {
                    IFile sharedFile = files[0];
                    sharedFiles[0] = sharedFile;
                    Process.Start("rundll32.exe", "shell32.dll,OpenAs_RunDLL " + files[0].Path);
                }
                catch (Exception e)
                {
                    new SalmonDialog("Could not launch external app: " + e.Message).Show();
                }
            });
        });

        SalmonDialog.PromptDialog("Open External",
        "You will be soon prompted to open the file with an app.\n" +
        "When you're done with the changes click OK to import your file.", "Import", () =>
        {
            manager.ImportFiles(sharedFiles, parentDir, false, (files) =>
            {
                if (files.Length == 0 || !files[0].Exists)
                {
                    SalmonDialog.PromptDialog("Import Error",
                            "Could not import the file make sure you delete or re-import manually: "
                            + sharedFiles[0].DisplayPath);
                }
                else
                {
                    RenameOldFile(salmonFile);
                    DeleteAfterImportShared(sharedFiles[0]);
                }
            }, false);
        }, "Ignore", () =>
        {
            DeleteAfterImportShared(sharedFiles[0]);
        });
    }


    private void RenameOldFile(AesFile salmonFile)
    {
        try
        {
            string ext = FileUtils.GetExtensionFromFileName(salmonFile.Name);
            int idx = salmonFile.Name.LastIndexOf(".");
            string newFilename;
            if (idx >= 0)
                newFilename = salmonFile.Name.Substring(0, idx) + ".bak." + ext;
            else
                newFilename = salmonFile.Name + ".bak";
            salmonFile.Rename(newFilename);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex);
        }
    }

    private void DeleteAfterImportShared(IFile sharedFile)
    {
        bool res = false;
        try
        {
            res = sharedFile.Delete();
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex);
        }
        if (!res)
        {
            SalmonDialog.PromptDialog("Error",
                    "Could not delete the exported file, make sure you close the external app or delete manually: "
                            + sharedFile.DisplayPath, "Try again", () =>
                            {
                                DeleteAfterImportShared(sharedFile);
                            }, "Cancel", null);
        }
    }

    public void OnShow()
    {
        WindowUtils.RunOnMainThread(() =>
        {
            manager.Initialize();
        }, 1000);
    }

    internal void ShowProperties(SalmonFileViewModel viewModel)
    {
        if (viewModel != null)
            SalmonDialogs.ShowProperties(viewModel.GetAesFile());
    }

    internal void ShowDiskUsage(List<SalmonFileViewModel> viewModels)
    {
        AesFile[] files = viewModels.Select(x => x.GetAesFile()).ToArray();
        Action<string> updateBody = SalmonDialog.PromptUpdatableDialog("Disk Usage", "");
        int fItems = 0;
        long fSize = 0;
        Action<int, long> updateDiskUsage = (items, size) =>
        {
            if (items > fItems)
                updateBody(SalmonDialogs.GetFormattedDiskUsage(items, size));
            fItems = items;
            fSize = size;
        };
        manager.GetDiskUsage(files, updateDiskUsage);
        updateBody(SalmonDialogs.GetFormattedDiskUsage(fItems, fSize));
    }

    public void OnExport()
    {
        SalmonDialogs.PromptExportFolder("Export Files", SalmonVaultManager.REQUEST_EXPORT_DIR, false);
    }

    public void OnExportAndDelete()
    {
        SalmonDialogs.PromptExportFolder("Export Files and Delete Files", SalmonVaultManager.REQUEST_EXPORT_DIR, true);
    }

    internal void OnCopy()
    {
        try
        {
            manager.CopySelectedFiles();
        }
        catch (Exception ex)
        {
            SalmonDialog.PromptDialog("Error", "Could not select files for copy: " + ex.Message);
        }
    }

    internal void OnCut()
    {
        try
        {
            manager.CutSelectedFiles();
        }
        catch (Exception ex)
        {
            SalmonDialog.PromptDialog("Error", "Could not select files for move: " + ex.Message);
        }
    }

    internal void OnPaste()
    {
        try
        {
            manager.PasteSelected();
        }
        catch (Exception ex)
        {
            SalmonDialog.PromptDialog("Error", "Could not paste files: " + ex.Message);
        }
    }

    internal void Refresh()
    {
        manager.Refresh();
    }

    internal void RenameFile(SalmonFileViewModel selectedItem)
    {
        if (selectedItem != null)
            SalmonDialogs.PromptRenameFile(selectedItem.GetAesFile());
    }

    internal void OnDelete()
    {
        SalmonDialogs.PromptDelete();
    }

    internal void OnBack()
    {
        manager.GoBack();
    }

    public void OpenItem(SalmonFileViewModel viewModel)
    {
        if (viewModel != null)
            manager.OpenItem(viewModel.GetAesFile());
    }

    public void Cancel()
    {
        manager.ClearCopiedFiles();
    }

    [MethodImpl(MethodImplOptions.Synchronized)]
    internal void OnSelectedItems(List<SalmonFileViewModel> selectedItems)
    {
        manager.SelectedFiles.Clear();
        foreach (SalmonFileViewModel item in selectedItems)
        {
            manager.SelectedFiles.Add(item.GetAesFile());
        }
        if (manager.IsJobRunning
        || selectedItems.Count > 0
        || manager.FileManagerMode == SalmonVaultManager.Mode.Copy
        || manager.FileManagerMode == SalmonVaultManager.Mode.Move)
        {
            StopVisibility = true;
        }
        else
        {
            StopVisibility = manager.IsJobRunning;
        }
    }
}