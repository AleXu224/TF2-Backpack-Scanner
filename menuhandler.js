var {
	remote,
	webContents
} = require('electron');
var await = require('await');
var fetch = require('node-fetch');
var vdf = require('node-vdf');
var request = require('request');
var $ = require('jquery');
var SteamID = require('steamid');

require('fs').readFile("./config.json", "utf8", async function (err, data) {
	if (err) {
		console.log(`Config has not been created yet`);
		openSettings();
		document.getElementById("apikey").parentNode.children[0].innerHTML = "Error: no key is present!"
		document.getElementById("bptfkey").parentNode.children[0].innerHTML = "Error: no key is present!"
		document.getElementById("maxRef").value = -1;
		document.getElementById("maxKeys").value = -1;
		document.getElementById("minPrice").value = 0;
	} else {
		config = JSON.parse(data);
		document.getElementById("apikey").value = config.apikey;
		document.getElementById("bptfkey").value = config.bptfkey;
		document.getElementById("maxRef").value = config.maxref;
		document.getElementById("maxKeys").value = config.maxkeys;
		document.getElementById("minPrice").value = config.minprice;
		var ts = Math.floor(new Date() / 1000);
		if (config.ts == undefined || config.ts + 60 * 60 * 24 * 7 < ts) {
			schemaRefresh();
		} else {
			startAgoTimer();
			require('fs').readFile("./schema.json", "utf8", (err, data_schema) => {
				schema = JSON.parse(data_schema);
			})
			require('fs').readFile("./schema_bptf.json", "utf8", (err, data_schema_bptf) => {
				bptf_schema = JSON.parse(data_schema_bptf);
				keyprice = bptf_schema.response.items["Mann Co. Supply Crate Key"].prices[6].Tradable.Craftable[0].value;
			})
		}
	}
})

async function schemaRefresh() {
	var startup = document.getElementById("startup_screen");
	startup.style.display = "flex";
	startup.children[0].innerHTML = "Downloading the item schema (1/2)";
	var schema_1_page = await fetch(`http://api.steampowered.com/IEconItems_440/GetSchemaItems/v0001/?key=${config.apikey}&language=en_US`);
	var schema_1 = await schema_1_page.json();
	await timeout(2000);
	var schema_2_page = await fetch(`http://api.steampowered.com/IEconItems_440/GetSchemaItems/v0001/?key=${config.apikey}&language=en_US&start=1150`);
	var schema_2 = await schema_2_page.json();
	await timeout(2000);
	var schema_3_page = await fetch(`http://api.steampowered.com/IEconItems_440/GetSchemaItems/v0001/?key=${config.apikey}&language=en_US&start=8303`);
	var schema_3 = await schema_3_page.json();
	await timeout(2000);
	var schema_4_page = await fetch(`http://api.steampowered.com/IEconItems_440/GetSchemaItems/v0001/?key=${config.apikey}&language=en_US&start=9336`);
	var schema_4 = await schema_4_page.json();
	await timeout(2000);
	var schema_5_page = await fetch(`http://api.steampowered.com/IEconItems_440/GetSchemaItems/v0001/?key=${config.apikey}&language=en_US&start=30044`);
	var schema_5 = await schema_5_page.json();
	schema = schema_1.result.items.concat(schema_2.result.items, schema_3.result.items, schema_4.result.items, schema_5.result.items);
	require('fs').writeFile('./schema.json', JSON.stringify(schema), (err) => {
		if (err) {
			console.log(err);
		}
	})
	startup.children[0].innerHTML = "Downloading the backpack.tf item schema (2/2)";
	var bptf_schema_page = await fetch(`https://backpack.tf/api/IGetPrices/v4?key=${config.bptfkey}`);
	bptf_schema = await bptf_schema_page.json();
	keyprice = bptf_schema.response.items["Mann Co. Supply Crate Key"].prices[6].Tradable.Craftable[0].value;
	require('fs').writeFile('./schema_bptf.json', JSON.stringify(bptf_schema), (err) => {
		if (err) {
			console.log(err);
		}
	})
	var ts = Math.floor(new Date() / 1000);
	config.ts = ts;
	require('fs').writeFile('./config.json', JSON.stringify(config), (err) => {
		if (err) {
			console.log(err);
		}
	})
	startup.classList.add("slide-lefter");
	setTimeout(() => {
		startup.style.display = "none";
		startAgoTimer();
	}, 250);
}

