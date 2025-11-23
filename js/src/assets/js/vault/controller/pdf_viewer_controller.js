/*
MIT License

Copyright (c) 2025 Max Kas

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
import { ObjectProperty } from "../../lib/jbind/object_property.js";
import { BooleanProperty } from "../../lib/jbind/boolean_property.js";
import { MemoryStream } from "../../lib/simple-io/streams/memory_stream.js";
import { Handler } from "../../lib/salmon-fs/service/handler.js";

export class PdfViewerController {
    static contentURL = "pdf-viewer.html";
    iframe;
    contentWindow;
    viewer;
    progressVisibility;
    url;

    setStage(contentWindow) {
        this.contentWindow = contentWindow;
        this.iframe = JBind.bind(this.contentWindow.getRoot(), 'pdf-viewer-iframe', 'src', new ObjectProperty());
        this.progressVisibility = JBind.bind(this.contentWindow.getRoot(), 'pdf-progress', 'display', new BooleanProperty());
    }

    static async openPdfViewer(fileViewModel, owner) {
        let controller = new PdfViewerController();
        let contentWindow = await JWindow.createWindowWithURL("PDF Viewer", this.contentURL);
        contentWindow.modal.style.resize = "both";
        contentWindow.modal.style.width = "800px";
        contentWindow.modal.style.height = "600px";
        controller.setStage(contentWindow);
        setTimeout(() => {
            controller.load(fileViewModel);
        });
        contentWindow.show();
        contentWindow.onClose = () => controller.onClose(this);
    }

    async load(fileViewModel) {
        try {
            let stream = await fileViewModel.getAesFile().getInputStream();
            let ms = new MemoryStream();
            await stream.copyTo(ms);
            await stream.close();
            let blob = new Blob([ms.toArray().buffer], { type: "application/pdf" });
            await ms.close();
            this.url = URL.createObjectURL(blob);
            this.iframe.set(this.url);
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
