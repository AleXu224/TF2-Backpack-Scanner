var { app, BrowserWindow } = require('electron');
const debug = require('electron-debug');

debug({showDevTools:false});

app.on("ready", () => {
	var win = new BrowserWindow({ minWidth: 800, minHeight: 600, frame: false, webPreferences: { nodeIntegration: true } });
	win.loadURL(`file:///${__dirname}/index.html`);
	// win.webContents.openDevTools()
	// win.setMenu(null);
})

app.on("window-all-closed", () => {
	app.quit();
})