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

import { Binding } from "../../common/binding/binding.js";
import { StringProperty } from "../../common/binding/string_property.js";
import { BooleanProperty } from "../../common/binding/boolean_property.js";
import { ObservableList } from "../../common/binding/observable_list.js";
import { DoubleProperty } from "../../common/binding/double_property.js";
import { SalmonDialog } from "../dialog/salmon_dialog.js";
import { ServiceLocator } from "../../common/services/service_locator.js";
import { ISettingsService } from "../../common/services/isettings_service.js";
import { JsSettingsService } from "../services/js_settings_service.js";
import { IFileService } from "../../common/services/ifile_service.js";
import { IHttpFileService } from "../../common/services/ihttp_file_service.js";
import { IWSFileService } from "../../common/services/iws_file_service.js";
import { JsFileService } from "../services/js_file_service.js";
import { JsHttpFileService } from "../services/js_http_file_service.js";
import { JsWSFileService } from "../services/js_ws_file_service.js";
import { IFileDialogService } from "../../common/services/ifile_dialog_service.js";
import { JsFileDialogService } from "../services/js_file_dialog_service.js";
import { IWebBrowserService } from "../../common/services/iweb_browser_service.js";
import { JsBrowserService } from "../services/js_browser_service.js";
import { IKeyboardService } from "../../common/services/ikeyboard_service.js";
import { JsKeyboardService } from "../services/js_keyboard_service.js";
import { IMediaPlayerService } from "../../common/services/imedia_player_service.js";
import { JsMediaPlayerService } from "../services/js_media_player_service.js";
import { SalmonDialogs } from "../../common/dialog/salmon_dialogs.js";
import { SalmonVaultManager } from "../../common/model/salmon_vault_manager.js";
import { SalmonFileViewModel } from "../viewmodel/salmon_file_view_model.js";
import { FileUtils } from "../../lib/salmon-fs/fs/drive/utils/file_utils.js";
import { ImageViewerController } from "./image_viewer_controller.js";
import { TextEditorController } from "./text_editor_controller.js";
import { SettingsController } from "./settings_controller.js";
import { MediaPlayerController } from "./media_player_controller.js";
import { PdfViewerController } from "./pdf_viewer_controller.js";

export class MainController {
    static MAX_TEXT_FILE = 1 * 1024 * 1024;
    static THREADS = 1;

    fileItemList = Binding.bind(document, 'table', 'tbody', new ObservableList());
    status = Binding.bind(document, 'status', 'innerText', new StringProperty());
    path = Binding.bind(document, 'path', 'value', new StringProperty());
    progressVisibility = Binding.bind(document, 'progress-layout-container', 'display', new BooleanProperty());
    fileprogress = Binding.bind(document, 'file-progress', 'value', new DoubleProperty());
    fileprogresstext = Binding.bind(document, 'file-progress-text', 'innerText', new StringProperty());
    filesprogress = Binding.bind(document, 'files-progress', 'value', new DoubleProperty());
    filesprogresstext = Binding.bind(document, 'files-progress-text', 'innerText', new StringProperty());

    keysPressed = new Set();
    metaKeysPressed = new Set();
    manager;

    constructor() {
        
    }
    
    setPath(value) {
        if (value.startsWith("/"))
            value = value.substring(1);
        path.set("salmonfs://" + value);
    }

    setupKeyboardShortcuts() {
        ServiceLocator.getInstance().resolve(IKeyboardService).addOnKeyListener((e) => this.onKey(e, this));
        ServiceLocator.getInstance().resolve(IKeyboardService).addOnMetaKeyListener((e) => this.onMetaKey(e, this));
    }

    onMetaKey(e, self) {
        let detected;
        if (e.type == 'keydown') {
            self.metaKeysPressed.add(e.key);
            detected = self.detectShortcuts();
        } else {
            self.metaKeysPressed.delete(e.key);
        }
        return detected;
    }

    onKey(e, self) {
        let detected;
        if (e.type == 'keydown') {
            self.keysPressed.add(e.key.toUpperCase());
            detected = self.detectShortcuts();
        } else if (!e.Down && e.key == "Enter") {
            // workaround for Enter
            self.keysPressed.add(e.key.toUpperCase());
            detected = self.detectShortcuts();
            self.keysPressed.delete(e.key.toUpperCase());
        }
        else
            self.keysPressed.delete(e.key.toUpperCase());
        return detected;
    }

    isModalOpened() {
        let modals = document.getElementsByClassName("modal");
        return modals.length > 0;
    }

