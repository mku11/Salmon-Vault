import { setDebugConsole } from "./assets/js/common/utils/debug_utils.js";
import { Handler } from "./assets/js/lib/salmon-fs/service/handler.js";
import { SalmonDialog } from "./assets/js/vault/dialog/salmon_dialog.js";
import { WindowUtils } from "./assets/js/vault/utils/window_utils.js";
import { SalmonConfig } from "./assets/js/vault/config/salmon_config.js";
import { ServiceLocator } from "./assets/js/common/services/service_locator.js";
import { IFileRemoteService } from "./assets/js/common/services/ifile_remote_service.js";
import { SalmonVaultManager } from "./assets/js/common/model/salmon_vault_manager.js";

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
	let urlRemote = "https://mku11.github.io/Salmon-Vault/vault";	
	let url = urlRemote;
	let dir = ServiceLocator.getInstance().resolve(IFileRemoteService).getFile(url);
	let password = "test";
	await SalmonVaultManager.getInstance().openVault(dir, password);
}

WindowUtils.setDefaultIconPath(SalmonConfig.APP_ICON);
setupDebug();
registerServiceWorker();