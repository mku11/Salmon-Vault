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
import com.mku.fs.file.IFile;
import com.mku.func.BiConsumer;
import com.mku.func.Consumer;
import com.mku.salmon.vault.dialog.SalmonDialog;
import com.mku.salmon.vault.dialog.SalmonDialogs;
import com.mku.salmon.vault.image.Thumbnails;
import com.mku.salmon.vault.model.SalmonVaultManager;
import com.mku.salmon.vault.model.win.SalmonWinVaultManager;
import com.mku.salmon.vault.services.*;
import com.mku.salmon.vault.utils.WindowUtils;
import com.mku.salmon.vault.utils.FileTypes;
import com.mku.salmon.vault.viewmodel.SalmonFileViewModel;
import com.mku.salmonfs.file.AesFile;
import javafx.application.Platform;
import javafx.beans.property.SimpleBooleanProperty;
import javafx.beans.property.SimpleDoubleProperty;
import javafx.beans.property.SimpleStringProperty;
import javafx.collections.FXCollections;
import javafx.collections.ListChangeListener;
import javafx.collections.ObservableList;
import javafx.fxml.FXML;
import javafx.scene.Node;
import javafx.scene.control.MenuItem;
import javafx.scene.control.*;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.input.KeyCode;
import javafx.scene.input.MouseButton;
import javafx.stage.Stage;

import java.awt.*;
import java.io.File;
import java.io.IOException;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

public class MainController {
    private static final long MAX_TEXT_FILE = 1 * 1024 * 1024;
    private static final int THREADS = 1;
    @FXML
    public final ObservableList<SalmonFileViewModel> fileItemList = FXCollections.observableArrayList();

    @FXML
    public TableView<SalmonFileViewModel> table;
    private Stage stage;

    @FXML
    private final SimpleStringProperty status = new SimpleStringProperty();

    @FXML
    public SimpleStringProperty statusProperty() {
        return status;
    }

    public String getStatus() {
        return status.get();
    }

    @FXML
    private final SimpleStringProperty path = new SimpleStringProperty();

    @FXML
    public SimpleStringProperty pathProperty() {
        return path;
    }

    public String getPath() {
        return path.get();
    }

    public void setPath(String value) {
        if (value.startsWith("/"))
            value = value.substring(1);
        path.set("salmonfs://" + value);
    }

    private final SimpleBooleanProperty progressVisibility = new SimpleBooleanProperty();

    @FXML
    public SimpleBooleanProperty progressVisibilityProperty() {
        return progressVisibility;
    }

    public boolean getProgressVisibility() {
        return progressVisibility.get();
    }

    private final SimpleBooleanProperty cancelVisibility = new SimpleBooleanProperty();

    @FXML
    public SimpleBooleanProperty cancelVisibilityProperty() {
        return cancelVisibility;
    }

    public boolean getCancelVisibility() {
        return cancelVisibility.get();
    }

    @FXML
    private final SimpleDoubleProperty fileprogress = new SimpleDoubleProperty();

    @FXML
    public SimpleDoubleProperty fileprogressProperty() {
        return fileprogress;
    }

    public Double getFileprogress() {
        return fileprogress.get();
    }

    @FXML
    private final SimpleStringProperty fileprogresstext = new SimpleStringProperty();

    @FXML
    public SimpleStringProperty fileprogresstextProperty() {
        return fileprogresstext;
    }

    public String getFileprogresstext() {
        return fileprogresstext.get();
    }

    @FXML
    private final SimpleDoubleProperty filesprogress = new SimpleDoubleProperty();

    @FXML
    public SimpleDoubleProperty filesprogressProperty() {
        return filesprogress;
    }

    public Double getFilesprogress() {
        return filesprogress.get();
    }

    @FXML
    private final SimpleStringProperty filesprogresstext = new SimpleStringProperty();

    @FXML
    public SimpleStringProperty filesprogresstextProperty() {
        return filesprogresstext;
    }

    public String getFilesprogresstext() {
        return filesprogresstext.get();
    }

    private SalmonVaultManager manager;

    public MainController() {

    }

    private void fileItemAdded(Integer position, AesFile file) {
        WindowUtils.runOnMainThread(() ->
        {
            fileItemList.add(position, new SalmonFileViewModel(file));
        });
    }