    detectShortcuts() {
        if (document.activeElement.tagName == 'BODY' && !this.isModalOpened())
        {
            if (this.metaKeysPressed.has('Control') && this.keysPressed.has("R"))
                this.onRefresh();
            else if (this.keysPressed.has("Back"))
                this.onBack();
            else if (this.metaKeysPressed.has('Control') && this.keysPressed.has("O"))
                this.onOpenVault();
            else if (this.metaKeysPressed.has('Control') && this.keysPressed.has("N"))
                this.onCreateVault();
            else if (this.metaKeysPressed.has('Control') && this.keysPressed.has("L"))
                this.onCloseVault();
            else if (this.metaKeysPressed.has('Control') && this.keysPressed.has("I"))
                this.onImport();
            else if (this.metaKeysPressed.has('Control') && this.metaKeysPressed.has('Shift') 
                && this.keysPressed.has("E"))
                this.onExportAndDelete();
            else if (this.metaKeysPressed.has('Control') && this.keysPressed.has("E"))
                this.onExport();
            else if (this.metaKeysPressed.has('Control') && this.keysPressed.has("C"))
                this.onCopy();
            else if (this.metaKeysPressed.has('Control') && this.keysPressed.has("X"))
                this.onCut();
            else if (this.metaKeysPressed.has('Control') && this.keysPressed.has("V"))
                this.onPaste();
            else if (this.metaKeysPressed.has('Control') && this.keysPressed.has("F"))
                this.onSearch();
            else if (this.metaKeysPressed.has('Control') && this.keysPressed.has("A")) {
                for(let i=0; i<this.fileItemList.length(); i++) {
                    let vm = this.fileItemList.get(i);
                    this.fileItemList.select(vm);
                }
            } else if (this.keysPressed.has("DELETE"))
                this.onDelete();
            else if (this.keysPressed.has("ESCAPE")) {
                this.keysPressed.clear();
                this.metaKeysPressed.clear();
                this.manager.clearCopiedFiles();
                this.fileItemList.clearSelectedItems();
            }
            else if (this.keysPressed.has("ENTER")) {
                if (this.fileItemList.getSelectedIndex() >= 0)
                    this.onOpenItem(this.fileItemList.getSelectedIndex());
            } else {
                return false;
            }
            return true;
        }
        return false;
    }

    fileItemAdded(position, file, self) {
        self.fileItemList.add(position, new SalmonFileViewModel(file));
    }

    async updateListItem(file, self) {
        let vm = self.getViewModel(file);
        await vm.update();
    }

    managerPropertyChanged(owner, propertyName, self) {
        if (propertyName == "FileItemList") {
            self.updateFileViewModels();
        } else if (propertyName == "CurrentItem") {
            self.selectItem(self.manager.getCurrentItem());
        } else if (propertyName == "Status") {
            setTimeout(() => self.status.set(self.manager.getStatus()));
        } else if (propertyName == "IsJobRunning") {
            setTimeout(() => {
                if (self.manager.getFileManagerMode() != SalmonVaultManager.Mode.Search) {
                    self.progressVisibility.set(self.manager.isJobRunning());
                }
                if (!self.manager.isJobRunning())
                    self.status.set("");
            }, self.manager.isJobRunning() ? 0 : 1000);
        } else if (propertyName == "Path") setTimeout(() => self.path.set(self.manager.getPath()));
        else if (propertyName == "FileProgress") {
            setTimeout(() => self.fileprogress.set(self.manager.getFileProgress()));
            setTimeout(() => self.fileprogresstext.set(Math.ceil(self.manager.getFileProgress() * 100.00) + " %"));
        } else if (propertyName == "FilesProgress") {
            setTimeout(() => self.filesprogress.set(self.manager.getFilesProgress()));
            setTimeout(() => self.filesprogresstext.set(Math.ceil(self.manager.getFilesProgress() * 100.00) + " %"));
        }
    }

    updateFileViewModels() {
        if (this.manager.getFileItemList() == null)
            this.fileItemList.clear();
        else {
            this.fileItemList.clear();
            for (let file of this.manager.getFileItemList())
                this.fileItemList.push(new SalmonFileViewModel(file));
        }
    }

    onSelectedItems(selectedItems) {
        this.manager.getSelectedFiles().clear();
        for (let item of selectedItems) {
            this.manager.getSelectedFiles().add(item.getSalmonFile());
        }
    }

    initialize() {
        this.setupTable();
    }

