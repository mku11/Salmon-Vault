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
using Mku.Salmon;
using System.Diagnostics;

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
                    manager.FileItemList.AddRange(value.Select(x => x.GetSalmonFile()).ToList());
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

    private void FileItemAdded(int position, SalmonFile file)
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

    private SalmonFileViewModel GetViewModel(SalmonFile item)
    {
        foreach (SalmonFileViewModel vm in FileItemList)
        {
            if (vm.GetSalmonFile() == item)
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
                manager.OpenItem(SelectedItem.GetSalmonFile());
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
        if (item == null)
            return;
        if (item.GetSalmonFile().Size > 1 * 1024 * 1024)
        {
            SalmonDialog.PromptDialog("Error", "File too large");
            return;
        }
        OpenTextEditor(item);
        SelectedItem = null;
        SelectedItem = item;
    }

    private void StartImageViewer(SalmonFileViewModel item)
    {
        OpenImageViewer(item);
    }

    private void StartContentViewer(SalmonFileViewModel item)
    {
        OpenContentViewer(item);
    }

    private void StartMediaPlayer(SalmonFileViewModel item)
    {
        OpenMediaPlayer(item);
    }

    public void OpenSettings()
    {
        OpenSettingsViewer();
    }

    private void UpdateListItem(SalmonFile file)
    {
        SalmonFileViewModel vm = GetViewModel(file);
        vm.Update();
    }

    private bool OpenListItem(SalmonFile file)
    {
        SalmonFileViewModel vm = GetViewModel(file);

        try
        {
            if (FileUtils.IsVideo(file.BaseName) || FileUtils.IsAudio(file.BaseName))
            {
                if (!SalmonConfig.USE_CONTENT_VIEWER && MediaPlayerViewModel.HasFFMPEG())
                    StartMediaPlayer(vm);
                else
                    StartContentViewer(vm);
                return true;
            }
            else if (FileUtils.IsImage(file.BaseName))
            {
                if (!SalmonConfig.USE_CONTENT_VIEWER)
                    StartImageViewer(vm);
                else
                    StartContentViewer(vm);
                return true;
            }
            else if (FileUtils.IsPdf(file.BaseName))
            {
                StartContentViewer(vm);
                return true;
            }
            else if (FileUtils.IsText(file.BaseName))
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


    public void PromptOpenExternalApp(SalmonFile file, string msg)
    {
        SalmonDialog.PromptDialog("Open External", (msg != null ? msg + " " : "") + "Press Ok to export the file and " +
                        "open it with an external app. This file will be placed in the export folder and will also be " +
                        "visible to all other apps in this device. If you edit this file externally you will have to " +
                        "import the file manually back into the vault.\n",
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

    private void OpenWith(SalmonFile salmonFile)
    {
        if (manager.IsJobRunning)
            throw new Exception("Another job is running");
        manager.ExportFiles(new SalmonFile[] { salmonFile }, (files)=>
        {
            WindowUtils.RunOnMainThread(()=> {
                try
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = files[0].Path;
                    psi.UseShellExecute = true;
                    Process.Start(psi);
                }
                catch (Exception e)
                {
                    new SalmonDialog("Could not launch external app: " + e.Message).Show();
                }
            });
        }, false);
    }

    public void OnShow()
    {
        WindowUtils.RunOnMainThread(() =>
        {
            manager.Initialize();
        }, 1000);
    }

    public void ExportSelectedFiles(bool deleteSource)
    {
        manager.ExportSelectedFiles(deleteSource);
    }

    internal void ShowProperties(SalmonFileViewModel viewModel)
    {
        if (viewModel != null)
            SalmonDialogs.ShowProperties(viewModel.GetSalmonFile());
    }

    internal void ShowDiskUsage(List<SalmonFileViewModel> viewModels)
    {
        SalmonFile[] files = viewModels.Select(x => x.GetSalmonFile()).ToArray();
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
        SalmonDialogs.PromptExport(false);
    }

    public void OnExportAndDelete()
    {
        SalmonDialogs.PromptExport(true);
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
            SalmonDialogs.PromptRenameFile(selectedItem.GetSalmonFile());
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
            manager.OpenItem(viewModel.GetSalmonFile());
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
            manager.SelectedFiles.Add(item.GetSalmonFile());
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