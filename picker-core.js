/**
 * Shared picker logic for desktop (index.html) and mobile (mobile.html).
 * Depends on pokemon_arrays.js, translate.js, dex_mini.js.
 */
(function (global) {
	"use strict";

	var zerogen_vers = 2;
	var domlink = global.location.protocol + "//" + global.location.host + "/";

	var type_order = ["", "Normal", "Fire", "Water", "Grass", "Electric", "Ice", "Fighting", "Poison", "Ground", "Flying", "Psychic", "Bug", "Rock", "Ghost", "Dragon", "Dark", "Steel", "Fairy", "Starter", "Gimmick", "Legendary", "Favorite"];
	var gen_order = ["gen1", "gen2", "gen3", "gen4", "gen5", "gen6", "gen7", "gen8", "gen9", "Favorite"];
	var type_eles = ["Normal", "Fire", "Water", "Grass", "Electric", "Ice", "Fighting", "Poison", "Ground", "Flying", "Psychic", "Bug", "Rock", "Ghost", "Dragon", "Dark", "Steel", "Fairy", "Starter", "GimmickForm", "Legend", "FavAlone"];
	var other_order = ["",
		"team1", "team2", "team3", "team4", "team5", "team6",
		"Custom1", "Bird", "Critter", "RegionalBug", "GrassGirl", "Pseudo", "Fossil", "MysteryDungeon", "Baby",
		"Custom2", "Box", "Mythical", "Mega", "Ultra", "GMax", "Paradox", "Regional", "NewEvolution",
		"Custom3", "Types", "PokeBall", "Pikaclone", "Eevee", "SpindaTitle", "Vivillon", "Furfrou", "Alcremie",
		"alc0", "alc7", "alc14", "alc21", "alc28", "alc35", "alc42", "alc49", "alc56"
	];

	var BOTTOM_ROWS = 0;
	var TEAM_SLOTS = 6;
	var ALCREMIE_MIN = other_order.indexOf("Alcremie");
	var ALCREMIE_MAX = other_order.indexOf("alc56");
	var SPINDA_BOX = other_order.indexOf("SpindaTitle");
	var GENERATION_FAV = type_eles.length;
	var TYPE_FAV = 10;
	var MAX_BOX = ALCREMIE_MIN;
	var STARTER_COLUMN = type_order.indexOf("Starter");
	var MYSTERY_BOX = other_order.indexOf("MysteryDungeon");
	var DEFAULT_CUSTOM = "Click to customize!";

	var filter_boxes = [
		other_order.indexOf("Custom1"),
		other_order.indexOf("Custom2"),
		other_order.indexOf("Custom3")
	];

	var cookie_names = [
		"gen0", "gen1", "gen2", "gen3", "gen4",
		"gen5", "gen6", "gen7", "gen8", "gen9",
		"favs", "spinda"
	];

	var swap = { "Front": "Shiny", "Shiny": "Front" };

	var spot_map = {
		"spot1x": "spot1", "spot1y": "spot1",
		"spot2x": "spot2", "spot2y": "spot2",
		"spot3x": "spot3", "spot3y": "spot3",
		"spot4x": "spot4", "spot4y": "spot4"
	};

	var GEN_TOPS = [101, 200, 299, 398, 497, 596, 695, 794, 893, 992];
	var TYPE_LEFTS = [];
	for (var ti = 0; ti <= 22; ti++) {
		TYPE_LEFTS[ti] = ti === 0 ? 0 : 100 + (ti - 1) * 99;
	}

	var BOTTOM_LEFTS = {
		1: 94, 2: 193, 3: 292, 4: 94, 5: 193, 6: 292,
		7: 530, 8: 722, 9: 914, 10: 1105, 11: 1297, 12: 1489, 13: 1681, 14: 1873, 15: 2064,
		16: 530, 17: 722, 18: 914, 19: 1105, 20: 1297, 21: 1489, 22: 1681, 23: 1873, 24: 2064,
		25: 530, 26: 722, 27: 914, 28: 1105, 29: 1297, 30: 1489, 31: 1681, 32: 1873, 33: 2064
	};

	var BOTTOM_TOPS = function (type) {
		if (type >= 1 && type <= 3) return 1264;
		if (type >= 4 && type <= 6) return 1363;
		if (type >= 7 && type <= 15) return 1210;
		if (type >= 16 && type <= 24) return 1409;
		if (type >= 25 && type <= 33) return 1608;
		return 1210;
	};

	var STORAGE_KEY = "picker-grid-v1";
	var STORAGE_SHINY_KEY = "picker-shiny-mode";
	var STORAGE_SPINDA_KEY = "picker-spinda-spots";

	var choices = [];
	var shinyCells = {};
	var spriteFile = "Front";
	var spindaSpots = { spot1: { x: 8, y: 8 }, spot2: { x: 8, y: 8 }, spot3: { x: 8, y: 8 }, spot4: { x: 8, y: 8 } };

	function cellKey(gen, type) {
		return gen + "_" + type;
	}

	function isShiny(gen, type) {
		return !!shinyCells[cellKey(gen, type)];
	}

	function setShiny(gen, type, val) {
		var k = cellKey(gen, type);
		if (val) shinyCells[k] = true;
		else delete shinyCells[k];
	}

	function resetChoices() {
		choices = [[]];
		shinyCells = {};
		for (var c in other_order) choices[0].push("");
		for (var i = 1; i <= TYPE_FAV; i++) {
			choices.push([]);
			for (var t in type_order) choices[i].push("");
		}
		choices[0][SPINDA_BOX] = "SPINDA";
	}

	resetChoices();

	function getBoxCoords(gen, type) {
		if (gen === BOTTOM_ROWS) {
			return { left: BOTTOM_LEFTS[type] || 530, top: BOTTOM_TOPS(type) };
		}
		if (gen >= 1 && gen <= TYPE_FAV) {
			var top = GEN_TOPS[gen - 1];
			var left = TYPE_LEFTS[type];
			return { left: left, top: top };
		}
		return { left: 0, top: 0 };
	}

	function getCookieName(g) {
		if (parseInt(g, 10) < TYPE_FAV) return "gen" + g;
		if (g == TYPE_FAV) return "favs";
		return "spinda";
	}

	function updateZerogen(str) {
		var ar = str.split(",");
		if (ar[0] == zerogen_vers) return str;
		var v = ar[0] || "1";
		switch (v) {
			case "1":
				ar = [
					2,
					ar[1], ar[2], ar[3], ar[4], ar[5], ar[6],
					"", ar[7], ar[8], ar[9], "", ar[10], ar[13], "", ar[34],
					"", ar[16], ar[17], "", ar[18], ar[15], ar[19], ar[14], ar[35],
					"", ar[20], ar[21], ar[11], ar[12], ar[22], ar[23], "", ar[24]
				];
		}
		return ar.join(",");
	}

	function getCookie(name) {
		var matches = document.cookie.match(new RegExp(
			"(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, "\\$1") + "=([^;]*)"
		));
		return matches ? decodeURIComponent(matches[1]) : undefined;
	}

	function setCookie(name, value) {
		var options = { path: "/", samesite: "strict" };
		options.Expires = new Date(new Date().getTime() + 365 * 24 * 60 * 60 * 1000);
		if (options.Expires instanceof Date) options.Expires = options.Expires.toUTCString();
		var updatedCookie = encodeURIComponent(name) + "=" + encodeURIComponent(value);
		for (var optionKey in options) {
			updatedCookie += "; " + optionKey;
			var optionValue = options[optionKey];
			if (optionValue !== true) updatedCookie += "=" + optionValue;
		}
		document.cookie = updatedCookie;
	}

	function deleteCookie(name) {
		setCookie(name, "", { "max-age": -1 });
	}

	function serializeGrid(includeHeader) {
		var header = "# Don't like my choices? You can overrule them here!\n# Write Code will put a text version of the grid here,\n# Then you can edit the names and Import Code to replace the images.\n# Most Pokemon are just their named capitalized, like SWELLOW.\n# Alternate forms have specific tags, like MEOWTH_2 for Galarian Meowth.\n# You can also use this to keep backups\n";
		var output = includeHeader !== false ? header : "";
		for (var g = 0; g < choices.length; g++) {
			for (var t = 0; t < choices[g].length; t++) {
				if (g == BOTTOM_ROWS && t == 0) {
					output += zerogen_vers + ",";
					continue;
				}
				if (g == BOTTOM_ROWS && t > ALCREMIE_MIN) continue;
				if (isShiny(g, t)) output += "&";
				if (choices[g][t]) output += choices[g][t];
				output += ",";
			}
			output += "\n";
		}
		output += "spindaspots,";
		var spots = ["spot1", "spot2", "spot3", "spot4"];
		for (var si = 0; si < spots.length; si++) {
			var sn = spots[si];
			output += spindaSpots[sn].x + "," + spindaSpots[sn].y + ",";
		}
		return output;
	}

	function deserializeGrid(importbox, persist) {
		shinyCells = {};
		var lines = importbox.replace(/# ?[^\n]+\n/g, "").split("\n");
		var gen = -1;
		for (var l in lines) {
			if (lines[l] == "" || !lines[l].match(/,/)) continue;
			gen++;
			if (gen == 0) lines[l] = updateZerogen(lines[l]);
			if (persist) setCookie(getCookieName(gen), lines[l]);
			var ents = lines[l].split(",");
			if (ents[0] && ents[0] == "spindaspots") {
				applySpindaArray(ents);
				continue;
			}
			for (var e in ents) {
				var name = ents[e].replace("&", "");
				if (gen == BOTTOM_ROWS && e == SPINDA_BOX) name = "SPINDA";
				if (!choices[gen]) continue;
				if (name == "") {
					choices[gen][e] = "";
					continue;
				}
				choices[gen][e] = name;
				if (ents[e].match("&")) setShiny(parseInt(gen, 10), parseInt(e, 10), true);
			}
		}
		if (persist) saveToStorage();
	}

	function applySpindaArray(ar) {
		var spots = ["spot1", "spot2", "spot3", "spot4"];
		if (!ar) return;
		for (var i = 0; i < spots.length; i++) {
			spindaSpots[spots[i]] = {
				x: parseInt(ar[2 * i + 1], 10) || 0,
				y: parseInt(ar[2 * i + 2], 10) || 0
			};
		}
	}

	function randomSpindaValues() {
		var ar = ["spindaspots"];
		for (var i = 0; i < 4; i++) {
			ar.push(Math.floor(Math.random() * 17));
			ar.push(Math.floor(Math.random() * 17));
		}
		applySpindaArray(ar);
		choices[BOTTOM_ROWS][SPINDA_BOX] = "SPINDA";
		saveToStorage();
		return ar;
	}

	function getSpindaSpotStyle(spotName) {
		var base_left = 1481;
		var base_top = 1616;
		var s = spindaSpots[spotName];
		return {
			left: base_left + s.x,
			top: base_top - s.y
		};
	}

	function saveToStorage() {
		try {
			localStorage.setItem(STORAGE_KEY, serializeGrid(false));
			localStorage.setItem(STORAGE_SHINY_KEY, spriteFile);
			localStorage.setItem(STORAGE_SPINDA_KEY, JSON.stringify(spindaSpots));
		} catch (e) { /* quota */ }
		for (var g = 0; g < choices.length; g++) {
			writeCookieRow(g);
		}
		writeSpindaCookieRow();
	}

	function writeCookieRow(g) {
		var cookie_text = "";
		for (var t = 0; t < choices[g].length; t++) {
			if (g == 0 && t == 0) {
				cookie_text += zerogen_vers + ",";
				continue;
			}
			if (isShiny(g, t)) cookie_text += "&";
			if (choices[g][t]) cookie_text += choices[g][t];
			cookie_text += ",";
		}
		setCookie(getCookieName(g), cookie_text);
	}

	function writeSpindaCookieRow() {
		var cookie_text = "spindaspots,";
		var spots = ["spot1", "spot2", "spot3", "spot4"];
		for (var i = 0; i < spots.length; i++) {
			cookie_text += spindaSpots[spots[i]].x + "," + spindaSpots[spots[i]].y + ",";
		}
		setCookie("spinda", cookie_text);
	}

	function loadFromStorage() {
		var migrated = false;
		try {
			var stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				deserializeGrid(stored, false);
				var sf = localStorage.getItem(STORAGE_SHINY_KEY);
				if (sf === "Shiny") spriteFile = "Shiny";
				var sp = localStorage.getItem(STORAGE_SPINDA_KEY);
				if (sp) spindaSpots = JSON.parse(sp);
				return;
			}
		} catch (e) { /* fall through to cookies */ }

		var cookie_vals = [];
		for (var c in cookie_names) cookie_vals.push(",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,");
		var cookies = document.cookie.split(/; ?/);
		for (var c in cookies) {
			var pair = cookies[c].match(/([^=]+) ?= ?([^=;]+)/);
			if (!pair) continue;
			var cname = decodeURIComponent(pair[1]);
			var cval = decodeURIComponent(pair[2]);
			var g = cookie_names.indexOf(cname);
			if (cname == "gen0") {
				var alt = updateZerogen(cval);
				if (alt != cval) { setCookie("gen0", alt); cval = alt; }
			}
			if (g == -1) {
				if (cname == "shiny") spriteFile = swap[spriteFile];
			} else {
				cookie_vals[g] = cval;
				migrated = true;
			}
		}
		deserializeGrid(cookie_vals.join("\n"), false);
		if (migrated) saveToStorage();
	}

	function calcTypes() {
		var scores = {};
		var bottom_skips = [
			other_order.indexOf("Pikaclone"),
			other_order.indexOf("SpindaTitle"),
			other_order.indexOf("Vivillon"),
			other_order.indexOf("Furfrou"),
			other_order.indexOf("Alcremie")
		];
		for (var t in type_count_array) scores[type_count_array[t]] = 0;
		for (var g in choices) {
			for (var m = 0; m < choices[g].length; m++) {
				if (g == BOTTOM_ROWS && bottom_skips.includes(m)) continue;
				var mon_name = choices[g][m];
				if (!mon_name || mon_name == "") continue;
				var mon_types = rev_map[mon_name];
				if (!mon_types) continue;
				for (var ty in mon_types) scores[mon_types[ty]]++;
			}
		}
		type_count_array.sort(function (a, b) { return scores[b] - scores[a]; });
		var fin = [];
		for (var i = 0; i < 3; i++) {
			if (scores[type_count_array[i]] > 0) fin.push(type_count_array[i]);
		}
		return [fin, scores];
	}

	/**
	 * Returns candidate mon keys for a box, mirroring openBox() logic without DOM.
	 */
	function getCandidates(gen, type, filterState, toppingsMode) {
		var list = [];
		if (filterState && filterState.length === 0) {
			list = type_order.filter(function (e) { return e; });
			var cur = choices[gen] && choices[gen][type];
			if (cur && !list.includes(cur)) list.push(cur);
			return list;
		}
		if (filterState && filterState.length === 1) {
			list = gen_order.filter(function (e) { return e; });
			var cur2 = choices[gen] && choices[gen][type];
			if (cur2 && !list.includes(cur2)) list.push(cur2);
			return list;
		}
		if (filterState && filterState.length === 2) {
			var category = filterState[0];
			var generation = filterState[1];
			var gendex = gen_order.indexOf(generation) + 1;
			if (category == "Favorite" && generation == "Favorite") {
				return [choices[TYPE_FAV][GENERATION_FAV]].filter(Boolean);
			}
			if (generation == "Favorite") {
				return [choices[TYPE_FAV][type_order.indexOf(category)]].filter(Boolean);
			}
			if (category == "Favorite") {
				return choices[gendex].filter(function (e) { return e; });
			}
			return arrays[category][gendex] || [];
		}
		if (gen == BOTTOM_ROWS) {
			var box = other_order[type];
			if (arrays[box]) return arrays[box].slice();
		}
		if (gen == TYPE_FAV && type == GENERATION_FAV) {
			for (var c = 1; c < choices.length; c++) {
				var start = GENERATION_FAV;
				if (c == TYPE_FAV) start = 1;
				for (var i = start; i < GENERATION_FAV + 1; i++) {
					if (!choices[c][i]) continue;
					if (list.includes(choices[c][i])) continue;
					list.push(choices[c][i]);
				}
			}
			return list;
		}
		if (gen == TYPE_FAV) {
			for (var g in choices) {
				if (g == gen || g == 0) continue;
				if (!choices[g][type]) continue;
				if (list.includes(choices[g][type])) continue;
				list.push(choices[g][type]);
			}
			return list;
		}
		if (type == GENERATION_FAV) {
			for (var m in choices[gen]) {
				if (m == type) continue;
				if (!choices[gen][m]) continue;
				if (list.includes(choices[gen][m])) continue;
				list.push(choices[gen][m]);
			}
			return list;
		}
		if (arrays[type_order[type]] && arrays[type_order[type]][gen]) {
			return arrays[type_order[type]][gen].slice();
		}
		return list;
	}

	function monTooltip(mon_key, gen, type, typeScores, toppingsMode) {
		var mon_data = keyToMonData(mon_key);
		var tooltip = mon_data.form_data.name + (mon_data.is_fs ? " (female)" : "");
		if (tooltip == "Alcremie" && gen == BOTTOM_ROWS && type >= ALCREMIE_MIN && type <= ALCREMIE_MAX) {
			tooltip = alcremieTooltip(mon_key, toppingsMode);
		}
		if (typeScores) tooltip += " (" + typeScores[mon_key] + ")";
		if (type == STARTER_COLUMN && gen >= 1) {
			var game = starterGame(mon_key, gen);
			if (game != "") tooltip += " (" + game + ")";
		}
		if (gen == 0 && type == MYSTERY_BOX) {
			var md = mdGame(mon_key);
			if (md != "") tooltip += " (" + md + ")";
		}
		return tooltip;
	}

	function spriteUrl(mon_key, gen, type, forceShiny) {
		var sf = forceShiny || isShiny(gen, type) || spriteFile === "Shiny" ? "Shiny" : "Front";
		var mon_data = keyToMonData(mon_key);
		if (mon_data.mon.grid_img && type != other_order.indexOf("PokeBall")) {
			return domlink + "grid/" + mon_key + ".png";
		}
		return domlink + sf + "/" + mon_key + ".png";
	}

	var EXTRA_CATS = [
		{ type: 7, id: "Custom1", custom: true },
		{ type: 8, id: "Bird" },
		{ type: 9, id: "Mammal" },
		{ type: 10, id: "RegionBug" },
		{ type: 11, id: "GrassGirl" },
		{ type: 12, id: "PseudoLegend" },
		{ type: 13, id: "Fossil" },
		{ type: 14, id: "MysteryDungeon" },
		{ type: 15, id: "Baby" },
		{ type: 16, id: "Custom2", custom: true },
		{ type: 17, id: "BoxLegendary" },
		{ type: 18, id: "Mythical" },
		{ type: 19, id: "MegaEvo" },
		{ type: 20, id: "UltraBeast" },
		{ type: 21, id: "Gigantamax" },
		{ type: 22, id: "Paradox" },
		{ type: 23, id: "RegionalForm" },
		{ type: 24, id: "NewEvolution" },
		{ type: 25, id: "Custom3", custom: true },
		{ type: 26, id: "Type" },
		{ type: 27, id: "Pokeball" },
		{ type: 28, id: "PikachuClone" },
		{ type: 29, id: "Eeveelution" },
		{ type: 30, id: "SpindaTitle" },
		{ type: 31, id: "Vivillon" },
		{ type: 32, id: "Furfrou" },
		{ type: 33, id: "Alcremie" }
	];

	var TYPE_CHIP_COLORS = {
		Normal: "#A8A878", Fire: "#F08030", Water: "#6890F0", Grass: "#78C850",
		Electric: "#F8D030", Ice: "#98D8D8", Fighting: "#C03028", Poison: "#A040A0",
		Ground: "#E0C068", Flying: "#A890F0", Psychic: "#F85888", Bug: "#A8B820",
		Rock: "#B8A038", Ghost: "#705898", Dragon: "#7038F8", Dark: "#705848",
		Steel: "#B8B8D0", Fairy: "#EE99AC", Starter: "#4caf50", Gimmick: "#8e24aa",
		Legendary: "#f9a825", Favorite: "#c5372f"
	};

	function translText(id, fallback) {
		var s = "";
		if (typeof getTranslString === "function") s = getTranslString(id);
		if (Object.prototype.toString.call(s) === "[object Array]") s = s[0] || "";
		return s || fallback || "";
	}

	function favoriteWord() {
		return translText("Favorite", "Favorite");
	}

	function extraCaption(cat) {
		if (cat.custom) {
			var titled = getCookie(cat.id);
			if (titled && titled !== DEFAULT_CUSTOM) return titled;
			if (choices[BOTTOM_ROWS][cat.type]) return "Showcase";
			return "";
		}
		var name = translText(cat.id, cat.id);
		var fav = favoriteWord();
		var lang = typeof currentLang === "string" ? currentLang : "English";
		if (typeof no_spaces !== "undefined" && no_spaces.indexOf(lang) >= 0) return fav + name;
		if (typeof trailing_fav !== "undefined" && trailing_fav.indexOf(lang) >= 0) return name + "\n" + fav;
		return fav + "\n" + name;
	}

	function wrapCanvasText(ctx, text, maxWidth) {
		text = String(text || "").replace(/<br\s*\/?>/gi, "\n");
		var out = [];
		var paras = text.split("\n");
		for (var p = 0; p < paras.length; p++) {
			var line = paras[p].trim();
			if (!line) continue;
			var words = line.split(" ");
			if (words.length === 1 || ctx.measureText(line).width <= maxWidth) {
				out.push(line);
				continue;
			}
			var curr = words[0];
			for (var i = 1; i < words.length; i++) {
				var test = curr + " " + words[i];
				if (ctx.measureText(test).width > maxWidth) {
					out.push(curr);
					curr = words[i];
				} else {
					curr = test;
				}
			}
			out.push(curr);
		}
		return out;
	}

	function posterFont(px) {
		return px + "px \"Copenhagen Grotesk\", system-ui, sans-serif";
	}

	function whenFontsReady(done) {
		if (document.fonts && document.fonts.ready) {
			document.fonts.ready.then(function () { done(); }).catch(function () { done(); });
		} else {
			done();
		}
	}

	function paintQueued(ctx, jobs, onDone) {
		var pending = 1;
		var finished = function () {
			pending--;
			if (pending <= 0) onDone();
		};
		var queueImage = function (src, x, y, w, h) {
			if (!src) return;
			pending++;
			var img = new Image();
			img.crossOrigin = "anonymous";
			img.onload = function () {
				ctx.drawImage(img, x, y, w || img.width, h || img.height);
				finished();
			};
			img.onerror = finished;
			img.src = src;
		};
		for (var i = 0; i < jobs.length; i++) {
			var j = jobs[i];
			queueImage(j.src, j.x, j.y, j.w, j.h);
		}
		finished();
	}

	function collectSpriteJobs() {
		var jobs = [];
		for (var g = 0; g <= TYPE_FAV; g++) {
			var maxT = g === BOTTOM_ROWS ? MAX_BOX : GENERATION_FAV;
			for (var t = 1; t <= maxT; t++) {
				var key = choices[g] && choices[g][t];
				if (!key) continue;
				var coords = getBoxCoords(g, t);
				jobs.push({ src: spriteUrl(key, g, t), x: coords.left, y: coords.top, w: 96, h: 96 });
				if (g === BOTTOM_ROWS && t === SPINDA_BOX) {
					jobs.push({ src: domlink + "spinda/" + spriteFile + "/SPINDA.png", x: coords.left, y: coords.top });
					var spots = ["spot1", "spot2", "spot3", "spot4"];
					for (var si = 0; si < spots.length; si++) {
						var st = getSpindaSpotStyle(spots[si]);
						jobs.push({ src: domlink + "spinda/" + spriteFile + "/" + spots[si] + ".png", x: st.left, y: st.top });
					}
					jobs.push({ src: domlink + "spinda/cover.png", x: coords.left, y: coords.top });
				}
			}
		}
		return jobs;
	}

	function drawPosterLabels(ctx) {
		ctx.textAlign = "center";
		ctx.textBaseline = "alphabetic";
		ctx.fillStyle = "#ffffff";
		ctx.font = posterFont(25);
		for (var i = 0; i < type_eles.length; i++) {
			var raw = translText(type_eles[i], type_order[i + 1] || type_eles[i]);
			var lines = wrapCanvasText(ctx, raw, 96);
			var start = lines.length > 1 ? 46 : 61;
			var cx = TYPE_LEFTS[i + 1] + 48;
			for (var p = 0; p < lines.length; p++) {
				ctx.fillStyle = "#000000";
				ctx.fillText(lines[p], cx + 2, start + 2);
				ctx.fillStyle = "#ffffff";
				ctx.fillText(lines[p], cx, start);
				start += 34;
			}
		}
		ctx.font = posterFont(27);
		ctx.fillText(translText("Team", "Team"), 240, 1245);
		var labelTops = { 1: 1132, 2: 1331, 3: 1530 };
		for (var c = 0; c < EXTRA_CATS.length; c++) {
			var cat = EXTRA_CATS[c];
			var box = getBoxCoords(BOTTOM_ROWS, cat.type);
			if (cat.custom && !choices[BOTTOM_ROWS][cat.type]) {
				ctx.fillStyle = "#000000";
				ctx.fillRect(box.left - 2, box.top - 2, 100, 100);
				ctx.fillStyle = "#ffffff";
				continue;
			}
			var caption = extraCaption(cat);
			if (!caption) continue;
			var pieces = wrapCanvasText(ctx, caption, 190);
			var row = cat.type <= 15 ? 1 : (cat.type <= 24 ? 2 : 3);
			var cx2 = box.left + 48;
			for (var pi = 0; pi < pieces.length; pi++) {
				var fragment = pieces[pieces.length - 1 - pi];
				ctx.fillText(fragment, cx2, 30 + labelTops[row] + 32 * (1 - pi));
			}
		}
	}

	function drawPoster(canvas, callback) {
		whenFontsReady(function () {
			canvas.width = 2276;
			canvas.height = 1770;
			var ctx = canvas.getContext("2d");
			var back = new Image();
			back.crossOrigin = "anonymous";
			back.onload = function () {
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.drawImage(back, 0, 0);
				paintQueued(ctx, collectSpriteJobs(), function () {
					drawPosterLabels(ctx);
					if (callback) callback(canvas);
				});
			};
			back.onerror = function () { if (callback) callback(canvas); };
			back.src = "./background4.png";
		});
	}

	function roundRect(ctx, x, y, w, h, r) {
		ctx.beginPath();
		ctx.moveTo(x + r, y);
		ctx.arcTo(x + w, y, x + w, y + h, r);
		ctx.arcTo(x + w, y + h, x, y + h, r);
		ctx.arcTo(x, y + h, x, y, r);
		ctx.arcTo(x, y, x + w, y, r);
		ctx.closePath();
	}

	var LIGHT_TYPE_CHIPS = {
		Normal: 1, Electric: 1, Ice: 1, Ground: 1, Steel: 1, Fairy: 1,
		Bug: 1, Flying: 1, Legendary: 1
	};

	function drawSpriteCard(ctx, x, y, w, h, jobs, src, lines, chipColor, lightChip) {
		ctx.fillStyle = "#fffdf8";
		roundRect(ctx, x, y, w, h, 16);
		ctx.fill();
		ctx.strokeStyle = "#e4dacb";
		ctx.lineWidth = 1;
		ctx.stroke();
		var sprite = 96;
		var sx = x + (w - sprite) / 2;
		var sy = y + 10;
		if (src) jobs.push({ src: src, x: sx, y: sy, w: sprite, h: sprite });
		var chipY = sy + sprite + 10;
		var text = (lines && lines[0]) ? lines[0] : "";
		if (chipColor) {
			ctx.fillStyle = chipColor;
			roundRect(ctx, x + 10, chipY, w - 20, 26, 13);
			ctx.fill();
			ctx.fillStyle = lightChip ? "#1d1916" : "#ffffff";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.font = posterFont(15);
			ctx.fillText(text, x + w / 2, chipY + 13);
		} else {
			ctx.fillStyle = "#1d1916";
			ctx.textAlign = "center";
			ctx.textBaseline = "alphabetic";
			ctx.font = posterFont(15);
			var ly = chipY + 16;
			for (var i = 0; i < (lines || []).length && i < 2; i++) {
				ctx.fillText(lines[i], x + w / 2, ly + i * 18);
			}
		}
	}

	function extraCardLabel(cat) {
		if (cat.custom) {
			var titled = getCookie(cat.id);
			if (titled && titled !== DEFAULT_CUSTOM) return titled;
			if (choices[BOTTOM_ROWS][cat.type]) return "Showcase";
			return translText(cat.id, "Custom");
		}
		return translText(cat.id, cat.id);
	}

	function typeDisplayName(type) {
		return String(translText(type_eles[type - 1], type_order[type] || "")).replace(/<br\s*\/?>/gi, " ");
	}

	function genDisplayName(gen) {
		return gen <= 9 ? "Gen " + gen : "Fav";
	}

	function genSectionTitle(gen) {
		return gen <= 9 ? "Generation " + gen : "All-time favorites";
	}

	function currentBrowseView() {
		try {
			if (localStorage.getItem("picker-browse-view") === "type") return "type";
		} catch (e) {}
		return "gen";
	}

	function drawMobileCard(canvas, callback) {
		whenFontsReady(function () {
			var W = 1080;
			var pad = 40;
			var headerH = 96;
			var gap = 12;
			var cols = 3;
			var cardW = Math.floor((W - pad * 2 - gap * (cols - 1)) / cols);
			var cardH = 148;
			var extraCardH = 168;
			var headingH = 52;
			var sectionGap = 28;
			var GEN_CHIP = "#efe6d8";
			var g, t, ei, cat, i, item;

			var browseView = currentBrowseView();
			var sections = [];
			if (browseView === "type") {
				for (t = 1; t <= GENERATION_FAV; t++) {
					var byType = [];
					for (g = 1; g <= TYPE_FAV; g++) {
						if (choices[g] && choices[g][t]) byType.push({ gen: g, type: t, key: choices[g][t] });
					}
					if (byType.length) sections.push({ title: typeDisplayName(t), filled: byType, chip: "gen" });
				}
			} else {
				for (g = 1; g <= TYPE_FAV; g++) {
					var byGen = [];
					for (t = 1; t <= GENERATION_FAV; t++) {
						if (choices[g] && choices[g][t]) byGen.push({ gen: g, type: t, key: choices[g][t] });
					}
					if (byGen.length) sections.push({ title: genSectionTitle(g), filled: byGen, chip: "type" });
				}
			}

			var extraFilled = [];
			for (ei = 0; ei < EXTRA_CATS.length; ei++) {
				cat = EXTRA_CATS[ei];
				if (cat.type === SPINDA_BOX) continue;
				if (choices[0] && choices[0][cat.type]) extraFilled.push(cat);
			}

			var y = headerH + 24;
			var sectionTops = [];
			for (i = 0; i < sections.length; i++) {
				sectionTops.push(y);
				y += headingH + Math.ceil(sections[i].filled.length / cols) * (cardH + gap) + sectionGap;
			}
			var teamTop = y;
			y += headingH + 2 * (cardH + gap) + sectionGap;
			var extrasTop = y;
			if (extraFilled.length) {
				y += headingH + Math.ceil(extraFilled.length / cols) * (extraCardH + gap);
			}
			y += pad;

			canvas.width = W;
			canvas.height = y;
			var ctx = canvas.getContext("2d");
			ctx.fillStyle = "#f3eee4";
			ctx.fillRect(0, 0, W, y);
			ctx.fillStyle = "#c5372f";
			ctx.fillRect(0, 0, W, headerH);
			ctx.fillStyle = "#ffffff";
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			ctx.font = posterFont(42);
			ctx.fillText("Favorite Picker", pad, headerH / 2);

			var jobs = [];
			for (i = 0; i < sections.length; i++) {
				var sec = sections[i];
				var top = sectionTops[i];
				ctx.textAlign = "left";
				ctx.textBaseline = "alphabetic";
				ctx.fillStyle = "#1d1916";
				ctx.font = posterFont(28);
				ctx.fillText(sec.title, pad, top + 30);
				for (var ci = 0; ci < sec.filled.length; ci++) {
					item = sec.filled[ci];
					var col = ci % cols;
					var row = Math.floor(ci / cols);
					var typeKey = type_order[item.type] || "";
					var useTypeChip = sec.chip === "type";
					drawSpriteCard(
						ctx,
						pad + col * (cardW + gap),
						top + headingH + row * (cardH + gap),
						cardW,
						cardH,
						jobs,
						spriteUrl(item.key, item.gen, item.type),
						[useTypeChip ? typeDisplayName(item.type) : genDisplayName(item.gen)],
						useTypeChip ? (TYPE_CHIP_COLORS[typeKey] || "#888") : GEN_CHIP,
						useTypeChip ? !!LIGHT_TYPE_CHIPS[typeKey] : true
					);
				}
			}

			ctx.textAlign = "left";
			ctx.textBaseline = "alphabetic";
			ctx.fillStyle = "#1d1916";
			ctx.font = posterFont(28);
			ctx.fillText(translText("Team", "Team of six"), pad, teamTop + 30);
			for (t = 1; t <= 6; t++) {
				var tcol = (t - 1) % cols;
				var trow = Math.floor((t - 1) / cols);
				var tk = choices[0] && choices[0][t];
				drawSpriteCard(
					ctx,
					pad + tcol * (cardW + gap),
					teamTop + headingH + trow * (cardH + gap),
					cardW,
					cardH,
					jobs,
					tk ? spriteUrl(tk, 0, t) : "",
					[String(t)],
					GEN_CHIP,
					true
				);
			}

			if (extraFilled.length) {
				ctx.fillStyle = "#1d1916";
				ctx.font = posterFont(28);
				ctx.textAlign = "left";
				ctx.fillText("More favorites", pad, extrasTop + 30);
				for (ei = 0; ei < extraFilled.length; ei++) {
					cat = extraFilled[ei];
					var ecol = ei % cols;
					var erow = Math.floor(ei / cols);
					var label = extraCardLabel(cat);
					ctx.font = posterFont(15);
					var bits = wrapCanvasText(ctx, String(label).replace(/\n/g, " "), cardW - 20);
					if (bits.length > 2) bits = [bits[0], bits.slice(1).join(" ")];
					drawSpriteCard(
						ctx,
						pad + ecol * (cardW + gap),
						extrasTop + headingH + erow * (extraCardH + gap),
						cardW,
						extraCardH - 8,
						jobs,
						spriteUrl(choices[0][cat.type], 0, cat.type),
						bits,
						null
					);
				}
			}

			paintQueued(ctx, jobs, function () {
				if (callback) callback(canvas);
			});
		});
	}

	// Expose globals for index.html backward compatibility
	global.zerogen_vers = zerogen_vers;
	global.domlink = domlink;
	global.type_order = type_order;
	global.gen_order = gen_order;
	global.type_eles = type_eles;
	global.other_order = other_order;
	global.BOTTOM_ROWS = BOTTOM_ROWS;
	global.TEAM_SLOTS = TEAM_SLOTS;
	global.ALCREMIE_MIN = ALCREMIE_MIN;
	global.ALCREMIE_MAX = ALCREMIE_MAX;
	global.SPINDA_BOX = SPINDA_BOX;
	global.GENERATION_FAV = GENERATION_FAV;
	global.TYPE_FAV = TYPE_FAV;
	global.MAX_BOX = MAX_BOX;
	global.STARTER_COLUMN = STARTER_COLUMN;
	global.MYSTERY_BOX = MYSTERY_BOX;
	global.DEFAULT_CUSTOM = DEFAULT_CUSTOM;
	global.filter_boxes = filter_boxes;
	global.cookie_names = cookie_names;
	global.swap = swap;
	global.spot_map = spot_map;
	global.choices = choices;
	global.spriteFile = spriteFile;

	global.PickerCore = {
		zerogen_vers: zerogen_vers,
		domlink: domlink,
		type_order: type_order,
		gen_order: gen_order,
		type_eles: type_eles,
		other_order: other_order,
		BOTTOM_ROWS: BOTTOM_ROWS,
		TEAM_SLOTS: TEAM_SLOTS,
		ALCREMIE_MIN: ALCREMIE_MIN,
		ALCREMIE_MAX: ALCREMIE_MAX,
		SPINDA_BOX: SPINDA_BOX,
		GENERATION_FAV: GENERATION_FAV,
		TYPE_FAV: TYPE_FAV,
		MAX_BOX: MAX_BOX,
		STARTER_COLUMN: STARTER_COLUMN,
		MYSTERY_BOX: MYSTERY_BOX,
		DEFAULT_CUSTOM: DEFAULT_CUSTOM,
		filter_boxes: filter_boxes,
		get choices() { return choices; },
		get spriteFile() { return spriteFile; },
		set spriteFile(v) { spriteFile = v; },
		get spindaSpots() { return spindaSpots; },
		resetChoices: resetChoices,
		getBoxCoords: getBoxCoords,
		getCookie: getCookie,
		setCookie: setCookie,
		deleteCookie: deleteCookie,
		getCookieName: getCookieName,
		updateZerogen: updateZerogen,
		serializeGrid: serializeGrid,
		deserializeGrid: deserializeGrid,
		saveToStorage: saveToStorage,
		loadFromStorage: loadFromStorage,
		writeCookieRow: writeCookieRow,
		writeSpindaCookieRow: writeSpindaCookieRow,
		isShiny: isShiny,
		setShiny: setShiny,
		getCandidates: getCandidates,
		calcTypes: calcTypes,
		monTooltip: monTooltip,
		spriteUrl: spriteUrl,
		applySpindaArray: applySpindaArray,
		randomSpindaValues: randomSpindaValues,
		getSpindaSpotStyle: getSpindaSpotStyle,
		drawPoster: drawPoster,
		drawMobileCard: drawMobileCard,
		cellKey: cellKey
	};

	// Keep choices in sync when index.html mutates global choices
	Object.defineProperty(global, "choices", {
		get: function () { return choices; },
		set: function (v) { choices = v; },
		configurable: true
	});
	Object.defineProperty(global, "spriteFile", {
		get: function () { return spriteFile; },
		set: function (v) { spriteFile = v; },
		configurable: true
	});

})(typeof window !== "undefined" ? window : this);