    setupTable() {
        this.setContextMenu();
        this.fileItemList.onItemDoubleClicked = async (index) => this.onOpenItem(index);
        this.fileItemList.onItemMouseEntered = async (index) => this.onItemMouseEntered(index);
        this.fileItemList.addSelectedChangeListener(() => {
            this.onSelectedItems(this.fileItemList.getSelectedItems());
        });
    }

    onAbout() {
        SalmonDialogs.promptAbout();
    }

    onOpenVault() {
        SalmonDialogs.promptOpenVault();
    }

    onCreateVault() {
        SalmonDialogs.promptCreateVault();
    }

    async onOpenItem(selectedItem) {
        try {
            await this.openItem(selectedItem);
        } catch (e) {
            console.error(e);
        }
    }

    onItemMouseEntered(position) {
        let vm = this.fileItemList.get(position);
        try {
            vm.entered();
        } catch (e) {
            console.error(e);
        }
    }

    onShow() {
        setTimeout(() => {
            this.manager.initialize();
        }, 1000);
    }

    setWindow() {
        this.setupSalmonManager();
        this.onShow();
    }

    onRefresh() {
        this.manager.refresh();
    }

    async onImport() {
        SalmonDialogs.promptImportFiles();
    }

    onExport() {
        SalmonDialogs.promptExportFolder("Export Files", SalmonVaultManager.REQUEST_EXPORT_DIR, false);
    }

    onExportAndDelete() {
        SalmonDialogs.promptExportFolder("Export Files and Delete", SalmonVaultManager.REQUEST_EXPORT_DIR, true);
    }

    onNewFolder() {
        SalmonDialogs.promptNewFolder();
    }

    onNewFile() {
        SalmonDialogs.promptNewFile();
    }

    onCopy() {
        this.manager.copySelectedFiles();
    }

    onCut() {
        this.manager.cutSelectedFiles();
    }

    onDelete() {
        SalmonDialogs.promptDelete();
    }

    onPaste() {
        this.manager.pasteSelected();
    }

    onSearch() {
        SalmonDialogs.promptSearch();
    }

    onStop() {
        this.manager.stopOperation();
    }

    onSettings() {
        try {
            SettingsController.openSettings(window);
        } catch (e) {
            console.error(e);
        }
    }

    onCloseVault() {
        this.manager.closeVault();
    }

    onChangePassword() {
        SalmonDialogs.promptChangePassword();
    }

    onImportAuth() {
        SalmonDialogs.promptImportAuth();
    }

    onExportAuth() {
        SalmonDialogs.promptExportAuth();
    }

    onRevokeAuth() {
        SalmonDialogs.promptRevokeAuth();
    }

    async onDisplayAuthId() {
        await SalmonDialogs.onDisplayAuthId();
    }

    onExit() {
        SalmonDialogs.promptExit();
    }

    async onBack() {
        this.manager.goBack();
    }

    selectItem(file) {
        let vm = this.getViewModel(file);
        if (vm == null)
            return;
        try {
            let index = 0;
            for (let i = 0; i < this.fileItemList.size(); i++) {
                let viewModel = this.fileItemList.get(i);
                if (viewModel == vm) {
                    setTimeout(() => {
                        try {
                            // TODO:
                            this.fileItemList.select(vm);
                            this.fileItemList.bringIntoView(index);
                        } catch (ex) {
                            console.error(ex);
                        }
                    });
                    break;
                }
                index++;
            }
        } catch (ex) {
            console.error(ex);
        }
    }

    setupSalmonManager() {
        try {
            ServiceLocator.getInstance().register(ISettingsService, new JsSettingsService());
            ServiceLocator.getInstance().register(IFileService, new JsFileService());
            ServiceLocator.getInstance().register(IHttpFileService, new JsHttpFileService());
            ServiceLocator.getInstance().register(IWSFileService, new JsWSFileService());
            ServiceLocator.getInstance().register(IFileDialogService, new JsFileDialogService());
            ServiceLocator.getInstance().register(IWebBrowserService, new JsBrowserService());
            ServiceLocator.getInstance().register(IKeyboardService, new JsKeyboardService());
            ServiceLocator.getInstance().register(IMediaPlayerService, new JsMediaPlayerService());
            this.setupKeyboardShortcuts();

            SalmonVaultManager.setThreads(MainController.THREADS);
            this.manager = SalmonVaultManager.getInstance();

            this.manager.openListItem = async (file) => await this.OpenListItem(file, this);
            this.manager.observePropertyChanges(this.managerPropertyChanged, this);
            this.manager.updateListItem = (file) => this.updateListItem(file, this);
            this.manager.onFileItemAdded = (position, file) => this.fileItemAdded(position, file, this);
            let currentExportDir = this.manager.getExportDir;
            this.manager.getExportDir = async ()=>  {
                return new Promise(async (resolve, reject)=> {
                    ServiceLocator.getInstance().resolve(IFileDialogService).pickFolder("Select directory to export files",
                    await currentExportDir(this.manager), (filePath) => {
                        resolve(filePath);
                    },
                    SalmonVaultManager.REQUEST_EXPORT_DIR);
                });
            }
        } catch (e) {
            console.error(e);
            new SalmonDialog("Error during initializing: " + e).show();
        }
    }

