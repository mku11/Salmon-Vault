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
using Mku.FS.Drive.Utils;
using Mku.SalmonFS.Drive.Utils;
using Mku.SalmonFS.File;
using Salmon.Vault.Dialog;
using Salmon.Vault.MAUI;
using Salmon.Vault.Model;
#if WINDOWS
using Salmon.Vault.Model.Win;
#endif
using Salmon.Vault.Services;
using Salmon.Vault.Utils;
using Salmon.Vault.View;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Collections.Specialized;
using System.ComponentModel;
using System.Linq;

namespace Salmon.Vault.ViewModel;

public class MainViewModel : INotifyPropertyChanged
{
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

    private ObservableCollection<SalmonFileViewModel> _selectedItems = new ObservableCollection<SalmonFileViewModel>();
    public ObservableCollection<SalmonFileViewModel> SelectedItems
    {
        get => _selectedItems;
        private set
        {
            if (value != _selectedItems)
            {
                _selectedItems = value;
                PropertyChanged(this, new PropertyChangedEventArgs("SelectedItems"));
            }
        }
    }

    private SalmonFileViewModel _currentItem;
    public SalmonFileViewModel CurrentItem
    {
        get => _currentItem;
        private set
        {
            if (value != _currentItem)
            {
                _currentItem = value;
                PropertyChanged(this, new PropertyChangedEventArgs("CurrentItem"));
            }
        }
    }

    private string _status = "";
    public string Status
    {
        get => _status;
        private set
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
        private set
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
        private set
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
        private set
        {
            if (value != _path)
            {
                _path = value;
                PropertyChanged(this, new PropertyChangedEventArgs("Path"));
            }
        }
    }

    private double _fileProgress;
    public double FileProgress
    {
        get => _fileProgress;
        private set
        {
            if (value != _fileProgress)
            {
                _fileProgress = value;
                PropertyChanged(this, new PropertyChangedEventArgs("FileProgress"));
            }
        }
    }

    private double _filesProgress;
    public double FilesProgress
    {
        get => _filesProgress;
        private set
        {
            if (value != _filesProgress)
            {
                _filesProgress = value;
                PropertyChanged(this, new PropertyChangedEventArgs("FilesProgress"));
            }
        }
    }

    private bool _isMultiSelection;
    public bool IsMultiSelection
    {
        get => _isMultiSelection;
        set
        {
            if (value != _isMultiSelection)
            {
                _isMultiSelection = value;
                if (!value)
                    ResetSelectedItems();
                PropertyChanged(this, new PropertyChangedEventArgs("IsMultiSelection"));
            }
        }
    }

    private void ResetSelectedItems()
    {
        if (SelectedItems == null)
            return;
        ObservableCollection<SalmonFileViewModel> selectedItems = SelectedItems;
        SelectedItems = null;
        selectedItems.Clear();
        SelectedItems = selectedItems;
    }

    public event PropertyChangedEventHandler PropertyChanged;
    private SalmonVaultManager manager;
    private bool initialized;

    public MainViewModel()
    {
#if WINDOWS
        manager = SalmonWinVaultManager.Instance;
#else
        manager = SalmonVaultManager.Instance;
#endif
        manager.OpenListItem = OpenListItem;
        manager.PropertyChanged += Manager_PropertyChanged;
        manager.UpdateListItem = UpdateListItem;
        manager.OnFileItemAdded = FileItemAdded;
        SelectedItems.CollectionChanged += SelectedItems_CollectionChanged;
    }

    private void FileItemAdded(int position, AesFile file)
    {
        WindowUtils.RunOnMainThread(() =>
        {
            FileItemList.Insert(position, new SalmonFileViewModel(file));
        });
    }

    private void SelectedItems_CollectionChanged(object sender, NotifyCollectionChangedEventArgs e)
    {
        manager.SelectedFiles.Clear();
        if (SelectedItems == null)
            return;
        foreach (SalmonFileViewModel item in SelectedItems)
        {
            manager.SelectedFiles.Add(item.GetSalmonFile());
        }
    }

