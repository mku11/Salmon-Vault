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
using Android.Content;
using Android.Content.PM;
using Android.Views;
using AndroidX.AppCompat.App;
using AndroidX.DocumentFile.Provider;
using AndroidX.RecyclerView.Widget;
using Salmon.Vault.Utils;
using Java.Lang;
using Exception = System.Exception;
using Semaphore = Java.Util.Concurrent.Semaphore;
using AndroidX.Core.View;
using Toolbar = AndroidX.AppCompat.Widget.Toolbar;
using Mku.Salmon;
using Mku.Utils;
using Mku.File;

using Mku.Android.File;
using Salmon.Vault.DotNetAndroid;
using Mku.Salmon.Transform;
using Salmon.Transform;
using System.Linq;
using Android.Widget;
using Android.App;
using System.Collections.Generic;
using Salmon.Vault.Extensions;
using Salmon.Vault.Dialog;
using Salmon.Vault.Model;
using Salmon.Vault.Services;
using System;
using System.ComponentModel;
using Salmon.Vault.MAUI.ANDROID;
using System.Threading.Tasks;
using Mku.Android.Salmon.Drive;
using Mku.Salmon.Utils;
using AndroidX.AppCompat.View.Menu;
using Java.Util.Concurrent.Atomic;
using Salmon.Vault.Config;
using Android.Webkit;
using AndroidX.Core.Content;
using AndroidX.Core.App;
using Salmon.Vault.Provider;

namespace Salmon.Vault.Main;

[Activity(Label = "@string/app_name", MainLauncher = true, Theme = "@style/AppTheme",
    ConfigurationChanges = ConfigChanges.ScreenSize | ConfigChanges.Orientation)]
public class SalmonActivity : AppCompatActivity
{
    private static readonly string TAG = typeof(SalmonApplication).Name;

    private static readonly long MAX_FILE_SIZE_TO_SHARE = 50 * 1024 * 1024;
    private static readonly long MEDIUM_FILE_SIZE_TO_SHARE = 10 * 1024 * 1024;

    private List<SalmonFile> fileItemList = new List<SalmonFile>();

    private Semaphore done = new Semaphore(1);

    private TextView pathText;
    private RecyclerView listView;
    private FileAdapter adapter;
    private View progressLayout;
    private TextView statusText;
    private ProgressBar fileProgress;
    private ProgressBar filesProgress;
    private TextView fileProgressText;
    private TextView filesProgressText;

    private SortType sortType = SortType.Default;
    private SalmonAndroidVaultManager manager;

    protected override void OnCreate(Android.OS.Bundle bundle)
    {
        base.OnCreate(bundle);
        SetupServices();
        SetupWindow();
        SetContentView(Resource.Layout.main);
        SetupControls();
        SetupSalmonManager();
    }

    protected void SetupServices()
    {
        ServiceLocator.GetInstance().Register(typeof(ISettingsService), new AndroidSettingsService());
        ServiceLocator.GetInstance().Register(typeof(IFileService), new AndroidFileService(this));
        ServiceLocator.GetInstance().Register(typeof(IFileDialogService), new AndroidFileDialogService(this));
        ServiceLocator.GetInstance().Register(typeof(IWebBrowserService), new AndroidBrowserService());
        ServiceLocator.GetInstance().Register(typeof(IKeyboardService), new AndroidKeyboardService(this));
    }

    private void SetupWindow()
    {
        Window.SetFlags(WindowManagerFlags.Secure, WindowManagerFlags.Secure);
        WindowUtils.UiActivity = this;
    }

    private void SetupControls()
    {
        fileProgress = (ProgressBar)FindViewById(Resource.Id.fileProgress);
        filesProgress = (ProgressBar)FindViewById(Resource.Id.filesProgress);
        fileProgressText = (TextView)FindViewById(Resource.Id.fileProgressText);
        filesProgressText = (TextView)FindViewById(Resource.Id.filesProgressText);

        statusText = (TextView)FindViewById(Resource.Id.status);
        progressLayout = FindViewById(Resource.Id.progress_layout);
        progressLayout.Visibility = ViewStates.Gone;
        pathText = (TextView)FindViewById(Resource.Id.path);
        pathText.Text = "";
        listView = (RecyclerView)FindViewById(Resource.Id.list);
        listView.SetLayoutManager(new LinearLayoutManager(this));
        listView.AddItemDecoration(new DividerItemDecoration(this, LinearLayoutManager.Vertical));
        RegisterForContextMenu(listView);
        adapter = CreateAdapter();
        adapter.OnCacheCleared += (sender, e) => ClearRecyclerViewCache();
        listView.SetAdapter(adapter);
        Toolbar toolbar = (Toolbar)FindViewById(Resource.Id.toolbar);
        SetSupportActionBar(toolbar);
        SupportActionBar.SetDisplayShowTitleEnabled(true);
        SupportActionBar.SetDisplayUseLogoEnabled(true);
        SupportActionBar.SetLogo(Resource.Drawable.logo_48x48);
    }