    setContextMenu() {
        this.fileItemList.setContextMenuTitle((item) => {
            return item.name;
        });
        let contextMenu = this.fileItemList.getContextMenu();

        contextMenu["View"] = { name: "View", 
            icon: "assets/images/common-res/icons/file_small.png", 
            callback: async () => this.onOpenItem(this.fileItemList.getSelectedIndex()) };
        contextMenu["ViewAsText"] = { name: "View as Text", 
            icon: "assets/images/common-res/icons/text_file_small.png", 
            callback: async () => this.startTextEditor(this.fileItemList.getSelectedItems()[0]) };
        contextMenu["Copy"] = { name: "Copy (Ctrl-C)", 
            icon: "assets/images/common-res/icons/copy_file_small.png", 
            callback: async () => this.onCopy() };
        contextMenu["Cut"] = { name: "Cut (Ctrl-X)", 
            icon: "assets/images/common-res/icons/move_file_small.png", 
            callback: async () => this.onCut() };
        contextMenu["Delete"] = { name: "Delete (Del)", 
            icon: "assets/images/common-res/icons/delete_small.png", 
            callback: async () => this.onDelete() };
        contextMenu["Rename"] = { name: "Rename", 
            icon: "assets/images/common-res/icons/rename_small.png", 
            callback: async () => SalmonDialogs.promptRenameFile(this.fileItemList.getSelectedItems()[0].getSalmonFile()) };
        contextMenu["Export"] = { name: "Export (Ctrl-E)", 
            icon: "assets/images/common-res/icons/export_file_small.png", 
            callback: async () => this.onExport() };
        contextMenu["ExportAndDelete"] = { name: "Export And Delete (Ctrl-Shift-E)", 
            icon: "assets/images/common-res/icons/export_and_delete_file_small.png", 
            callback: async () => this.onExportAndDelete() };
        contextMenu["Properties"] = { name: "Properties", 
            icon: "assets/images/common-res/icons/info_small.png", 
            callback: async () => await SalmonDialogs.showProperties(this.fileItemList.getSelectedItems()[0].getSalmonFile()) };
    }

    async openItem(position) {
        let selectedFile = this.fileItemList.get(position);
        await this.manager.openItem(selectedFile.getSalmonFile());
    }

    getViewModel(item) {
        for (let i = 0; i < this.fileItemList.size(); i++) {
            let vm = this.fileItemList.get(i);
            if (vm.getSalmonFile() == item)
                return vm;
        }
        return null;
    }

    async OpenListItem(file, self) {
        let vm = self.getViewModel(file);
        try {
            if (FileUtils.isVideo(await file.getName())) {
                self.startMediaPlayer(vm);
                return true;
            } else if (FileUtils.isAudio(await file.getName())) {
                self.startMediaPlayer(vm);
                return true;
            } else if (FileUtils.isImage(await file.getName())) {
                self.startImageViewer(vm);
                return true;
            } else if (FileUtils.isText(await file.getName())) {
                self.startTextEditor(vm);
                return true;
            } else if (FileUtils.isPdf(await file.getName())) {
                self.startPdfViewer(vm);
                return true;
            }
        } catch (ex) {
            console.error(ex);
            new SalmonDialog("Could not open: " + ex).show();
        }
        return false;
    }

    startTextEditor(item) {
        try {
            if (item.getSalmonFile().getLength() > MainController.MAX_TEXT_FILE) {
                new SalmonDialog("File too large").show();
                return;
            }
            TextEditorController.openTextEditor(item, window);
        } catch (e) {
            console.error(e);
        }
    }

    startImageViewer(item) {
        try {
            ImageViewerController.openImageViewer(item, window);
        } catch (e) {
            console.error(e);
        }
    }

    startMediaPlayer(item) {
        try {
            MediaPlayerController.openMediaPlayer(item, window);
        } catch (e) {
            console.error(e);
        }
    }

    startPdfViewer(item) {
        try {
            PdfViewerController.openPdfViewer(item, window);
        } catch (e) {
            console.error(e);
        }
    }
}