    private void updateListItem(AesFile file) {
        SalmonFileViewModel vm = getViewModel(file);
        vm.update();
    }

    private void managerPropertyChanged(Object owner, String propertyName) {
        if (propertyName.equals("FileItemList")) {
            updateFileViewModels();
        } else if (propertyName.equals("CurrentItem")) {
            selectItem(manager.getCurrentItem());
        } else if (propertyName.equals("Status")) {
            WindowUtils.runOnMainThread(() -> status.setValue(manager.getStatus()));
            if (manager.isJobRunning()
                    || table.getSelectionModel().getSelectedCells().size() > 0
                    || manager.getFileManagerMode() == SalmonVaultManager.Mode.Copy
                    || manager.getFileManagerMode() == SalmonVaultManager.Mode.Move) {
                cancelVisibility.setValue(true);
            } else {
                cancelVisibility.setValue(manager.isJobRunning());
            }
        } else if (propertyName == "IsJobRunning") {
            WindowUtils.runOnMainThread(() ->
            {
                if (manager.getFileManagerMode() != SalmonVaultManager.Mode.Search) {
                    progressVisibility.setValue(manager.isJobRunning());
                    cancelVisibility.setValue(manager.isJobRunning());
                }
                if (!manager.isJobRunning())
                    status.setValue("");
            }, manager.isJobRunning() ? 0 : 1000);
        } else if (propertyName.equals("Path")) WindowUtils.runOnMainThread(() -> path.set(manager.getPath()));
        else if (propertyName.equals("FileProgress")) {
            WindowUtils.runOnMainThread(() -> fileprogress.set(manager.getFileProgress()));
            WindowUtils.runOnMainThread(() -> fileprogresstext.set((int) (manager.getFileProgress() * 100f) + " %"));
        } else if (propertyName.equals("FilesProgress")) {
            WindowUtils.runOnMainThread(() -> filesprogress.set(manager.getFilesProgress()));
            WindowUtils.runOnMainThread(() -> filesprogresstext.set((int) (manager.getFilesProgress() * 100f) + " %"));
        }
    }

    private void updateFileViewModels() {
        WindowUtils.runOnMainThread(() -> {
            if (manager.getFileItemList() == null)
                fileItemList.clear();
            else {
                fileItemList.clear();
                fileItemList.addAll(manager.getFileItemList().stream()
                        .map(SalmonFileViewModel::new)
                        .collect(Collectors.toList()));
            }
        });
    }

    synchronized void onSelectedItems(java.util.List<SalmonFileViewModel> selectedItems) {
        manager.getSelectedFiles().clear();
        for (SalmonFileViewModel item : selectedItems) {
            manager.getSelectedFiles().add(item.getAesFile());
        }
    }

    @FXML
    private void initialize() {
        setupTable();
    }

    @SuppressWarnings("unchecked")
    private void setupTable() {
        table.getSelectionModel().setSelectionMode(SelectionMode.MULTIPLE);
        table.setItems(fileItemList);
        table.setRowFactory(tv -> {
            TableRow<SalmonFileViewModel> row = new TableRow<>();
            row.setOnMouseClicked(event -> {
                if (event.getButton() == MouseButton.PRIMARY && event.getClickCount() == 2 && (!row.isEmpty())) {
                    onOpenItem(fileItemList.indexOf(row.getItem()));
                } else if (event.getButton() == MouseButton.SECONDARY) {
                    openContextMenu(row.getItem());
                }
            });
            row.setOnMouseEntered(event -> {
                SalmonFileViewModel item = row.getItem();
                if(item != null)
                    item.entered();
            });
            return row;
        });
        table.setOnKeyPressed(event -> {
            if (event.getCode() == KeyCode.ENTER) {
                event.consume();
                TableView.TableViewSelectionModel<SalmonFileViewModel> rowData = table.getSelectionModel();
                onOpenItem(rowData.getSelectedIndex());
            }
        });
        table.getSelectionModel().getSelectedCells().addListener((ListChangeListener<TablePosition>) c -> {
            onSelectedItems(table.getSelectionModel().getSelectedItems());
        });
        Platform.runLater(() -> table.requestFocus());
    }

    public void onAbout() {
        SalmonDialogs.promptAbout();
    }

    public void onOpenVault() {
        SalmonDialogs.promptOpenVault();
    }

