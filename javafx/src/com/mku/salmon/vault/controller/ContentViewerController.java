package com.mku.salmon.vault.controller;
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

import com.mku.fs.drive.utils.FileUtils;
import com.mku.salmon.vault.model.SalmonSettings;
import com.mku.salmon.vault.utils.Resources;
import com.mku.salmon.vault.utils.TaskQueueUtils;
import com.mku.salmon.vault.utils.WindowUtils;
import com.mku.salmon.vault.viewmodel.SalmonFileViewModel;
import com.mku.salmonfs.file.AesFile;
import com.mku.salmonfs.handler.AesStreamHandler;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.MenuBar;
import javafx.scene.layout.VBox;
import javafx.scene.web.WebEngine;
import javafx.scene.web.WebView;
import javafx.stage.Stage;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class ContentViewerController {
    @FXML
    private MenuBar menuBar;
    @FXML
    private VBox root;
    private Stage stage;
    @FXML
    private WebView webView;
    private WebEngine webEngine;
    private AesStreamHandler handler;
    private String url;

    public void setStage(Stage stage) {
        this.stage = stage;
    }

    private static final double imageViewMargin = 64;
    private static final int buffers = 2;
    private static final int bufferSize = 8 * 1024 * 1024;
    private static final int threads = 1;
    private static final int backOffset = 256 * 1024;

    public static void openContentViewer(SalmonFileViewModel file, Stage owner) throws IOException {
        FXMLLoader loader = new FXMLLoader(SalmonSettings.getInstance().getClass().getResource("/view/content-viewer.fxml"));
        Parent root = loader.load();
        ContentViewerController controller = loader.getController();
        Stage stage = new Stage();
        controller.setStage(stage);
        stage.getIcons().add(WindowUtils.getDefaultIcon());
        stage.setTitle("Content Viewer");
        Scene scene = new Scene(root);
        stage.setScene(scene);
        stage.widthProperty().addListener((observable, oldValue, newValue) -> {
            controller.webView.setPrefWidth(newValue.doubleValue()
                    - controller.root.getPadding().getLeft()
                    - controller.root.getPadding().getRight()
                    - imageViewMargin
            );
        });
        stage.heightProperty().addListener((observable, oldValue, newValue) -> {
            controller.webView.setPrefHeight(newValue.doubleValue()
                    - controller.root.getPadding().getTop()
                    - controller.root.getPadding().getBottom()
                    - controller.menuBar.getHeight()
                    - imageViewMargin
            );
        });
        stage.show();
        TaskQueueUtils.run(() -> {
            controller.load(file);
        });
        stage.setOnCloseRequest((event) -> {
            controller.onClose();
        });
    }

    private void load(SalmonFileViewModel item) {
        AesFile file = item.getAesFile();
        try {
            webEngine = webView.getEngine();
            Path path = new File(item.getAesFile().getName()).toPath();
            String mimeType = Files.probeContentType(path);
            if (handler == null) {
                handler = AesStreamHandler.getInstance();
                handler.setProperties(buffers, bufferSize, threads, backOffset);
            }

            StringBuilder content = new StringBuilder();
            if(FileUtils.isVideo(item.getAesFile().getName())) {
                url = handler.register("content.mp4#t=5", file);
                String html = Resources.getResourceAsString("/html/video_content.html");
                html = html.replaceAll(Pattern.quote("$videoSrc"), Matcher.quoteReplacement(url));
                html = html.replaceAll(Pattern.quote("$videoMimeType"), Matcher.quoteReplacement(mimeType));
                content.append(html);
            } else {
                url = handler.register("content.dat", file);
                content.append(url);
            }
            WindowUtils.runOnMainThread(() -> {
                webEngine.loadContent(content.toString());
            });
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void onClose() {
        webEngine.load(null);
        if (handler != null)
            handler.unregister(this.url);
        stage.close();
    }
}
