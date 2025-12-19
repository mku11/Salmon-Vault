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
import { SalmonImageViewer } from "../../common/model/salmon_image_viewer.js";
import { JBind } from "../../lib/jbind/jbind.js";
import { ObjectProperty } from "../../lib/jbind/object_property.js";
import { BooleanProperty } from "../../lib/jbind/boolean_property.js";
import { MemoryStream } from "../../lib/simple-io/streams/memory_stream.js";
import { Handler } from "../../lib/salmon-fs/service/handler.js";

export class ImageViewerController {
    static contentURL = "image-viewer.html";
	static checkIntegrity = true;
    image;
    contentWindow;
    viewer;
    progressVisibility;
    url;

    setStage(contentWindow) {
        this.contentWindow = contentWindow;
        this.image = JBind.bind(this.contentWindow.getWindowPanel(), 'image-viewer-image', 'src', new ObjectProperty());
        this.progressVisibility = JBind.bind(this.contentWindow.getWindowPanel(), 'media-progress', 'display', new BooleanProperty());
    }

    static async openImageViewer(fileViewModel, owner) {
        let controller = new ImageViewerController();
        let contentWindow = await JWindow.createWindowWithURL("Image Viewer", ImageViewerController.contentURL);
        contentWindow.setResizable(true);
        controller.setStage(contentWindow);
        setTimeout(() => {
            controller.load(fileViewModel);
        });
        await contentWindow.show();
        contentWindow.onClose = () => controller.onClose(this);
    }

    async load(fileViewModel) {
        if (this.viewer == null)
            this.viewer = new SalmonImageViewer();
        try {
			let file = fileViewModel.getAesFile();
			await file.setVerifyIntegrity(ImageViewerController.checkIntegrity);
            this.viewer.load(file);
            let stream = await file.getInputStream();
            let ms = new MemoryStream();
            await stream.copyTo(ms);
            await stream.close();
            let blob = new Blob([ms.toArray().buffer]);
            await ms.close();
            this.url = URL.createObjectURL(blob);
            this.image.set(this.url);
        } catch (e) {
            console.error(e);
        }
        this.progressVisibility.set(false);
    }

    onClose() {
        URL.revokeObjectURL(this.url);
        Handler.getInstance().unregister();
    }
}