    public void onCreateVault() {
        SalmonDialogs.promptCreateVault();
    }

    private void onOpenItem(int selectedItem) {
        try {
            openItem(selectedItem);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void onShow() {
        WindowUtils.runOnMainThread(() ->
        {
            manager.initialize();
        }, 1000);
    }

    public void setStage(Stage stage) {
        this.stage = stage;
        setupSalmonManager();
        stage.setOnCloseRequest(event -> {
            stage.close();
            Platform.exit();
            System.exit(0);
        });

        stage.setOnShowing(event -> Platform.runLater(() -> onShow()));
    }

    public void onRefresh() {
        manager.refresh();
    }

    public void onImportFiles() {
        SalmonDialogs.promptImportFiles("Import Files", SalmonVaultManager.REQUEST_IMPORT_FILES);
    }

    public void onImportFolder() {
        SalmonDialogs.promptImportFolder("Import Folder", SalmonVaultManager.REQUEST_IMPORT_FOLDER);
    }

    public void onExport() {
        SalmonDialogs.promptExportFolder("Export Files", SalmonVaultManager.REQUEST_EXPORT_DIR, false);
    }

    public void onExportAndDelete() {
        SalmonDialogs.promptExportFolder("Export Files and Delete", SalmonVaultManager.REQUEST_EXPORT_DIR, true);
    }

    public void onNewFolder() {
        SalmonDialogs.promptNewFolder();
    }

    public void onCopy() {
        if (!table.isFocused())
            return;
        try {
            manager.copySelectedFiles();
        } catch (Exception ex) {
            SalmonDialog.promptDialog("Error", "Could not select files for copy: " + ex);
        }
    }

    public void onCut() {
        if (!table.isFocused())
            return;
        try {
            manager.cutSelectedFiles();
        } catch (Exception ex) {
            SalmonDialog.promptDialog("Error", "Could not select files for move: " + ex);
        }
    }

    public void onDelete() {
        if (!table.isFocused())
            return;
        SalmonDialogs.promptDelete();
    }

    public void onPaste() {
        if (!table.isFocused())
            return;
        try {
            manager.pasteSelected();
        } catch (Exception ex) {
            SalmonDialog.promptDialog("Error", "Could not paste files: " + ex);
        }
    }

    public void onSearch() {
        SalmonDialogs.promptSearch();
    }

    private void showDiskUsage(AesFile[] files) {

        Consumer<String> updateBody = SalmonDialog.promptUpdatableDialog("Disk Usage", "");
        AtomicInteger fItems = new AtomicInteger();
        AtomicLong fSize = new AtomicLong();
        BiConsumer<AtomicInteger, AtomicLong> updateDiskUsage = (items, size) -> {
            if (items.get() > fItems.get())
                updateBody.accept(SalmonDialogs.getFormattedDiskUsage(items.get(), size.get()));
            fItems.set(items.get());
            fSize.set(size.get());
        };
        manager.getDiskUsage(files, updateDiskUsage);
        updateBody.accept(SalmonDialogs.getFormattedDiskUsage(fItems.get(), fSize.get()));
    }

    public void onStop() {
        manager.stopOperation();
        table.getSelectionModel().clearSelection();
    }

    public void onSettings() {
        try {
            SettingsController.openSettings(stage);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public void onCloseVault() {
        manager.closeVault();
    }

    public void onChangePassword() {
        SalmonDialogs.promptChangePassword();
    }

    public void onImportAuth() {
        SalmonDialogs.promptImportAuth();
    }

    public void onExportAuth() {
        SalmonDialogs.promptExportAuth();
    }

    public void onRevokeAuth() {
        SalmonDialogs.promptRevokeAuth();
    }

    public void onDisplayAuthID() {
        SalmonDialogs.onDisplayAuthID();
    }

    public void onExit() {
        SalmonDialogs.promptExit();
    }

    public void onBack() {
        manager.goBack();
    }

    private void selectItem(AesFile file) {
        SalmonFileViewModel vm = getViewModel(file);
        if (vm == null) {
            WindowUtils.runOnMainThread(() -> {
                try {
                    table.getSelectionModel().clearSelection();
                } catch (Exception ex) {
                    ex.printStackTrace();
                }
            });
            return;
        }
        try {
            int index = 0;
            for (SalmonFileViewModel viewModel : fileItemList) {
                if (viewModel == vm) {
                    int finalIndex = index;
                    WindowUtils.runOnMainThread(() -> {
                        try {
                            table.getSelectionModel().select(finalIndex);
                            table.scrollTo(table.selectionModelProperty().get().getSelectedIndex());
                            table.requestFocus();
                        } catch (Exception ex) {
                            ex.printStackTrace();
                        }
                    });
                    break;
                }
                index++;
            }
        } catch (Exception ex) {
            ex.printStackTrace();
        }
    }

    public void setupSalmonManager() {
        try {
            ServiceLocator.getInstance().register(ISettingsService.class, new JavaFxSettingsService());
            ServiceLocator.getInstance().register(IFileService.class, new JavaFxFileService());
            ServiceLocator.getInstance().register(IHttpFileService.class, new JavaFxHttpFileService());
            ServiceLocator.getInstance().register(IWSFileService.class, new JavaFxWebServiceFileService());
            ServiceLocator.getInstance().register(IFileDialogService.class, new JavaFxFileDialogService(stage));
            ServiceLocator.getInstance().register(IWebBrowserService.class, new JavaFxBrowserService());
            ServiceLocator.getInstance().register(IKeyboardService.class, new JavaFxKeyboardService());
            ServiceLocator.getInstance().register(IMediaPlayerService.class, new JavaFxMediaPlayerService());

            SalmonVaultManager.setThreads(THREADS);
            if (System.getProperty("os.name").toUpperCase().toUpperCase().startsWith("WINDOWS"))
                manager = SalmonWinVaultManager.getInstance();
            else
                manager = SalmonVaultManager.getInstance();

            manager.openListItem = this::OpenListItem;
            manager.observePropertyChanges(this::managerPropertyChanged);
            manager.updateListItem = this::updateListItem;
            manager.onFileItemAdded = this::fileItemAdded;

        } catch (Exception e) {
            e.printStackTrace();
            new SalmonDialog(Alert.AlertType.ERROR, "Error during initializing: " + e.getMessage()).show();
        }
    }

    private void openContextMenu(SalmonFileViewModel fileItem) {
        ContextMenu contextMenu = new ContextMenu();

        MenuItem item;

        if (fileItem.getAesFile().isFile()) {
            item = new MenuItem("View");
            item.setGraphic(getImageIcon("/icons/file_small.png"));
            item.setOnAction((event) -> onOpenItem(fileItemList.indexOf(fileItem)));
            contextMenu.getItems().add(item);

            item = new MenuItem("View as Text");
            item.setGraphic(getImageIcon("/icons/text_file_small.png"));
            item.setOnAction((event) -> startTextEditor(fileItem));
            contextMenu.getItems().add(item);

            item = new MenuItem("View External");
            item.setGraphic(getImageIcon("/icons/view_external_small.png"));
            item.setOnAction((event) -> promptOpenExternalApp(fileItem.getAesFile(), null));
            contextMenu.getItems().add(item);
        } else {
            item = new MenuItem("Open");
            item.setGraphic(getImageIcon("/icons/folder_menu_small.png"));
            item.setOnAction((event) -> onOpenItem(fileItemList.indexOf(fileItem)));
            contextMenu.getItems().add(item);
        }

        item = new MenuItem("Copy (Ctrl+C)");
        item.setGraphic(getImageIcon("/icons/copy_file_small.png"));
        item.setOnAction((event) -> onCopy());
        contextMenu.getItems().add(item);

        item = new MenuItem("Cut (Ctrl+X)");
        item.setGraphic(getImageIcon("/icons/move_file_small.png"));
        item.setOnAction((event) -> onCut());
        contextMenu.getItems().add(item);

        item = new MenuItem("Delete");
        item.setGraphic(getImageIcon("/icons/delete_small.png"));
        item.setOnAction((event) -> onDelete());
        contextMenu.getItems().add(item);

        item = new MenuItem("Rename");
        item.setGraphic(getImageIcon("/icons/rename_small.png"));
        item.setOnAction((event) -> SalmonDialogs.promptRenameFile(fileItem.getAesFile()));
        contextMenu.getItems().add(item);

        item = new MenuItem("Export (Ctrl+E)");
        item.setGraphic(getImageIcon("/icons/export_file_small.png"));
        item.setOnAction((event) -> onExport());
        contextMenu.getItems().add(item);

        item = new MenuItem("Export And Delete (Ctrl+Shift+E)");
        item.setGraphic(getImageIcon("/icons/export_and_delete_file_small.png"));
        item.setOnAction((event) -> onExportAndDelete());
        contextMenu.getItems().add(item);

        item = new MenuItem("Properties");
        item.setGraphic(getImageIcon("/icons/info_small.png"));
        item.setOnAction((event) -> SalmonDialogs.showProperties(fileItem.getAesFile()));
        contextMenu.getItems().add(item);

        item = new MenuItem("Disk Usage");
        item.setGraphic(getImageIcon("/icons/disk_small.png"));
        item.setOnAction((event) -> {
            ObservableList<SalmonFileViewModel> files = table.getSelectionModel().getSelectedItems();
            showDiskUsage(files.stream().map(x -> x.getAesFile()).collect(Collectors.toList()).toArray(new AesFile[0]));
        });
        contextMenu.getItems().add(item);

        Point p = MouseInfo.getPointerInfo().getLocation();
        contextMenu.show(stage, p.x, p.y);
    }

    private Node getImageIcon(String path) {
        ImageView imageView = new ImageView();
        imageView.setImage(new Image(Thumbnails.class.getResourceAsStream(path)));
        return imageView;
    }

    protected void openItem(int position) throws Exception {
        if (fileItemList.size() < position)
            return;
        SalmonFileViewModel selectedFile = fileItemList.get(position);
        manager.openItem(selectedFile.getAesFile());
    }

    private SalmonFileViewModel getViewModel(AesFile item) {
        for (SalmonFileViewModel vm : fileItemList) {
            if (vm.getAesFile() == item)
                return vm;
        }
        return null;
    }

    private boolean OpenListItem(AesFile file) {
        SalmonFileViewModel vm = getViewModel(file);
        try {
            if (FileUtils.isVideo(file.getName())) {
                startMediaPlayer(vm);
                return true;
            } else if (FileUtils.isAudio(file.getName())) {
                startMediaPlayer(vm);
                return true;
            } else if (FileUtils.isImage(file.getName())) {
                startImageViewer(vm);
                return true;
            } else if (FileTypes.isPDF(file.getName()) || FileTypes.isDocument(file.getName())) {
                startPDFViewer(vm);
                return true;
            } else if (FileUtils.isText(file.getName())) {
                startTextEditor(vm);
                return true;
            } else {
                promptOpenExternalApp(file, "No internal viewers found.");
            }
        } catch (Exception ex) {
            ex.printStackTrace();
            new SalmonDialog(Alert.AlertType.WARNING, "Could not open: " + ex).show();
        }
        return false;
    }

    private void promptOpenExternalApp(AesFile file, String msg) {
        SalmonDialog.promptDialog("Open External", (msg != null ? msg + " " : "")
                        + "Press Ok to export the file temporarily and " +
                        "open it with an external app. \n",
                "Ok", () -> {
                    try {
                        openWith(file);
                    } catch (Exception e) {
                        new SalmonDialog(Alert.AlertType.ERROR, "Could not open file: " + e).show();
                    }
                }, "Cancel", null);
    }

    private void openWith(AesFile salmonFile) {
        SalmonDialogs.promptShare("Share File", SalmonVaultManager.REQUEST_EXPORT_DIR, (sharedDir) -> {
            openWith(salmonFile, sharedDir);
        });
    }

    private void openWith(AesFile salmonFile, IFile sharedDir) {
        AesFile parentDir = salmonFile.getParent();
        if (manager.isJobRunning())
            throw new RuntimeException("Another job is running");
        IFile[] sharedFiles = new IFile[1];
        manager.exportFiles(new AesFile[]{salmonFile}, sharedDir, false, (files) ->
        {
            WindowUtils.runOnMainThread(() -> {
                try {
                    IFile sharedFile = files[0];
                    sharedFiles[0] = sharedFile;
                    String os = System.getProperty("os.name").toUpperCase();
                    if (os.startsWith("WINDOWS")) { // for windows we let the user choose the app
                        Runtime.getRuntime().exec("rundll32.exe SHELL32.DLL,OpenAs_RunDLL " + sharedFile.getPath());
                    } else {
                        if (Desktop.getDesktop().isSupported(Desktop.Action.EDIT)) {
                            Desktop.getDesktop().edit(new File(sharedFile.getPath()));
                        } else if (Desktop.getDesktop().isSupported(Desktop.Action.OPEN)) {
                            Desktop.getDesktop().open(new File(sharedFile.getPath()));
                        }
                    }
                } catch (Exception e) {
                    new SalmonDialog(Alert.AlertType.ERROR, "Could not launch external app: " + e).show();
                }
            });
        });
        SalmonDialog.promptDialog("Open External",
                "You will be soon prompted to open the file with an app. " +
                "When you're done with the changes click OK to import your file.", "Import", () -> {
            manager.importFiles(sharedFiles, parentDir, false, (files) -> {
                if (files.length == 0 || !files[0].exists()) {
                    SalmonDialog.promptDialog("Import Error",
                            "Could not import the file make sure you delete or re-import manually: "
                            + sharedFiles[0].getDisplayPath());
                } else {
                    renameOldFile(salmonFile);
                    deleteAfterImportShared(sharedFiles[0]);
                }
            }, false);
        }, "Ignore", () -> {
            deleteAfterImportShared(sharedFiles[0]);
        });
    }

    private void renameOldFile(AesFile salmonFile) {
        try {
            String ext = FileUtils.getExtensionFromFileName(salmonFile.getName());
            int idx = salmonFile.getName().lastIndexOf(".");
            String newFilename;
            if (idx >= 0)
                newFilename = salmonFile.getName().substring(0, idx) + ".bak." + ext;
            else
                newFilename = salmonFile.getName() + ".bak";
            salmonFile.rename(newFilename);
        } catch (Exception ex) {
            ex.printStackTrace();
        }
    }

    public IFile getSharedDir() throws Exception {
        String sharedDir;
        String os = System.getProperty("os.name").toUpperCase();
        if (os.toUpperCase().contains("WIN")) {
            sharedDir = System.getenv("HOMEDRIVE") + System.getenv("HOMEPATH") + "\\"
                    + "SalmonShared";
        } else if (os.toUpperCase().contains("MAC")) {
            sharedDir = System.getProperty("user.home") + "/" + "SalmonShared";
        } else if (os.toUpperCase().contains("LINUX")) {
            sharedDir = System.getProperty("user.dir") + "/" + "SalmonShared";
        } else
            throw new Exception("Operating System not supported");
        return new com.mku.fs.file.File(sharedDir);
    }

    private void deleteAfterImportShared(IFile sharedFile) {
        boolean res = false;
        try {
            res = sharedFile.delete();
        } catch (Exception ex) {
            ex.printStackTrace();
        }
        if (!res) {
            SalmonDialog.promptDialog("Error",
                    "Could not delete the exported file, make sure you close the external app or delete manually: "
                            + sharedFile.getDisplayPath(), "Try again", () -> {
                        deleteAfterImportShared(sharedFile);
                    }, "Cancel", null);
        }
    }

    private void startTextEditor(SalmonFileViewModel item) {
        WindowUtils.runOnMainThread(() -> {
            try {
                if (item.getAesFile().getLength() > MAX_TEXT_FILE) {
                    new SalmonDialog(Alert.AlertType.WARNING, "File too large").show();
                    return;
                }
                TextEditorController.openTextEditor(item, stage);
                selectItem(null);
                selectItem(item.getAesFile());
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
    }

    private void startImageViewer(SalmonFileViewModel item) {
        WindowUtils.runOnMainThread(() -> {
            try {
                ImageViewerController.openImageViewer(item, stage);
            } catch (IOException e) {
                e.printStackTrace();
            }
        });
    }

    private void startPDFViewer(SalmonFileViewModel item) {
        WindowUtils.runOnMainThread(() -> {
            try {
                PDFViewerController.openPDFViewer(item, stage);
            } catch (IOException e) {
                e.printStackTrace();
            }
        });
    }

    private void startMediaPlayer(SalmonFileViewModel item) {
        WindowUtils.runOnMainThread(() -> {
            try {
                MediaPlayerController.openMediaPlayer(item, stage);
            } catch (IOException e) {
                e.printStackTrace();
            }
        });
    }
}