var {
	remote,
	webContents
} = require('electron');
var await = require('await');
var fetch = require('node-fetch');
var SteamID = require('steamid');
var vdf = require('vdf');
var fs = require('fs');
var win = remote.getCurrentWindow();
const shell = require('electron').shell;

// Globals
var stop = true;
var group_scan = false;
var config = undefined;
var keyprice;
var schema;
var bptf_schema;
var skin_list;

initialize();

async function initialize() {
	try {
		config = JSON.parse(await fs.readFileSync("./config.json", "utf8"));
	} catch (err) {
		openWindow("settings");
		return false;
	}

	var ts = getTime();
	if (config.ts == undefined || config.ts + 60 * 60 * 24 * 7 < ts) {
		schemaRefresh();
		return false;
	}

	document.getElementById("apikey").value = config.apikey;

	if (config.maxRef !== undefined) {
		document.getElementById("maxRef").value = config.maxRef;
		document.getElementById("maxKeys").value = config.maxKeys;
		document.getElementById("minRef").value = config.minRef;
		document.getElementById("minKeys").value = config.minKeys;
		document.getElementById("untradable").checked = config.untradable;
		document.getElementById("unvalued").checked = config.unvalued;
		document.getElementById("skins").checked = config.skins;
		document.getElementById("pages").value = config.pages;
		document.getElementById("skip").value = config.skip;
	}

	try {
		schema = await JSON.parse(fs.readFileSync("./schema.json", "utf8"));
		bptf_schema = await JSON.parse(fs.readFileSync("./schema_bptf.json", "utf8"));
		keyprice = bptf_schema.response.items["Mann Co. Supply Crate Key"].prices[6].Tradable.Craftable[0].value;
		skin_list = await JSON.parse(fs.readFileSync("./skins.json", "utf8"));
	} catch (error) {
		schemaRefresh();
		return false;
	}
	versionCheck();
	openWindow('scaninfo');
}

async function versionCheck() {
	var version_page = await fetch(`https://raw.githubusercontent.com/AleXu224/TF2-Backpack-Scanner/master/version`);
	if (!version_page.ok) {
		return false;
	}
	var rep_version = await version_page.text();
	var local_version = await fs.readFileSync("./version", "utf8");

	if (rep_version !== local_version) {
		var version_element = document.getElementById("version");
		version_element.setAttribute("tooltip", `Version ${rep_version} is available!`);
		version_element.classList.remove("hidden");
	}
}

async function schemaRefresh() {
	openWindow("splash");
	var progress = document.getElementById("progress");

	// TF2 item schema
	progress.innerText = "Downloading the item schema (1/6)";
	var schema_1_page = await fetch(`http://api.steampowered.com/IEconItems_440/GetSchemaItems/v0001/?key=${config.apikey}&language=en_US`);
	var schema_1 = await schema_1_page.json();
	progress.innerText = "Downloading the item schema (2/6)";
	var schema_2_page = await fetch(`http://api.steampowered.com/IEconItems_440/GetSchemaItems/v0001/?key=${config.apikey}&language=en_US&start=1150`);
	var schema_2 = await schema_2_page.json();
	progress.innerText = "Downloading the item schema (3/6)";
	var schema_3_page = await fetch(`http://api.steampowered.com/IEconItems_440/GetSchemaItems/v0001/?key=${config.apikey}&language=en_US&start=8303`);
	var schema_3 = await schema_3_page.json();
	progress.innerText = "Downloading the item schema (4/6)";
	var schema_4_page = await fetch(`http://api.steampowered.com/IEconItems_440/GetSchemaItems/v0001/?key=${config.apikey}&language=en_US&start=9336`);
	var schema_4 = await schema_4_page.json();
	progress.innerText = "Downloading the item schema (5/6)";
	var schema_5_page = await fetch(`http://api.steampowered.com/IEconItems_440/GetSchemaItems/v0001/?key=${config.apikey}&language=en_US&start=10338`);
	var schema_5 = await schema_5_page.json();
	progress.innerText = "Downloading the item schema (5/6)";
	var schema_6_page = await fetch(`http://api.steampowered.com/IEconItems_440/GetSchemaItems/v0001/?key=${config.apikey}&language=en_US&start=30044`);
	var schema_6 = await schema_6_page.json();
	progress.innerText = "Merging item schema";
	schema = schema_1.result.items.concat(schema_2.result.items, schema_3.result.items, schema_4.result.items, schema_5.result.items, schema_6.result.items);
	await fs.writeFileSync("./schema.json", JSON.stringify(schema));

	// Backpack.tf prices
	progress.innerText = "Downloading the backpack.tf prices";
	var bptf_schema_page = await fetch(`https://raw.githubusercontent.com/AleXu224/bptf_pricelist/master/schema_bptf.json`);
	bptf_schema = await bptf_schema_page.json();
	keyprice = bptf_schema.response.items["Mann Co. Supply Crate Key"].prices[6].Tradable.Craftable[0].value;
	await fs.writeFileSync("./schema_bptf.json", JSON.stringify(bptf_schema));

	// Skin names
	progress.innerText = "Fetching the skin ids";
	var protoObjs_page = await fetch(`https://raw.githubusercontent.com/SteamDatabase/GameTracking-TF2/master/tf/resource/tf_proto_obj_defs_english.txt`);
	var protoObjs = await protoObjs_page.text();
	var parsed = vdf.parse(protoObjs);
	for (var lang in parsed) {
		var tokens = parsed[lang].Tokens;
	}
	skin_list = {};
	for (var token in tokens) {
		var tokenSplit = token.split("_");
		var type = tokenSplit[0];
		var id = tokenSplit[1];
		var name = tokens[token];
		if (name.startsWith(`${id}`)) {
			continue;
		}
		if (type == 9) {
			skin_list[id] = name;
		}
	}
	await fs.writeFileSync("./skins.json", JSON.stringify(skin_list));
	
	// Finishing up
	progress.innerText = "Done";
	var ts = getTime();
	config.ts = ts;
	await fs.writeFileSync("./config.json", JSON.stringify(config));
	closeWindow("splash");
	versionCheck();
}

