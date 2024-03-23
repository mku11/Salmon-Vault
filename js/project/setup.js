import { setDebugConsole } from "./common/utils/debug_utils.js";
import { SalmonHandler } from "./lib/salmon-fs/service/salmon_handler.js";

const DEBUG = true;
function setupDebug() {
    let debugConsole = document.getElementById("debug-console");
    let debugConsoleContainer = document.getElementById("debug-console-container");
    debugConsoleContainer.style.display = DEBUG ? "flex" : "none";
    setDebugConsole(debugConsole);
}

setupDebug();

console.log("Registering handler");
SalmonHandler.setWorkerPath('service-worker.js');
await SalmonHandler.getInstance().register();