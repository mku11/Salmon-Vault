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
import android.view.Menu;
import android.view.MenuItem;
import android.view.WindowManager;
import android.widget.EditText;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.view.menu.MenuBuilder;
import androidx.appcompat.widget.Toolbar;
import androidx.core.view.MenuCompat;

import com.mku.salmon.vault.android.R;
import com.mku.salmon.vault.model.SalmonTextEditor;
import com.mku.salmon.vault.model.SalmonVaultManager;
import com.mku.salmon.vault.utils.WindowUtils;
import com.mku.salmonfs.file.AesFile;

import java.io.IOException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class TextEditorActivity extends AppCompatActivity {
    private static AesFile file;
    private TextView filenameText;
    private TextView statusText;
    private SalmonTextEditor textEditor;
    private EditText editText;

    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    public static void setTextFile(AesFile file) {
        TextEditorActivity.file = file;
    }

    @Override
    protected void onCreate(Bundle bundle) {
        super.onCreate(bundle);
        setupWindow();
        setContentView(R.layout.texteditor);
        setupControls();
        setupEditor();
        load();
    }

    private void setupEditor() {
        textEditor = new SalmonTextEditor();
    }

    private void setupWindow() {
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
        WindowUtils.setUiActivity(this);
    }

    private void setupControls() {
        editText = (EditText) findViewById(R.id.text_edit);
        statusText = (TextView) findViewById(R.id.status);
        filenameText = (TextView) findViewById(R.id.file_name);
        filenameText.setText("");
        Toolbar toolbar = (Toolbar) findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);
        getSupportActionBar().setDisplayShowTitleEnabled(true);
        getSupportActionBar().setDisplayUseLogoEnabled(true);
        getSupportActionBar().setLogo(R.drawable.logo_48x48);
    }

    @Override
    public boolean onPrepareOptionsMenu(Menu menu) {
        MenuCompat.setGroupDividerEnabled(menu, true);
        ((MenuBuilder) menu).setOptionalIconsVisible(true);
        menu.clear();

        menu.add(1, ActionType.SAVE.ordinal(), 0, getResources().getString(R.string.Save))
                .setIcon(R.drawable.save_small)
                .setShowAsAction(MenuItem.SHOW_AS_ACTION_ALWAYS);
        menu.add(8, ActionType.SETTINGS.ordinal(), 0, getResources().getString(R.string.Settings))
                .setIcon(R.drawable.settings_small);
        menu.add(8, ActionType.EXIT.ordinal(), 0, getResources().getString(R.string.Exit))
                .setIcon(R.drawable.exit_small);

        return super.onPrepareOptionsMenu(menu);
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (ActionType.values()[item.getItemId()]) {
            case SAVE:
                onSave();
                break;
            case EXIT:
                onExit();
                break;
            case SETTINGS:
                startSettings();
                break;
        }
        super.onOptionsItemSelected(item);
        return false;
    }

    private void load() {
        executor.execute(() -> {
            try {
                String contents = textEditor.getTextContent(file);
                String filename = file.getName();
                WindowUtils.runOnMainThread(() -> {
                    filenameText.setText(filename);
                    editText.setText(contents);
                });
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        });
    }

    private void onSave() {
        executor.execute(() -> {
            AesFile oldFile = file;
            file = textEditor.OnSave(file, editText.getText().toString());
            int index = SalmonVaultManager.getInstance().getFileItemList().indexOf(oldFile);
            if (index >= 0) {
                SalmonVaultManager.getInstance().getFileItemList().remove(oldFile);
                SalmonVaultManager.getInstance().getFileItemList().add(index, file);
                WindowUtils.runOnMainThread(() -> {
                    SalmonVaultManager.getInstance().onFileItemRemoved.accept(index, file);
                    SalmonVaultManager.getInstance().onFileItemAdded.accept(index, file);
                });
            }
            WindowUtils.runOnMainThread(() -> {
                statusText.setText("File saved");
                WindowUtils.runOnMainThread(() -> {
                    statusText.setText("");
                }, 3000);
            });
        });
    }

    private void onExit() {
        finish();
    }

    protected void startSettings() {
        Intent intent = new Intent(this, SettingsActivity.class);
        WindowUtils.runOnMainThread(() -> {
            startActivity(intent);
        });
    }

    @Override
    public void onBackPressed() {
        onExit();
    }
}