async function openLink(link) {
	shell.openExternal(link);
}

function getTime() {
	return Math.floor(new Date() / 1000);
}

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

function groupToggle() {
	var toggle = document.getElementById("group");
	var group = toggle.checked;
	var userScan = document.getElementById("userScan");
	scanSettingsList = document.getElementById("scanSettingsList");
	if (group) {
		scanSettingsList.classList.add("group");
		userScan.setAttribute("placeholder", "Group link");
	} else {
		scanSettingsList.classList.remove("group");
		userScan.setAttribute("placeholder", "User list");
	}
	group_scan = group;
}

async function getIdsFromGroup(link, pages, skip) {
	if (!link.match(/.*\/$/)) {
		link += "/";
	}
	link += "memberslistxml?xml=1&p=";

	var group_members
	
	for (let i = skip + 1; i <= pages + skip; i++) {
		try {
			var group_members_page = await fetch(link + i);
		} catch (error) {
			return null;
		}
		if (!group_members_page.ok) {
			return 1;
		}
		group_members += await group_members_page.text();
	}
	return group_members;
}

function saveSettings() {
	var apikey = document.getElementById("apikey").value;
	if (apikey.length != 32) {
		alert(`The Steam api key key is invalid`);
	} else {
		async function save(config, restart) {
			fs.writeFile('./config.json', JSON.stringify(config), (err) => {
				if (restart) {
					location.reload();
				}
			});
		}
		fs.readFile("./config.json", "utf8", (err, data) => {
			if (err) {
				save({
					apikey
				}, true);
			} else {
				var config = JSON.parse(data);
				save({
					apikey,
					ts: config.ts
				}, false);
			}
		})
	}
}