    private void ClearRecyclerViewCache()
    {
        listView.GetRecycledViewPool().Clear();
        listView.SetRecycledViewPool(new RecyclerView.RecycledViewPool());
    }

    protected FileAdapter CreateAdapter()
    {
        return new FileAdapter(this, fileItemList, (int pos) =>
        {
            try
            {
                return OpenItem(GetFileItemList()[pos]);
            }
            catch (Exception exception)
            {
                exception.PrintStackTrace();
            }
            return false;
        });
    }

    private void SetupSalmonManager()
    {
        try
        {

            SalmonNativeTransformer.NativeProxy = new AndroidNativeProxy();
            AndroidDrive.Initialize(this.ApplicationContext);

            manager = (SalmonAndroidVaultManager)CreateVaultManager();
            manager.PromptExitOnBack = true;
            manager.OpenListItem = OpenListItem;
            manager.PropertyChanged += Manager_PropertyChanged;
            manager.UpdateListItem = UpdateListItem;
            manager.OnFileItemAdded = FileItemAdded;
            adapter.PropertyChanged += Adapter_PropertyChanged;
            WindowUtils.RunOnMainThread(() =>
            {
                manager.Initialize();
            }, 1000);
        }
        catch (Exception e)
        {
            e.PrintStackTrace();
        }
    }

    private void UpdateListItem(SalmonFile file)
    {
        int index = fileItemList.IndexOf(file);
        if (index >= 0)
            adapter.NotifyItemChanged(index);
    }

    private void Manager_PropertyChanged(object sender, PropertyChangedEventArgs e)
    {
        WindowUtils.RunOnMainThread(() =>
        {
            if (e.PropertyName == "FileItemList")
            {
                UpdateFileAdapter();

                adapter.SelectAll(false);
                adapter.SetMultiSelect(false);
            }
            else if (e.PropertyName == "CurrentItem")
            {
                SelectItem(manager.CurrentItem);
            }
            else if (e.PropertyName == "Status")
            {
                statusText.Text = manager.Status;

            }
            else if (e.PropertyName == "IsJobRunning")
            {
                WindowUtils.RunOnMainThread(() =>
                {
                    if (manager.FileManagerMode != SalmonVaultManager.Mode.Search)
                    {
                        progressLayout.Visibility = manager.IsJobRunning ? ViewStates.Visible : ViewStates.Gone;
                    }
                    if (!manager.IsJobRunning)
                        statusText.Text = "";
                    InvalidateOptionsMenu();
                }, manager.IsJobRunning ? 0 : 1000);
            }
            else if (e.PropertyName == "Path")
            {
                pathText.Text = manager.Path;
                listView.ScrollToPosition(0);
            }
            else if (e.PropertyName == "FileProgress")
            {
                fileProgress.Progress = (int)(manager.FileProgress * 100);
                fileProgressText.Text = fileProgress.Progress + " %";
            }
            else if (e.PropertyName == "FilesProgress")
            {
                filesProgress.Progress = (int)(manager.FilesProgress * 100);
                filesProgressText.Text = filesProgress.Progress + " %";
            }
        });
    }

    private void SelectItem(SalmonFile file)
    {
        try
        {
            int index = 0;
            foreach (SalmonFile viewFile in fileItemList)
            {
                if (viewFile == file)
                {
                    int finalIndex = index;
                    WindowUtils.RunOnMainThread(() =>
                    {
                        try
                        {
                            listView.ScrollToPosition(finalIndex);
                        }
                        catch (Exception ex)
                        {
                            ex.PrintStackTrace();
                        }
                    });
                    break;
                }
                index++;
            }
        }
        catch (Exception ex)
        {
            ex.PrintStackTrace();
        }
    }

    private void Adapter_PropertyChanged(object sender, PropertyChangedEventArgs e)
    {
        if (e.PropertyName == "SelectedFiles")
        {
            manager.SelectedFiles.Clear();
            foreach (SalmonFile file in adapter.SelectedFiles)
                manager.SelectedFiles.Add(file);
        }
        InvalidateOptionsMenu();
    }

    private void UpdateFileAdapter()
    {
        adapter.ResetAnimation();
        fileItemList.Clear();
        if (manager.FileItemList != null)
        {
            fileItemList.AddRange(manager.FileItemList);
        }
        if (sortType != SortType.Default)
        {
            SortFiles(sortType);
            adapter.NotifyDataSetChanged();
        }
    }

    private void FileItemAdded(int position, SalmonFile file)
    {
        WindowUtils.RunOnMainThread(() =>
        {
            fileItemList.Insert(position, file);
            adapter.NotifyItemInserted(position);
        });
    }

