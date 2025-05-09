package com.mku.salmon.vault.services;
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

import com.mku.fs.file.File;
import com.mku.func.Consumer;
import javafx.stage.DirectoryChooser;
import javafx.stage.FileChooser;
import javafx.stage.Stage;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

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
public class JavaFxFileDialogService implements IFileDialogService {
    Stage stage;
    private HashMap<Integer, Consumer<Object>> handlers = new HashMap<>();

    public JavaFxFileDialogService(Stage stage) {
        this.stage = stage;
    }

    public Consumer<Object> getCallback(int requestCode) {
        return handlers.get(requestCode);
    }

    public void openFile(String title, String filename, HashMap<String, String> filter, String initialDirectory, 
                         Consumer<Object> onFilePicked, int requestCode) {
        handlers.put(requestCode, onFilePicked);
        FileChooser fileChooser = new FileChooser();
        if (filter != null) {
            for (String key : filter.keySet()) {
                fileChooser.getExtensionFilters().add(
                        new FileChooser.ExtensionFilter(key, "*." + filter.get(key)));
            }
        }
        if (title != null)
            fileChooser.setTitle(title);
        if (initialDirectory != null) {
            java.io.File lastDir = new java.io.File(initialDirectory);
            if (lastDir.exists() && lastDir.isDirectory())
                fileChooser.setInitialDirectory(lastDir);
        }
        java.io.File file = fileChooser.showOpenDialog(stage);
        if (file == null)
            return;
        File javaFile = new File(file.getPath());
        onFilePicked.accept(javaFile);

    }

    public void openFiles(String title, HashMap<String, String> filter, String initialDirectory,
                          Consumer<Object> onFilesPicked, int requestCode) {
        handlers.put(requestCode, onFilesPicked);
        FileChooser fileChooser = new FileChooser();
        if (filter != null) {
            for (String key : filter.keySet()) {
                fileChooser.getExtensionFilters().add(
                        new FileChooser.ExtensionFilter(key, "*." + filter.get(key)));
            }
        }
        if (title != null)
            fileChooser.setTitle(title);
        if (initialDirectory != null) {
            java.io.File lastDir = new java.io.File(initialDirectory);
            if (lastDir.exists() && lastDir.isDirectory())
                fileChooser.setInitialDirectory(lastDir);
        }
        List<java.io.File> files = fileChooser.showOpenMultipleDialog(stage);
        if (files == null)
            return;
        List<File> javaFiles = new ArrayList<>();
        for (java.io.File file : files) {
            javaFiles.add(new File(file.getPath()));
        }
        onFilesPicked.accept(javaFiles.toArray(new File[0]));
    }

    public void openFolder(String title, String initialDirectory, Consumer<Object> onFolderPicked, int requestCode) {
        handlers.put(requestCode, onFolderPicked);
        DirectoryChooser directoryChooser = new DirectoryChooser();
        if (title != null)
            directoryChooser.setTitle(title);
        if (initialDirectory != null) {
            File initDir = new File(initialDirectory);
            if (initDir.exists() && initDir.isDirectory()) {
                directoryChooser.setInitialDirectory(new java.io.File(initialDirectory));
            }
        }
        java.io.File selectedDirectory = directoryChooser.showDialog(stage);
        if (selectedDirectory == null)
            return;
        File javaFile = new File(selectedDirectory.getPath());
        onFolderPicked.accept(javaFile);
    }

    public void saveFile(String title, String filename, HashMap<String, String> filter, String initialDirectory,
                         Consumer<Object> onFilePicked, int requestCode) {
        handlers.put(requestCode, onFilePicked);
        FileChooser fileChooser = new FileChooser();
        if(title!=null)
            fileChooser.setTitle(title);
        if(filename != null)
            fileChooser.setInitialFileName(filename);
        if (initialDirectory != null) {
            File initDir = new File(initialDirectory);
            if (initDir.exists() && initDir.isDirectory()) {
                fileChooser.setInitialDirectory(new java.io.File(initialDirectory));
            }
        }
        if (filter != null) {
            for (String key : filter.keySet()) {
                fileChooser.getExtensionFilters().add(
                        new FileChooser.ExtensionFilter(key, "*." + filter.get(key)));
            }
        }
        java.io.File file = fileChooser.showSaveDialog(stage);
        if (file == null)
            return;
        File javaFile = new File(file.getPath());
        onFilePicked.accept(javaFile);
    }
}