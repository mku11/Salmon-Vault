package com.mku.salmon.vault.utils;
/*
MIT License

Copyright (c) 2025 Max Kas

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

import com.mku.fs.drive.utils.FileUtils;
import com.mku.salmon.vault.dialog.SalmonDialog;
import com.twelvemonkeys.io.FileUtil;
import javafx.scene.control.Alert;

import java.awt.*;
import java.net.URI;

public class FileTypes {

    public static boolean isPDF(String filename) {
        String ext = FileUtils.getExtensionFromFileName(filename).toLowerCase();
        return ext.equals("pdf");
    }

    public static boolean isDocument(String filename) {
        String ext = FileUtils.getExtensionFromFileName(filename).toLowerCase();
        return ext.equals("docx");
    }

    public static boolean isSpreadsheet(String filename) {
        String ext = FileUtils.getExtensionFromFileName(filename).toLowerCase();
        return ext.equals("xlsx");
    }

    public static boolean isPresentation(String filename) {
        String ext = FileUtils.getExtensionFromFileName(filename).toLowerCase();
        return ext.equals("pptx");
    }
}