    public override bool OnPrepareOptionsMenu(IMenu menu)
    {
        MenuCompat.SetGroupDividerEnabled(menu, true);
        ((MenuBuilder)menu).SetOptionalIconsVisible(true);
        menu.Clear();

        // vault
        menu.Add(1, ActionType.OPEN_VAULT.Ordinal(), 0, Resources.GetString(Resource.String.OpenVault))
                .SetIcon(Resource.Drawable.open_vault_small)
                .SetShowAsAction(ShowAsAction.Never);
        menu.Add(1, ActionType.CREATE_VAULT.Ordinal(), 0, Resources.GetString(Resource.String.NewVault))
                .SetIcon(Resource.Drawable.add_vault_small)
                .SetShowAsAction(ShowAsAction.Never);
        menu.Add(1, ActionType.CLOSE_VAULT.Ordinal(), 0, Resources.GetString(Resource.String.CloseVault))
                .SetIcon(Resource.Drawable.close_vault_small)
                .SetShowAsAction(ShowAsAction.Never);
        if (manager != null && manager.Drive != null)
        {
            menu.Add(1, ActionType.CHANGE_PASSWORD.Ordinal(), 0, Resources.GetString(Resource.String.Password))
                    .SetIcon(Resource.Drawable.key_small)
                    .SetShowAsAction(ShowAsAction.Never);
        }


        // Item options
        if (adapter.GetMode() == FileAdapter.Mode.MULTI_SELECT)
        {

            if (adapter.SelectedFiles.Count > 0)
            {

                // edit
                if (!manager.IsJobRunning)
                {
                    menu.Add(2, ActionType.COPY.Ordinal(), 0, Resources.GetString(Resource.String.Copy))
                            .SetIcon(Resource.Drawable.copy_file_small)
                            .SetShowAsAction(ShowAsAction.Always);
                    menu.Add(2, ActionType.COPY.Ordinal(), 0, Resources.GetString(Resource.String.Copy))
                            .SetIcon(Resource.Drawable.copy_file_small)
                            .SetShowAsAction(ShowAsAction.Never);

                    menu.Add(2, ActionType.CUT.Ordinal(), 0, Resources.GetString(Resource.String.Move))
                            .SetIcon(Resource.Drawable.move_file_small)
                            .SetShowAsAction(ShowAsAction.Always);
                    menu.Add(2, ActionType.CUT.Ordinal(), 0, Resources.GetString(Resource.String.Move))
                            .SetIcon(Resource.Drawable.move_file_small)
                            .SetShowAsAction(ShowAsAction.Never);

                    menu.Add(2, ActionType.DELETE.Ordinal(), 0, Resources.GetString(Resource.String.Delete))
                            .SetIcon(Resource.Drawable.delete_small)
                            .SetShowAsAction(ShowAsAction.Always);
                    menu.Add(2, ActionType.DELETE.Ordinal(), 0, Resources.GetString(Resource.String.Delete))
                            .SetIcon(Resource.Drawable.delete_small)
                            .SetShowAsAction(ShowAsAction.Never);

                    menu.Add(2, ActionType.RENAME.Ordinal(), 0, GetString(Resource.String.Rename))
                            .SetIcon(Resource.Drawable.rename_small);
                    menu.Add(2, ActionType.EXPORT.Ordinal(), 0, Resources.GetString(Resource.String.ExportFiles))
                            .SetIcon(Resource.Drawable.export_file_small);
                    menu.Add(2, ActionType.EXPORT_AND_DELETE.Ordinal(), 0, Resources.GetString(Resource.String.ExportAndDeleteFiles))
                            .SetIcon(Resource.Drawable.export_and_delete_file_small);
                }

                if (adapter.GetLastSelected().IsFile)
                {
                    // view
                    menu.Add(3, ActionType.VIEW.Ordinal(), 0, GetString(Resource.String.View))
                        .SetIcon(Resource.Drawable.file_small);
                    menu.Add(3, ActionType.VIEW_AS_TEXT.Ordinal(), 0, GetString(Resource.String.ViewAsText))
                            .SetIcon(Resource.Drawable.text_file_small);
                    menu.Add(3, ActionType.VIEW_EXTERNAL.Ordinal(), 0, GetString(Resource.String.ViewExternal))
                            .SetIcon(Resource.Drawable.view_external_small);
                }
                else
                {
                    menu.Add(3, ActionType.VIEW.Ordinal(), 0, GetString(Resource.String.Open))
                        .SetIcon(Resource.Drawable.folder_menu_small);
                }
                menu.Add(3, ActionType.PROPERTIES.Ordinal(), 0, GetString(Resource.String.Properties))
                        .SetIcon(Resource.Drawable.file_properties_small);
                menu.Add(3, ActionType.DISK_USAGE.Ordinal(), 0, GetString(Resource.String.DiskUsage))
                        .SetIcon(Resource.Drawable.disk_small);
            }

            // misc
            menu.Add(4, ActionType.SELECT_ALL.Ordinal(), 0, GetString(Resource.String.SelectAll))
                    .SetIcon(Resource.Drawable.select_small);
            menu.Add(4, ActionType.UNSELECT_ALL.Ordinal(), 0, GetString(Resource.String.UnselectAll))
                    .SetIcon(Resource.Drawable.unselect_small);
        }

        // Operations
        if (!manager.IsJobRunning && (manager.FileManagerMode == SalmonVaultManager.Mode.Copy
                || manager.FileManagerMode == SalmonVaultManager.Mode.Move))
        {
            menu.Add(5, ActionType.PASTE.Ordinal(), 0, Resources.GetString(Resource.String.Paste))
                    .SetIcon(Resource.Drawable.file_paste_small)
                    .SetShowAsAction(ShowAsAction.Always);
            menu.Add(5, ActionType.PASTE.Ordinal(), 0, Resources.GetString(Resource.String.Paste))
                    .SetIcon(Resource.Drawable.file_paste_small)
                    .SetShowAsAction(ShowAsAction.Never);
        }
        if (manager.IsJobRunning
                || adapter.SelectedFiles.Count > 0
                || manager.FileManagerMode == SalmonVaultManager.Mode.Copy
                || manager.FileManagerMode == SalmonVaultManager.Mode.Move)
        {
            menu.Add(5, ActionType.STOP.Ordinal(), 0, Resources.GetString(Resource.String.Cancel))
                    .SetIcon(Resource.Drawable.cancel_small)
                    .SetShowAsAction(ShowAsAction.Always);
            menu.Add(5, ActionType.STOP.Ordinal(), 0, Resources.GetString(Resource.String.Cancel))
                    .SetIcon(Resource.Drawable.cancel_small)
                    .SetShowAsAction(ShowAsAction.Never);
        }

        if (manager.Drive != null)
        {
            if (adapter.GetMode() != FileAdapter.Mode.MULTI_SELECT
                    && !manager.IsJobRunning)
            {
                if (manager.FileManagerMode != SalmonVaultManager.Mode.Copy
                        && manager.FileManagerMode != SalmonVaultManager.Mode.Move)
                {
                    menu.Add(5, ActionType.IMPORT_FILES.Ordinal(), 0, Resources.GetString(Resource.String.ImportFiles))
                            .SetIcon(Resource.Drawable.import_file_small)
                            .SetShowAsAction(ShowAsAction.Never);
                    menu.Add(5, ActionType.IMPORT_FOLDER.Ordinal(), 0, Resources.GetString(Resource.String.ImportFolder))
                            .SetIcon(Resource.Drawable.import_folder_small)
                            .SetShowAsAction(ShowAsAction.Never);
                }
                menu.Add(5, ActionType.NEW_FOLDER.Ordinal(), 0, GetString(Resource.String.NewFolder))
                        .SetIcon(Resource.Drawable.add_folder_small);
            }

            menu.Add(6, ActionType.SORT.Ordinal(), 0, Resources.GetString(Resource.String.Sort))
                    .SetIcon(Resource.Drawable.sort_small);
            if (adapter.GetMode() != FileAdapter.Mode.MULTI_SELECT)
            {
                menu.Add(6, ActionType.SEARCH.Ordinal(), 0, Resources.GetString(Resource.String.Search))
                        .SetIcon(Resource.Drawable.search_small);
            }
            menu.Add(6, ActionType.REFRESH.Ordinal(), 0, Resources.GetString(Resource.String.Refresh))
                    .SetIcon(Resource.Drawable.refresh_small)
                    .SetShowAsAction(ShowAsAction.Never);
        }

        // Auth
        if (manager.Drive != null && adapter.GetMode() != FileAdapter.Mode.MULTI_SELECT)
        {
            menu.Add(7, ActionType.IMPORT_AUTH.Ordinal(), 0, Resources.GetString(Resource.String.ImportAuthFile))
                    .SetIcon(Resource.Drawable.auth_import_small)
                    .SetShowAsAction(ShowAsAction.Never);
            menu.Add(7, ActionType.EXPORT_AUTH.Ordinal(), 0, Resources.GetString(Resource.String.ExportAuthFile))
                    .SetIcon(Resource.Drawable.auth_export_small)
                    .SetShowAsAction(ShowAsAction.Never);
            menu.Add(7, ActionType.REVOKE_AUTH.Ordinal(), 0, Resources.GetString(Resource.String.RevokeAuth))
                    .SetIcon(Resource.Drawable.auth_revoke_small)
                    .SetShowAsAction(ShowAsAction.Never);
            menu.Add(7, ActionType.DISPLAY_AUTH_ID.Ordinal(), 0, Resources.GetString(Resource.String.DisplayAuthID))
                    .SetIcon(Resource.Drawable.auth_small)
                    .SetShowAsAction(ShowAsAction.Never);
        }

        // Other
        menu.Add(8, ActionType.SETTINGS.Ordinal(), 0, Resources.GetString(Resource.String.Settings))
                .SetIcon(Resource.Drawable.settings_small);
        menu.Add(8, ActionType.ABOUT.Ordinal(), 0, Resources.GetString(Resource.String.About))
                .SetIcon(Resource.Drawable.info_small);
        menu.Add(8, ActionType.EXIT.Ordinal(), 0, Resources.GetString(Resource.String.Exit))
                .SetIcon(Resource.Drawable.exit_small);

        return base.OnPrepareOptionsMenu(menu);
    }

