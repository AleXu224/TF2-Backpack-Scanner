var {remote} = require('electron');

require('fs').readFile("./config.json", "utf8", (err, data) => {
	if (err) {
		console.log(`Config has not been created yet`);
		console.log(err);
	} else {
		config = JSON.parse(data);
		document.getElementById("apikey").value = config.apikey;
	}
})

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
		config = {
			"apikey": apikey
		}
		require('fs').writeFile('./config.json', JSON.stringify(config), (err) => {
			if (err) {
				console.log(err);
			}
		})
	}
}

function clearError(i) {
	var option = document.getElementsByClassName("option")[i];
	option.children[0].innerHTML = "Api Key"
}

function scan() {
	if (config == undefined || config.apikey == undefined) {
		openSettings();
		document.getElementById("apikey").parentNode.children[0].innerHTML = "Error: no key is present!"
	} else {
		var input = document.getElementById("idinput").value;
		var ids = input.match(/7656119[0-9]{10}/g);
		console.log(ids);
	}
}