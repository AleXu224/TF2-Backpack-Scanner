var { remote } = require('electron');

var win = remote.getCurrentWindow();

function maximize() {
	if (!win.isMaximized()) {
		win.maximize();          
	} else {
		win.unmaximize();
	}
}

function minimize() {
	win.minimize();
}

function close_window() {
	win.close();
}