    public override bool OnOptionsItemSelected(IMenuItem item)
    {
        switch ((ActionType)item.ItemId)
        {
            case ActionType.OPEN_VAULT:
                SalmonDialogs.PromptOpenVault();
                break;
            case ActionType.CREATE_VAULT:
                SalmonDialogs.PromptCreateVault();
                break;
            case ActionType.CLOSE_VAULT:
                manager.CloseVault();
                break;
            case ActionType.CHANGE_PASSWORD:
                SalmonDialogs.PromptChangePassword();
                break;

            case ActionType.REFRESH:
                manager.Refresh();
                return true;
            case ActionType.IMPORT_FILES:
                SalmonDialogs.PromptImportFiles("Select files to import", SalmonVaultManager.REQUEST_IMPORT_FILES);
                return true;
            case ActionType.IMPORT_FOLDER:
                SalmonDialogs.PromptImportFolder("Select folder to import", SalmonVaultManager.REQUEST_IMPORT_FOLDER);
                return true;
            case ActionType.EXPORT:
                ExportSelectedFiles(false);
                return true;
            case ActionType.EXPORT_AND_DELETE:
                ExportSelectedFiles(true);
                return true;


            case ActionType.VIEW:
                OpenItem(adapter.GetLastSelected());
                break;
            case ActionType.VIEW_AS_TEXT:
                StartTextViewer(adapter.GetLastSelected());
                break;
            case ActionType.VIEW_EXTERNAL:
                OpenWith(adapter.GetLastSelected());
                break;

            case ActionType.NEW_FOLDER:
                SalmonDialogs.PromptNewFolder();
                return true;
            case ActionType.COPY:
                OnCopy();
                return true;
            case ActionType.CUT:
                OnCut();
                return true;
            case ActionType.DELETE:
                SalmonDialogs.PromptDelete();
                return true;

            case ActionType.RENAME:
                SalmonDialogs.PromptRenameFile(adapter.GetLastSelected());
                break;
            case ActionType.PROPERTIES:
                SalmonDialogs.ShowProperties(adapter.GetLastSelected());
                break;
            case ActionType.DISK_USAGE:
                ShowDiskUsage(adapter.GetSelectedFiles().ToArray());
                break;

            case ActionType.PASTE:
                OnPaste();
                return true;
            case ActionType.SELECT_ALL:
                SelectAll(true);
                return true;
            case ActionType.UNSELECT_ALL:
                SelectAll(false);
                return true;
            case ActionType.SEARCH:
                SalmonDialogs.PromptSearch();
                return true;

            case ActionType.STOP:
                StopOperations();
                return true;
            case ActionType.SORT:
                PromptSortFiles();
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

            case ActionType.SETTINGS:
                StartSettings();
                return true;
            case ActionType.ABOUT:
                SalmonDialogs.PromptAbout();
                return true;
            case ActionType.EXIT:
                Exit();
                return true;
        }
        base.OnOptionsItemSelected(item);
        return false;
    }


