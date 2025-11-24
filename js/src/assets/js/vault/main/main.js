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

import { MainController } from "../controller/main_controller.js";
import { JWindow } from "../../lib/jwin/assets/js/jwindow.js";
import { SalmonConfig } from "../config/salmon_config.js";
import { HttpSyncClient } from "../../lib/simple-fs/fs/file/http_sync_client.js";
import { setDebugConsole } from "../../common/utils/debug_utils.js";
import { Handler } from "../../lib/salmon-fs/service/handler.js";
import { JDialog } from "../../lib/jwin/assets/js/jdialog.js";

addEventListener("load", async (e) => {
    const DEBUG = false;
    // worker path should be at the root of the site
    const workerPath = 'service-worker.js';

    function setupDebug() {
        let debugConsole = document.getElementById("debug-console");
        let debugConsoleContainer = document.getElementById("debug-console-container");
        debugConsoleContainer.style.display = DEBUG ? "flex" : "none";
        setDebugConsole(debugConsole);
    }

    async function registerServiceWorker() {
        Handler.getInstance().setWorkerPath(workerPath);
        try {
            await Handler.getInstance().register();
        } catch (ex) {
            JDialog.promptDialog("Error", ex);
        }
    }

    setupDebug();
    registerServiceWorker();

    console.log("Starting Salmon Vault");
    HttpSyncClient.setAllowClearTextTraffic(false); // use only for demo and testing purposes
    JWindow.setDefaultIconPath(SalmonConfig.APP_ICON);
    MainController.openMainWindow(window);
});

