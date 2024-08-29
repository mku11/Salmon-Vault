package com.mku.salmon.vault.model.android;
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

import com.mku.android.salmon.drive.AndroidDrive;
import com.mku.android.sequence.AndroidSequenceSerializer;
import com.mku.salmon.SalmonFile;
import com.mku.salmon.vault.model.SalmonVaultManager;
import com.mku.sequence.INonceSequenceSerializer;

import java.util.LinkedHashSet;

public class SalmonAndroidVaultManager extends SalmonVaultManager {
    synchronized
    public static SalmonAndroidVaultManager getInstance() {
        if (instance == null) {
            instance = new SalmonAndroidVaultManager();
        }
        return (SalmonAndroidVaultManager) instance;
    }

    protected INonceSequenceSerializer createSerializer() {
        return new AndroidSequenceSerializer();
    }
	
	protected Class<?> getDriveClassType() {
		return AndroidDrive.class;
	}

    // TODO: Refactor to SalmonVaultManager
    public static long getTotalBytes(SalmonFile[] selectedFiles) {
        long totalSize = 0;
        for(SalmonFile file : selectedFiles) {
            if(file.isFile())
                totalSize += file.getRealFile().length();
            else
                totalSize += getTotalBytes(file.listFiles());
        }
        return totalSize;
    }

    public int getTotalItems(SalmonFile[] selectedFiles) {
        int totalItems = 0;
        for(SalmonFile file : selectedFiles) {
            if(file.isFile())
                totalItems++;
            else
                totalItems += getTotalItems(file.listFiles());
        }
        return totalItems;
    }
}