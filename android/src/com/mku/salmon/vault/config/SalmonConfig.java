package com.mku.salmon.vault.config;

import com.mku.salmon.vault.android.BuildConfig;
import com.mku.salmon.vault.main.SalmonApplication;

public class SalmonConfig {
    public static final String APP_NAME = "Salmon Vault";
    public static final String ABOUT_TEXT = "License: MIT License\n\n" +
            "Open source projects included:\n" +
            "Salmon-AES-CTR - MIT License - https://github.com/mku11/Salmon-AES-CTR\n" +
            "uxwing icons - https://uxwing.com\n\n" +
            "For more information visit the project website";
    public static final String SourceCodeURL = "https://github.com/mku11/Salmon-Vault";
    public static final String FILE_SEQ_FILENAME = "config.xml";

    public static final String FILE_PROVIDER = "com.mku.salmon.vault.android.fileprovider";

    public static String getVersion() {
        return BuildConfig.VERSION_NAME;
    }
	
	public static String getPrivateDir() {
        return SalmonApplication.getInstance().getFilesDir().getPath();
    }
}