/**
 * Mobile picker UI — type-first layout on top of PickerCore.
 */
var MobilePicker = (function () {
	"use strict";

	var PC = PickerCore;
	var choices = PC.choices;
	var selecting = null;
	var teamSelect = false;
	var filterState = null;
	var toppings = false;
	var shinyMode = false;
	var sheetShiny = false;
	var sheetCandidates = [];
	var sheetFiltered = [];
	var browseView = "gen";
	var selectedType = 1;
	var selectedGen = 1;
	var spindaBuilt = false;
	var VIEW_KEY = "picker-browse-view";
	var posterBlob = null;
	var posterCache = { poster: null, card: null };
	var posterDirty = true;
	var posterTimer = null;
	var exportFormat = "poster";
	var EXPORT_KEY = "picker-export-format";

	var BOTTOM = PC.BOTTOM_ROWS;
	var TYPE_FAV = PC.TYPE_FAV;
	var GEN_FAV = PC.GENERATION_FAV;
	var MAX_BOX = PC.MAX_BOX;
	var ALCREMIE_MIN = PC.ALCREMIE_MIN;
	var ALCREMIE_MAX = PC.ALCREMIE_MAX;
	var SPINDA_BOX = PC.SPINDA_BOX;
	var TEAM = PC.TEAM_SLOTS;
	var FILTER_BOXES = PC.filter_boxes;

	var LIGHT_TYPES = {
		Normal: 1, Electric: 1, Ice: 1, Ground: 1, Steel: 1, Fairy: 1,
		Bug: 1, Flying: 1, Legendary: 1
	};

	var TYPE_COLORS = {
		Normal: "#A8A878", Fire: "#F08030", Water: "#6890F0", Grass: "#78C850",
		Electric: "#F8D030", Ice: "#98D8D8", Fighting: "#C03028", Poison: "#A040A0",
		Ground: "#E0C068", Flying: "#A890F0", Psychic: "#F85888", Bug: "#A8B820",
		Rock: "#B8A038", Ghost: "#705898", Dragon: "#7038F8", Dark: "#705848",
		Steel: "#B8B8D0", Fairy: "#EE99AC", Starter: "#4caf50", Gimmick: "#8e24aa",
		Legendary: "#f9a825", Favorite: "#c5372f"
	};

	var EXTRA_DEFS = [
		{ type: 7, id: "Custom1", label: "Custom 1", custom: true },
		{ type: 8, id: "Bird", label: "Regional Bird" },
		{ type: 9, id: "Mammal", label: "Regional Mammal" },
		{ type: 10, id: "RegionBug", label: "Regional Bug" },
		{ type: 11, id: "GrassGirl", label: "Grass Girl" },
		{ type: 12, id: "PseudoLegend", label: "Pseudo Legend" },
		{ type: 13, id: "Fossil", label: "Fossil" },
		{ type: 14, id: "MysteryDungeon", label: "Mystery Dungeon" },
		{ type: 15, id: "Baby", label: "Baby" },
		{ type: 16, id: "Custom2", label: "Custom 2", custom: true },
		{ type: 17, id: "BoxLegendary", label: "Box Legendary" },
		{ type: 18, id: "Mythical", label: "Mythical" },
		{ type: 19, id: "MegaEvo", label: "Mega Evolution" },
		{ type: 20, id: "UltraBeast", label: "Ultra Beast" },
		{ type: 21, id: "Gigantamax", label: "Gigantamax" },
		{ type: 22, id: "Paradox", label: "Paradox" },
		{ type: 23, id: "RegionalForm", label: "Regional Form" },
		{ type: 24, id: "NewEvolution", label: "New Evolution" },
		{ type: 25, id: "Custom3", label: "Custom 3", custom: true },
		{ type: 26, id: "Type", label: "Type" },
		{ type: 27, id: "Pokeball", label: "Poké Ball" },
		{ type: 28, id: "PikachuClone", label: "Pikachu Clone" },
		{ type: 29, id: "Eeveelution", label: "Eeveelution" },
		{ type: 31, id: "Vivillon", label: "Vivillon" },
		{ type: 32, id: "Furfrou", label: "Furfrou" },
		{ type: 33, id: "Alcremie", label: "Alcremie" }
	];

	function $(id) { return document.getElementById(id); }

	function prettyName(key) {
		if (!key) return "";
		try {
			return keyToMonData(key).form_data.name;
		} catch (e) {
			return key.replace(/_/g, " ");
		}
	}

	function cellLabel(gen, type) {
		if (gen >= 1 && gen <= 9) return "Gen " + gen + " " + type_order[type];
		if (gen === TYPE_FAV && type === GEN_FAV) return "Ultimate Favorite";
		if (gen === TYPE_FAV) return "Favorite " + type_order[type];
		if (type === GEN_FAV) return "Gen " + gen + " Favorite";
		for (var i = 0; i < EXTRA_DEFS.length; i++) {
			if (EXTRA_DEFS[i].type === type) return EXTRA_DEFS[i].label;
		}
		return other_order[type] || ("Box " + type);
	}

	function customizeLabel(ele) {
		var str = prompt("Pick a title for this box:");
		if (!str) str = (typeof customizeTransl === "function") ? customizeTransl() : "Custom";
		ele.textContent = str;
		if (str === PC.DEFAULT_CUSTOM) PC.deleteCookie(ele.id);
		else PC.setCookie(ele.id, str);
	}

	function setBanner(text) {
		var el = $("status-banner");
		if (!text) {
			el.hidden = true;
			el.textContent = "";
			return;
		}
		el.hidden = false;
		el.textContent = text;
	}

	function updateStatus() {
		if (shinyMode) {
			setBanner("Shiny mode on — tap a filled Pokémon to toggle shiny.");
		} else if (teamSelect && selecting) {
			setBanner("Tap any picked Pokémon to copy it to Team " + selecting[1] + ".");
		} else {
			setBanner("");
		}
	}

	function countFilled() {
		var n = 0;
		var total = 0;
		for (var g = 1; g <= TYPE_FAV; g++) {
			for (var t = 1; t <= GEN_FAV; t++) {
				total++;
				if (choices[g] && choices[g][t]) n++;
			}
		}
		return { n: n, total: total };
	}

	function updateProgress() {
		var c = countFilled();
		$("progress-label").textContent = c.n + " / " + c.total + " filled";
		$("progress-fill").style.width = Math.round((c.n / c.total) * 100) + "%";
	}

	function syncHeaderHeight() {
		var h = $("mobile-header");
		if (h) document.documentElement.style.setProperty("--header-h", h.offsetHeight + "px");
	}

	function genTitle(g) {
		return g <= 9 ? "Generation " + g : "All-time favorites";
	}

	function typeKey(t) {
		return type_order[t] || "";
	}

	function setBrowseView(view) {
		browseView = view === "type" ? "type" : "gen";
		try { localStorage.setItem(VIEW_KEY, browseView); } catch (e) {}
		$("view-gen").classList.toggle("selected", browseView === "gen");
		$("view-type").classList.toggle("selected", browseView === "type");
		$("view-gen").setAttribute("aria-selected", browseView === "gen" ? "true" : "false");
		$("view-type").setAttribute("aria-selected", browseView === "type" ? "true" : "false");
		renderAxisRail();
		renderPickColumn();
		syncHeaderHeight();
	}

	function renderAxisRail() {
		var rail = $("axis-rail");
		rail.innerHTML = "";
		if (browseView === "type") {
			for (var t = 1; t <= 22; t++) {
				var key = typeKey(t);
				var chip = document.createElement("button");
				chip.type = "button";
				chip.className = "type-chip" + (LIGHT_TYPES[key] ? " light" : "");
				chip.dataset.key = key;
				chip.dataset.type = String(t);
				chip.textContent = key;
				if (t === selectedType) chip.classList.add("selected");
				chip.addEventListener("click", (function (typeIndex) {
					return function () { selectType(typeIndex); };
				})(t));
				rail.appendChild(chip);
			}
		} else {
			for (var g = 1; g <= TYPE_FAV; g++) {
				var chipG = document.createElement("button");
				chipG.type = "button";
				chipG.className = "type-chip gen-chip";
				chipG.dataset.gen = String(g);
				chipG.textContent = g <= 9 ? "Gen " + g : "Fav";
				if (g === selectedGen) chipG.classList.add("selected");
				chipG.addEventListener("click", (function (genIndex) {
					return function () { selectGen(genIndex); };
				})(g));
				rail.appendChild(chipG);
			}
		}
	}

	function selectType(typeIndex) {
		selectedType = typeIndex;
		var chips = document.querySelectorAll("#axis-rail .type-chip");
		for (var i = 0; i < chips.length; i++) {
			chips[i].classList.toggle("selected", parseInt(chips[i].dataset.type, 10) === selectedType);
		}
		var selectedChip = document.querySelector('#axis-rail .type-chip[data-type="' + selectedType + '"]');
		if (selectedChip) selectedChip.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
		renderPickColumn();
	}

	function selectGen(genIndex) {
		selectedGen = genIndex;
		var chips = document.querySelectorAll("#axis-rail .gen-chip");
		for (var i = 0; i < chips.length; i++) {
			chips[i].classList.toggle("selected", parseInt(chips[i].dataset.gen, 10) === selectedGen);
		}
		var selectedChip = document.querySelector('#axis-rail .gen-chip[data-gen="' + selectedGen + '"]');
		if (selectedChip) selectedChip.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
		renderPickColumn();
	}

	function renderPickColumn() {
		var wrap = $("pick-column");
		wrap.className = "pick-grid" + (browseView === "type" ? " pick-grid-gens" : " pick-grid-types");
		wrap.innerHTML = "";
		if (browseView === "type") {
			$("column-title").textContent = typeKey(selectedType);
			$("teamInstructions").textContent = "Fill this type across every generation, then move on.";
			for (var g = 1; g <= TYPE_FAV; g++) {
				wrap.appendChild(makePickCard(g, selectedType));
			}
		} else {
			$("column-title").textContent = genTitle(selectedGen);
			$("teamInstructions").textContent = "Fill every type in this generation, then move on.";
			for (var t = 1; t <= 22; t++) {
				wrap.appendChild(makePickCard(selectedGen, t));
			}
		}
	}

	function makePickCard(gen, type) {
		var btn = document.createElement("button");
		btn.type = "button";
		btn.className = "pick-box grid-cell";
		btn.dataset.gen = gen;
		btn.dataset.type = type;
		btn.setAttribute("aria-label", cellLabel(gen, type));

		var well = document.createElement("div");
		well.className = "sprite-well";
		var img = document.createElement("img");
		img.alt = "";
		well.appendChild(img);

		var chip = document.createElement("span");
		chip.className = "pick-chip";
		if (browseView === "type") {
			chip.classList.add("gen-chip");
			chip.textContent = gen <= 9 ? "Gen " + gen : "Fav";
		} else {
			var key = typeKey(type);
			chip.dataset.key = key;
			chip.textContent = key;
			if (LIGHT_TYPES[key]) chip.classList.add("light");
			chip.style.background = TYPE_COLORS[key] || "#888";
		}

		btn.appendChild(well);
		btn.appendChild(chip);
		btn.addEventListener("click", function () { onCellClick(gen, type); });
		paintCell(btn);
		return btn;
	}

	function paintCell(el) {
		var gen = parseInt(el.dataset.gen, 10);
		var type = parseInt(el.dataset.type, 10);
		var key = choices[gen] && choices[gen][type];
		var img = el.querySelector("img");
		var picking = selecting && selecting[0] === gen && selecting[1] === type;
		el.classList.toggle("picking", !!picking);
		if (!key) {
			el.classList.add("empty");
			if (img) img.removeAttribute("src");
			return;
		}
		el.classList.remove("empty");
		if (img) img.src = PC.spriteUrl(key, gen, type);
	}

	function paintSmallCell(el) {
		var gen = parseInt(el.dataset.gen, 10);
		var type = parseInt(el.dataset.type, 10);
		var key = choices[gen] && choices[gen][type];
		var img = el.querySelector("img");
		el.classList.toggle("picking", !!(selecting && selecting[0] === gen && selecting[1] === type));
		if (!key) {
			el.classList.add("empty");
			if (img) img.removeAttribute("src");
			return;
		}
		el.classList.remove("empty");
		if (img) img.src = PC.spriteUrl(key, gen, type);
	}

	function renderTeam() {
		var wrap = $("team-cells");
		wrap.innerHTML = "";
		for (var t = 1; t <= TEAM; t++) {
			var btn = document.createElement("button");
			btn.type = "button";
			btn.className = "team-slot grid-cell";
			btn.dataset.gen = BOTTOM;
			btn.dataset.type = t;
			btn.setAttribute("aria-label", "Team " + t);
			var well = document.createElement("div");
			well.className = "sprite-well";
			var img = document.createElement("img");
			img.alt = "";
			well.appendChild(img);
			var lab = document.createElement("span");
			lab.className = "slot-label";
			lab.textContent = t;
			btn.appendChild(well);
			btn.appendChild(lab);
			btn.addEventListener("click", (function (slot) {
				return function () { onCellClick(BOTTOM, slot); };
			})(t));
			paintSmallCell(btn);
			wrap.appendChild(btn);
		}
	}

	function renderExtras() {
		var wrap = $("extras-cells");
		wrap.innerHTML = "";
		for (var i = 0; i < EXTRA_DEFS.length; i++) {
			var def = EXTRA_DEFS[i];
			var btn = document.createElement("button");
			btn.type = "button";
			btn.className = "extra-card grid-cell";
			btn.dataset.gen = BOTTOM;
			btn.dataset.type = def.type;
			btn.setAttribute("aria-label", def.label);
			var well = document.createElement("div");
			well.className = "sprite-well";
			var img = document.createElement("img");
			img.alt = "";
			well.appendChild(img);
			var lab = document.createElement("span");
			lab.className = "extra-label" + (def.custom ? " clickable" : "");
			lab.id = def.id;
			lab.textContent = def.label;
			if (def.custom) {
				lab.addEventListener("click", function (ev) {
					ev.stopPropagation();
					customizeLabel(this);
				});
			}
			btn.appendChild(well);
			btn.appendChild(lab);
			btn.addEventListener("click", (function (type) {
				return function () { onCellClick(BOTTOM, type); };
			})(def.type));
			paintSmallCell(btn);
			wrap.appendChild(btn);
		}
	}

	function updateSpindaPreview() {
		var prev = $("spinda-preview");
		if (!prev.childElementCount) {
			var layers = [
				{ id: "mob-spinda2", src: "./spinda/Front/SPINDA.png" },
				{ id: "mob-spot1", src: "./spinda/Front/spot1.png", spot: "spot1" },
				{ id: "mob-spot2", src: "./spinda/Front/spot2.png", spot: "spot2" },
				{ id: "mob-spot3", src: "./spinda/Front/spot3.png", spot: "spot3" },
				{ id: "mob-spot4", src: "./spinda/Front/spot4.png", spot: "spot4" },
				{ id: "mob-cover", src: "./spinda/cover.png" }
			];
			for (var i = 0; i < layers.length; i++) {
				var im = document.createElement("img");
				im.id = layers[i].id;
				im.src = layers[i].src;
				im.alt = "";
				if (layers[i].spot) im.dataset.spot = layers[i].spot;
				prev.appendChild(im);
			}
		}
		var sf = PC.spriteFile === "Shiny" || PC.isShiny(BOTTOM, SPINDA_BOX) ? "Shiny" : "Front";
		$("mob-spinda2").src = "./spinda/" + sf + "/SPINDA.png";
		["spot1", "spot2", "spot3", "spot4"].forEach(function (sn) {
			var im = document.querySelector('img[data-spot="' + sn + '"]');
			if (!im) return;
			im.src = "./spinda/" + sf + "/" + sn + ".png";
			var st = PC.getSpindaSpotStyle(sn);
			im.style.left = (st.left - 1489) + "px";
			im.style.top = (st.top - 1608) + "px";
		});
	}

	function renderSpindaControls() {
		if (spindaBuilt) {
			["spot1", "spot2", "spot3", "spot4"].forEach(function (sn) {
				["x", "y"].forEach(function (axis) {
					var val = document.getElementById("val-" + sn + "-" + axis);
					if (val) val.textContent = PC.spindaSpots[sn][axis];
				});
			});
			updateSpindaPreview();
			return;
		}
		var ctrl = $("spinda-controls");
		ctrl.innerHTML = "";
		var spots = ["spot1", "spot2", "spot3", "spot4"];
		var titles = ["Top left", "Top right", "Bottom left", "Bottom right"];
		for (var s = 0; s < spots.length; s++) {
			var sn = spots[s];
			var card = document.createElement("div");
			card.className = "spot-card";
			card.innerHTML = "<strong>" + titles[s] + "</strong>";
			["x", "y"].forEach(function (axis) {
				var row = document.createElement("div");
				row.className = "spot-row";
				row.appendChild(document.createTextNode(axis === "x" ? "Left / right" : "Down / up"));
				var stepper = document.createElement("div");
				stepper.className = "stepper";
				var minus = document.createElement("button");
				minus.type = "button";
				minus.textContent = "−";
				var val = document.createElement("span");
				val.id = "val-" + sn + "-" + axis;
				val.textContent = PC.spindaSpots[sn][axis];
				var plus = document.createElement("button");
				plus.type = "button";
				plus.textContent = "+";
				minus.addEventListener("click", nudge(sn, axis, -1));
				plus.addEventListener("click", nudge(sn, axis, 1));
				stepper.appendChild(minus);
				stepper.appendChild(val);
				stepper.appendChild(plus);
				row.appendChild(stepper);
				card.appendChild(row);
			});
			ctrl.appendChild(card);
		}
		spindaBuilt = true;
		updateSpindaPreview();
	}

	function nudge(spot, axis, delta) {
		return function () {
			var next = (PC.spindaSpots[spot][axis] || 0) + delta;
			if (next < 0) next = 0;
			if (next > 16) next = 16;
			PC.spindaSpots[spot][axis] = next;
			document.getElementById("val-" + spot + "-" + axis).textContent = next;
			updateSpindaPreview();
			PC.writeSpindaCookieRow();
			PC.saveToStorage();
			markPosterDirty();
		};
	}

	function refreshCells() {
		choices = PC.choices;
		document.querySelectorAll(".grid-cell").forEach(function (el) {
			if (el.classList.contains("pick-box") || el.classList.contains("gen-pick")) paintCell(el);
			else paintSmallCell(el);
		});
		updateProgress();
		updateStatus();
		updateSpindaPreview();
	}

	function onCellClick(gen, type) {
		if (shinyMode) {
			if (choices[gen][type]) {
				PC.setShiny(gen, type, !PC.isShiny(gen, type));
				PC.saveToStorage();
				markPosterDirty();
				refreshCells();
			}
			return;
		}
		if (teamSelect && selecting) {
			if (!(choices[gen] && choices[gen][type])) return;
			choices[selecting[0]][selecting[1]] = choices[gen][type];
			PC.setShiny(selecting[0], selecting[1], PC.isShiny(gen, type));
			teamSelect = false;
			selecting = null;
			PC.writeCookieRow(BOTTOM);
			PC.saveToStorage();
			markPosterDirty();
			refreshCells();
			return;
		}
		if (gen === BOTTOM && type <= TEAM) {
			if (selecting && selecting[0] === gen && selecting[1] === type) {
				selecting = null;
				teamSelect = false;
				refreshCells();
				return;
			}
			teamSelect = true;
			selecting = [gen, type];
			refreshCells();
			return;
		}
		selecting = [gen, type];
		filterState = (gen === BOTTOM && FILTER_BOXES.indexOf(type) >= 0) ? [] : null;
		toppings = false;
		openSheet();
	}

	function metaLabel(key) {
		if (key && key.indexOf("gen") === 0 && key.length === 4) return "Gen " + key.charAt(3);
		return key;
	}

	function sheetTitle() {
		if (filterState && filterState.length === 0) return "Pick a type";
		if (filterState && filterState.length === 1) return "Pick a generation";
		if (toppings) return "Pick a topping";
		return cellLabel(selecting[0], selecting[1]);
	}

	function sheetStep() {
		if (filterState && filterState.length === 0) return "Custom box — first choose a type.";
		if (filterState && filterState.length === 1) return filterState[0] + " — now choose a generation.";
		if (toppings) return "Now choose a sweet garnish.";
		return "";
	}

	function openSheet() {
		var gen = selecting[0];
		var type = selecting[1];
		sheetShiny = PC.isShiny(gen, type);
		sheetCandidates = buildCandidates();
		sheetFiltered = sheetCandidates.slice();
		$("sheet-title").textContent = sheetTitle();
		var step = sheetStep();
		$("sheet-step").hidden = !step;
		$("sheet-step").textContent = step;
		$("sheet-search").value = "";
		$("sheet-shiny").classList.toggle("active", sheetShiny);
		renderSheetGrid();
		$("sheet-backdrop").classList.add("open");
		var sheet = $("picker-sheet");
		sheet.classList.add("open");
		sheet.setAttribute("aria-hidden", "false");
		sheet.removeAttribute("inert");
		document.body.classList.add("sheet-open");
		refreshCells();
	}

	function buildCandidates() {
		var gen = selecting[0];
		var type = selecting[1];
		var list = PC.getCandidates(gen, type, filterState, toppings) || [];
		var typeScores = null;
		if (gen === BOTTOM && other_order[type] === "Types") {
			typeScores = PC.calcTypes()[1];
		}
		var out = [];
		for (var i = 0; i < list.length; i++) {
			var key = list[i];
			if (!key) continue;
			var isFilterMeta = filterState && filterState.length <= 1
				&& (type_order.indexOf(key) >= 0 || gen_order.indexOf(key) >= 0);
			out.push({
				key: key,
				label: isFilterMeta ? metaLabel(key) : PC.monTooltip(key, gen, type, typeScores, toppings),
				isMeta: !!isFilterMeta
			});
		}
		return out;
	}

	function renderSheetGrid() {
		var grid = $("picker-grid");
		grid.innerHTML = "";
		$("empty-search").hidden = sheetFiltered.length > 0;
		if (!selecting) return;
		var cur = choices[selecting[0]][selecting[1]];

		for (var i = 0; i < sheetFiltered.length; i++) {
			(function (idx) {
				var item = sheetFiltered[idx];
				var btn = document.createElement("button");
				btn.type = "button";
				btn.className = "picker-option" + (item.isMeta ? " meta" : "");
				if (item.key === cur) btn.classList.add("selected");
				if (item.isMeta) {
					btn.textContent = item.label;
				} else {
					var img = document.createElement("img");
					img.alt = item.label;
					var sf = sheetShiny ? "Shiny" : "Front";
					try {
						var md = keyToMonData(item.key);
						if (md.mon.grid_img && selecting[1] !== other_order.indexOf("PokeBall")) {
							img.src = "./grid/" + item.key + ".png";
						} else {
							img.src = "./" + sf + "/" + item.key + ".png";
						}
						btn.appendChild(img);
						var cap = document.createElement("span");
						cap.textContent = item.label;
						btn.appendChild(cap);
					} catch (e) {
						btn.textContent = item.label || item.key;
					}
				}
				btn.addEventListener("click", function () { pickFromSheet(idx); });
				grid.appendChild(btn);
			})(i);
		}
	}

	function pickFromSheet(idx) {
		var item = sheetFiltered[idx];
		var gen = selecting[0];
		var type = selecting[1];

		if (filterState !== null && item.isMeta) {
			filterState.push(item.key);
			sheetCandidates = buildCandidates();
			sheetFiltered = sheetCandidates.slice();
			$("sheet-title").textContent = sheetTitle();
			var step = sheetStep();
			$("sheet-step").hidden = !step;
			$("sheet-step").textContent = step;
			$("sheet-search").value = "";
			renderSheetGrid();
			return;
		}

		if (filterState !== null && filterState.length >= 2) {
			filterState = null;
		}

		if (choices[gen][type] === item.key && !toppings) {
			choices[gen][type] = "";
			PC.setShiny(gen, type, false);
		} else {
			choices[gen][type] = item.key;
			PC.setShiny(gen, type, sheetShiny);
		}

		if (gen === BOTTOM && type === ALCREMIE_MIN && !toppings && item.key !== "ALCREMIE_70") {
			toppings = true;
			var baseList = PC.getCandidates(gen, ALCREMIE_MIN, null, false) || [];
			var pickIdx = baseList.indexOf(item.key);
			if (pickIdx < 0) pickIdx = idx;
			selecting[1] = ALCREMIE_MIN + 1 + pickIdx;
			filterState = null;
			sheetCandidates = buildCandidates();
			sheetFiltered = sheetCandidates.slice();
			$("sheet-title").textContent = sheetTitle();
			$("sheet-step").hidden = false;
			$("sheet-step").textContent = sheetStep();
			renderSheetGrid();
			return;
		}

		filterState = null;
		toppings = false;
		PC.writeCookieRow(gen);
		PC.saveToStorage();
		markPosterDirty();
		closeSheet();
	}

	function clearCurrentCell() {
		if (!selecting) return;
		var gen = selecting[0];
		var type = selecting[1];
		choices[gen][type] = "";
		PC.setShiny(gen, type, false);
		PC.writeCookieRow(gen);
		PC.saveToStorage();
		markPosterDirty();
		closeSheet();
	}

	function hideSheet(fully) {
		$("sheet-backdrop").classList.remove("open");
		var sheet = $("picker-sheet");
		sheet.classList.remove("open");
		sheet.setAttribute("aria-hidden", "true");
		sheet.setAttribute("inert", "");
		document.body.classList.remove("sheet-open");
		$("picker-grid").innerHTML = "";
		if (fully) {
			selecting = null;
			teamSelect = false;
			filterState = null;
			toppings = false;
		}
	}

	function closeSheet() {
		hideSheet(true);
		refreshCells();
	}

	function filterSheet() {
		var q = $("sheet-search").value.toLowerCase().trim();
		sheetFiltered = !q ? sheetCandidates.slice() : sheetCandidates.filter(function (item) {
			return item.label.toLowerCase().indexOf(q) >= 0 || item.key.toLowerCase().indexOf(q) >= 0;
		});
		renderSheetGrid();
	}

	function toggleSheetShiny() {
		sheetShiny = !sheetShiny;
		$("sheet-shiny").classList.toggle("active", sheetShiny);
		renderSheetGrid();
	}

	function toggleShinyMode() {
		shinyMode = !shinyMode;
		if (shinyMode) {
			teamSelect = false;
			selecting = null;
			closeSheetQuiet();
		}
		$("btnShinyMode").classList.toggle("active", shinyMode);
		updateStatus();
	}

	function closeSheetQuiet() {
		hideSheet(false);
	}

	function exportCode() {
		$("import").value = PC.serializeGrid(true);
	}

	function importCode() {
		PC.deserializeGrid($("import").value, true);
		choices = PC.choices;
		renderPickColumn();
		refreshCells();
		markPosterDirty();
	}

	function resetGrid() {
		if (!confirm(getTranslString("gridConfirm") || "Reset all choices?")) return;
		for (var c in cookie_names) PC.deleteCookie(cookie_names[c]);
		try {
			localStorage.removeItem("picker-grid-v1");
			localStorage.removeItem("picker-shiny-mode");
			localStorage.removeItem("picker-spinda-spots");
		} catch (e) {}
		PC.resetChoices();
		choices = PC.choices;
		renderPickColumn();
		refreshCells();
		markPosterDirty();
	}

	function randomSpinda() {
		PC.randomSpindaValues();
		choices = PC.choices;
		spindaBuilt = false;
		renderSpindaControls();
		refreshCells();
		markPosterDirty();
	}

	function canSharePosterFile() {
		if (!navigator.share || !navigator.canShare || typeof File === "undefined") return false;
		try {
			var probe = new File(["x"], "pokemon-picker.png", { type: "image/png" });
			return navigator.canShare({ files: [probe] });
		} catch (e) {
			return false;
		}
	}

	function exportFileName() {
		return exportFormat === "card" ? "pokemon-picker-phone.png" : "pokemon-picker.png";
	}

	function setExportFormat(fmt) {
		exportFormat = fmt === "card" ? "card" : "poster";
		try { localStorage.setItem(EXPORT_KEY, exportFormat); } catch (e) {}
		$("export-poster").classList.toggle("selected", exportFormat === "poster");
		$("export-card").classList.toggle("selected", exportFormat === "card");
		$("export-poster").setAttribute("aria-selected", exportFormat === "poster" ? "true" : "false");
		$("export-card").setAttribute("aria-selected", exportFormat === "card" ? "true" : "false");
		$("btnShare").textContent = exportFormat === "card" ? "Share card" : "Share poster";
		if (posterCache[exportFormat] && !posterDirty) posterBlob = posterCache[exportFormat];
	}

	function markPosterDirty() {
		posterDirty = true;
		posterCache.poster = null;
		posterCache.card = null;
		posterBlob = null;
		if (posterTimer) clearTimeout(posterTimer);
		posterTimer = setTimeout(warmPoster, 1200);
	}

	function warmPoster() {
		if (!posterDirty) return;
		paintPoster(function () {});
	}

	function blobFromCanvas(canvas, done) {
		if (canvas.toBlob) {
			canvas.toBlob(function (blob) { done(blob || null); }, "image/png");
			return;
		}
		try {
			var data = canvas.toDataURL("image/png");
			var bin = atob(data.split(",")[1] || "");
			var bytes = new Uint8Array(bin.length);
			for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
			done(new Blob([bytes], { type: "image/png" }));
		} catch (e) {
			done(null);
		}
	}

	function paintPoster(done) {
		var fmt = exportFormat;
		var canvas = fmt === "card" ? $("card-canvas") : $("export-canvas");
		var draw = fmt === "card" ? PC.drawMobileCard : PC.drawPoster;
		draw(canvas, function () {
			blobFromCanvas(canvas, function (blob) {
				if (blob) {
					posterCache[fmt] = blob;
					posterBlob = blob;
					posterDirty = false;
				}
				done(blob || null);
			});
		});
	}

	function saveBlob(blob) {
		var url = URL.createObjectURL(blob);
		var link = $("downloader");
		link.href = url;
		link.download = exportFileName();
		link.click();
		setTimeout(function () { URL.revokeObjectURL(url); }, 2500);
	}

	function shareBlob(blob, done) {
		if (!blob) {
			if (done) done();
			return;
		}
		if (typeof File !== "undefined" && navigator.share && navigator.canShare) {
			try {
				var file = new File([blob], exportFileName(), { type: "image/png" });
				if (navigator.canShare({ files: [file] })) {
					navigator.share({
						files: [file],
						title: "Favorite Pokémon Picker",
						text: exportFormat === "card" ? "My favorite Pokémon card" : "My favorite Pokémon grid"
					}).then(function () {
						if (done) done();
					}).catch(function (err) {
						if (!(err && err.name === "AbortError")) saveBlob(blob);
						if (done) done();
					});
					return;
				}
			} catch (e) {}
		}
		saveBlob(blob);
		if (done) done();
	}

	function withPoster(action) {
		var btnShare = $("btnShare");
		var btnSave = $("btnPrint");
		var labelShare = btnShare.textContent;
		var labelSave = btnSave.textContent;
		btnShare.disabled = true;
		btnSave.disabled = true;
		btnShare.textContent = "Painting…";
		btnSave.textContent = "Painting…";
		var restore = function () {
			btnShare.disabled = false;
			btnSave.disabled = false;
			btnShare.textContent = labelShare;
			btnSave.textContent = labelSave;
		};
		if (posterCache[exportFormat] && !posterDirty) {
			action(posterCache[exportFormat], function () {});
			return;
		}
		paintPoster(function (blob) {
			if (!blob) {
				restore();
				return;
			}
			action(blob, restore);
		});
	}

	function sharePoster() {
		withPoster(function (blob, done) { shareBlob(blob, done); });
	}

	function saveImage() {
		withPoster(function (blob, done) {
			saveBlob(blob);
			done();
		});
	}

	function initLangMode() {
		var params = new URL(location).searchParams;
		var langCode = params.get("lang");
		var modeCode = params.get("mode");
		if (langCode) {
			changeLang(langCode);
			$("language-select").value = lang_code[currentLang];
		}
		if (modeCode) {
			MODE.SITE = Number(modeCode);
			remodeArrays();
			$("mode-select").value = MODE.SITE;
		}
		var customs = ["Custom1", "Custom2", "Custom3"];
		for (var i = 0; i < customs.length; i++) {
			var alt = PC.getCookie(customs[i]);
			if (alt) {
				var el = document.getElementById(customs[i]);
				if (el) el.textContent = alt;
			}
		}
	}

	function init() {
		window.getCookie = PC.getCookie;
		window.setCookie = PC.setCookie;
		window.deleteCookie = PC.deleteCookie;
		PC.loadFromStorage();
		choices = PC.choices;
		try {
			var storedView = localStorage.getItem(VIEW_KEY);
			if (storedView === "type" || storedView === "gen") browseView = storedView;
		} catch (e) {}
		$("view-gen").classList.toggle("selected", browseView === "gen");
		$("view-type").classList.toggle("selected", browseView === "type");
		$("view-gen").setAttribute("aria-selected", browseView === "gen" ? "true" : "false");
		$("view-type").setAttribute("aria-selected", browseView === "type" ? "true" : "false");
		renderAxisRail();
		renderPickColumn();
		renderTeam();
		renderExtras();
		renderSpindaControls();
		initLangMode();
		refreshCells();
		syncHeaderHeight();
		if (!canSharePosterFile()) document.body.classList.add("no-file-share");
		try {
			var storedFmt = localStorage.getItem(EXPORT_KEY);
			if (storedFmt === "card" || storedFmt === "poster") setExportFormat(storedFmt);
		} catch (e) {}
		window.addEventListener("resize", syncHeaderHeight);
		document.addEventListener("keydown", function (ev) {
			if (ev.key === "Escape") closeSheet();
		});
		markPosterDirty();
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}

	return {
		onCellClick: onCellClick,
		openSheet: openSheet,
		closeSheet: closeSheet,
		filterSheet: filterSheet,
		toggleSheetShiny: toggleSheetShiny,
		toggleShinyMode: toggleShinyMode,
		clearCurrentCell: clearCurrentCell,
		exportCode: exportCode,
		importCode: importCode,
		resetGrid: resetGrid,
		randomSpinda: randomSpinda,
		sharePoster: sharePoster,
		saveImage: saveImage,
		downloadImage: saveImage,
		setExportFormat: setExportFormat,
		setBrowseView: setBrowseView,
		refreshAll: refreshCells
	};
})();
