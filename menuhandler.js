var { remote } = require('electron');
try {
	var config = require('./config.json');
	
	if (config.apikey != undefined) {
		document.getElementById("apikey").value = config.apikey;
	}
} catch (error) {
	console.log(`Config has not been created yet`);
}

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

function saveSettings() {
	var apikey = document.getElementById("apikey").value;
	if (apikey.length != 32) {
		document.getElementById("apikey").parentNode.children[0].innerHTML = "Error: invalid key"
	} else {
		var config = {
			"apikey": apikey
		}
		require('fs').writeFile('./config.json', JSON.stringify(config), (err) => {
			if (err){
				console.log(err);
			}
		})
	}
}

function clearError(i) {
	var option = document.getElementsByClassName("option")[i];
	option.children[0].innerHTML = "Api Key"
}