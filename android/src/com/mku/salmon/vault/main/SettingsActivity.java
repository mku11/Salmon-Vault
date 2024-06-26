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

import android.os.Bundle;
import android.preference.PreferenceActivity;
import android.view.WindowManager;

import com.mku.salmon.vault.android.R;
import com.mku.salmon.vault.model.SalmonSettings;

public class SettingsActivity extends PreferenceActivity {
    public void onCreate(Bundle SavedInstanceState) {
        super.onCreate(SavedInstanceState);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
        addPreferencesFromResource(R.xml.settings);
        updateSummaries();
        setupListeners();
    }

    public void onResume() {
        super.onResume();
        updateSummaries();
    }

    private void updateSummaries() {
        getPreferenceManager().findPreference("aesType").setSummary(SalmonSettings.getInstance().getAesType().name());
        getPreferenceManager().findPreference("pbkdfType").setSummary(SalmonSettings.getInstance().getPbkdfImpl().name());
        getPreferenceManager().findPreference("pbkdfAlgo").setSummary(SalmonSettings.getInstance().getPbkdfAlgo().name());
    }

    private void setupListeners() {
        getPreferenceManager().findPreference("aesType").setOnPreferenceChangeListener((preference, o) -> {
            SalmonSettings.getInstance().setAesType(SalmonSettings.AESType.valueOf((String) o));
            preference.setSummary((String) o);
            return true;
        });

        getPreferenceManager().findPreference("pbkdfType").setOnPreferenceChangeListener((preference, o) -> {
            SalmonSettings.getInstance().setPbkdfImpl(SalmonSettings.PbkdfImplType.valueOf((String) o));
            preference.setSummary((String) o);
            return true;
        });

        getPreferenceManager().findPreference("pbkdfAlgo").setOnPreferenceChangeListener((preference, o) -> {
            SalmonSettings.getInstance().setPbkdfAlgo(SalmonSettings.PbkdfAlgoType.valueOf((String) o));
            preference.setSummary((String) o);
            return true;
        });

        getPreferenceManager().findPreference("deleteAfterImport").setOnPreferenceChangeListener((preference, o) -> {
            SalmonSettings.getInstance().setDeleteAfterImport((boolean) o);
            return true;
        });
    }
}

