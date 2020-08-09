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
var effects;
var local_version = "1.4.0";
var last_input;

/**
 */

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
		document.getElementById("maxHistory").value = config.maxHistory;
		document.getElementById("untradable").checked = config.untradable;
		document.getElementById("unvalued").checked = config.unvalued;
		document.getElementById("skins").checked = config.skins;
		document.getElementById("pages").value = config.pages;
		document.getElementById("skip").value = config.skip;
		document.getElementById("maxHours").value = config.maxHours;
	}

	try {
		schema = await JSON.parse(fs.readFileSync("./schema.json", "utf8"));
		bptf_schema = await JSON.parse(fs.readFileSync("./schema_bptf.json", "utf8"));
		keyprice = bptf_schema.response.items["Mann Co. Supply Crate Key"].prices[6].Tradable.Craftable[0].value;
		skin_list = await JSON.parse(fs.readFileSync("./skins.json", "utf8"));
		effects = await JSON.parse(fs.readFileSync("./effects.json", "utf8"));
	} catch (error) {
		schemaRefresh();
		return false;
	}
	versionCheck();
}

async function versionCheck() {
	var version_page = await fetch(`https://raw.githubusercontent.com/AleXu224/TF2-Backpack-Scanner/master/version`);
	if (!version_page.ok) {
		return false;
	}
	var rep_version = await version_page.text();

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

	// Effects
	progress.innerText = "Fetching the effects";
	var effectsObjs_page = await fetch(`https://raw.githubusercontent.com/mninc/tf2-effects/master/effects.json`);
	var effectsObjs = await effectsObjs_page.json();
	effects = effectsObjs;
	await fs.writeFileSync("./effects.json", JSON.stringify(effectsObjs));

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
	var maxHistory = document.getElementById("maxHistory").value;
	var untradable = document.getElementById("untradable").checked;
	var unvalued = document.getElementById("unvalued").checked;
	var skins = document.getElementById("skins").checked;
	var pages = document.getElementById("pages").value;
	var skip = document.getElementById("skip").value;
	var maxHours = document.getElementById("maxHours").value;

	config.maxRef = maxRef;
	config.maxKeys = maxKeys;
	config.minRef = minRef;
	config.minKeys = minKeys;
	config.maxHistory = maxHistory;
	config.untradable = untradable;
	config.unvalued = unvalued;
	config.skins = skins;
	config.pages = pages;
	config.skip = skip;
	config.maxHours = maxHours;

	if (maxRef == "") maxRef = -1;
	if (maxKeys == "") maxKeys = -1;
	if (minRef == "") minRef = 0;
	if (minKeys == "") minKeys = 0;
	if (maxHistory == "") maxHistory = -1;
	if (pages == "") pages = 1;
	if (skip == "") skip = 0;
	if (maxHours == "") maxHours = -1;

	maxRef = parseFloat(maxRef);
	maxKeys = parseFloat(maxKeys);
	minRef = parseFloat(minRef);
	minKeys = parseFloat(minKeys);
	maxHistory = parseFloat(maxHistory);
	pages = parseFloat(pages);
	skip = parseFloat(skip);
	maxHours = parseFloat(maxHours);

	if (isNaN(maxRef) || isNaN(maxKeys) || isNaN(minRef) || isNaN(minKeys) || isNaN(pages) || isNaN(skip) || isNaN(maxHistory) || isNaN(maxHours)) {
		alert("All settings have to be numbers");
		return false;
	}
	if (pages < 1) pages = 1;
	if (skip < 0) skip = 0;

	var totalMinPrice = (minKeys >= 0 ? minKeys : 0) + (minRef >= 0 ? minRef : 0) / keyprice;

	var settings = {
		maxRef,
		maxKeys,
		minRef,
		minKeys,
		maxHistory,
		untradable,
		unvalued,
		skins,
		pages,
		skip,
		maxHours,
		totalMinPrice
	}

	await fs.writeFileSync("./config.json", JSON.stringify(config));

	if (document.getElementById("userScan").value == "" && last_input != undefined) input = last_input;
	else input = document.getElementById("userScan").value;
	last_input = input;

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
	var ids2 = input.match(/\[U:1:[0-9]*\]/g);
	for (var id in ids2) {
		var newSteamID = new SteamID(ids2[id]);
		var newID = newSteamID.getSteamID64();
		ids.push(newID);
	}
	var ids = ids.concat(ids1);

	document.getElementById("userScan").value = '';
	startScanRe(ids, settings)
}

