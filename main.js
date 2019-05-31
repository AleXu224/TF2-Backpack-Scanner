var {
	remote,
	webContents
} = require('electron');
var await = require('await');
var fetch = require('node-fetch');
var SteamID = require('steamid');

require('fs').readFile("./config.json", "utf8", async function (err, data) {
	if (err) {
		console.log(`Config has not been created yet`);
		openWindow("settings");
	} else {
		config = JSON.parse(data);
		document.getElementById("apikey").value = config.apikey;
		if (config.maxRef !== undefined) {
			document.getElementById("maxRef").value = config.maxRef;
			document.getElementById("maxKeys").value = config.maxKeys;
			document.getElementById("minRef").value = config.minRef;
			document.getElementById("minKeys").value = config.minKeys;
		}

		var ts = Math.floor(new Date() / 1000);
		if (config.ts == undefined || config.ts + 60 * 60 * 24 * 7 < ts) {
			schemaRefresh();
		} else {
			// startAgoTimer();
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
	openWindow("splash");
	var progress = document.getElementById("progress");
	progress.innerText = "Downloading the item schema (1/5)";
	var schema_1_page = await fetch(`http://api.steampowered.com/IEconItems_440/GetSchemaItems/v0001/?key=${config.apikey}&language=en_US`);
	var schema_1 = await schema_1_page.json();
	await timeout(2000);
	progress.innerText = "Downloading the item schema (2/5)";
	var schema_2_page = await fetch(`http://api.steampowered.com/IEconItems_440/GetSchemaItems/v0001/?key=${config.apikey}&language=en_US&start=1150`);
	var schema_2 = await schema_2_page.json();
	await timeout(2000);
	progress.innerText = "Downloading the item schema (3/5)";
	var schema_3_page = await fetch(`http://api.steampowered.com/IEconItems_440/GetSchemaItems/v0001/?key=${config.apikey}&language=en_US&start=8303`);
	var schema_3 = await schema_3_page.json();
	await timeout(2000);
	progress.innerText = "Downloading the item schema (4/5)";
	var schema_4_page = await fetch(`http://api.steampowered.com/IEconItems_440/GetSchemaItems/v0001/?key=${config.apikey}&language=en_US&start=9336`);
	var schema_4 = await schema_4_page.json();
	await timeout(2000);
	progress.innerText = "Downloading the item schema (5/5)";
	var schema_5_page = await fetch(`http://api.steampowered.com/IEconItems_440/GetSchemaItems/v0001/?key=${config.apikey}&language=en_US&start=30044`);
	var schema_5 = await schema_5_page.json();
	progress.innerText = "Merging item schema";
	schema = schema_1.result.items.concat(schema_2.result.items, schema_3.result.items, schema_4.result.items, schema_5.result.items);
	require('fs').writeFile('./schema.json', JSON.stringify(schema), (err) => {
		if (err) {
			console.log(err);
		}
	})
	progress.innerText = "Downloading the backpack.tf prices";
	var bptf_schema_page = await fetch(`https://raw.githubusercontent.com/AleXu224/bptf_pricelist/master/schema_bptf.json`);
	bptf_schema = await bptf_schema_page.json();
	keyprice = bptf_schema.response.items["Mann Co. Supply Crate Key"].prices[6].Tradable.Craftable[0].value;
	require('fs').writeFile('./schema_bptf.json', JSON.stringify(bptf_schema), (err) => {
		if (err) {
			console.log(err);
		}
	})
	progress.innerText = "Done";
	var ts = Math.floor(new Date() / 1000);
	config.ts = ts;
	require('fs').writeFile('./config.json', JSON.stringify(config), (err) => {
		if (err) {
			console.log(err);
		}
	})
	closeWindow("splash");
}

const shell = require('electron').shell;

async function openLink(link) {
	shell.openExternal(link);
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
	if (apikey.length != 32) {
		alert(`The Steam api key key is invalid`);
	} else {
		try {
			if (config != undefined) {
				var restartAfter = false;
				config = {
					"apikey": apikey,
					ts: config.ts
				}
			}
		} catch (error) {
			var restartAfter = true;
			config = {
				"apikey": apikey
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

stop = true;

function scan() {
	try {
		if (config == undefined) {
			openSettings();
			return false;
		}
	} catch (error) {
		openWindow("settings");
		return false;
	}
	var maxRef = document.getElementById("maxRef").value;
	var maxKeys = document.getElementById("maxKeys").value;
	var minRef = document.getElementById("minRef").value;
	var minKeys = document.getElementById("minKeys").value;

	config.maxRef = maxRef;
	config.maxKeys = maxKeys;
	config.minRef = minRef;
	config.minKeys = minKeys;

	require('fs').writeFile('./config.json', JSON.stringify(config), (err) => {
		if (err) {
			console.log(err);
		}
	});

	if (maxRef == "") {
		maxRef = -1;
	}
	if (maxKeys == "") {
		maxKeys = -1;
	}
	if (minRef == "") {
		minRef = 0;
	}
	if (minKeys == "") {
		minKeys = 0;
	}

	maxRef = parseFloat(maxRef);
	maxKeys = parseFloat(maxKeys);
	minRef = parseFloat(minRef);
	minKeys = parseFloat(minKeys);

	if (isNaN(maxRef) || isNaN(maxKeys) || isNaN(minRef) || isNaN(minKeys)) {
		alert("All inputs have to be numbers");
		return false;
	}
	var settings = {
		maxRef,
		maxKeys,
		minRef,
		minKeys
	}

	var input = document.getElementById("userScan").value;
	var ids = [];
	var ids1 = input.match(/7656119[0-9]{10}/g);
	var ids2 = input.match(/\[U:1:[0-9]{9}\]/g);
	for (var id in ids2) {
		var newSteamID = new SteamID(ids2[id]);
		var newID = newSteamID.getSteamID64();
		ids.push(newID);
	}
	var ids = ids.concat(ids1);
	document.getElementById("userScan").value = '';
	startScan(ids, settings)
}

async function removeUser(id) {
	document.getElementById(id).remove();
}

async function userBuilder(userObject, n) {
	var personIcon = document.createElement("i");
	personIcon.classList.add("material-icons");
	personIcon.appendChild(document.createTextNode("person"));
	var addIcon = document.createElement("i");
	addIcon.classList.add("material-icons");
	addIcon.appendChild(document.createTextNode("add"));
	var accountIcon = document.createElement("i");
	accountIcon.classList.add("material-icons");
	accountIcon.appendChild(document.createTextNode("account_circle"));
	var accountImage = document.createElement("img");
	accountImage.setAttribute("src", userObject.avatarmedium);
	var deleteIcon = document.createElement("i");
	deleteIcon.classList.add("material-icons");
	deleteIcon.appendChild(document.createTextNode("delete"));
	var spacer = document.createElement("div");
	spacer.classList.add("spacer");

	var avatarCircle = document.createElement("div");
	var hoursDisplay = document.createElement("div");
	var addButton = document.createElement("div");
	var profileButton = document.createElement("div");
	var removeButton = document.createElement("div");
	avatarCircle.classList.add("profile");
	avatarCircle.setAttribute("tooltip", userObject.personaname);
	avatarCircle.setAttribute("pos", "right");
	avatarCircle.setAttribute("onclick", `openLink('https://steamcommunity.com/profiles/${userObject.steamid}')`)
	avatarCircle.appendChild(accountImage);

	hoursDisplay.classList.add("hours");
	addButton.classList.add("action");
	profileButton.classList.add("action");
	removeButton.classList.add("action");

	hoursDisplay.setAttribute("tooltip", "Hours played");
	addButton.setAttribute("tooltip", "Add friend");
	addButton.setAttribute("onclick", `openLink('steam://friends/add/${userObject.steamid}')`);
	profileButton.setAttribute("tooltip", "Backpack.tf page");
	profileButton.setAttribute("onclick", `openLink('https://backpack.tf/profiles/${userObject.steamid}')`);
	removeButton.setAttribute("tooltip", "Remove listing");
	removeButton.setAttribute("onclick", `removeUser(${n})`);
	hoursDisplay.setAttribute("pos", "bottom");
	addButton.setAttribute("pos", "bottom");
	profileButton.setAttribute("pos", "bottom");
	removeButton.setAttribute("pos", "left");

	if (userObject.hours !== undefined) {
		if (userObject.hours != 0) {
			hoursDisplay.appendChild(document.createTextNode(userObject.hours));
		} else {
			hoursDisplay.appendChild(document.createTextNode("Private"));
		}
	} else {
		hoursDisplay.appendChild(document.createTextNode("Private"));
	}

	addButton.appendChild(addIcon);
	profileButton.appendChild(accountIcon);
	removeButton.appendChild(deleteIcon);

	var actions = document.createElement("div");
	actions.classList.add("actions");
	actions.appendChild(avatarCircle);
	actions.appendChild(addButton);
	actions.appendChild(profileButton);
	actions.appendChild(hoursDisplay);
	actions.appendChild(spacer);
	actions.appendChild(removeButton);

	// var itemContainer = document.createElement("div");
	// itemContainer.classList.add("items");

	var user = document.createElement("div");
	user.classList.add("user");
	user.id = n;

	user.appendChild(actions);
	// user.appendChild(itemContainer);

	return user;
}

async function stopScan() {
	stop = true;
	document.getElementById("stop").classList.add("hidden");
	document.getElementById("stop2").classList.add("hidden");
	document.getElementById("start").classList.remove("hidden");
	document.getElementById("start2").classList.remove("hidden");
}

async function startScan(ids, settings) {
	document.getElementById("start").classList.add("hidden");
	document.getElementById("start2").classList.add("hidden");
	document.getElementById("stop").classList.remove("hidden");
	document.getElementById("stop2").classList.remove("hidden");
	stop = false;
	var id_string = "";
	var usersToScan = ids.length;
	var usersScanned = 0;
	nextScan(0);
	async function nextScan(i) {
		if (i >= ids.length) {
			stopScan();
			return false;
		}
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
		if (stop === true) {
			return false;
		}
		if (scan == "yes" && stop === false) {
			var profile_page = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${config.apikey}&format=json&steamids=${id_string}`);
			var profile = await profile_page.json();
			if (usersToScan < 100) {
				usersToScan == 0;
			} else {
				usersToScan -= 100;
			}
			for (var j in profile.response.players) {
				if (stop === true) {
					return false;
				}
				// document.getElementById("users_scanned").innerText = `Users scanned: ${++usersScanned}/${ids.length}`
				var userObject = profile.response.players[j];
				if (userObject.communityvisibilitystate != 3) {
					continue;
				}
				var inventory = await getUserInventory(userObject.steamid);
				if (inventory == "private") {
					continue;
				} else if (inventory == "timeout") {
					var inventory = await getUserInventory(userObject.steamid);
				}
				var n = Math.floor((Math.random() * (1000000000000 - 1)) + 1);
				// var user = await userBuilder(userObject, n);
				inventoryScrap = 0;
				inventoryKeys = 0;
				items = 0;
				var itemContainer = document.createElement("div");
				itemContainer.classList.add("items");
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
					var serial = undefined;
					if (item.australium == 1){
						console.log();
					}
					try {
						if (item.quality == 5) { 
							if (item.effect != undefined) {
								serial = item.effect;
							} else {
								serial = 0;
							}
						} else {
							if (item.crate != undefined) {
								if (bptf_schema.response.items[item.australium == 1 ? "Australium " + item.name : item.name].prices[item.quality].Tradable[item.craftable == 1 ? "Craftable" : "Non-Craftable"][0] == undefined) {
									serial = item.crate;
								} else {
									serial = 0;
								}
							} else {
								serial = 0;
							}
						}
						var price = bptf_schema.response.items[item.australium == 1 ? "Australium " + item.name : item.name].prices[item.quality].Tradable[item.craftable == 1 ? "Craftable" : "Non-Craftable"][serial];
						if (price == undefined) {
							continue;
						}
					} catch (error) {
						continue;
					}
					if (price.currency == "keys") {
						if (price.value < settings.minKeys + settings.minRef / keyprice) {
							continue;
						}
					} else {
						if (0 < settings.minKeys) {
							continue;
						} else if (price.value < settings.minRef) {
							continue;
						}
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

					var itemElement = document.createElement("div");
					itemElement.classList.add("item");
					itemElement.classList.add(item.quality_name);
					itemElement.setAttribute("tooltip", item.name_original);
					itemElement.setAttribute("pos", "top");

					var categoryIcon = document.createElement("i");
					categoryIcon.classList.add("material-icons");
					categoryIcon.appendChild(document.createTextNode("category"));

					var itemImage = document.createElement("img");
					itemImage.setAttribute("src", item.image);
					itemImage.setAttribute("height", "65");
					itemImage.setAttribute("width", "65");

					var effectImage = document.createElement("img");
					effectImage.setAttribute("src", item.effect_image);
					effectImage.setAttribute("height", "65");
					effectImage.setAttribute("width", "65");

					var priceNode = document.createElement("div");
					priceNode.classList.add("price");
					priceNode.appendChild(document.createTextNode(`${price.value} ${currency_name}`));

					if (item.quality == 5) {
						itemElement.appendChild(effectImage);
					}
					itemElement.appendChild(itemImage);
					itemElement.appendChild(priceNode);
					itemElement.setAttribute("style", `order: -${Math.floor(orderPrice)}`);
					// user.children[1].appendChild(itemElement);
					itemContainer.appendChild(itemElement);
				}
				if (items > 0) {
					async function sendData(userObject) {
						var games_page = await fetch(`http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${config.apikey}&steamid=${userObject.steamid}&format=json&include_played_free_games=1`);
						var games = await games_page.json();

						var game_list = games.response.games;
						if (game_list != undefined) {
							for (var game of game_list) {
								if (game.appid == 440) {
									userObject.hours = Math.round(game.playtime_forever / 60);
								}
							}
						}

						var user = await userBuilder(userObject, n);
						user.appendChild(itemContainer);

						document.getElementById("userlist").appendChild(user);
					}
					if (settings.maxKeys != -1 && settings.maxRef != -1) {
						if (settings.maxKeys > inventoryKeys) {
							sendData(userObject);
						} else if (settings.maxKeys == inventoryKeys && settings.maxRef >= scrapToRef(inventoryScrap)) {
							sendData(userObject);
						}
					} else if (settings.maxKeys != -1) {
						if (settings.maxKeys >= inventoryKeys) {
							sendData(userObject);
						}
					} else if (settings.maxRef != -1) {
						if (settings.maxRef >= scrapToRef(inventoryScrap)) {
							sendData(userObject);
						}
					} else {
						sendData(userObject);
					}
				}
			}
			nextScan(++i);
		} else {
			nextScan(++i);
		}
	}
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
		killstreak = undefined;
		australium = undefined;
		craftable = undefined;
		name = undefined;
		name_original = undefined;
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
			} else if (attribute == 2041) {
				var effect_image = `https://backpack.tf/images/440/particles/${item.attributes[j].value}_94x94.png`;
				var effect = item.attributes[j].value;
			} else if (attribute == 187) {
				var crate = item.attributes[j].float_value;
			}
		}
		if (australium == undefined) {
			var australium = -1;
		}
		if (killstreak == undefined) {
			var killstreak = 0;
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
		if (killstreak !== 0) {
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
				effect_image,
				crate
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