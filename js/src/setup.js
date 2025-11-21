import { setDebugConsole } from "./assets/js/common/utils/debug_utils.js";
import { Handler } from "./assets/js/lib/salmon-fs/service/handler.js";
import { SalmonDialog } from "./assets/js/lib/jwin/assets/js/dialog.js";

const DEBUG = false;
function setupDebug() {
    let debugConsole = document.getElementById("debug-console");
    let debugConsoleContainer = document.getElementById("debug-console-container");
    debugConsoleContainer.style.display = DEBUG ? "flex" : "none";
    setDebugConsole(debugConsole);
}

async function registerServiceWorker() {
    console.log("Registering handler");
    Handler.getInstance().setWorkerPath('service-worker.js');
    try {
        await Handler.getInstance().register();
    } catch (ex) {
        SalmonDialog.promptDialog("Error", ex);
    }
}

document.salmonStartUp = async function() {
	// any initializing code you want goes here
}

setupDebug();
registerServiceWorker();