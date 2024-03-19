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

import { SalmonWindow } from "../window/salmon_window.js";
import { WindowUtils } from "../utils/window_utils.js";
import { SalmonConfig } from "../config/salmon_config.js";
import { Binding } from "../../common/binding/binding.js";
import { StringProperty } from "../../common/binding/string_property.js";
import { SalmonHandler } from "../../lib/salmon-fs/service/salmon_handler.js";

export class MediaPlayerController {
    static modalURL = "media-player.html";
    static MEDIA_BUFFERS = 4;
    static MEDIA_BUFFER_SIZE = 4 * 1024 * 1024;
    static MEDIA_THREADS = 1;
    static MEDIA_BACKOFFSET = 256 * 1024;

    filePath;
    handler;
    modalWindow;
    
    initialize() {
        setImage(playImage);
    }

    setStage(modalWindow) {
        this.modalWindow = modalWindow;
        this.player = Binding.bind(this.modalWindow.getRoot(), 'media-player-video', 'src', new StringProperty());
    }

    static openMediaPlayer(fileViewModel, owner) {
        fetch(MediaPlayerController.modalURL).then(async (response) => {
            let htmlText = await response.text();
            let controller = new MediaPlayerController();
            let modalWindow = await SalmonWindow.createModal("Media Player", htmlText);
            controller.setStage(modalWindow);
            await controller.load(fileViewModel);
            WindowUtils.setDefaultIconPath(SalmonConfig.APP_ICON);
            modalWindow.show();
            modalWindow.onClose = () => controller.onClose(this);
        });
    }

    async load(fileItem) {
        let file = fileItem.getSalmonFile();
        try {
            this.filePath = file.getRealPath();
        } catch (e) {
            console.error(e);
            return;
        }
        this.handler = new SalmonHandler();
        var link = document.createElement("a");
        link.href = "?path=" + encodeURIComponent(this.filePath);
        let url = link.href;
        await this.handler.register(url, {
            fileHandle: file.getRealFile().getPath(),
            fileClass: file.getRealFile().constructor.name,
            key: file.getEncryptionKey(),
            integrity: file.getIntegrity(),
            hash_key: file.getHashKey(),
            mimeType: "video/mp4"
        });
        this.player.set(url);
    }

    onClose() {
        this.handler.unregister();
    }
}