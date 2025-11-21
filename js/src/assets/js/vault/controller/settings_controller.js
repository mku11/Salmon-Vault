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

import { JBind } from "../../lib/jbind/jbind.js";
import { BooleanProperty } from "../../lib/jbind/boolean_property.js";
import { ObservableList } from "../../lib/jbind/observable_list.js";
import { Window } from "../../lib/jwin/assets/js/window.js";
import { SalmonSettings } from "../../common/model/salmon_settings.js";

export class SettingsController {
    static contentURL = "settings.html";
    aesType;
    pbkdfType;
    pbkdfAlgo;
    authType;
    deleteSourceAfterImport;
    contentWindow;

    initialize() {

        for (let aesType of Object.values(SalmonSettings.AESType))
            this.aesType.add(aesType.name);
        this.aesType.select(SalmonSettings.getInstance().getAesType().name);

        for (let pbkdfImplType of Object.values(SalmonSettings.PbkdfImplType))
            this.pbkdfType.add(pbkdfImplType.name);
        this.pbkdfType.select(SalmonSettings.getInstance().getPbkdfImpl().name);

        for (let pbkdfAlgoType of Object.values(SalmonSettings.PbkdfAlgoType))
            this.pbkdfAlgo.add(pbkdfAlgoType.name);
        this.pbkdfAlgo.select(SalmonSettings.getInstance().getPbkdfAlgo().name);

        for (let authType of Object.values(SalmonSettings.AuthType))
            this.authType.add(authType.name);
        this.authType.select(SalmonSettings.getInstance().getSequencerAuthType().name);

        this.deleteSourceAfterImport.set(SalmonSettings.getInstance().isDeleteAfterImport());

    }

    setStage(contentWindow) {
        this.contentWindow = contentWindow;
        this.aesType = JBind.bind(this.contentWindow.getRoot(), 'aesType', 'options', new ObservableList());
        this.pbkdfType = JBind.bind(this.contentWindow.getRoot(), 'pbkdfType', 'options', new ObservableList());
        this.pbkdfAlgo = JBind.bind(this.contentWindow.getRoot(), 'pbkdfAlgo', 'options', new ObservableList());
        this.authType = JBind.bind(this.contentWindow.getRoot(), 'authType', 'options', new ObservableList());
        this.deleteSourceAfterImport = JBind.bind(this.contentWindow.getRoot(), 'deleteSourceAfterImport', 'value', new BooleanProperty());
        this.initialize();
    }

    isDeleteAfterImportSelected() {
        return this.deleteSourceAfterImport.get();
    }

    getpbkdfType() {
        return SalmonSettings.PbkdfImplType[this.pbkdfType.getSelectedItem()];
    }

    getpbkdfAlgo() {
        return SalmonSettings.PbkdfAlgoType[this.pbkdfAlgo.getSelectedItem()];
    }

    getAESType() {
        return SalmonSettings.AESType[this.aesType.getSelectedItem()];
    }

    getAuthType() {
        return SalmonSettings.AuthType[this.authType.getSelectedItem()];
    }

    static async openSettings(owner) {
        let controller = new SettingsController();
        window.settingsController = controller;
        let contentWindow = await Window.createModalWithURL("Settings", this.contentURL);
        controller.setStage(contentWindow);
        contentWindow.show();
        contentWindow.onClose = () => controller.onClose(this);
    }

    onClose(self) {
        SalmonSettings.getInstance().setAesType(this.getAESType());
        SalmonSettings.getInstance().setPbkdfImpl(this.getpbkdfType());
        SalmonSettings.getInstance().setPbkdfAlgo(this.getpbkdfAlgo());
        SalmonSettings.getInstance().setSequencerAuthType(this.getAuthType());
        SalmonSettings.getInstance().setDeleteAfterImport(this.isDeleteAfterImportSelected());
    }
}
