package com.mku.salmon.vault.main;
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

import android.content.Intent;
import android.os.Bundle;
import android.view.ContextMenu;
import android.view.Gravity;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.MimeTypeMap;
import android.widget.ArrayAdapter;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.view.menu.MenuBuilder;
import androidx.appcompat.widget.Toolbar;
import androidx.core.app.ShareCompat;
import androidx.core.content.FileProvider;
import androidx.core.view.MenuCompat;
import androidx.core.widget.ContentLoadingProgressBar;
import androidx.recyclerview.widget.DividerItemDecoration;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.mku.android.fs.file.AndroidFile;
import com.mku.android.fs.file.AndroidFileSystem;
import com.mku.android.salmonfs.drive.AndroidDrive;
import com.mku.fs.drive.utils.FileUtils;
import com.mku.fs.file.HttpSyncClient;
import com.mku.fs.file.IFile;
import com.mku.func.BiConsumer;
import com.mku.func.Consumer;
import com.mku.salmon.vault.android.R;
import com.mku.salmon.vault.config.SalmonConfig;
import com.mku.salmon.vault.dialog.SalmonDialog;
import com.mku.salmon.vault.dialog.SalmonDialogs;
import com.mku.salmon.vault.model.SalmonVaultManager;
import com.mku.salmon.vault.model.android.SalmonAndroidVaultManager;
import com.mku.salmon.vault.provider.SalmonFileProvider;
import com.mku.salmon.vault.services.AndroidBrowserService;
import com.mku.salmon.vault.services.AndroidFileDialogService;
import com.mku.salmon.vault.services.AndroidFileService;
import com.mku.salmon.vault.services.AndroidHttpFileService;
import com.mku.salmon.vault.services.AndroidKeyboardService;
import com.mku.salmon.vault.services.AndroidSettingsService;
import com.mku.salmon.vault.services.AndroidWebServiceFileService;
import com.mku.salmon.vault.services.IFileDialogService;
import com.mku.salmon.vault.services.IFileService;
import com.mku.salmon.vault.services.IHttpFileService;
import com.mku.salmon.vault.services.IKeyboardService;
import com.mku.salmon.vault.services.ISettingsService;
import com.mku.salmon.vault.services.IWSFileService;
import com.mku.salmon.vault.services.IWebBrowserService;
import com.mku.salmon.vault.services.ServiceLocator;
import com.mku.salmon.vault.utils.ByteUtils;
import com.mku.salmon.vault.utils.WindowUtils;
import com.mku.salmonfs.auth.AuthException;
import com.mku.salmonfs.drive.AesDrive;
import com.mku.salmonfs.drive.utils.AesFileComparators;
import com.mku.salmonfs.file.AesFile;

import java.io.IOException;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

public class SalmonActivity extends AppCompatActivity {
    private static final String TAG = SalmonApplication.class.getSimpleName();

    private List<AesFile> fileItemList = new ArrayList<>();

    private Semaphore done = new Semaphore(1);

    private TextView pathText;
    private RecyclerView listView;
    private FileAdapter adapter;
    private View progressLayout;
    private TextView statusText;
    private ContentLoadingProgressBar progressBar;
    private ProgressBar fileProgress;
    private ProgressBar filesProgress;
    private TextView fileProgressText;
    private TextView filesProgressText;

    private SortType sortType = SortType.Default;
    private SalmonAndroidVaultManager manager;

    @Override
    protected void onCreate(Bundle bundle) {
        super.onCreate(bundle);
        HttpSyncClient.setAllowClearTextTraffic(true);
        setupServices();
        setupWindow();
        setContentView(R.layout.main);
        setupControls();
        setupSalmonManager();
    }

    protected void setupServices() {
        ServiceLocator.getInstance().register(ISettingsService.class, new AndroidSettingsService());
        ServiceLocator.getInstance().register(IFileService.class, new AndroidFileService(this));
        ServiceLocator.getInstance().register(IHttpFileService.class, new AndroidHttpFileService(this));
        ServiceLocator.getInstance().register(IWSFileService.class, new AndroidWebServiceFileService(this));
        ServiceLocator.getInstance().register(IFileDialogService.class, new AndroidFileDialogService(this));
        ServiceLocator.getInstance().register(IWebBrowserService.class, new AndroidBrowserService());
        ServiceLocator.getInstance().register(IKeyboardService.class, new AndroidKeyboardService(this));
    }

    private void setupWindow() {
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
        WindowUtils.setUiActivity(this);
    }

