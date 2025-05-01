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

using Android.App;
using Android.Content.PM;
using Android.Content.Res;
using Android.OS;
using Android.Views;
using AndroidX.AppCompat.App;
using Salmon.Vault.Extensions;
using System;
using Salmon.Vault.DotNetAndroid;
using Mku.SalmonFS.File;
using System.Threading.Tasks;
using Salmon.Vault.Model;
using Android.Content;
using Android.Views.InputMethods;
using AndroidX.Core.View;
using AndroidX.AppCompat.View.Menu;
using Android.Text;
using Salmon.Vault.Utils;
using Android.Widget;

namespace Salmon.Vault.Main;

[Activity(Label = "@string/app_name", Theme = "@style/AppTheme",
    ConfigurationChanges = ConfigChanges.ScreenSize | ConfigChanges.Orientation)]
public class TextEditorActivity : AppCompatActivity {
    private static AesFile file;
    private TextView filenameText;
    private TextView statusText;
    private SalmonTextEditor textEditor;
    private EditText editText;

    private SearchView searchView;
    private string searchString = "";

    private int searchIndex = -1;

    public static void SetTextFile(AesFile file) {
        TextEditorActivity.file = file;
    }

    protected override void OnCreate(Bundle bundle) {
        base.OnCreate(bundle);
        SetupWindow();
        SetContentView(Resource.Layout.texteditor);
        SetupControls();
        SetupEditor();
        SetupSearchView();
        Load();
    }

    private void SetupSearchView() {
        searchView = new SearchView(SupportActionBar.ThemedContext);
        searchView.Focusable = false;
        SupportActionBar.CustomView = searchView;
        SupportActionBar.SetDisplayShowCustomEnabled(true);
        searchView.ClearFocus();
        SearchManager searchManager = (SearchManager) GetSystemService(SearchService);
        if (null != searchView) {
            searchView.SetQueryHint("Search");
            searchView.SetSearchableInfo(searchManager.GetSearchableInfo(ComponentName));
            searchView.SetHorizontalGravity(GravityFlags.Right);
        }
        SetupSearchViewListeners();
    }

    public void SetupSearchViewListeners() {
        searchView.QueryTextChange += (s, e) =>
        {
            e.Handled = true;
            if (searchString.Equals(e.NewText))
                return;
            searchString = e.NewText;
        };

        searchView.QueryTextSubmit += (s, e) =>
        {
            InputMethodManager imm = (InputMethodManager) GetSystemService(InputMethodService);
            imm.HideSoftInputFromWindow(searchView.WindowToken, 0);
            OnSearch();
            e.Handled = true;
        };
    }

    private void SetupEditor() {
        textEditor = new SalmonTextEditor();
    }

    private void SetupWindow() {
        Window.SetFlags(WindowManagerFlags.Secure, WindowManagerFlags.Secure);
    }

    private void SetupControls() {
        editText = (EditText) FindViewById(Resource.Id.text_edit);
        statusText = (TextView) FindViewById(Resource.Id.status);
        filenameText = (TextView) FindViewById(Resource.Id.file_name);
        filenameText.Text = "";
        AndroidX.AppCompat.Widget.Toolbar toolbar = (AndroidX.AppCompat.Widget.Toolbar) FindViewById(Resource.Id.toolbar);
        SetSupportActionBar(toolbar);
        SupportActionBar.SetDisplayShowTitleEnabled(true);
        SupportActionBar.SetDisplayUseLogoEnabled(true);
        SupportActionBar.SetLogo(Resource.Drawable.logo_48x48);
    }


    public override bool OnPrepareOptionsMenu(IMenu menu) {
        MenuCompat.SetGroupDividerEnabled(menu, true);
        ((MenuBuilder) menu).SetOptionalIconsVisible(true);
        menu.Clear();

        menu.Add(1, ActionType.SEARCH.Ordinal(), 0, Resources.GetString(Resource.String.Search))
                .SetIcon(Resource.Drawable.search_small)
                .SetShowAsAction(ShowAsAction.Always);
        menu.Add(1, ActionType.SAVE.Ordinal(), 0, Resources.GetString(Resource.String.Save))
                .SetIcon(Resource.Drawable.save_small)
                .SetShowAsAction(ShowAsAction.Always);
        menu.Add(8, ActionType.SETTINGS.Ordinal(), 0, Resources.GetString(Resource.String.Settings))
                .SetIcon(Resource.Drawable.settings_small);
        menu.Add(8, ActionType.EXIT.Ordinal(), 0, Resources.GetString(Resource.String.Exit))
                .SetIcon(Resource.Drawable.exit_small);

        return base.OnPrepareOptionsMenu(menu);
    }

    public override bool OnOptionsItemSelected(IMenuItem item) {
        switch ((ActionType) item.ItemId) {
            case ActionType.SEARCH:
                OnSearch();
                break;
            case ActionType.SAVE:
                OnSave();
                break;
            case ActionType.EXIT:
                OnExit();
                break;
            case ActionType.SETTINGS:
                StartSettings();
                break;
        }
        base.OnOptionsItemSelected(item);
        return false;
    }

    private void OnSearch() {
        if (searchString.Length == 0) {
            RunOnUiThread(() => {
                searchView.Iconified = false;
            });
            return;
        }
        String contents = editText.Text.ToString();
        searchIndex = contents.IndexOf(searchString, searchIndex + 1);
        if (searchIndex >= 0)
            select(searchIndex, searchString.Length);
    }

    private void select(int start, int length) {
        RunOnUiThread(() => {
            Layout layout = editText.Layout;
            if (layout != null) {
                int line = layout.GetLineForOffset(start);
                int y = layout.GetLineTop(line);
                editText.ScrollTo(0, y);
                editText.RequestFocus();
                editText.SetSelection(start, start + length);
            }
        });
    }

    private void Load() {
        Task.Run(()=> {
            try {
                String contents = textEditor.GetTextContent(file);
                String filename = file.Name;
                WindowUtils.RunOnMainThread(() => {
                    filenameText.Text = filename;
                    editText.Text = contents;
                });
            } catch (Exception e) {
                throw;
            }
        });
    }

    private void OnSave() {
        Task.Run(() => {
        AesFile oldFile = file;
            file = textEditor.OnSave(file, editText.Text.ToString());
            int index = SalmonVaultManager.Instance.FileItemList.IndexOf(oldFile);
            if (index >= 0) {
                SalmonVaultManager.Instance.FileItemList.Remove(oldFile);
                SalmonVaultManager.Instance.FileItemList.Insert(index, file);
                WindowUtils.RunOnMainThread(() => {
                    SalmonVaultManager.Instance.OnFileItemRemoved(index, file);
                    SalmonVaultManager.Instance.OnFileItemAdded(index, file);
                });
            }
            WindowUtils.RunOnMainThread(() => {
                statusText.Text = "File saved";
                WindowUtils.RunOnMainThread(() => {
                    statusText.Text = "";
                }, 3000);
            });
        });
    }

    private void OnExit() {
        Finish();
    }

    protected void StartSettings() {
        Intent intent = new Intent(this, typeof(SettingsActivity));
        WindowUtils.RunOnMainThread(() => {
            StartActivity(intent);
        });
    }

    public override void OnBackPressed() {
        OnExit();
    }
}