package com.mku.salmon.vault.viewmodel;
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
import com.mku.salmon.vault.image.Thumbnails;
import com.mku.salmon.vault.utils.ByteUtils;

import com.mku.salmon.vault.utils.WindowUtils;
import com.mku.salmonfs.file.AesFile;
import javafx.application.Platform;
import javafx.beans.property.SimpleObjectProperty;
import javafx.beans.property.SimpleStringProperty;
import javafx.beans.value.WritableValue;
import javafx.fxml.FXML;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;

import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.concurrent.Callable;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

public class SalmonFileViewModel {
    private static final int BACKGROUND_THREADS = 1;
    private static final int THUMBNAIL_MAX_STEPS = 10;
    private static final long VIDEO_THUMBNAIL_MSECS = 3000;

    private static final SimpleDateFormat formatter = new SimpleDateFormat("dd/MM/yyyy hh:mm:ss a");

    private SimpleObjectProperty<ImageView> image = new SimpleObjectProperty<>();
    private final SimpleStringProperty name = new SimpleStringProperty();
    private final SimpleStringProperty date = new SimpleStringProperty();
    private final SimpleStringProperty type = new SimpleStringProperty();
    private final SimpleStringProperty size = new SimpleStringProperty();
    private final SimpleStringProperty path = new SimpleStringProperty();

    private AesFile salmonFile;

    private static final Executor executor = Executors.newFixedThreadPool(BACKGROUND_THREADS);

    public SalmonFileViewModel(AesFile salmonFile) {
        this.salmonFile = salmonFile;
    }

    private boolean animate = false;
    private static SalmonFileViewModel animationViewModel;

    @FXML
    public SimpleObjectProperty<ImageView> imageProperty() {
        if (image.get() != null)
            return image;
        final ImageView imageView = new ImageView();
        imageView.setFitHeight(48);
        imageView.setPreserveRatio(true);
        Image thumbnail = Thumbnails.generateThumbnail(salmonFile, imageView);
        if (image != null)
            imageView.setImage(thumbnail);
        image.setValue(imageView);
        return image;
    }

    @FXML
    public SimpleStringProperty nameProperty() {
        if (name.get() == null)
            updateProperty(() -> salmonFile.getName(), this.name);
        return name;
    }

    @FXML
    public SimpleStringProperty dateProperty() {
        if (date.get() == null)
            updateProperty(this::getDateText, this.date);
        return date;
    }

    @FXML
    public SimpleStringProperty typeProperty() {
        if (type.get() == null)
            updateProperty(this::getExtText, this.type);
        return type;
    }

    @FXML
    public SimpleStringProperty sizeProperty() {
        if (size.get() == null)
            updateProperty(this::getSizeText, this.size);
        return size;
    }

    @FXML
    public SimpleStringProperty pathProperty() {
        if (path.get() == null)
            updateProperty(() -> salmonFile.getPath(), this.path);
        return path;
    }

    private <T> void updateProperty(Callable<T> callable, WritableValue<T> property) {
        CompletableFuture.supplyAsync(() -> {
            try {
                return callable.call();
            } catch (Exception e) {
                e.printStackTrace();
            }
            return null;
        }).thenAccept((value) -> {
            Platform.runLater(() -> property.setValue(value));
        });
    }

    public void setAesFile(AesFile file) throws Exception {
        salmonFile = file;
        update();
    }

    public void update() {
        try {
            name.setValue(salmonFile.getName());
            date.setValue(getDateText());
            size.setValue(getSizeText());
            type.setValue(getExtText());
            path.setValue(salmonFile.getPath());
            Thumbnails.resetCache(salmonFile);
            image.set(null);
        } catch (Exception ex) {
            ex.printStackTrace();
        }
    }

    private String getExtText() throws IOException {
        return FileUtils.getExtensionFromFileName(salmonFile.getName()).toLowerCase();
    }

    private String getDateText() {
        return formatter.format(new Date(salmonFile.getLastDateModified()));
    }

    private String getSizeText() {
        if (!salmonFile.isDirectory())
            return ByteUtils.getBytes(salmonFile.getRealFile().getLength(), 2);
        else {
            int items = salmonFile.getChildrenCount();
            return items + " item" + (items == 1 ? "" : "s");
        }
    }

    public AesFile getAesFile() {
        return salmonFile;
    }

    private void checkAndStartAnimation() throws IOException {
        if (animationViewModel != this || !animationViewModel.animate) {
            resetAnimation();
            animationViewModel = this;
            animationViewModel.animate = true;
            if (getExtText().equals("mp4")) {
                animateVideo();
            }
        }
    }

    private void animateVideo() {
        executor.execute(() -> {
            if (!Thumbnails.isAnimationEnabled())
                return;
            int i = 0;
            try {
                while (animationViewModel == this && animationViewModel.animate) {
                    i++;
                    i %= THUMBNAIL_MAX_STEPS;
                    try {
                        Thread.sleep(1000);
                    } catch (InterruptedException e) {
                        throw new RuntimeException(e);
                    }
                    Image image = null;
                    try {
                        image = Thumbnails.getVideoThumbnail(salmonFile,
                                (i + 1) * VIDEO_THUMBNAIL_MSECS / 1000f);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                    if (image == null)
                        continue;
                    Image finalImage = image;
                    WindowUtils.runOnMainThread(() -> {
                        if (animationViewModel == this && animationViewModel.animate)
                            this.image.get().setImage(finalImage);
                    });
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
    }

    public static void resetAnimation() {
        if (animationViewModel != null)
            animationViewModel.animate = false;
        animationViewModel = null;
    }

    public void entered() {
        try {
            checkAndStartAnimation();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}