async function scan() {
	if (config == undefined) {
		openWindow("settings");
		return false;
	}
	var maxRef = document.getElementById("maxRef").value;
	var maxKeys = document.getElementById("maxKeys").value;
	var minRef = document.getElementById("minRef").value;
	var minKeys = document.getElementById("minKeys").value;
	var untradable = document.getElementById("untradable").checked;
	var unvalued = document.getElementById("unvalued").checked;
	var skins = document.getElementById("skins").checked;
	var pages = document.getElementById("pages").value;
	var skip = document.getElementById("skip").value;

	config.maxRef = maxRef;
	config.maxKeys = maxKeys;
	config.minRef = minRef;
	config.minKeys = minKeys;
	config.untradable = untradable;
	config.unvalued = unvalued;
	config.skins = skins;
	config.pages = pages;
	config.skip = skip;

	if (maxRef == "") maxRef = -1;
	if (maxKeys == "") maxKeys = -1;
	if (minRef == "") minRef = 0;
	if (minKeys == "") minKeys = 0;
	if (pages == "") pages = 1;
	if (skip == "") skip = 0;

	maxRef = parseFloat(maxRef);
	maxKeys = parseFloat(maxKeys);
	minRef = parseFloat(minRef);
	minKeys = parseFloat(minKeys);
	pages = parseFloat(pages);
	skip = parseFloat(skip);

	if (isNaN(maxRef) || isNaN(maxKeys) || isNaN(minRef) || isNaN(minKeys) || isNaN(pages) || isNaN(skip)) {
		alert("All inputs have to be numbers");
		return false;
	}
	if (pages < 1) pages = 1;
	if (skip < 0) skip = 0;
	var settings = {
		maxRef,
		maxKeys,
		minRef,
		minKeys,
		untradable,
		unvalued,
		skins,
		pages,
		skip
	}

	await fs.writeFileSync("./config.json", JSON.stringify(config));

	input = document.getElementById("userScan").value;
	if (group_scan) {
		input = await getIdsFromGroup(input, settings.pages, settings.skip);
		console.log(`Group`);
		if (!input) {
			alert("Invalid link");
			return false;
		}
		if (input === 1) {
			alert("Steam servers are unavailable at the moment");
			return false;
		}
	}
	closeWindow('scaninfo');
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
	var levelDisplay = document.createElement("div");
	var keyDisplay = document.createElement("div");
	var refDisplay = document.createElement("div");
	var addButton = document.createElement("div");
	var profileButton = document.createElement("div");
	var removeButton = document.createElement("div");
	avatarCircle.classList.add("profile");
	avatarCircle.setAttribute("tooltip", userObject.personaname);
	avatarCircle.setAttribute("pos", "right");
	avatarCircle.setAttribute("onclick", `openLink('https://steamcommunity.com/profiles/${userObject.steamid}')`)
	avatarCircle.appendChild(accountImage);

	hoursDisplay.classList.add("hours");
	levelDisplay.classList.add("hours");
	keyDisplay.classList.add("hours");
	refDisplay.classList.add("hours");
	addButton.classList.add("action");
	profileButton.classList.add("action");
	removeButton.classList.add("action");

	hoursDisplay.setAttribute("tooltip", "Hours played");
	levelDisplay.setAttribute("tooltip", "Steam level");
	keyDisplay.setAttribute("tooltip", "Tradable keys in inventory");
	refDisplay.setAttribute("tooltip", "Tradable refined in inventory");
	addButton.setAttribute("tooltip", "Add friend");
	addButton.setAttribute("onclick", `openLink('steam://friends/add/${userObject.steamid}')`);
	profileButton.setAttribute("tooltip", "Backpack.tf page");
	profileButton.setAttribute("onclick", `openLink('https://backpack.tf/profiles/${userObject.steamid}')`);
	removeButton.setAttribute("tooltip", "Remove listing");
	removeButton.setAttribute("onclick", `removeUser(${n})`);
	hoursDisplay.setAttribute("pos", "bottom");
	levelDisplay.setAttribute("pos", "bottom");
	keyDisplay.setAttribute("pos", "bottom");
	refDisplay.setAttribute("pos", "bottom");
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

	if (userObject.level !== undefined) {
		levelDisplay.appendChild(document.createTextNode("lvl " + userObject.level));
	} else {
		levelDisplay.appendChild(document.createTextNode("Private"));
	}

	refDisplay.appendChild(document.createTextNode(scrapToRef(userObject.inventoryScrap) + " Ref"));
	keyDisplay.appendChild(document.createTextNode(userObject.inventoryKeys + " Keys"));

	addButton.appendChild(addIcon);
	profileButton.appendChild(accountIcon);
	removeButton.appendChild(deleteIcon);

	var actions = document.createElement("div");
	actions.classList.add("actions");
	actions.appendChild(avatarCircle);
	actions.appendChild(addButton);
	actions.appendChild(profileButton);
	actions.appendChild(hoursDisplay);
	actions.appendChild(levelDisplay);
	if (userObject.inventoryKeys > 0) actions.appendChild(keyDisplay);
	if (userObject.inventoryScrap > 0) actions.appendChild(refDisplay);
	actions.appendChild(spacer);
	actions.appendChild(removeButton);

	var user = document.createElement("div");
	user.classList.add("user");
	user.id = n;

	user.appendChild(actions);

	return user;
}

