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
import { BooleanProperty } from "../../common/binding/boolean_property.js";
import { Handler } from "../../lib/salmon-fs/service/handler.js";
import { MemoryStream } from "../../lib/salmon-core/streams/memory_stream.js";
import { AesFileReadableStream } from "../../lib/salmon-fs/salmonfs/streams/aes_file_readable_stream.js";
import { HttpSyncClient } from "../../lib/salmon-fs/fs/file/http_sync_client.js";
import { SalmonDialog } from "../dialog/salmon_dialog.js";

export class MediaPlayerController {
    static MIN_FILE_STREAMING = 1 * 1024 * 1024;
    static MEDIA_BUFFERS = 2;
    // make sure we use a large enough buffer for the MediaDataSource since some videos stall
    static MEDIA_BUFFER_SIZE = 4 * 1024 * 1024;
    static MEDIA_BACKOFFSET = 256 * 1024;
    // increase the threads if you have more cpus available for parallel processing
    static mediaThreads = 1;
    static modalURL = "media-player.html";

    filePath;
    modalWindow;
    player;
    progressVisibility;
    url;

    initialize() {
        setImage(playImage);
    }

    setStage(modalWindow) {
        this.modalWindow = modalWindow;
        this.player = Binding.bind(this.modalWindow.getRoot(), 'media-player-video', 'src', new StringProperty());
        this.progressVisibility = Binding.bind(this.modalWindow.getRoot(), 'media-progress', 'display', new BooleanProperty());
    }

    static openMediaPlayer(fileViewModel, owner) {
        fetch(MediaPlayerController.modalURL).then(async (response) => {
            let htmlText = await response.text();
            let controller = new MediaPlayerController();
            let modalWindow = await SalmonWindow.createWindow("Media Player", htmlText);
            controller.setStage(modalWindow);
            setTimeout(() => {
                controller.load(fileViewModel);
            });
            WindowUtils.setDefaultIconPath(SalmonConfig.APP_ICON);
            modalWindow.show();
            modalWindow.onClose = () => controller.onClose(this);
        });
    }

    async load(fileItem) {
        let file = fileItem.getSalmonFile();
        try {
            this.filePath = file.getRealPath();
			this.url = null;
			let size = await file.getLength();
            // set the correct worker path when using parallel operations
            let workerPath = './assets/js/lib/salmon-fs/salmonfs/streams/aes_file_readable_stream_worker.js';
			// if file is relative small just decrypt and load via a blob
			if (size < MediaPlayerController.MIN_FILE_STREAMING) {
				let stream = AesFileReadableStream.createFileReadableStream(file,
					1, MediaPlayerController.MIN_FILE_STREAMING, 2, 0);
                stream.setWorkerPath(workerPath);
				let ms = new MemoryStream();
				let reader = stream.getReader();
				while (true) {
					let buffer = await reader.read();
					if (buffer.value == undefined || buffer.value.length == 0)
						break;
					await ms.write(buffer.value, 0, buffer.value.length);
				}
				reader.releaseLock();
				await stream.cancel();
				let blob = new Blob([ms.toArray().buffer]);
				await ms.close();
				this.url = URL.createObjectURL(blob);
			} else {
				var link = document.createElement("a");
				link.href = "?path=" + encodeURIComponent(this.filePath);
				this.url = link.href;
                let realFile = file.getRealFile();
                let servicePath = realFile.constructor.name === 'WSFile' ? realFile.getServicePath() : null;
                let credentials = realFile.getCredentials();
                let serviceUser = credentials?.getServiceUser();
                let servicePassword = credentials?.getServicePassword();
				await Handler.getInstance().register(this.url, {
					fileHandle: realFile.getPath(),
					fileClass: realFile.constructor.name,
					key: file.getEncryptionKey(),
					integrity: file.isIntegrityEnabled(),
					hash_key: file.getHashKey(),
					mimeType: "video/mp4",
					// you can turn on the FileReadableStream which is better in caching content
					// though parallelism is not available for service workers in the browser
					useFileReadableStream: false,
                    workerPath: workerPath,
                    servicePath: servicePath,
                    serviceUser: serviceUser,
                    servicePassword: servicePassword,
                    allowClearTextTraffic: HttpSyncClient.getAllowClearTextTraffic()
				});
			}
			// set the video player to the content
			this.player.set(this.url);
			this.progressVisibility.set(false);
		} catch (e) {
            console.error(e);
			SalmonDialog.promptDialog("Error", e);
        }
    }

    onClose() {
        URL.revokeObjectURL(this.url);
        Handler.getInstance().unregister();
    }
}