const shell = require('electron').shell;

$(document).on('click', 'a[href^="http"]', function (event) {
	event.preventDefault();
	shell.openExternal(this.href);
});

async function clearSearch() {
	document.getElementById("container").innerHTML = "";
}

async function startAgoTimer() {
	setInterval(() => {
		var timer = document.getElementById("schemaTimer");
		var ts = Math.floor(new Date() / 1000);
		var timeElapsed = ts - config.ts;
		if (timeElapsed < 60) {
			timer.innerHTML = `Schema last updated ${timeElapsed} seconds ago`;
		} else if (timeElapsed < 3600 && timeElapsed > 60) {
			var minutes = Math.floor(timeElapsed / 60);
			timer.innerHTML = `Schema last updated ${minutes} ${minutes == 1 ? "minute" : "minutes"} ago`;
		} else if (timeElapsed < 86400 && timeElapsed > 3600) {
			var hours = Math.floor(timeElapsed / 60 / 60);
			timer.innerHTML = `Schema last updated ${hours} ${hours == 1 ? "hour" : "hours"} ago`;
		} else if (timeElapsed > 86400) {
			var days = Math.floor(timeElapsed / 60 / 60 / 24);
			timer.innerHTML = `Schema last updated ${days} ${days == 1 ? "day" : "days"} ago`;
		}
	}, 1000)
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

function timeout(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function saveSettings() {
	var apikey = document.getElementById("apikey").value;
	var bptfkey = document.getElementById("bptfkey").value;
	var maxref = parseInt(document.getElementById("maxRef").value);
	var maxkeys = parseInt(document.getElementById("maxKeys").value);
	var minprice = parseInt(document.getElementById("minPrice").value);
	if (apikey.length != 32) {
		document.getElementById("apikey").parentNode.children[0].innerHTML = "Error: invalid key"
	} else if (bptfkey.length != 24) {
		document.getElementById("bptfkey").parentNode.children[0].innerHTML = "Error: invalid key"
	} else if (isNaN(maxref)) {
		alert(`Max refined must be a number`);
	} else if (isNaN(maxkeys)) {
		alert(`Max keys must be a number`);
	} else if (isNaN(minprice)) {
		alert(`Minimum price must be a number`);
	} else {
		try {
			if (config != undefined) {
				var restartAfter = false;
				config = {
					"apikey": apikey,
					"bptfkey": bptfkey,
					ts: config.ts,
					maxref: maxref,
					maxkeys: maxkeys,
					minprice: minprice
				}
			}
		} catch (error) {
			var restartAfter = true;
			config = {
				"apikey": apikey,
				"bptfkey": bptfkey,
				maxref: maxref,
				maxkeys: maxkeys,
				minprice: minprice
			}
		}
		require('fs').writeFile('./config.json', JSON.stringify(config), (err) => {
			if (err) {
				console.log(err);
			}
		});
		if (restartAfter) {
			location.reload();
		}
	}
}

function clearError(i) {
	var option = document.getElementsByClassName("option")[i];
	if (i == 0) {
		option.children[0].innerHTML = "Steam Api Key"
	} else if (i == 1) {
		option.children[0].innerHTML = "Backpack.tf Api Key"
	}
}

async function closeContainer(id) {
	var container = document.getElementById(id);
	container.classList.add("slide-lefter");
	setTimeout(() => {
		container.style.display = "none";
		container.classList.remove("slide-lefter")
	}, 250);
}

var isScanning = false;

function scan() {
	if (isScanning == true) {
		alert(`scanning`);
		return false;
	}
	try {
		if (config == undefined) {
			openSettings();
			document.getElementById("apikey").parentNode.children[0].innerHTML = "Error: no key is present!";
			return false;
		}
	} catch (error) {
		openSettings();
		document.getElementById("apikey").parentNode.children[0].innerHTML = "Error: no key is present!";
		return false;
	}
	isScanning = true;
	var input = document.getElementById("idinput").value;
	var ids = [];
	var ids1 = input.match(/7656119[0-9]{10}/g);
	var ids2 = input.match(/\[U:1:[0-9]{9}\]/g);
	for (var id in ids2) {
		var newSteamID = new SteamID(ids2[id]);
		var newID = newSteamID.getSteamID64();
		ids.push(newID);
	}
	var ids = ids.concat(ids1);
	startScan(ids)
}

async function showDetails() {
	alert(`Not implemented yet`);
}

async function startScan(ids) {
	startTimer();
	document.getElementById("users_scanned").innerText = `Users scanned: 0/${ids.length}`
	if (config.minprice > keyprice) {
		var a = config.minprice / keyprice
		var minimumprice = {
			value: a,
			currency: "keys"
		}
	} else {
		var minimumprice = {
			value: config.minprice,
			currency: "metal"
		}
	}
	var id_string = "";
	var usersToScan = ids.length;
	var usersScanned = 0;
	for (var i in ids) {
		i = parseInt(i);
		var scan = false;
		var id = ids[i];
		id_string += `${id},`
		if (usersToScan < 100) {
			if ((i + 1) % 100 == usersToScan) {
				scan = "yes";
			}
		} else if ((i + 1) % 100 == 0) {
			scan = "yes";
		}
		if (scan == "yes") {
			var profile_page = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${config.apikey}&format=json&steamids=${id_string}`);
			var profile = await profile_page.json();
			if (usersToScan < 100) {
				usersToScan == 0;
			} else {
				usersToScan -= 100;
			}
			for (var j in profile.response.players) {
				document.getElementById("users_scanned").innerText = `Users scanned: ${++usersScanned}/${ids.length}`
				var user = profile.response.players[j];
				if (user.communityvisibilitystate != 3) {
					continue;
				}
				var inventory = await getUserInventory(user.steamid);
				if (inventory == "private") {
					continue;
				} else if (inventory == "timeout") {
					var inventory = await getUserInventory(user.steamid);
				}
				// var userToSend = `<div class="user_container" id="${i * 1000 + j}">
				// <a href="https://backpack.tf/profiles/${user.steamid}" target="_blank">
				// 	<img src="${user.avatarmedium}">
				// </a>
				// <div class="item_container" onclick="showDetails(${i * 1000 + j})">`
				var n = Math.floor((Math.random() * (100000 - 1)) + 1);
				var userToSend = `<div class="user_container" id="${n}">
				<a href="https://backpack.tf/profiles/${user.steamid}" target="_blank">
					<img src="${user.avatarmedium}">
				</a>
				<div class="user_options">
					<div class="user_option">
						<a href="steam://friends/add/${user.steamid}">
							<i class="material-icons">add</i>
						</a>
					</div>
					<div class="user_option">
						<a href="http://steamcommunity.com/profiles/${user.steamid}">
							<i class="material-icons">person</i>
						</a>
					</div>
					<div class="user_option" onclick="closeContainer(${n})">
						<a href="#">
							<i class="material-icons">close</i>
						</a>
					</div>
				</div>
				<div class="item_container" onclick="showDetails(${n})">`
				inventoryScrap = 0;
				inventoryKeys = 0;
				items = 0;
				for (var z in inventory) {
					var item = inventory[z];
					if (item.name == "Refined Metal") {
						inventoryScrap += 9;
						continue;
					} else if (item.name == "Reclaimed Metal") {
						inventoryScrap += 3;
						continue;
					} else if (item.name == "Scrap Metal") {
						inventoryScrap++;
						continue;
					} else if (item.name == "Mann Co. Supply Crate Key") {
						inventoryKeys++;
						continue;
					}
					try {
						var price = bptf_schema.response.items[item.name].prices[item.quality].Tradable[item.craftable == 1 ? "Craftable" : "Non-Craftable"][item.effect != undefined ? effect : 0];
						if (price == undefined) {
							continue;
						}
					} catch (error) {
						continue;
					}
					if (minimumprice.currency == price.currency) {
						if (minimumprice.value > price.value) {
							continue;
						}
					} else if (minimumprice.currency == "keys") {
						continue;
					}
					var orderPrice = 0;
					if (price.currency == "keys") {
						orderPrice = price.value * 100 * 100;
					} else if (price.currency == "metal") {
						orderPrice = price.value * 100;
					} else {
						orderPrice = 133;
					}
					items++;
					if (price.currency == "metal") {
						currency_name = "Ref";
					} else if (price.currency == "keys") {
						currency_name = "Keys";
					} else {
						currency_name = "Hat";
					}
					userToSend += `<div class="item_container2" style="order: -${Math.floor(orderPrice)}">
										<div class="${item.craftable == 1 ? "" : "Craft "}${item.quality_name} item">
											<img src="${item.image}">
										</div>
										<div class="item_price">${price.value} ${currency_name}</div>
									</div>`
				}
				if (items > 0) {
					function sendData() {
						userToSend += `</div></div>`
						document.getElementById("container").innerHTML += userToSend;
					}
					if (config.maxkeys != -1 && config.maxref != -1) {
						if (config.maxkeys > inventoryKeys) {
							sendData();
						} else if (config.maxkeys == inventoryKeys && config.maxref >= scrapToRef(inventoryScrap)) {
							sendData();
						}
					} else if (config.maxkeys != -1) {
						if (config.maxkeys >= inventoryKeys) {
							sendData();
						}
					} else if (config.maxref != -1) {
						if (config.maxref >= scrapToRef(inventoryScrap)) {
							sendData();
						}
					} else {
						sendData();
					}
				}
			}
		}
	}
	stopTimer();
	isScanning = false;
}

function scrapToRef(scrapNumber) {
	refNumber = Math.trunc((scrapNumber / 9) * 100) / 100;
	return refNumber;
}

async function getUserInventory(steamid) {
	var inventory_page = await fetch(`http://api.steampowered.com/ieconitems_440/getplayeritems/v0001/?key=${config.apikey}&steamid=${steamid}`);
	var inventory = await inventory_page.json();
	if (inventory.result == undefined) {
		return "private";
	}
	if (inventory.result.num_backpack_slots < 300) {
		return "private"
	}
	if (inventory.result.status != 1) {
		return "timeout";
	}
	var response = [];
	for (var i in inventory.result.items) {
		var item = inventory.result.items[i];
		if (item.flag_cannot_trade != undefined) {
			continue;
		}
		if (item.flag_cannot_craft != undefined) {
			craftable = -1;
		} else {
			craftable = 1;
		}
		var quality = item.quality;
		var quality_name = qualities[quality].name;
		for (var j in item.attributes) {
			var attribute = item.attributes[j].defindex;
			if (attribute == 2027) {
				var australium = 1
			} else if (attribute == 2025) {
				var killstreak = item.attributes[j].float_value;
			} else if (attribute == 134) {
				var effect_image = `https://backpack.tf/images/440/particles/${item.attributes[j].float_value}_94x94.png`;
				var effect = item.attributes[j].float_value;
			}
		}
		if (australium == undefined) {
			australium = -1;
		}
		if (killstreak == undefined) {
			killstreak = 0;
		}
		for (var l in schema) {
			var schem = schema[l];
			if (schem.defindex == item.defindex) {
				var name = schem.item_name;
				var image = schem.image_url;
				break;
			}
		}
		var name_original = name;
		if (australium == 1) {
			name_original = `Australium ${name_original}`;
		}
		if (killstreak != 0) {
			name_original = `Killstreak ${name_original}`;
			if (killstreak == 3) {
				name_original = `Professional ${name_original}`;
			} else if (killstreak == 2) {
				name_original = `Specialized ${name_original}`;
			}
		}
		if (quality != 6) {
			name_original = `${quality_name} ${name_original}`;
		}
		for (var q = 0; q < item.quantity; q++) {
			response.push({
				name,
				name_original,
				quality,
				quality_name,
				craftable,
				killstreak,
				australium,
				image,
				effect,
				effect_image
			})
		}
	}
	return response;
}

var qualities = [];
qualities[0] = {
	name: "Normal",
	color: "#B2B2B2"
};
qualities[1] = {
	name: "Genuine",
	color: "#4D7455"
};
qualities[3] = {
	name: "Vintage",
	color: "#476291"
};
qualities[5] = {
	name: "Unusual",
	color: "#8650AC"
};
qualities[6] = {
	name: "Unique",
	color: "#FFD700"
};
qualities[7] = {
	name: "Community",
	color: "#70B04A"
};
qualities[8] = {
	name: "Valve",
	color: "#A50F79"
};
qualities[9] = {
	name: "Self-Made",
	color: "#70B04A"
};
qualities[11] = {
	name: "Strange",
	color: "#CF6A32"
};
qualities[13] = {
	name: "Haunted",
	color: "#38F3AB"
};
qualities[14] = {
	name: "Collector",
	color: "#AA0000"
};
qualities[15] = {
	name: "Decorated",
	color: "#FAFAFA"
};