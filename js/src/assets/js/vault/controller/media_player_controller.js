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

import { JWindow } from "../../lib/jwin/assets/js/jwindow.js";
import { JBind } from "../../lib/jbind/jbind.js";
import { StringProperty } from "../../lib/jbind/string_property.js";
import { BooleanProperty } from "../../lib/jbind/boolean_property.js";
import { Handler } from "../../lib/salmon-fs/service/handler.js";
import { MemoryStream } from "../../lib/simple-io/streams/memory_stream.js";
import { AesFileReadableStream } from "../../lib/salmon-fs/salmonfs/streams/aes_file_readable_stream.js";
import { HttpSyncClient } from "../../lib/simple-fs/fs/file/http_sync_client.js";
import { JDialog } from "../../lib/jwin/assets/js/jdialog.js";
import { URLUtils } from "../../vault/utils/url_utils.js";

export class MediaPlayerController {
    static MIN_FILE_STREAMING = 1 * 1024 * 1024;
    static MEDIA_BUFFERS = 2;
    // make sure we use a large enough buffer for the MediaDataSource since some videos stall
    static MEDIA_BUFFER_SIZE = 4 * 1024 * 1024;
    static MEDIA_BACKOFFSET = 256 * 1024;
    // increase the threads if you have more cpus available for parallel processing
    static mediaThreads = 1;
    static contentURL = "media-player.html";
    // set the correct worker path when using parallel operations
    static workerPath = './assets/js/lib/salmon-fs/salmonfs/streams/aes_file_readable_stream_worker.js';
    
    filePath;
    contentWindow;
    player;
    progressVisibility;
    url;

    initialize() {
        setImage(playImage);
    }

    setStage(contentWindow) {
        this.contentWindow = contentWindow;
        this.player = JBind.bind(this.contentWindow.getWindowPanel(), 'media-player-video', 'src', new StringProperty());
        this.progressVisibility = JBind.bind(this.contentWindow.getWindowPanel(), 'media-progress', 'display', new BooleanProperty());
    }

    static async openMediaPlayer(fileViewModel, owner) {
        let controller = new MediaPlayerController();
        let contentWindow = await JWindow.createWindowWithURL("Media Player", this.contentURL);
        contentWindow.setResizable(true);
        controller.setStage(contentWindow);
        setTimeout(() => {
            controller.load(fileViewModel);
        });
        await contentWindow.show();
        contentWindow.onClose = () => controller.onClose(this);
    }

    async load(fileItem) {
        let file = fileItem.getAesFile();
        try {
            this.filePath = file.getRealPath();
            this.url = null;
            let size = await file.getLength();
            // if file is relative small just decrypt and load via a blob
            if (size < MediaPlayerController.MIN_FILE_STREAMING) {
                let stream = AesFileReadableStream.createFileReadableStream(file,
                    1, MediaPlayerController.MIN_FILE_STREAMING, 2, 0);
                stream.setWorkerPath(MediaPlayerController.workerPath);
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
                // or we register the url via handler
                this.url = URLUtils.getAbsoluteURL("?path=" + encodeURIComponent(this.filePath));
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
                    workerPath: MediaPlayerController.workerPath,
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
            JDialog.promptDialog("Error", e);
        }
    }

    onClose() {
        URL.revokeObjectURL(this.url);
        Handler.getInstance().unregister();
    }
}
