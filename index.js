var {app, BrowserWindow} = require('electron');

app.on("ready", () => {
	var win = new BrowserWindow({minWidth:800,minHeight:600,frame:false})
	win.loadURL(`file:///${__dirname}/index.html`);
	win.webContents.openDevTools()
	// win.setMenu(null);
})

app.on("window-all-closed", () => {
	app.quit();
})