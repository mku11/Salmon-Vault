import { SalmonHandler } from "./lib/salmon-fs/service/salmon_handler.js";

console.log("Registering handler");
SalmonHandler.setWorkerPath('service-worker.js');
await SalmonHandler.getInstance().register();