async function stopScan() {
	stop = true;
	document.getElementById("stop").classList.add("hidden");
	document.getElementById("stop2").classList.add("hidden");
	document.getElementById("start").classList.remove("hidden");
	document.getElementById("start2").classList.remove("hidden");
}

async function endTimer(t0) {
	var t1 = performance.now();
	var t = (t1 - t0) / 1000;
	var t = t.toFixed(3);
	document.getElementById("status").innerText = `The scan took ${t} seconds`;
}

async function startScan(ids, settings) {
	t0 = performance.now();
	document.getElementById("start").classList.add("hidden");
	document.getElementById("start2").classList.add("hidden");
	document.getElementById("stop").classList.remove("hidden");
	document.getElementById("stop2").classList.remove("hidden");
	stop = false;
	var id_string = "";
	var usersToScan = ids.length;
	var scanned = 0;
	var status = document.getElementById("status");
	status.classList.remove("hidden");

	nextScan(0);
	async function nextScan(i) {
		if (i >= ids.length) {
			stopScan();
			endTimer(t0);
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
			endTimer(t0);
			return false;
		}
		if (scan == "yes" && stop === false) {
			var profile_page = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${config.apikey}&format=json&steamids=${id_string}`);
			var profile = await profile_page.json();
			id_string = "";
			if (usersToScan < 100) {
				usersToScan == 0;
			} else {
				usersToScan -= 100;
			}
			for (var j in profile.response.players) {
				scanned++;
				status.innerText = `${scanned}/${ids.length}`;
				if (stop === true) {
					endTimer(t0);
					return false;
				}
				var userObject = profile.response.players[j];
				if (userObject.communityvisibilitystate != 3) {
					continue;
				}
				var inventory = await getUserInventory(userObject.steamid, settings);
				if (inventory == "private") {
					continue;
				} else if (inventory == "timeout") {
					var inventory = await getUserInventory(userObject.steamid);
				}
				var n = Math.floor((Math.random() * (Math.pow(10, 32) - 1)) + 1);
				userObject.inventoryScrap = 0;
				userObject.inventoryKeys = 0;
				items = 0;
				var itemContainer = document.createElement("div");
				itemContainer.classList.add("items");
				var skinContainer = document.createElement("div");
				skinContainer.classList.add("items");
				if (inventory === "timeout") continue;
				for (var z in inventory) {
					// Get the item stats
					var item = inventory[z];

					// Check if the item is a currency
					if (item.name == "Refined Metal") {
						userObject.inventoryScrap += 9;
						continue;
					} else if (item.name == "Reclaimed Metal") {
						userObject.inventoryScrap += 3;
						continue;
					} else if (item.name == "Scrap Metal") {
						userObject.inventoryScrap++;
						continue;
					} else if (item.name == "Mann Co. Supply Crate Key") {
						userObject.inventoryKeys++;
						continue;
					}

					// Get the item price
					if (item.skin_id != undefined) {
						var price = {
							currency: "skin",
							value: 0
						}
					} else if (bptf_schema.response.items[item.australium == 1 ? "Australium " + item.name : item.name] == undefined) {
						var price = {
							currency: "unknown",
							value: 0
						}
					} else if (bptf_schema.response.items[item.australium == 1 ? "Australium " + item.name : item.name].prices[item.quality2 != undefined ? item.quality2 : item.quality] == undefined) {
						var price = {
							currency: "unknown",
							value: 0
						}
					} else if (bptf_schema.response.items[item.australium == 1 ? "Australium " + item.name : item.name].prices[item.quality2 != undefined ? item.quality2 : item.quality].Tradable[item.craftable == 1 ? "Craftable" : "Non-Craftable"] == undefined) {
						var price = {
							currency: "unknown",
							value: 0
						}
					} else {
						var serial = undefined;
						if (item.quality == 5 || item.quality2 == 5) {
							if (item.target != undefined) {
								serial = item.target;
							} else if (item.effect != undefined) {
								serial = item.effect;
							} else {
								serial = 0;
							}
						} else {
							if (item.crate != undefined) {
								if (bptf_schema.response.items[item.australium == 1 ? "Australium " + item.name : item.name].prices[item.quality2 != undefined ? item.quality2 : item.quality].Tradable[item.craftable == 1 ? "Craftable" : "Non-Craftable"][0] == undefined) {
									serial = item.crate;
								} else {
									serial = 0;
								}
							} else {
								serial = 0;
							}
						}
						var price = bptf_schema.response.items[item.australium == 1 ? "Australium " + item.name : item.name].prices[item.quality2 != undefined ? item.quality2 : item.quality].Tradable[item.craftable == 1 ? "Craftable" : "Non-Craftable"][serial];
						if (price == undefined) {
							continue;
						}
					}

					// Filter the price
					if (price.currency == "keys") {
						if (price.value < settings.minKeys + settings.minRef / keyprice) continue;
					} else if (price.currency == "metal") {
						if (settings.minKeys > 0 && price.value < settings.minKeys * keyprice + settings.minRef) {
							continue;
						} else if (price.value < settings.minRef) {
							continue;
						}
					} else if (price.currency == "unknown") {
						if (settings.unvalued === false) continue;
					} else if (price.currency == "skin") {
						if (settings.skins === false) continue;
					} else {
						// Hat
						if (0 < settings.minKeys) continue;
						if (1.33 < settings.minRef) continue;
					}

					// Get the order value that the item will have
					var orderPrice = 0;
					if (price.currency == "keys") {
						orderPrice = price.value * 100 * 100;
					} else if (price.currency == "metal") {
						orderPrice = price.value * 100;
					} else if (price.currency == "unknown") {
						orderPrice = 0;
					} else if (price.currency == "skin") {
						orderPrice = item.quality2 % 6;
					} else {
						orderPrice = 133;
					}

					// Increase the item counter
					items++;

					// Set the currency name
					if (price.currency == "metal") {
						currency_name = "Ref";
					} else if (price.currency == "keys") {
						currency_name = "Keys";
					} else if (price.currency == "unknown") {
						currency_name = "Unknown";
					} else {
						currency_name = "Hat";
					}

					// Crate the item element
					var itemElement = document.createElement("div");
					itemElement.classList.add("item");
					itemElement.classList.add(item.quality_name);
					if (item.quality2 != undefined && item.quality2 != 6) {
						itemElement.classList.add(`${item.quality2_name}2`);
					}
					itemElement.setAttribute("tooltip", item.name_original);
					itemElement.setAttribute("pos", "top");
					if (item.available != undefined) {
						var ts = getTime();
						itemElement.setAttribute("tooltipS", `Tradable in ${Math.floor((item.available - ts) / (24 * 60 * 60))} days`);
						itemElement.setAttribute("posS", "bottom");
					}

					var categoryIcon = document.createElement("i");
					categoryIcon.classList.add("material-icons");
					categoryIcon.appendChild(document.createTextNode("category"));

					var itemImage = document.createElement("img");
					itemImage.setAttribute("src", item.image);
					itemImage.setAttribute("height", "65");
					itemImage.setAttribute("width", "65");

					var timeIcon = document.createElement("i");
					timeIcon.classList.add("material-icons");
					timeIcon.appendChild(document.createTextNode("access_time"));

					var untradableMark = document.createElement("div");
					untradableMark.classList.add("tradable");
					untradableMark.appendChild(timeIcon);

					var effectImage = document.createElement("img");
					effectImage.setAttribute("src", item.effect_image);
					effectImage.setAttribute("height", "65");
					effectImage.setAttribute("width", "65");

					var priceNode = document.createElement("div");
					priceNode.classList.add("price");
					if (price.currency == "unknown") {
						priceNode.appendChild(document.createTextNode(`Unknown`));
					} else {
						priceNode.appendChild(document.createTextNode(`${price.value} ${currency_name}`));
					}

					if (item.quality == 5 || item.quality2 == 5) itemElement.appendChild(effectImage);
					itemElement.appendChild(itemImage);
					if (item.available != undefined) itemElement.appendChild(untradableMark);
					if (price.currency != "skin") itemElement.appendChild(priceNode);
					itemElement.setAttribute("style", `order: -${Math.floor(orderPrice)}`);
					if (price.currency == "skin") {
						skinContainer.appendChild(itemElement);
					} else {
						itemContainer.appendChild(itemElement);
					}
				}
				if (items > 0) {
					async function sendData(userObject, itemContainer, skinContainer) {
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

						var level_page = await fetch(`https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key=${config.apikey}&steamid=${userObject.steamid}`);
						var level = await level_page.json();

						level = level.response.player_level;
						userObject.level = level;

						var user = await userBuilder(userObject, n);
						if (skinContainer.children.length > 0) user.appendChild(skinContainer);
						if (skinContainer.children.length > 0 && itemContainer.children.length > 0) {
							var divider = document.createElement("div");
							divider.classList.add("divider");
							user.appendChild(divider);
						}
						if (itemContainer.children.length > 0) user.appendChild(itemContainer);
						document.getElementById("userlist").appendChild(user);
					}
					if (settings.maxKeys != -1 && settings.maxRef != -1) {
						if (settings.maxKeys > userObject.inventoryKeys) {
							sendData(userObject, itemContainer, skinContainer);
						} else if (settings.maxKeys == userObject.inventoryKeys && settings.maxRef >= scrapToRef(userObject.inventoryScrap)) {
							sendData(userObject, itemContainer, skinContainer);
						}
					} else if (settings.maxKeys != -1) {
						if (settings.maxKeys >= userObject.inventoryKeys) {
							sendData(userObject, itemContainer, skinContainer);
						}
					} else if (settings.maxRef != -1) {
						if (settings.maxRef >= scrapToRef(userObject.inventoryScrap)) {
							sendData(userObject, itemContainer, skinContainer);
						}
					} else {
						sendData(userObject, itemContainer, skinContainer);
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

async function getUserInventory(steamid, settings) {
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
		tradable = true;
		available = undefined;
		skin_id = undefined;
		skin_wear = undefined;
		quality = undefined;
		quality_name = undefined;
		quality2 = undefined;
		quality2_name = undefined;
		target = undefined;
		target_name = undefined;
		var item = inventory.result.items[i];
		if (item.flag_cannot_trade != undefined) {
			tradable = false;
		}
		if (item.flag_cannot_craft != undefined) {
			craftable = -1;
		} else {
			craftable = 1;
		}
		var quality = item.quality;
		for (var j in item.attributes) {
			var attribute = item.attributes[j].defindex;
			var attrib = item.attributes[j];
			if (attribute == 2027) {
				var australium = 1
			} else if (attribute == 2025) {
				var killstreak = attrib.float_value;
			} else if (attribute == 134) {
				var effect_image = `https://backpack.tf/images/440/particles/${item.attributes[j].float_value}_94x94.png`;
				var effect = attrib.float_value;
				quality2 = 5;
			} else if (attribute == 2041) {
				var effect_image = `https://backpack.tf/images/440/particles/${item.attributes[j].value}_94x94.png`;
				var effect = attrib.value;
			} else if (attribute == 187) {
				var crate = attrib.float_value;
			} else if (attribute == 211) {
				var ts = getTime();
				if (ts < attrib.value && settings.untradable === true) {
					tradable = true;
					available = attrib.value;
				}
			} else if (attribute == 834) {
				skin_id = attrib.value;
				// quality = 15;
			} else if (attribute == 725) {
				skin_wear = Math.floor(attrib.float_value * 5);
				if (skin_wear < 1) skin_wear = 1;
			} else if (attribute == 214) {
				quality2 = 11;
			} else if (attribute == 2012) {
				target = attrib.float_value;
			}
		}
		if (quality == quality2) {
			quality2 = undefined;
		} else if (quality == 15 && quality2 == undefined) {
			quality2 = 6;
		}
		if (tradable === false) {
			continue;
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
		var name_original;
		if (target != undefined) {
			for (var l in schema) {
				var schem = schema[l];
				if (schem.defindex == target) {
					target_name = schem.item_name;
					break;
				}
			}
			name_original = target_name + " Unusualifier";
		} else {
			name_original = name;
		}
		if (skin_id != undefined) {
			name_original = `${skin_list[skin_id]} ${name_original}`;
			image = `https://scrap.tf/img/items/warpaint/${name}_${skin_id}_${skin_wear}_0.png`;
		}
		if (quality == 15) {
			quality2_name = qualities[quality2].name;
		}
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
		var quality_name = qualities[quality].name;
		if (quality != 6 && quality != 15) {
			name_original = `${quality_name} ${name_original}`;
		}
		if (quality2 != 6 && quality2 != undefined) {
			name_original = `${quality2_name} ${name_original}`;
		}
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
			crate,
			tradable,
			available,
			skin_id,
			skin_wear,
			quality2,
			quality2_name,
			target
		});
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