    private void OnCopy()
    {
        try
        {
            manager.CopySelectedFiles();
            adapter.SetMultiSelect(false, false);
        }
        catch (Exception ex)
        {
            SalmonDialog.PromptDialog("Error", "Could not select files for copy: " + ex.Message);
        }
    }

    private void OnCut()
    {
        try
        {
            manager.CutSelectedFiles();
            adapter.SetMultiSelect(false, false);
        }
        catch (Exception ex)
        {
            SalmonDialog.PromptDialog("Error", "Could not select files for move: " + ex.Message);
        }
    }

    private void OnPaste()
    {
        try
        {
            manager.PasteSelected();
        }
        catch (Exception ex)
        {
            SalmonDialog.PromptDialog("Error", "Could not paste files: " + ex);
        }
    }


    private void OpenWith(SalmonFile salmonFile)
    {
        Java.IO.File sharedFile = null;
        try
        {
            long size = salmonFile.RealFile.Length;
            if (size > SalmonFileProvider.MAX_FILE_SIZE_TO_SHARE)
            {
                Toast toast = Toast.MakeText(this, GetString(Resource.String.FileSizeTooLarge), ToastLength.Long);
                toast.Show();
                return;
            }
            if (size > SalmonFileProvider.MEDIUM_FILE_SIZE_TO_SHARE)
            {
                Toast toast = Toast.MakeText(this, GetString(Resource.String.PleaseWaitWhileDecrypting), ToastLength.Long);
                toast.SetGravity(GravityFlags.Center, 0, 0);
                toast.Show();
            }
            sharedFile = SalmonFileProvider.CreateSharedFile(salmonFile);
            if (salmonFile.Size > SalmonFileProvider.MAX_FILE_SIZE_TO_SHARE)
            {
                Toast.MakeText(this, GetString(Resource.String.FileSizeTooLarge), ToastLength.Long).Show();
                return;
            }
            sharedFile.DeleteOnExit();
            string ext = FileUtils.GetExtensionFromFileName(salmonFile.BaseName).ToLower();
            string mimeType = MimeTypeMap.Singleton.GetMimeTypeFromExtension(ext);
            Android.Net.Uri uri = FileProvider.GetUriForFile(this, SalmonConfig.FILE_PROVIDER, sharedFile);
            ShareCompat.IntentBuilder builder = ShareCompat.IntentBuilder.From(this).SetType(mimeType);

            Intent intent = builder.CreateChooserIntent();
            intent.SetAction(Intent.ActionView);
            intent.SetData(uri);

            intent.AddFlags(ActivityFlags.GrantReadUriPermission);
            Intent finalIntent1 = intent;
            RunOnUiThread(() =>
            {
                try
                {
                    StartActivity(finalIntent1);
                }
                catch (Exception ex)
                {
                    ex.PrintStackTrace();
                    Toast.MakeText(this, GetString(Resource.String.NoApplicationsFound), ToastLength.Long).Show();
                }
            });

        }
        catch (Exception e)
        {
            throw new RuntimeException(e.Message);
        }
    }

