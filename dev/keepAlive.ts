import { Connection } from "./connection";

const connection = new Connection();

const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20e3);

chrome.runtime.onStartup.addListener(keepAlive);
chrome.runtime.onStartup.addListener(() => connection.retryConnect());

chrome.runtime.onInstalled.addListener(keepAlive);

keepAlive();