    private void setupControls() {
        progressBar = (ContentLoadingProgressBar) findViewById(R.id.progress_bar);
        fileProgress = (ProgressBar) findViewById(R.id.fileProgress);
        filesProgress = (ProgressBar) findViewById(R.id.filesProgress);
        fileProgressText = (TextView) findViewById(R.id.fileProgressText);
        filesProgressText = (TextView) findViewById(R.id.filesProgressText);

        statusText = (TextView) findViewById(R.id.status);
        progressLayout = findViewById(R.id.progress_layout);
        progressLayout.setVisibility(View.GONE);
        pathText = (TextView) findViewById(R.id.path);
        pathText.setText("");
        listView = (RecyclerView) findViewById(R.id.list);
        listView.setLayoutManager(new LinearLayoutManager(this));
        listView.addItemDecoration(new DividerItemDecoration(this, LinearLayoutManager.VERTICAL));
        registerForContextMenu(listView);
        adapter = createAdapter();
        adapter.setOnCacheCleared(this::clearRecyclerViewCache);
        listView.setAdapter(adapter);
        Toolbar toolbar = (Toolbar) findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);
        getSupportActionBar().setDisplayShowTitleEnabled(true);
        getSupportActionBar().setDisplayUseLogoEnabled(true);
        getSupportActionBar().setLogo(R.drawable.logo_48x48);
    }

    private void clearRecyclerViewCache() {
        listView.getRecycledViewPool().clear();
        listView.setRecycledViewPool(new RecyclerView.RecycledViewPool());
    }

    protected FileAdapter createAdapter() {
        return new FileAdapter(this, fileItemList, (Integer pos) ->
        {
            try {
                return openItem(getFileItemList().get(pos));
            } catch (Exception e) {
                e.printStackTrace();
                SalmonDialog.promptDialog("Could not open item: " + e.getMessage());
            }
            return false;
        });
    }

    private void setupSalmonManager() {
        try {
            manager = (SalmonAndroidVaultManager) createVaultManager();
            manager.setPromptExitOnBack(true);
            manager.openListItem = this::openListItem;
            manager.observePropertyChanges(this::manager_PropertyChanged);
            manager.updateListItem = this::updateListItem;
            manager.onFileItemAdded = this::fileItemAdded;
            adapter.observePropertyChanges(this::Adapter_PropertyChanged);
            WindowUtils.runOnMainThread(() ->
            {
                manager.initialize();
            }, 1000);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void updateListItem(AesFile file) {
        int index = fileItemList.indexOf(file);
        if (index >= 0)
            adapter.notifyItemChanged(index);
    }

    private void manager_PropertyChanged(Object owner, String propertyName) {
        WindowUtils.runOnMainThread(() ->
        {
            if (propertyName.equals("taskRunning")) {
                progressBar.show();
            } else if (propertyName.equals("taskComplete")) {
                progressBar.hide();
            } else if (propertyName.equals("FileItemList")) {
                UpdateFileAdapter();
                adapter.selectAll(false);
                adapter.setMultiSelect(false);
            } else if (propertyName.equals("CurrentItem")) {
                selectItem(manager.getCurrentItem());
            } else if (propertyName.equals("Status")) {
                statusText.setText(manager.getStatus());
            } else if (propertyName.equals("IsJobRunning")) {
                WindowUtils.runOnMainThread(() ->
                {
                    if (manager.getFileManagerMode() != SalmonVaultManager.Mode.Search) {
                        progressLayout.setVisibility(manager.isJobRunning() ? View.VISIBLE : View.GONE);
                    }
                    if (!manager.isJobRunning())
                        statusText.setText("");
                    invalidateOptionsMenu();
                }, manager.isJobRunning() ? 0 : 1000);
            } else if (propertyName.equals("Path")) {
                pathText.setText(manager.getPath());
                listView.scrollToPosition(0);
            } else if (propertyName.equals("FileProgress")) {
                fileProgress.setProgress((int) (manager.getFileProgress() * 100));
                fileProgressText.setText(fileProgress.getProgress() + " %");
            } else if (propertyName.equals("FilesProgress")) {
                filesProgress.setProgress((int) (manager.getFilesProgress() * 100));
                filesProgressText.setText(filesProgress.getProgress() + " %");
            }
        });
    }

    private void selectItem(AesFile file) {
        try {
            int index = 0;
            for (AesFile viewFile : fileItemList) {
                if (viewFile == file) {
                    int finalIndex = index;
                    WindowUtils.runOnMainThread(() -> {
                        try {
                            listView.scrollToPosition(finalIndex);
                        } catch (Exception ex) {
                            ex.printStackTrace();
                        }
                    });
                    break;
                }
                index++;
            }
        } catch (Exception ex) {
            ex.printStackTrace();
        }
    }

    private void Adapter_PropertyChanged(Object owner, String propertyName) {
        if (propertyName == "SelectedFiles") {
            manager.getSelectedFiles().clear();
            for (AesFile file : adapter.getSelectedFiles())
                manager.getSelectedFiles().add(file);
            invalidateOptionsMenu();
        }
    }

    private void UpdateFileAdapter() {
        adapter.resetAnimation();
        fileItemList.clear();
        if (manager.getFileItemList() != null) {
            fileItemList.addAll(manager.getFileItemList());
        }
        if (sortType != SortType.Default) {
            sortFiles(sortType);
            adapter.notifyDataSetChanged();
        }
    }

    private void fileItemAdded(int position, AesFile file) {
        WindowUtils.runOnMainThread(() ->
        {
            fileItemList.add(position, file);
            adapter.notifyItemInserted(position);
        });
    }

    @Override
    public boolean onPrepareOptionsMenu(Menu menu) {
        MenuCompat.setGroupDividerEnabled(menu, true);
        ((MenuBuilder) menu).setOptionalIconsVisible(true);
        menu.clear();

        // vault
        menu.add(1, ActionType.OPEN_VAULT.ordinal(), 0, getResources().getString(R.string.OpenVault))
                .setIcon(R.drawable.open_vault_small)
                .setShowAsAction(MenuItem.SHOW_AS_ACTION_NEVER);
        menu.add(1, ActionType.CREATE_VAULT.ordinal(), 0, getResources().getString(R.string.NewVault))
                .setIcon(R.drawable.add_vault_small)
                .setShowAsAction(MenuItem.SHOW_AS_ACTION_NEVER);
        menu.add(1, ActionType.CLOSE_VAULT.ordinal(), 0, getResources().getString(R.string.CloseVault))
                .setIcon(R.drawable.close_vault_small)
                .setShowAsAction(MenuItem.SHOW_AS_ACTION_NEVER);
        if (manager != null && manager.getDrive() != null) {
            menu.add(1, ActionType.CHANGE_PASSWORD.ordinal(), 0, getResources().getString(R.string.Password))
                    .setIcon(R.drawable.key_small)
                    .setShowAsAction(MenuItem.SHOW_AS_ACTION_NEVER);
        }


        // Item options
        if (adapter.getMode() == FileAdapter.Mode.MULTI_SELECT) {

            if (adapter.getSelectedFiles().size() > 0) {

                // edit
                if (!manager.isJobRunning()) {
                    menu.add(2, ActionType.COPY.ordinal(), 0, getResources().getString(R.string.Copy))
                            .setIcon(R.drawable.copy_file_small)
                            .setShowAsAction(MenuItem.SHOW_AS_ACTION_ALWAYS);
                    menu.add(2, ActionType.COPY.ordinal(), 0, getResources().getString(R.string.Copy))
                            .setIcon(R.drawable.copy_file_small)
                            .setShowAsAction(MenuItem.SHOW_AS_ACTION_NEVER);

                    menu.add(2, ActionType.CUT.ordinal(), 0, getResources().getString(R.string.Move))
                            .setIcon(R.drawable.move_file_small)
                            .setShowAsAction(MenuItem.SHOW_AS_ACTION_ALWAYS);
                    menu.add(2, ActionType.CUT.ordinal(), 0, getResources().getString(R.string.Move))
                            .setIcon(R.drawable.move_file_small)
                            .setShowAsAction(MenuItem.SHOW_AS_ACTION_NEVER);

                    menu.add(2, ActionType.DELETE.ordinal(), 0, getResources().getString(R.string.Delete))
                            .setIcon(R.drawable.delete_small)
                            .setShowAsAction(MenuItem.SHOW_AS_ACTION_ALWAYS);
                    menu.add(2, ActionType.DELETE.ordinal(), 0, getResources().getString(R.string.Delete))
                            .setIcon(R.drawable.delete_small)
                            .setShowAsAction(MenuItem.SHOW_AS_ACTION_NEVER);

                    menu.add(2, ActionType.RENAME.ordinal(), 0, getString(R.string.Rename))
                            .setIcon(R.drawable.rename_small);
                    menu.add(2, ActionType.EXPORT.ordinal(), 0, getResources().getString(R.string.ExportFiles))
                            .setIcon(R.drawable.export_file_small);
                    menu.add(2, ActionType.EXPORT_AND_DELETE.ordinal(), 0, getResources().getString(R.string.ExportAndDeleteFiles))
                            .setIcon(R.drawable.export_and_delete_file_small);
                }

                menu.add(3, ActionType.VIEW.ordinal(), 0, getString(R.string.View))
                        .setIcon(R.drawable.file_small);
                menu.add(3, ActionType.VIEW_AS_TEXT.ordinal(), 0, getString(R.string.ViewAsText))
                        .setIcon(R.drawable.text_file_small);
                menu.add(3, ActionType.VIEW_EXTERNAL.ordinal(), 0, getString(R.string.ViewExternal))
                        .setIcon(R.drawable.view_external_small);

                menu.add(3, ActionType.PROPERTIES.ordinal(), 0, getString(R.string.Properties))
                        .setIcon(R.drawable.file_properties_small);
                menu.add(3, ActionType.DISK_USAGE.ordinal(), 0, getString(R.string.DiskUsage))
                        .setIcon(R.drawable.disk_small);
            }

            // misc
            menu.add(4, ActionType.SELECT_ALL.ordinal(), 0, getString(R.string.SelectAll))
                    .setIcon(R.drawable.select_small);
            menu.add(4, ActionType.UNSELECT_ALL.ordinal(), 0, getString(R.string.UnselectAll))
                    .setIcon(R.drawable.unselect_small);
        }

        // Operations
        if (!manager.isJobRunning() && (manager.getFileManagerMode() == SalmonVaultManager.Mode.Copy
                || manager.getFileManagerMode() == SalmonVaultManager.Mode.Move)) {
            menu.add(5, ActionType.PASTE.ordinal(), 0, getResources().getString(R.string.Paste))
                    .setIcon(R.drawable.file_paste_small)
                    .setShowAsAction(MenuItem.SHOW_AS_ACTION_ALWAYS);
            menu.add(5, ActionType.PASTE.ordinal(), 0, getResources().getString(R.string.Paste))
                    .setIcon(R.drawable.file_paste_small)
                    .setShowAsAction(MenuItem.SHOW_AS_ACTION_NEVER);
        }
        if (manager.isJobRunning()
                || adapter.getSelectedFiles().size() > 0
                || manager.getFileManagerMode() == SalmonVaultManager.Mode.Copy
                || manager.getFileManagerMode() == SalmonVaultManager.Mode.Move) {
            menu.add(5, ActionType.STOP.ordinal(), 0, getResources().getString(R.string.Cancel))
                    .setIcon(R.drawable.cancel_small)
                    .setShowAsAction(MenuItem.SHOW_AS_ACTION_ALWAYS);
            menu.add(5, ActionType.STOP.ordinal(), 0, getResources().getString(R.string.Cancel))
                    .setIcon(R.drawable.cancel_small)
                    .setShowAsAction(MenuItem.SHOW_AS_ACTION_NEVER);
        }

        if (manager.getDrive() != null) {
            if (adapter.getMode() != FileAdapter.Mode.MULTI_SELECT
                    && !manager.isJobRunning()) {
                if (manager.getFileManagerMode() != SalmonVaultManager.Mode.Copy
                        && manager.getFileManagerMode() != SalmonVaultManager.Mode.Move) {
                    menu.add(5, ActionType.IMPORT_FILES.ordinal(), 0, getResources().getString(R.string.ImportFiles))
                            .setIcon(R.drawable.import_file_small)
                            .setShowAsAction(MenuItem.SHOW_AS_ACTION_NEVER);
                    menu.add(5, ActionType.IMPORT_FOLDER.ordinal(), 0, getResources().getString(R.string.ImportFolder))
                            .setIcon(R.drawable.import_folder_small)
                            .setShowAsAction(MenuItem.SHOW_AS_ACTION_NEVER);
                }
                menu.add(5, ActionType.NEW_FOLDER.ordinal(), 0, getString(R.string.NewFolder))
                        .setIcon(R.drawable.add_folder_small);
                menu.add(5, ActionType.NEW_FILE.ordinal(), 0, getString(R.string.NewFile))
                        .setIcon(R.drawable.add_file_small);
            }

            menu.add(6, ActionType.SORT.ordinal(), 0, getResources().getString(R.string.Sort))
                    .setIcon(R.drawable.sort_small);
            if (adapter.getMode() != FileAdapter.Mode.MULTI_SELECT) {
                menu.add(6, ActionType.SEARCH.ordinal(), 0, getResources().getString(R.string.Search))
                        .setIcon(R.drawable.search_small);
            }
            menu.add(6, ActionType.REFRESH.ordinal(), 0, getResources().getString(R.string.Refresh))
                    .setIcon(R.drawable.refresh_small)
                    .setShowAsAction(MenuItem.SHOW_AS_ACTION_NEVER);
        }

        // Auth
        if (manager.getDrive() != null && adapter.getMode() != FileAdapter.Mode.MULTI_SELECT) {
            menu.add(7, ActionType.IMPORT_AUTH.ordinal(), 0, getResources().getString(R.string.ImportAuthFile))
                    .setIcon(R.drawable.auth_import_small)
                    .setShowAsAction(MenuItem.SHOW_AS_ACTION_NEVER);
            menu.add(7, ActionType.EXPORT_AUTH.ordinal(), 0, getResources().getString(R.string.ExportAuthFile))
                    .setIcon(R.drawable.auth_export_small)
                    .setShowAsAction(MenuItem.SHOW_AS_ACTION_NEVER);
            menu.add(7, ActionType.REVOKE_AUTH.ordinal(), 0, getResources().getString(R.string.RevokeAuth))
                    .setIcon(R.drawable.auth_revoke_small)
                    .setShowAsAction(MenuItem.SHOW_AS_ACTION_NEVER);
            menu.add(7, ActionType.DISPLAY_AUTH_ID.ordinal(), 0, getResources().getString(R.string.DisplayAuthID))
                    .setIcon(R.drawable.auth_small)
                    .setShowAsAction(MenuItem.SHOW_AS_ACTION_NEVER);
        }

        // Other
        menu.add(8, ActionType.SETTINGS.ordinal(), 0, getResources().getString(R.string.Settings))
                .setIcon(R.drawable.settings_small);
        menu.add(8, ActionType.ABOUT.ordinal(), 0, getResources().getString(R.string.About))
                .setIcon(R.drawable.info_small);
        menu.add(8, ActionType.EXIT.ordinal(), 0, getResources().getString(R.string.Exit))
                .setIcon(R.drawable.exit_small);

        return super.onPrepareOptionsMenu(menu);
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (ActionType.values()[item.getItemId()]) {
            case OPEN_VAULT:
                SalmonDialogs.promptOpenVault();
                break;
            case CREATE_VAULT:
                SalmonDialogs.promptCreateVault();
                break;
            case CLOSE_VAULT:
                manager.closeVault();
                break;
            case CHANGE_PASSWORD:
                SalmonDialogs.promptChangePassword();
                break;

            case REFRESH:
                manager.refresh();
                return true;
            case IMPORT_FILES:
                SalmonDialogs.promptImportFiles("Select files to import", SalmonVaultManager.REQUEST_IMPORT_FILES);
                return true;
            case IMPORT_FOLDER:
                SalmonDialogs.promptImportFolder("Select folder to import", SalmonVaultManager.REQUEST_IMPORT_FOLDER);
                return true;
            case EXPORT:
                exportSelectedFiles(false);
                return true;
            case EXPORT_AND_DELETE:
                exportSelectedFiles(true);
                return true;

            case VIEW:
                openItem(adapter.getLastSelected());
                adapter.setMultiSelect(false);
                break;
            case VIEW_AS_TEXT:
                startTextViewer(adapter.getLastSelected());
                adapter.setMultiSelect(false);
                break;
            case VIEW_EXTERNAL:
                openWith(adapter.getLastSelected());
                adapter.setMultiSelect(false);
                break;


            case NEW_FOLDER:
                SalmonDialogs.promptNewFolder();
                return true;
            case NEW_FILE:
                SalmonDialogs.promptNewFile();
                return true;
            case COPY:
                onCopy();
                return true;
            case CUT:
                onCut();
                return true;
            case DELETE:
                SalmonDialogs.promptDelete();
                return true;
            case RENAME:
                SalmonDialogs.promptRenameFile(adapter.getLastSelected());
                adapter.setMultiSelect(false);
                break;
            case PROPERTIES:
                SalmonDialogs.showProperties(adapter.getLastSelected());
                break;
            case DISK_USAGE:
                showDiskUsage(adapter.getSelectedFiles().toArray(new AesFile[0]));
                break;

            case PASTE:
                onPaste();
                return true;
            case SELECT_ALL:
                selectAll(true);
                return true;
            case UNSELECT_ALL:
                selectAll(false);
                return true;
            case SEARCH:
                SalmonDialogs.promptSearch();
                return true;
            case STOP:
                stopOperations();
                return true;
            case SORT:
                promptSortFiles();
                break;

            case IMPORT_AUTH:
                SalmonDialogs.promptImportAuth();
                break;
            case EXPORT_AUTH:
                SalmonDialogs.promptExportAuth();
                break;
            case REVOKE_AUTH:
                SalmonDialogs.promptRevokeAuth();
                break;
            case DISPLAY_AUTH_ID:
                SalmonDialogs.onDisplayAuthID();
                break;

            case SETTINGS:
                StartSettings();
                return true;
            case ABOUT:
                SalmonDialogs.promptAbout();
                return true;
            case EXIT:
                Exit();
                return true;

        }
        super.onOptionsItemSelected(item);
        return false;
    }

    private void onCopy() {
        try {
            manager.copySelectedFiles();
            adapter.setMultiSelect(false, false);
        } catch (Exception ex) {
            SalmonDialog.promptDialog("Error", "Could not select files for copy: " + ex);
        }
    }

    private void onCut() {
        try {
            manager.cutSelectedFiles();
            adapter.setMultiSelect(false, false);
        } catch (Exception ex) {
            SalmonDialog.promptDialog("Error", "Could not select files for move: " + ex);
        }
    }

    private void onPaste() {
        try {
            manager.pasteSelected();
        } catch (Exception ex) {
            SalmonDialog.promptDialog("Error", "Could not paste files: " + ex);
        }
    }


    private void openWith(AesFile salmonFile) {
        java.io.File sharedFile = null;
        try {
            long size = salmonFile.getRealFile().getLength();
            if (size > SalmonFileProvider.MAX_FILE_SIZE_TO_SHARE) {
                Toast toast = Toast.makeText(this, getString(R.string.FileSizeTooLarge), Toast.LENGTH_LONG);
                toast.show();
                return;
            }
            if (size > SalmonFileProvider.MEDIUM_FILE_SIZE_TO_SHARE) {
                Toast toast = Toast.makeText(this, getString(R.string.PleaseWaitWhileDecrypting), Toast.LENGTH_LONG);
                toast.setGravity(Gravity.CENTER, 0, 0);
                toast.show();
            }
            sharedFile = SalmonFileProvider.createSharedFile(salmonFile);
            if (salmonFile.getLength() > SalmonFileProvider.MAX_FILE_SIZE_TO_SHARE) {
                Toast.makeText(this, getString(R.string.FileSizeTooLarge), Toast.LENGTH_LONG).show();
                return;
            }
            sharedFile.deleteOnExit();
            String ext = FileUtils.getExtensionFromFileName(salmonFile.getName()).toLowerCase();
            String mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
            android.net.Uri uri = FileProvider.getUriForFile(this, SalmonConfig.FILE_PROVIDER, sharedFile);
            ShareCompat.IntentBuilder builder = ShareCompat.IntentBuilder.from(this).setType(mimeType);

            Intent intent = builder.createChooserIntent();
            intent.setAction(Intent.ACTION_VIEW);
            intent.setData(uri);

            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent finalIntent1 = intent;
            runOnUiThread(() ->
            {
                try {
                    startActivity(finalIntent1);
                } catch (Exception ex) {
                    ex.printStackTrace();
                    Toast.makeText(this, getString(R.string.NoApplicationsFound), Toast.LENGTH_LONG).show();
                }
            });

        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }


    private void showDiskUsage(AesFile[] files) {

        Consumer<String> updateBody = SalmonDialog.promptUpdatableDialog("Disk Usage", "");
        AtomicInteger fItems = new AtomicInteger();
        AtomicLong fSize = new AtomicLong();
        BiConsumer<AtomicInteger, AtomicLong> updateDiskUsage = (items, size) -> {
            if (items.get() > fItems.get())
                updateBody.accept(SalmonDialogs.getFormattedDiskUsage(items.get(), size.get()));
            fItems.set(items.get());
            fSize.set(size.get());
        };
        manager.getDiskUsage(files, updateDiskUsage);
        updateBody.accept(SalmonDialogs.getFormattedDiskUsage(fItems.get(), fSize.get()));
    }

    private void stopOperations() {
        manager.stopOperation();
        adapter.setMultiSelect(false);
        adapter.selectAll(false);
    }

    @Override
    public void onCreateContextMenu(ContextMenu menu, View v, ContextMenu.ContextMenuInfo menuInfo) {
        menu.setHeaderTitle(getString(R.string.Action));

    }

    private void exportSelectedFiles(boolean deleteSource) {
        try {
            manager.setSelectedFiles(adapter.getSelectedFiles());
            SalmonDialogs.promptExportFolder("Select folder to export to",
                    SalmonVaultManager.REQUEST_EXPORT_DIR, deleteSource);
        } catch (AuthException e) {
            SalmonDialog.promptDialog("Could not export file(s): " + e.getMessage());
        }
    }

    protected boolean openItem(AesFile salmonFile) {
        try {
            return manager.openItem(salmonFile);
        } catch (Exception e) {
            e.printStackTrace();
            SalmonDialog.promptDialog("Could not open item: " + e.getMessage());
        }
        return true;
    }

    private void selectAll(boolean value) {
        adapter.selectAll(value);
    }

    public void showTaskMessage(String msg) {
        runOnUiThread(() -> statusText.setText(msg == null ? "" : msg));
    }

    private void sortFiles(SortType sortType) {
        switch (sortType) {
            case Default:
                manager.refresh();
                break;
            case Name:
                Collections.sort(fileItemList, AesFileComparators.getFilenameAscComparator());
                break;
            case NameDesc:
                Collections.sort(fileItemList, AesFileComparators.getFilenameDescComparator());
                break;
            case Size:
                Collections.sort(fileItemList, AesFileComparators.getSizeAscComparator());
                break;
            case SizeDesc:
                Collections.sort(fileItemList, AesFileComparators.getSizeDescComparator());
                break;
            case Type:
                Collections.sort(fileItemList, AesFileComparators.getTypeAscComparator());
                break;
            case TypeDesc:
                Collections.sort(fileItemList, AesFileComparators.getTypeDescComparator());
                break;
            case Date:
                Collections.sort(fileItemList, AesFileComparators.getDateAscComparator());
                break;
            case DateDesc:
                Collections.sort(fileItemList, AesFileComparators.getDateDescComparator());
                break;
        }
    }

    private void promptSortFiles() {
        List<String> sortTypes = new ArrayList<String>();
        SortType[] values = SortType.values();
        sortTypes.add(values[0].toString());
        for (int i = 1; i < values.length; i++) {
            sortTypes.add((i % 2 == 1 ? "↓" : "↑") + " " + values[i - (i + 1) % 2].toString());
        }

        SalmonDialog.promptSingleValue(getString(R.string.Sort), sortTypes, sortType.ordinal(),
                (Integer which) ->
                {
                    sortType = values[which];
                    sortFiles(sortType);
                    adapter.notifyDataSetChanged();
                }
        );
    }

    private void Exit() {
        finish();
    }

    protected void StartSettings() {
        Intent intent = new Intent(this, SettingsActivity.class);
        WindowUtils.runOnMainThread(() -> {
            startActivity(intent);
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (data == null)
            return;
        android.net.Uri uri = data.getData();
        if (requestCode == SalmonVaultManager.REQUEST_OPEN_VAULT_DIR) {
            ActivityCommon.setUriPermissions(data, uri);
            IFile file = ServiceLocator.getInstance().resolve(IFileService.class).getFile(uri.toString(), true);
            Consumer<Object> callback = ServiceLocator.getInstance().resolve(IFileDialogService.class).getCallback(requestCode);
            callback.accept(file);
        } else if (requestCode == SalmonVaultManager.REQUEST_CREATE_VAULT_DIR) {
            ActivityCommon.setUriPermissions(data, uri);
            IFile file = ServiceLocator.getInstance().resolve(IFileService.class).getFile(uri.toString(), true);
            Consumer<Object> callback = ServiceLocator.getInstance().resolve(IFileDialogService.class).getCallback(requestCode);
            callback.accept(file);
        } else if (requestCode == SalmonVaultManager.REQUEST_IMPORT_FILES
                || requestCode == SalmonVaultManager.REQUEST_IMPORT_FOLDER) {
            String[] filesToImport = ActivityCommon.getFilesFromIntent(this, data);
            IFile[] files = new AndroidFile[filesToImport.length];
            for (int i = 0; i < files.length; i++) {
                files[i] = ServiceLocator.getInstance().resolve(IFileService.class).getFile(filesToImport[i],
                        requestCode == SalmonVaultManager.REQUEST_IMPORT_FOLDER);
            }
            Consumer<Object> callback = ServiceLocator.getInstance().resolve(IFileDialogService.class).getCallback(requestCode);
            if (requestCode == SalmonVaultManager.REQUEST_IMPORT_FILES)
                callback.accept(files);
            else if (requestCode == SalmonVaultManager.REQUEST_IMPORT_FOLDER)
                callback.accept(files[0]);
        } else if (requestCode == SalmonVaultManager.REQUEST_EXPORT_DIR) {
            String[] filesToImport = ActivityCommon.getFilesFromIntent(this, data);
            IFile folder = ServiceLocator.getInstance().resolve(IFileService.class)
                    .getFile(filesToImport[0], true);
            Consumer<Object> callback = ServiceLocator.getInstance().resolve(IFileDialogService.class).getCallback(requestCode);
            callback.accept(folder);
        } else if (requestCode == SalmonVaultManager.REQUEST_IMPORT_AUTH_FILE) {
            String[] files = ActivityCommon.getFilesFromIntent(this, data);
            String importFile = files != null ? files[0] : null;
            if (importFile == null)
                return;
            IFile file = ServiceLocator.getInstance().resolve(IFileService.class).getFile(importFile, false);
            Consumer<Object> callback = ServiceLocator.getInstance().resolve(IFileDialogService.class).getCallback(requestCode);
            callback.accept(file);
        } else if (requestCode == SalmonVaultManager.REQUEST_EXPORT_AUTH_FILE) {
            String[] dirs = ActivityCommon.getFilesFromIntent(this, data);
            String exportAuthDir = dirs != null ? dirs[0] : null;
            if (exportAuthDir == null)
                return;
            IFile dir = ServiceLocator.getInstance().resolve(IFileService.class).getFile(exportAuthDir, true);
            IFile exportAuthFile = null;
            try {
                exportAuthFile = dir.createFile(AesDrive.getAuthConfigFilename());
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
            Consumer<Object> callback = ServiceLocator.getInstance().resolve(IFileDialogService.class).getCallback(requestCode);
            callback.accept(exportAuthFile);
        }
    }

    public boolean openListItem(AesFile file) {
        try {
            if (FileUtils.isVideo(file.getName()) || FileUtils.isAudio(file.getName())) {
                startMediaPlayer(fileItemList.indexOf(file));
                return true;
            } else if (FileUtils.isImage(file.getName())) {
                startWebViewer(fileItemList.indexOf(file));
                return true;
            } else if (FileUtils.isText(file.getName())) {
                startWebViewer(fileItemList.indexOf(file));
                return true;
            } else {
                SalmonDialog.promptDialog("Open External", this.getString(R.string.OpenExternalInstructions),
                        "Ok", () -> {
                            openWith(file);
                        }, "Cancel", null);
            }
        } catch (Exception ex) {
            ex.printStackTrace();
            SalmonDialog.promptDialog("Error", "Could not open: " + ex.getMessage());
        }
        return false;
    }

    private void Logout() {
        try {
            SalmonVaultManager.getInstance().getDrive().close();
        } catch (Exception ex) {
            ex.printStackTrace();
        }
    }

    public void startMediaPlayer(int position) {
        List<AesFile> salmonFiles = new ArrayList<>();
        int pos = 0;
        int i = 0;
        for (AesFile file : fileItemList) {
            String filename;
            try {
                filename = file.getName();
                if (FileUtils.isVideo(filename) || FileUtils.isAudio(filename)) {
                    salmonFiles.add(file);
                }
                if (i == position)
                    pos = salmonFiles.size() - 1;
            } catch (Exception e) {
                e.printStackTrace();
            }
            i++;
        }

        Intent intent = getMediaPlayerIntent();
        MediaPlayerActivity.setMediaFiles(pos, salmonFiles.toArray(new AesFile[0]));
        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
        WindowUtils.runOnMainThread(() -> {
            startActivity(intent);
        });
    }

    protected Intent getMediaPlayerIntent() {
        return new Intent(this, MediaPlayerActivity.class);
    }

    private void startTextViewer(AesFile salmonFile) {
        try {
            if (salmonFile.getLength() > 1 * 1024 * 1024) {
                Toast.makeText(this, "File too large", Toast.LENGTH_LONG).show();
                return;
            }
            startWebViewer(fileItemList.indexOf(adapter.getSelectedFiles().iterator().next()));
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void startWebViewer(int position) {
        try {
            List<AesFile> salmonFiles = new ArrayList<>();
            AesFile file = fileItemList.get(position);
            String filename = file.getName();

            int pos = 0;
            int i = 0;
            for (AesFile listFile : fileItemList) {
                try {
                    String listFilename = listFile.getName();
                    if (i != position &&
                            ((FileUtils.isImage(filename) && FileUtils.isImage(listFilename))
                                    || (FileUtils.isText(filename) && FileUtils.isText(listFilename)))) {
                        salmonFiles.add(listFile);
                    }
                    if (i == position) {
                        salmonFiles.add(listFile);
                        pos = salmonFiles.size() - 1;
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
                i++;
            }
            Intent intent = getWebViewerIntent();
            AesFile selectedFile = fileItemList.get(position);
            WebViewerActivity.setContentFiles(pos, salmonFiles.toArray(new AesFile[0]));
            intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
            WindowUtils.runOnMainThread(() -> {
                startActivity(intent);
            });
        } catch (Exception e) {
            e.printStackTrace();
            WindowUtils.runOnMainThread(() -> {
                Toast.makeText(this, "Could not open viewer: " + e.getMessage(), Toast.LENGTH_LONG).show();
            });
        }
    }

    protected Intent getWebViewerIntent() {
        return new Intent(this, WebViewerActivity.class);
    }

    @Override
    protected void onDestroy() {
        Logout();
        adapter.stop();
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (!manager.isJobRunning() && adapter.getSelectedFiles().size() > 0) {
            adapter.setMultiSelect(false);
            adapter.selectAll(false);
        } else {
            manager.goBack();
        }
    }

    public enum SortType {
        Default, Name, NameDesc, Size, SizeDesc, Type, TypeDesc, Date, DateDesc
    }

    protected SalmonVaultManager createVaultManager() {
        AndroidFileSystem.initialize(this);
        return SalmonAndroidVaultManager.getInstance();
    }

    protected List<AesFile> getFileItemList() {
        return fileItemList;
    }

    @Override
    protected void onResume() {
        super.onResume();
        checkPendingAppAuthorizations();
    }

    private void checkPendingAppAuthorizations() {
        for (String packageName : SalmonFileProvider.getApps(false)) {
            promptAuthorizeApp(packageName);
        }
    }

    private void promptAuthorizeApp(String packageName) {
        SalmonDialog.promptDialog("External app authorization",
                "Application with package name:\n"
                        + packageName + "\n"
                        + "is requesting access to Salmon Files, allow?",
                "Ok",
                () ->
                {
                    SalmonFileProvider.authorizeApp(packageName);
                }, "Cancel", null);
    }

}