    private void ShowDiskUsage(SalmonFile[] toArray)
    {

        Action<string> updateBody = SalmonDialog.promptUpdatableDialog("Disk Usage", "");
        AtomicInteger fItems = new AtomicInteger();
        AtomicLong fSize = new AtomicLong();
        Action<int, long> updateDiskUsage = (items, size) =>
        {
            if (items > fItems.Get())
                updateBody(SalmonDialogs.GetFormattedDiskUsage(items, size));
            fItems.Set(items);
            fSize.Set(size);
        };
        manager.GetDiskUsage(adapter.SelectedFiles.ToArray(), updateDiskUsage);
        updateBody(SalmonDialogs.GetFormattedDiskUsage(fItems.Get(), fSize.Get()));
    }

    private void StopOperations()
    {
        manager.StopOperation();
        adapter.SetMultiSelect(false);
        adapter.SelectAll(false);
    }

    public override void OnCreateContextMenu(IContextMenu menu, View v, IContextMenuContextMenuInfo menuInfo)
    {
        menu.SetHeaderTitle(GetString(Resource.String.Action));
    }


    private void ExportSelectedFiles(bool deleteSource)
    {
        try
        {
            manager.SelectedFiles = adapter.SelectedFiles;
            manager.ExportSelectedFiles(deleteSource);
        }
        catch (SalmonAuthException e)
        {
            SalmonDialog.PromptDialog("Could not export file(s): " + e.Message);
        }
    }

    protected bool OpenItem(SalmonFile file)
    {
        return manager.OpenItem(file);
    }

    private void SelectAll(bool value)
    {
        adapter.SelectAll(value);
    }

    public void ShowTaskMessage(string msg)
    {
        RunOnUiThread(() => statusText.Text = msg == null ? "" : msg);
    }

    private void SortFiles(SortType sortType)
    {
        this.sortType = sortType;
        switch (sortType)
        {
            case SortType.Default:
                manager.Refresh();
                break;
            case SortType.Name:
                fileItemList.Sort(SalmonFileComparators.FilenameAscComparator);
                break;
            case SortType.NameDesc:
                fileItemList.Sort(SalmonFileComparators.FilenameDescComparator);
                break;
            case SortType.Size:
                fileItemList.Sort(SalmonFileComparators.SizeAscComparator);
                break;
            case SortType.SizeDesc:
                fileItemList.Sort(SalmonFileComparators.SizeDescComparator);
                break;
            case SortType.Type:
                fileItemList.Sort(SalmonFileComparators.TypeAscComparator);
                break;
            case SortType.TypeDesc:
                fileItemList.Sort(SalmonFileComparators.TypeDescComparator);
                break;
            case SortType.Date:
                fileItemList.Sort(SalmonFileComparators.DateAscComparator);
                break;
            case SortType.DateDesc:
                fileItemList.Sort(SalmonFileComparators.DateDescComparator);
                break;
        }
    }