    private void Manager_PropertyChanged(object sender, PropertyChangedEventArgs e)
    {
        if (e.PropertyName == "FileItemList")
        {
            UpdateFileViewModels();
            ResetSelectedItems();
            IsMultiSelection = false;
        }
        else if (e.PropertyName == "SelectedFiles")
        {
            if (manager.SelectedFiles.Count == 0)
            {
                ResetSelectedItems();
                IsMultiSelection = false;
            }
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
        else if (e.PropertyName == "FileProgress") FileProgress = manager.FileProgress;
        else if (e.PropertyName == "FilesProgress") FilesProgress = manager.FilesProgress;
    }

    private void UpdateFileViewModels()
    {
        if (manager.FileItemList == null)
            FileItemList = new ObservableCollection<SalmonFileViewModel>();
        else
            FileItemList = new ObservableCollection<SalmonFileViewModel>(manager.FileItemList
                .Select(x => new SalmonFileViewModel(x)));
    }

    private List<SalmonFileViewModel> GetViewModels(HashSet<AesFile> files)
    {
        List<SalmonFileViewModel> list = new List<SalmonFileViewModel>();
        foreach (AesFile file in files)
        {
            SalmonFileViewModel vm = GetViewModel(file);
            if (vm != null)
                list.Add(vm);
        }
        return list;
    }

    private SalmonFileViewModel GetViewModel(AesFile item)
    {
        foreach (SalmonFileViewModel vm in FileItemList)
        {
            if (vm.GetSalmonFile() == item)
                return vm;
        }
        return null;
    }

    public void OnCommandClicked(ActionType actionType)
    {
        switch (actionType)
        {
            case ActionType.REFRESH:
                manager.Refresh();
                break;
            case ActionType.SETTINGS:
                OpenSettings();
                break;
            case ActionType.STOP:
                manager.StopOperation();
                break;
            case ActionType.IMPORT_FILES:
                SalmonDialogs.PromptImportFiles("Select files to import", SalmonVaultManager.REQUEST_IMPORT_FILES);
                break;
            case ActionType.IMPORT_FOLDER:
                SalmonDialogs.PromptImportFolder("Select folder to import", SalmonVaultManager.REQUEST_IMPORT_FOLDER);
                break;

            case ActionType.EXPORT:
                ExportSelectedFiles(false);
                break;
            case ActionType.EXPORT_AND_DELETE:
                ExportSelectedFiles(true);
                break;
            case ActionType.SEARCH:
                SalmonDialogs.PromptSearch();
                break;
            case ActionType.NEW_FOLDER:
                SalmonDialogs.PromptNewFolder();
                break;
            case ActionType.COPY:
                manager.CopySelectedFiles();
                IsMultiSelection = false;
                break;
            case ActionType.CUT:
                manager.CutSelectedFiles();
                IsMultiSelection = false;
                break;
            case ActionType.DELETE:
                SalmonDialogs.PromptDelete();
                break;
            case ActionType.PASTE:
                manager.PasteSelected();
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
        if (((SalmonFileViewModel)item).GetSalmonFile().Length > 1 * 1024 * 1024)
        {
            SalmonDialog.PromptDialog("Error", "File too large");
            return;
        }
        WindowUtils.RunOnMainThread(() =>
        {
            var parameters = new Dictionary<string, object> { { "SalmonFileViewModel", item } };
            AppShell.Current.GoToAsync(nameof(TextEditor), parameters);
        });
    }

    private void StartImageViewer(SalmonFileViewModel item)
    {
        WindowUtils.RunOnMainThread(() =>
        {
            var parameters = new Dictionary<string, object> { { "SalmonFileViewModel", item } };
            AppShell.Current.GoToAsync(nameof(ImageViewer), parameters);
        });
    }

    private void StartContentViewer(SalmonFileViewModel item)
    {
        var parameters = new Dictionary<string, object> { { "SalmonFileViewModel", item } };
        AppShell.Current.GoToAsync(nameof(ContentViewer), parameters);
    }

    private void OpenSettings()
    {
        var parameters = new Dictionary<string, object> { { "MainViewModel", this } };
        AppShell.Current.GoToAsync(nameof(SettingsViewer), parameters);
    }

    private void UpdateListItem(AesFile file)
    {
        SalmonFileViewModel vm = GetViewModel(file);
        vm.Update();
    }

    public bool OpenListItem(AesFile file)
    {
        SalmonFileViewModel vm = GetViewModel(file);

        try
        {
            if (FileUtils.IsVideo(file.Name) || FileUtils.IsAudio(file.Name))
            {
#if ANDROID
                    // we can only use the android webview for small content like images
                    // since it does not support partial content unlike WinUI Webview2 does
                    // so we use our custom android media player instead
                    ServiceLocator.GetInstance().Resolve<IMediaPlayerService>().StartMediaPlayer(file);
#else
                StartContentViewer(vm);
                return true;
#endif
            }
            else if (FileUtils.IsImage(file.Name))
            {
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
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex);
            SalmonDialog.PromptDialog("Error", "Could not open: " + ex.Message);
        }
        return false;
    }

    public void OnShow()
    {
        if(initialized)
            return;
        initialized = true;
        WindowUtils.RunOnMainThread(() =>
        {
            manager.Initialize();
        }, 1000);
    }

    public void ExportSelectedFiles(bool deleteSource)
    {
        if(deleteSource)
            SalmonDialogs.PromptExportFolder("Export Files and Delete Files", SalmonVaultManager.REQUEST_EXPORT_DIR, deleteSource);
        else
            SalmonDialogs.PromptExportFolder("Export Files", SalmonVaultManager.REQUEST_EXPORT_DIR, deleteSource);
    }

    internal void ShowProperties(SalmonFileViewModel viewModel)
    {
        SalmonDialogs.ShowProperties(viewModel.GetSalmonFile());
    }

    internal void OnCopy()
    {
        manager.CopySelectedFiles();
        IsMultiSelection = false;
    }

    internal void OnCut()
    {
        manager.CutSelectedFiles();
        IsMultiSelection = false;
    }

    internal void Refresh()
    {
        manager.Refresh();
    }

    internal void RenameFile(SalmonFileViewModel selectedItem)
    {
        SalmonDialogs.PromptRenameFile(selectedItem.GetSalmonFile());
    }

    internal void PromptDelete()
    {
        SalmonDialogs.PromptDelete();
    }

    internal void OnBack()
    {
        manager.GoBack();
    }

    internal void OpenItem(SalmonFileViewModel viewModel)
    {
        manager.OpenItem(viewModel.GetSalmonFile());
    }

    public void Select(SalmonFileViewModel vm, bool value)
    {
        if (value)
        {
            if (SelectedItems != null && !SelectedItems.Contains(vm))
                SelectedItems.Add(vm);
            manager.SelectedFiles.Add(vm.GetSalmonFile());
        }
        else
        {
            if (SelectedItems != null && SelectedItems.Contains(vm))
                SelectedItems.Remove(vm);
            manager.SelectedFiles.Remove(vm.GetSalmonFile());
        }
    }

    public void Cancel()
    {
        manager.ClearCopiedFiles();
    }

    bool nameOrderAsc = false;
    internal void SortByName()
    {
        List<SalmonFileViewModel> list = FileItemList.ToList();
        Comparer<AesFile> comparer = nameOrderAsc ? AesFileComparators.FilenameDescComparator : AesFileComparators.FilenameAscComparator;
        list.Sort((a, b) => comparer.Compare(a.GetSalmonFile(), b.GetSalmonFile()));
        FileItemList = new ObservableCollection<SalmonFileViewModel>(list);
        nameOrderAsc = !nameOrderAsc;
    }

    bool dateOrderAsc = false;
    internal void SortByDate()
    {
        List<SalmonFileViewModel> list = FileItemList.ToList();
        Comparer<AesFile> comparer = dateOrderAsc ? AesFileComparators.DateDescComparator : AesFileComparators.DateAscComparator;
        list.Sort((a, b) => comparer.Compare(a.GetSalmonFile(), b.GetSalmonFile()));
        FileItemList = new ObservableCollection<SalmonFileViewModel>(list);
        dateOrderAsc = !dateOrderAsc;
    }

    bool typeOrderAsc = false;
    internal void SortByType()
    {
        List<SalmonFileViewModel> list = FileItemList.ToList();
        Comparer<AesFile> comparer = typeOrderAsc ? AesFileComparators.TypeDescComparator : AesFileComparators.TypeAscComparator;
        list.Sort((a, b) => comparer.Compare(a.GetSalmonFile(), b.GetSalmonFile()));
        FileItemList = new ObservableCollection<SalmonFileViewModel>(list);
        typeOrderAsc = !typeOrderAsc;
    }

    bool sizeOrderAsc = false;
    internal void SortBySize()
    {
        List<SalmonFileViewModel> list = FileItemList.ToList();
        Comparer<AesFile> comparer = sizeOrderAsc ? AesFileComparators.SizeDescComparator : AesFileComparators.SizeAscComparator;
        list.Sort((a, b) => comparer.Compare(a.GetSalmonFile(), b.GetSalmonFile()));
        FileItemList = new ObservableCollection<SalmonFileViewModel>(list);
        sizeOrderAsc = !sizeOrderAsc;
    }
}