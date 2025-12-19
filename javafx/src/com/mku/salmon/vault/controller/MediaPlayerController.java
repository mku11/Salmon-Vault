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
import com.mku.salmon.vault.dialog.SalmonDialog;
import com.mku.salmon.vault.model.SalmonSettings;
import com.mku.salmon.vault.utils.MimeUtils;
import com.mku.salmon.vault.utils.TaskQueueUtils;
import com.mku.salmon.vault.utils.Timer;
import com.mku.salmon.vault.utils.WindowUtils;
import com.mku.salmon.vault.viewmodel.SalmonFileViewModel;
import com.mku.salmonfs.file.AesFile;
import com.mku.salmonfs.handler.AesStreamHandler;
import javafx.application.Platform;
import javafx.beans.property.ObjectProperty;
import javafx.beans.property.SimpleObjectProperty;
import javafx.beans.property.SimpleStringProperty;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.MenuBar;
import javafx.scene.control.Slider;
import javafx.scene.image.Image;
import javafx.scene.input.MouseEvent;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.VBox;
import javafx.scene.media.Media;
import javafx.scene.media.MediaPlayer;
import javafx.scene.media.MediaView;
import javafx.stage.Stage;

import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Objects;
import java.util.TimeZone;

public class MediaPlayerController {
    private static final SimpleDateFormat format = new SimpleDateFormat("HH:mm:ss");
    private static final double mediaViewHorizMargin = 24;
    private static final double mediaViewVertMargin = 64;
    private static final int buffers = 2;
    private static final int bufferSize = 8 * 1024 * 1024;
    private static final int threads = 1;
    private static final int backOffset = 256 * 1024;
    private static Image playImage;
    private static Image pauseImage;
	private static boolean checkIntegrity = true;

    static {
        setupImages();
    }

    @FXML
    public GridPane gridPane;
    @FXML
    public Button playButton;
    @FXML
    public Slider slider;
    @FXML
    public HBox mediaContainer;
    @FXML
    public VBox root;
    @FXML
    public HBox controlContainer;
    @FXML
    private MediaView mediaView;
    @FXML
    private MenuBar menuBar;

    private Stage stage;
    private MediaPlayer mp;
    private String url;
    private final ObjectProperty<Image> image = new SimpleObjectProperty<>(this, "image");
    private Timer timer;
    private AesStreamHandler handler;
    private boolean closed;

    public final void setImage(Image image) {
        this.image.set(image);
    }

    public final Image getImage() {
        return image.get();
    }

    public final ObjectProperty<Image> imageProperty() {
        return image;
    }

    private final SimpleStringProperty currtime = new SimpleStringProperty(this, "00:00:00");

    public final void setCurrtime(String value) {
        this.currtime.set(value);
    }

    public final String getCurrtime() {
        return currtime.get();
    }

    public final SimpleStringProperty currtimeProperty() {
        return currtime;
    }

    private final SimpleStringProperty totaltime = new SimpleStringProperty(this, "00:00:00");

    public final void setTotaltime(String value) {
        this.totaltime.set(value);
    }

    public final String getTotaltime() {
        return totaltime.get();
    }

    public final SimpleStringProperty totaltimeProperty() {
        return totaltime;
    }

    @FXML
    private void initialize() {
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        image.setValue(playImage);
        currtime.setValue(format.format(new Date()));
        totaltime.setValue(format.format(new Date()));
    }

    public void setStage(Stage stage) {
        this.stage = stage;
        stage.setOnCloseRequest(event -> this.onClose());
    }

    public static void openMediaPlayer(SalmonFileViewModel file, Stage owner) throws IOException {
        FXMLLoader loader = new FXMLLoader(SalmonSettings.getInstance().getClass().getResource("/view/media-player.fxml"));
        Parent root = loader.load();
        MediaPlayerController controller = loader.getController();
        Stage stage = new Stage();
        controller.setStage(stage);
        stage.getIcons().add(WindowUtils.getDefaultIcon());
        Scene scene = new Scene(root);
        stage.setScene(scene);
        if (MimeUtils.isVideo(file.getAesFile().getName())) {
            stage.widthProperty().addListener((observable, oldValue, newValue) -> {
                controller.mediaView.setFitWidth(newValue.doubleValue()
                        - controller.root.getPadding().getLeft()
                        - controller.root.getPadding().getRight()
                        - mediaViewHorizMargin
                );
            });
            stage.heightProperty().addListener((observable, oldValue, newValue) -> {
                controller.mediaView.setFitHeight(newValue.doubleValue()
                        - controller.root.getPadding().getTop()
                        - controller.root.getPadding().getBottom()
                        - controller.controlContainer.getHeight()
                        - controller.menuBar.getHeight()
                        - mediaViewVertMargin
                );
            });
            scene.getWindow().setWidth(800);
            scene.getWindow().setHeight(600);
        }
        stage.show();
        TaskQueueUtils.run(() -> {
            controller.load(file);
            controller.play();
        });
    }

    private static void setupImages() {
        playImage = new Image(Objects.requireNonNull(
                MediaPlayerController.class.getResourceAsStream("/icons/play.png")));
        pauseImage = new Image(Objects.requireNonNull(
                MediaPlayerController.class.getResourceAsStream("/icons/pause.png")));
    }

    private void play() {
        mp.play();
    }

    private void load(SalmonFileViewModel fileItem) {
        AesFile file = fileItem.getAesFile();
        String filePath;
        try {
			file.setVerifyIntegrity(checkIntegrity);
            filePath = file.getRealPath();
            if(handler == null) {
                handler = AesStreamHandler.getInstance();
                handler.setProperties(buffers, bufferSize, threads, backOffset);
            }
            this.url = handler.register(filePath, file);
            Media m = new Media(url);
            mp = new MediaPlayer(m);
            mp.setOnPaused(() -> setImage(playImage));
            mp.setOnPlaying(() -> setImage(pauseImage));
            mediaView.setMediaPlayer(mp);
            startTimer();

            String filename = file.getName();
            WindowUtils.runOnMainThread(()-> stage.setTitle("Media Player - " + filename));
        } catch (Exception e) {
            e.printStackTrace();
            SalmonDialog.promptDialog("Error", "Could not load file: " + e);
        }
    }

    private void startTimer() {
        timer = new Timer(this::updateTimeControls, 1000);
        timer.start();
    }

    private void updateTimeControls() {
        int progressInt = (int) (mp.getCurrentTime().toMillis() / mp.getTotalDuration().toMillis() * 1000);
        slider.setValue(progressInt);
        Date curr = new Date((long) mp.getCurrentTime().toMillis());
        Date total = new Date((long) mp.getTotalDuration().toMillis());
        Platform.runLater(() -> {
            currtime.setValue(format.format(curr));
            totaltime.setValue(format.format(total));
        });
    }

    public void onClose() {
        if(closed)
            return;
        if (timer != null) {
            timer.cancel();
        }
        mp.stop();
        mp.dispose();
        stage.close();
        if(handler != null)
            handler.unregister(this.url);
        mp = null;
        closed = true;
    }

    public void togglePlay() {
        if (mp.getStatus() == MediaPlayer.Status.PLAYING) {
            mp.pause();
        } else
            mp.play();
    }

    public void onSliderChanged(MouseEvent mouseEvent) {
        int posMillis = (int) (mp.getTotalDuration().toMillis() * slider.getValue() / 1000);
        javafx.util.Duration duration = javafx.util.Duration.millis(posMillis);
        mp.seek(duration);
    }
}
