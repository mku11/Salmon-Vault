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

import com.mku.salmon.vault.config.SalmonConfig;
import com.mku.salmon.vault.model.SalmonSettings;
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

import java.io.IOException;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

public class ContentViewerController {

    public WebView webView;
    private Stage stage;

    @FXML
    private MenuBar menuBar;

    @FXML
    private VBox root;
    private WebEngine webEngine;

    public void setStage(Stage stage) {
        this.stage = stage;
    }

    private static final double imageViewMargin = 64;
    private static final Executor executor = Executors.newSingleThreadExecutor();

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
        WindowUtils.setDefaultIconPath(SalmonConfig.icon);
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
        executor.execute(() -> {
            controller.load(file);
        });
        stage.setOnCloseRequest((event)-> {
            controller.onClose();
        });
    }

    private void load(SalmonFileViewModel item) {
        AesFile file = item.getAesFile();
        try {
            webEngine = webView.getEngine();
            String url = AesStreamHandler.getInstance().register("content.dat", file);
            WindowUtils.runOnMainThread(()-> {
                                webEngine.loadContent("<html><body>" +
                        "<video controls='controls'>" +
                        "<source src='" + url + "' type='video/mp4'>" +
                        "</video>" +
                        "</body></html>");
            });
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void onClose() {
        webEngine.load(null);
        stage.close();
    }
}