    private void PromptSortFiles()
    {
        List<string> sortTypes = new List<string>();
        SortType[] values = System.Enum.GetValues(typeof(SortType)).Cast<SortType>().ToArray();
        sortTypes.Add(values[0].ToString());
        for (int i = 1; i < values.Length; i++)
        {
            sortTypes.Add((i % 2 == 1 ? "↓" : "↑") + " " + values[i - (i + 1) % 2].ToString());
        }

        ArrayAdapter<string> itemsAdapter = new ArrayAdapter<string>(
                this, Android.Resource.Layout.SimpleListItemActivated1, sortTypes.ToArray());
        SalmonDialog.PromptSingleValue(itemsAdapter, GetString(Resource.String.Sort), sortType.Ordinal(),
            (AndroidX.AppCompat.App.AlertDialog dialog, int which) =>
                {
                    sortType = values[which];
                    SortFiles(sortType);
                    adapter.NotifyDataSetChanged();
                    dialog.Dismiss();
                }
        );
    }

    private void Exit()
    {
        Finish();
    }

    protected void StartSettings()
    {
        Intent intent = new Intent(this, typeof(SettingsActivity));
        StartActivity(intent);
    }

    protected override void OnActivityResult(int requestCode, Result resultCode, Intent data)
    {
        base.OnActivityResult(requestCode, resultCode, data);
        if (data == null)
            return;
        Android.Net.Uri uri = data.Data;
        if (requestCode == SalmonVaultManager.REQUEST_OPEN_VAULT_DIR)
        {
            ActivityCommon.SetUriPermissions(data, uri);
            IRealFile file = ServiceLocator.GetInstance().Resolve<IFileService>().GetFile(uri.ToString(), true);
            Action<IRealFile> callback = ServiceLocator.GetInstance().Resolve<IFileDialogService>().GetCallback(requestCode);
            callback(file);
        }
        else if (requestCode == SalmonVaultManager.REQUEST_CREATE_VAULT_DIR)
        {
            ActivityCommon.SetUriPermissions(data, uri);
            IRealFile file = ServiceLocator.GetInstance().Resolve<IFileService>().GetFile(uri.ToString(), true);
            Action<IRealFile> callback = ServiceLocator.GetInstance().Resolve<IFileDialogService>().GetCallback(requestCode);
            callback(file);
        }
        else if (requestCode == SalmonVaultManager.REQUEST_IMPORT_FILES
            || requestCode == SalmonVaultManager.REQUEST_IMPORT_FOLDER)
        {
            string[] filesToImport = ActivityCommon.GetFilesFromIntent(this, data);
            IRealFile[] files = new AndroidFile[filesToImport.Length];
            for (int i = 0; i < files.Length; i++)
            {
                files[i] = ServiceLocator.GetInstance().Resolve<IFileService>().GetFile(filesToImport[i], requestCode == SalmonVaultManager.REQUEST_IMPORT_FOLDER);
            }
            Action<object> callback = ServiceLocator.GetInstance().Resolve<IFileDialogService>().GetCallback(requestCode);
            if (requestCode == SalmonVaultManager.REQUEST_IMPORT_FILES)
                callback(files);
            else if (requestCode == SalmonVaultManager.REQUEST_IMPORT_FOLDER)
                callback(files[0]);
        }
        else if (requestCode == SalmonVaultManager.REQUEST_IMPORT_AUTH_FILE)
        {
            string[] files = ActivityCommon.GetFilesFromIntent(this, data);
            string importFile = files != null ? files[0] : null;
            if (importFile == null)
                return;
            IRealFile file = ServiceLocator.GetInstance().Resolve<IFileService>().GetFile(importFile, false);
            Action<IRealFile> callback = ServiceLocator.GetInstance().Resolve<IFileDialogService>().GetCallback(requestCode);
            callback(file);
        }
        else if (requestCode == SalmonVaultManager.REQUEST_EXPORT_AUTH_FILE)
        {
            string[] dirs = ActivityCommon.GetFilesFromIntent(this, data);
            string exportAuthDir = dirs != null ? dirs[0] : null;
            if (exportAuthDir == null)
                return;
            IRealFile dir = ServiceLocator.GetInstance().Resolve<IFileService>().GetFile(exportAuthDir, true);
            IRealFile exportAuthFile;
            try
            {
                exportAuthFile = dir.CreateFile(SalmonDrive.AuthConfigFilename);
            }
            catch (Java.IO.IOException e)
            {
                throw new RuntimeException(e);
            }
            Action<IRealFile> callback = ServiceLocator.GetInstance().Resolve<IFileDialogService>().GetCallback(requestCode);
            callback(exportAuthFile);
        }
    }

    public bool OpenListItem(SalmonFile file)
    {

        try
        {
            if (FileUtils.IsVideo(file.BaseName) || FileUtils.IsAudio(file.BaseName))
            {
                StartMediaPlayer(fileItemList.IndexOf(file));
                return true;
            }
            else if (FileUtils.IsImage(file.BaseName))
            {
                StartWebViewer(fileItemList.IndexOf(file));
                return true;
            }
            else if (FileUtils.IsText(file.BaseName))
            {
                StartWebViewer(fileItemList.IndexOf(file));
                return true;
            }
            else
            {
                SalmonDialog.PromptDialog("Open External", this.GetString(Resource.String.OpenExternalInstructions),
                        "Ok", () =>
                        {
                            OpenWith(file);
                        }, "Cancel", null);
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex);
            SalmonDialog.PromptDialog("Error", "Could not open: " + ex.Message);
        }
        return false;
    }