async function removeUser(id) {
	document.getElementById(id).remove();
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

class Player {
    constructor(data) {
        this.steamid = data.steamid;
        this.name = data.personaname;
        this.avatarUrl = data.avatarmedium;
        this.playerId = data.steamid.toString() + (Math.round(Math.random() * 256000)).toString();
		this.visibility = data.communityvisibilitystate;
    }

    async getInventory() {
        this.inventory = new Inventory();
        await this.inventory.getInventory(this.steamid);
        return true;
	}
	
	async getHours() {
		var gamesPage = await request(`http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${config.apikey}&steamid=${this.steamid}&format=json&include_played_free_games=1`);
		if (gamesPage.status != 200) return false;
		else var games = gamesPage.body;

		for (var gameT in games.response.games) {
			var game = games.response.games[gameT];
			if (game.appid == 440) this.hours = Math.round(game.playtime_forever / 60);
		}

		if (this.hours == undefined) return false;
		else return true;
	}

	async getHistory() {
		var historyPage = await fetch(`https://backpack.tf/profiles/${this.steamid}`);
		if (historyPage.status != 200) return false;
		else var history = await historyPage.text();
		var matches = history.match(/Most Recent[\S\s]*<\/select/);
		if (matches) {
			var h = matches[0].match(/value/gi);
			this.histories = h.length;
		} else {
			this.histories = 0;
		}
		return true;
	}

	async getLevel() {
		var levelPage = await request(`https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key=${config.apikey}&steamid=${this.steamid}`);
		if (levelPage.status != 200) return false;

		this.level = levelPage.body.response.player_level;
		return true;
	}
}

class Inventory {
    constructor() {
        this.items = [];
        this.scrap = 0;
        this.keys = 0;
		this.success = true;
		this.inventoryJson = {};
    }
    async getInventory(steamid) {
        var badTryCounter = 0;
        while (true) {
			await timeout(100);
			var response = await request(`https://steamcommunity.com/inventory/${steamid}/440/2?l=english&count=4000`);
			if (stop === true) {
				this.success = false;
				return;
			}
			if (response.status != 200 && response.status != 403) {
				continue;
			} else if (response.status == 403) {
				this.success = false;
				return;
			}
			this.inventoryJson = response.body;
			break;
		}
		
		if (this.inventoryJson.success == undefined || this.inventoryJson.success != 1) {
			this.success = false;
			return;
		}

		var matches = [];

		for (var assetT in this.inventoryJson.assets) {
			var asset = this.inventoryJson.assets[assetT];
			for (var descriptionT in this.inventoryJson.descriptions) {
				var description = this.inventoryJson.descriptions[descriptionT];
				if (description.classid == asset.classid) {
					matches.push(description);
					break;
				}
			}
		}

		for (var it in matches) {
			var i = matches[it];
			// ITEM
			var it = new Item(i);
			if (it.name == "Scrap Metal") {
				if (it.tradable) this.scrap++;
				it.isCurrency = true;
			}
			if (it.name == "Reclaimed Metal") {
				if (it.tradable) this.scrap += 3;
				it.isCurrency = true;
			}
			if (it.name == "Refined Metal") {
				if (it.tradable) this.scrap += 9;
				it.isCurrency = true;
			}
			if (it.name == "Mann Co. Supply Crate Key") {
				if (it.tradable) this.keys++;
				it.isCurrency = true;
			}
			this.items.push(it);
		}
		return;
    }
}

class Item {
	constructor(data) {
		this.name;
		this.nameComplete;
		this.craftable = 1;
		this.australium = -1;
		this.killstreak = 0;
		this.quality;
		this.quality2;
		this.qualityName;
		this.qualityName2;
		this.image;
		this.skinId;
		this.target;
		this.targetName;
		this.tradable = true;
		this.effect;
		this.effectName;
		this.effectImage;
		this.crate;
		this.isCrate = false;
		this.currency;
		this.priceValue;
		this.isStrangePart = false;
		this.isCurrency = false;

		if (data.tradable == 0) this.tradable = false;
		this.nameComplete = data.market_name;
		this.name = data.market_name;
		this.name = this.name.replace(/^The /, "");
		this.image = `https://steamcommunity-a.akamaihd.net/economy/image/${data.icon_url}`;
		if (this.name.includes("Killstreak ")) {
			this.killstreak = 1;
			this.name = this.name.replace("Killstreak ","");

		}
		if (this.name.includes("Specialized ")) {
			this.killstreak = 2;
			this.name = this.name.replace("Specialized ", "");
		}
		if (this.name.includes("Professional ")) {
			this.killstreak = 2;
			this.name = this.name.replace("Professional ", "");
		}
		if (this.name.includes("Australium ")) {
			this.australium = 1;
			this.name = this.name.replace("Australium ", "");
		}

		for (var tagT in data.tags) {
			var tag = data.tags[tagT];
			var category = tag.category;
			if (category == "Quality") {
				for (var qualityDataT in qualitieList) {
					var qualityData = qualitieList[qualityDataT];
					if (qualityData.name == tag.localized_tag_name) {
						this.quality = qualityData.index;
						this.qualityName = qualityData.name;
						break;
					}
				}
			} else if (category == "Type") {
				if (tag.localized_tag_name == "Crate") {
					this.isCrate = true;
				} else if (tag.localized_tag_name == "Strange Part") {
					this.isStrangePart = true;
				}
			}
		}

		for (var descriptionT in data.descriptions) {
			var description = data.descriptions[descriptionT];
			var value = description.value;
			if (value.includes("★ Unusual Effect: ") && !value.includes("''")) {
				this.effectName = value.replace("★ Unusual Effect: ", "");
			} else if (value.includes("Usable in Crafting")) {
				this.craftable = -1;
			}
		}

		if (!this.isStrangePart) this.name = this.name.replace(`${this.qualityName} `, "");

		for (var qualityDataT in qualitieList) {
			var qualityData = qualitieList[qualityDataT];
			if (this.name.startsWith(`${qualityData.name} `)) {
				if (qualityData.index == 11 && this.isStrangePart) continue;
				if (this.quality == qualityData.index) break;
				this.name = this.name.replace(`${qualityData.name} `, "");
				this.quality2 = qualityData.index;
				this.qualityName2 = qualityData.name;
				break;
			}
		}

		if (this.quality == 15) {
			for (var k in skin_list) {
				var v = skin_list[k];
				if (this.name.includes(v)) {
					this.name = this.name.replace(`${v} `, "");
					this.skinId = k;
					break;
				}
			}
		}

		if (this.quality == 14) this.qualityName = "Collector";
		if (this.quality == 15) this.qualityName = "Decorated";

		if (this.name.includes("#")) {
			this.crate = this.name.match(/\d+$/);
			this.name = this.name.replace(` Series #${this.crate}`, "");
			this.name = this.name.replace(` #${this.crate}`, "");
		}

		if (this.name.includes(" Unusualifier")) {
			this.targetName = name.match(/^[\w:\s]+(?=\s)/);
			this.name = this.name.replace(`${this.targetName} `, "");
			for (var it in schema) {
				if (it.item_name == this.targetName) {
					this.target = it.defindex;
					break;
				}
			}
		}

		if (this.quality == 5 && this.effectName != undefined) {
			this.effect = effects[this.effectName] || effects[`The ${this.effectName}`];
			this.nameComplete = this.nameComplete.replace("Unusual", this.effectName);
			this.effectImage = `https://backpack.tf/images/440/particles/${this.effect}_94x94.png`;
		}

		var _name = `${this.australium == 1 ? "Australium " : ""}${this.name}`;
		var _displayQuality = (this.quality2 || this.quality).toString();
		if (this.quality == 5) _displayQuality = this.quality.toString();
		var _craftable = `${this.craftable == 1 ? "Craftable" : "Non-Craftable"}`;

		var p1 = bptf_schema.response.items[_name] || bptf_schema.response.items[`The ${_name}`] || {};
		var p2 = p1.prices || {};
		var p3 = p2[_displayQuality] || {};
		var p4 = p3["Tradable"] || {};
		var priceIndex = p4[_craftable];

		if (priceIndex == undefined) {
			this.displayPrice = "No value";
			this.priceValue = 0;
			return;
		}

		var _serial = 0;
		if (this.quality == 5 || this.quality2 == 5 || _name.includes("Strangifier")) {
			if (this.target != undefined) _serial = this.target;
			else if (this.effect != undefined) _serial = this.effect;
		} else if (this.isCrate) {
			priceIndex[0] == undefined ? _serial = this.crate : _serial = 0;
		}
		var prices = priceIndex[_serial] || priceIndex[_serial];
		if (prices == undefined) {
			if (Object.keys(priceIndex).length == 1) prices = priceIndex[Object.keys(priceIndex)[0]];
			else {
				this.displayPrice = "No value";
				this.priceValue = 0;
				return;
			} 
		}

		if (prices.currency == "keys") this.currency = 1;
		else if (prices.currency == "metal") this.currency = 2;
		else this.currency = 3;

		if (this.currency == 1) this.priceValue = prices.value;
		if (this.currency == 2) this.priceValue = prices.value / keyprice;
		if (this.currency == 3) this.priceValue = 1.33 / keyprice;
		if (this.currency == undefined) this.priceValue = 0;
		
		if (this.currency == 1) this.displayPrice = `${prices.value} Keys`;
		if (this.currency == 2) this.displayPrice = `${prices.value} Ref`;
		if (this.currency == 3) this.displayPrice = `1.33 Ref`;
		if (!this.tradable) {
			this.displayPrice = "No value";
			this.priceValue = 0;
		}

		if (this.skinId != null) currency = 4;
	}
}

async function request(url) {
    try {
        var response = await fetch(url);
        if (!response.ok && response.status != 429) {
            return {status: response.status, body: null};
        } else if (response.status == 429) {
			await timeout(5000);
			return {status: response.status, body: null};
        } else {
			var body = await response.json();
			return {status: response.status, body};
		}
    } catch (error) {
		console.log(`Error fetching`);
		await timeout(5000);
        return {status: error.status, body: null};
    }
}

async function startScanRe(ids, settings) {
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

	var idParts = [];

	for (var i = 0; i < usersToScan; i += 100) {
		var end = (i + 100 < usersToScan) ? i + 100 : usersToScan;
		idParts.push(ids.slice(i, end));
	}

	for (var idListT in idParts) {
		var idList = idParts[idListT];
		if (stop) break;
		var idString = "";

		for (var i in idList) {
			var id = idList[i];

			idString += id;
			if (i != idList.length - 1) idString += ",";
		}

		var playersData = await request(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${config.apikey}&format=json&steamids=${idString}`);
		var players = [];
		for (var p in playersData.body.response.players) {
			var playerData = playersData.body.response.players[p];
			players.push(new Player(playerData));
		}

		for (var playerT in players) {
			scanned++;
			status.innerText = `${scanned}/${usersToScan}`;
			var player = players[playerT];
			if (stop) break;
			if (player.visibility == 1 || player.visibility == 2) continue;
			await player.getInventory();
			if (!player.inventory.success) continue;
			if (player.inventory.scrap / 9 > settings.maxRef && settings.maxRef >= 0) continue;
			if (player.inventory.keys > settings.maxKeys && settings.maxKeys >= 0) continue;

			var displayItems = [];

			for (var itemT in player.inventory.items) {
				var item = player.inventory.items[itemT];

				if (item.isCurrency) continue;

				if (item.currency != null && settings.totalMinPrice > 0) {
					if (item.currency == 1 && item.priceValue < settings.totalMinPrice) continue;
					if (item.currency == 2 && item.priceValue < settings.totalMinPrice) continue;
					if (item.currency == 3 && item.priceValue < settings.totalMinPrice) continue;
				}

				if (item.currency == 4 && !settings.skins) continue;

				if (item.currency == undefined && !settings.unvalued) continue;

				if (!item.tradable && !settings.untradable) continue;

				displayItems.push(item);
			}
			
			if (displayItems.length == 0) continue;
			else addPlayer(player, displayItems, settings);
		}
	}
	endTimer(t0);
	stopScan();
}
/**
 * 
 * @param {Player} player
 * @param {Array<Item>} displayItems 
 * @param {*} settings
 */
async function addPlayer(player, displayItems, settings) {
	displayItems.sort((a,b) => {return b.priceValue - a.priceValue});

	await player.getHistory();
	await player.getHours();
	await player.getLevel();

	if (player.histories == undefined && settings.maxHistory >= 0) return;
	else if (player.histories != undefined && settings.maxHistory >= 0 && player.histories > settings.maxHistory) return;

	if (player.hours == undefined && settings.maxHours >= 0) return;
	else if (player.hours != undefined && settings.maxHours >= 0 && player.hours > settings.maxHours) return;

	var itemContainer = document.createElement("div");
	itemContainer.classList.add("items");

	for (var itemT in displayItems) {
		var item = displayItems[itemT];

		var itemElement = document.createElement("div");
		itemElement.classList.add("item");
		itemElement.classList.add(item.qualityName);
		itemElement.classList.add(`${item.qualityName2}2`);
		itemElement.setAttribute("tooltip", item.nameComplete);
		itemElement.setAttribute("pos", "top");

		var itemImage = document.createElement("img");
		itemImage.setAttribute("src", item.image);
		itemImage.setAttribute("height", "65");
		itemImage.setAttribute("width", "65");

		var effectImage = document.createElement("img");
		effectImage.setAttribute("src", item.effectImage);
		effectImage.setAttribute("height", "65");
		effectImage.setAttribute("width", "65");

		var priceNode = document.createElement("div");
		priceNode.classList.add("price");
		priceNode.appendChild(document.createTextNode(item.displayPrice));

		if ((item.quality == 5 || item.quality2 == 5) && item.effectImage != undefined) itemElement.appendChild(effectImage);
		itemElement.appendChild(itemImage);
		itemElement.appendChild(priceNode);

		itemContainer.appendChild(itemElement);
	}

	var user = await userBuilderRe(player, player.playerId);
	user.appendChild(itemContainer);
	document.getElementById("userlist").appendChild(user);
}

/**
 * 
 * @param {Player} userObject
 */
async function userBuilderRe(userObject, n) {
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
	accountImage.setAttribute("src", userObject.avatarUrl);
	var deleteIcon = document.createElement("i");
	deleteIcon.classList.add("material-icons");
	deleteIcon.appendChild(document.createTextNode("delete"));
	var spacer = document.createElement("div");
	spacer.classList.add("spacer");

	var avatarCircle = document.createElement("div");
	var hoursDisplay = document.createElement("div");
	var levelDisplay = document.createElement("div");
	var historyDisplay = document.createElement("div");
	var keyDisplay = document.createElement("div");
	var refDisplay = document.createElement("div");
	var addButton = document.createElement("div");
	var profileButton = document.createElement("div");
	var removeButton = document.createElement("div");
	avatarCircle.classList.add("profile");
	avatarCircle.setAttribute("tooltip", userObject.name);
	avatarCircle.setAttribute("pos", "right");
	avatarCircle.setAttribute("onclick", `openLink('https://steamcommunity.com/profiles/${userObject.steamid}')`)
	avatarCircle.appendChild(accountImage);

	hoursDisplay.classList.add("hours");
	levelDisplay.classList.add("hours");
	historyDisplay.classList.add("hours");
	keyDisplay.classList.add("hours");
	refDisplay.classList.add("hours");
	addButton.classList.add("action");
	profileButton.classList.add("action");
	removeButton.classList.add("action");

	hoursDisplay.setAttribute("tooltip", "Hours played");
	levelDisplay.setAttribute("tooltip", "Steam level");
	historyDisplay.setAttribute("tooltip", "Saved history states on backpack.tf");
	keyDisplay.setAttribute("tooltip", "Tradable keys in inventory");
	refDisplay.setAttribute("tooltip", "Tradable refined in inventory");
	addButton.setAttribute("tooltip", "Add friend");
	addButton.setAttribute("onclick", `openLink('steam://friends/add/${userObject.steamid}')`);
	profileButton.setAttribute("tooltip", "Backpack.tf page");
	profileButton.setAttribute("onclick", `openLink('https://backpack.tf/profiles/${userObject.steamid}')`);
	removeButton.setAttribute("tooltip", "Remove listing");
	removeButton.setAttribute("onclick", `removeUser("${n}")`);
	hoursDisplay.setAttribute("pos", "bottom");
	levelDisplay.setAttribute("pos", "bottom");
	historyDisplay.setAttribute("pos", "bottom");
	keyDisplay.setAttribute("pos", "bottom");
	refDisplay.setAttribute("pos", "bottom");
	addButton.setAttribute("pos", "bottom");
	profileButton.setAttribute("pos", "bottom");
	removeButton.setAttribute("pos", "left");

	if (userObject.hours !== undefined) {
		if (userObject.hours != 0) {
			hoursDisplay.appendChild(document.createTextNode(userObject.hours + " Hrs"));
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

	if (userObject.histories != undefined) {
		historyDisplay.appendChild(document.createTextNode(userObject.histories));
	} else {
		historyDisplay.appendChild(document.createTextNode("Unknown"));
	}

	refDisplay.appendChild(document.createTextNode(scrapToRef(userObject.inventory.scrap) + " Ref"));
	keyDisplay.appendChild(document.createTextNode(userObject.inventory.keys + " Keys"));

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
	actions.appendChild(historyDisplay);
	if (userObject.inventory.keys > 0) actions.appendChild(keyDisplay);
	if (userObject.inventory.scrap > 0) actions.appendChild(refDisplay);
	actions.appendChild(spacer);
	actions.appendChild(removeButton);

	var user = document.createElement("div");
	user.classList.add("user");
	user.id = n;

	user.appendChild(actions);

	return user;
}

function scrapToRef(scrapNumber) {
	refNumber = Math.trunc((scrapNumber / 9) * 100) / 100;
	return refNumber;
}

var qualitieList = [
	{
	  "name": "Normal",
	  "color": "#B2B2B2",
	  "index": 0
	},
	{
	  "name": "Genuine",
	  "color": "#4D7455",
	  "index": 1
	},
	{
	  "name": "Vintage",
	  "color": "#476291",
	  "index": 3
	},
	{
	  "name": "Unusual",
	  "color": "#8650AC",
	  "index": 5
	},
	{
	  "name": "Unique",
	  "color": "#FFD700",
	  "index": 6
	},
	{
	  "name": "Community",
	  "color": "#70B04A",
	  "index": 7
	},
	{
	  "name": "Valve",
	  "color": "#A50F79",
	  "index": 8
	},
	{
	  "name": "Self-Made",
	  "color": "#70B04A",
	  "index": 9
	},
	{
	  "name": "Strange",
	  "color": "#CF6A32",
	  "index": 11
	},
	{
	  "name": "Haunted",
	  "color": "#38F3AB",
	  "index": 13
	},
	{
	  "name": "Collector's",
	  "color": "#AA0000",
	  "index": 14
	},
	{
	  "name": "Decorated Weapon",
	  "color": "#FAFAFA",
	  "index": 15
	}
  ];