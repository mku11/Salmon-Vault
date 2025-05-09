package com.mku.salmon.vault.model;
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

import com.mku.salmon.streams.AesStream;
import com.mku.salmon.vault.dialog.SalmonDialog;
import com.mku.salmonfs.file.AesFile;
import com.mku.streams.MemoryStream;
import com.mku.streams.RandomAccessStream;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

public class SalmonTextEditor {
    synchronized
    public AesFile OnSave(AesFile file, String text) {
        AesFile targetFile = null;
        RandomAccessStream stream = null;
        MemoryStream ins = null;
        boolean success = false;
        try {
            byte[] contents = text.getBytes(StandardCharsets.UTF_8);
            ins = new MemoryStream(contents);
            AesFile dir = file.getParent();
            targetFile = dir.createFile(file.getName());
            targetFile.setApplyIntegrity(true);
            stream = targetFile.getOutputStream();
            ins.copyTo(stream);
            stream.flush();
            success = true;
        } catch (Exception ex) {
            ex.printStackTrace();
            SalmonDialog.promptDialog("Error", "Error during saving file: " + ex.getMessage());
        } finally {
            if (success) {
                if (file != null)
                    file.delete();
            } else {
                if (targetFile != null)
                    targetFile.delete();
            }
            if (stream != null) {
                try {
                    stream.close();
                } catch (IOException ignored) {
                }
            }
            if (ins != null) {
                ins.close();
            }
        }
        if (success)
            return targetFile;
        return null;
    }

    synchronized
    public String getTextContent(AesFile file) throws IOException {
        AesStream stream = file.getInputStream();
        MemoryStream ms = new MemoryStream();
        stream.copyTo(ms);
        stream.close();
        byte[] bytes = ms.toArray();
        String content = new String(bytes);
        return content;
    }
}