    private void Logout()
    {
        try
        {
            SalmonVaultManager.Instance.Drive.Close();
        }
        catch (Exception ex)
        {
            ex.PrintStackTrace();
        }
    }

    public void StartMediaPlayer(int position)
    {
        List<SalmonFile> salmonFiles = new List<SalmonFile>();
        int pos = 0;
        int i = 0;
        foreach (SalmonFile file in fileItemList)
        {
            string filename;
            try
            {
                filename = file.BaseName;
                if (FileUtils.IsVideo(filename) || FileUtils.IsAudio(filename))
                {
                    salmonFiles.Add(file);
                }
                if (i == position)
                    pos = salmonFiles.Count - 1;
            }
            catch (Exception e)
            {
                e.PrintStackTrace();
            }
            i++;
        }

        Intent intent = GetMediaPlayerIntent();
        MediaPlayerActivity.SetMediaFiles(pos, salmonFiles.ToArray());
        intent.SetFlags(ActivityFlags.ClearTop | ActivityFlags.NewTask);
        StartActivity(intent);
    }

    protected Intent GetMediaPlayerIntent()
    {
        return new Intent(this, typeof(MediaPlayerActivity));
    }

    private void StartTextViewer(SalmonFile salmonFile)
    {
        try
        {
            if (salmonFile.Size > 1 * 1024 * 1024)
            {
                Toast.MakeText(this, "File too large", ToastLength.Long).Show();
                return;
            }
            StartWebViewer(fileItemList.IndexOf(adapter.SelectedFiles.FirstOrDefault()));
        }
        catch (Exception e)
        {
            e.PrintStackTrace();
        }
    }

    private void StartWebViewer(int position)
    {
        try
        {
            List<SalmonFile> salmonFiles = new List<SalmonFile>();
            SalmonFile file = fileItemList[position];
            string filename = file.BaseName;

            int pos = 0;
            int i = 0;
            foreach (SalmonFile listFile in fileItemList)
            {
                try
                {
                    string listFilename = listFile.BaseName;
                    if (i != position &&
                            (FileUtils.IsImage(filename) && FileUtils.IsImage(listFilename))
                            || (FileUtils.IsText(filename) && FileUtils.IsText(listFilename)))
                    {
                        salmonFiles.Add(listFile);
                    }
                    if (i == position)
                    {
                        salmonFiles.Add(listFile);
                        pos = salmonFiles.Count - 1;
                    }
                }
                catch (Exception e)
                {
                    e.PrintStackTrace();
                }
                i++;
            }
            Intent intent = GetWebViewerIntent();
            SalmonFile selectedFile = fileItemList[position];
            WebViewerActivity.SetContentFiles(pos, salmonFiles.ToArray());
            intent.SetFlags(ActivityFlags.ClearTop | ActivityFlags.NewTask);
            StartActivity(intent);
        }
        catch (Exception e)
        {
            e.PrintStackTrace();
            Toast.MakeText(this, "Could not open viewer: " + e.Message, ToastLength.Long).Show();
        }
    }

    protected Intent GetWebViewerIntent()
    {
        return new Intent(this, typeof(WebViewerActivity));
    }

    protected override void OnDestroy()
    {
        Logout();
        adapter.Stop();
        base.OnDestroy();
    }

    public override void OnBackPressed()
    {
        if (!manager.IsJobRunning && adapter.SelectedFiles.Count > 0)
        {
            adapter.SetMultiSelect(false);
            adapter.SelectAll(false);
        }
        else
        {
            manager.GoBack();
        }
    }

    public enum SortType
    {
        Default, Name, NameDesc, Size, SizeDesc, Type, TypeDesc, Date, DateDesc
    }

    protected SalmonVaultManager CreateVaultManager()
    {
        SalmonNativeTransformer.NativeProxy = new AndroidNativeProxy();
        AndroidDrive.Initialize(this.ApplicationContext);
        return SalmonAndroidVaultManager.Instance;
    }

    protected List<SalmonFile> GetFileItemList()
    {
        return fileItemList;
    }

    protected override void OnResume()
    {
        base.OnResume();
        CheckPendingAppAuthorizations();
    }

    private void CheckPendingAppAuthorizations()
    {
        foreach (string packageName in SalmonFileProvider.GetApps(false))
        {
            PromptAuthorizeApp(packageName);
        }
    }

    private void PromptAuthorizeApp(string packageName)
    {
        SalmonDialog.PromptDialog("External app authorization",
                "Application with package name:\n"
                        + packageName + "\n"
                        + "is requesting access to Salmon Files, allow?",
                "Ok",
                () =>
                {
                    SalmonFileProvider.authorizeApp(packageName);
                }, "Cancel", null);
    }
}