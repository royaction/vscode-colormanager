	/*

		TODO: HWB support
		TODO: RGB + HSL CSS Color Module Level 4 support. Aber nur Erkennung und Einfügen (innerhalb der Extension alles wie gehabt mit Kommas)

		Grundlegende Funktionsweise:
		----------------------------

		Info! Die Funktionsweise wirkt etwas umständlich, das liegt aber daran dass vscode den Inhalt von sidebar-webviews komplett zerstört sobald diese ausgeblendet
		werden (wird gemacht um Speicher zu sparen). Um ein persistentes Verhalten zu simulieren müssen daher alle Änderungen innerhalb des webviews gespeichert werden
		und bei erneutem Anzeigen wieder geladen werden (z.B. Scroll-Position, Picker-Status usw.)

		Webview anzeigen: Die extension.js erstellt das webview unter "webview_create_html()". Daraufhin wird die main.js geladen. Sobald die main.js geladen ist teilt
		sie der extension.js mit, dass alles bereit ist (siehe main.js -> "webview_is_loaded"). Die extension.js führt daraufhin die Funktion "webview_init()" aus und
		schickt der main.js die zuletzt	verwendeten Einstellungen (siehe "webview_init()" -> "post_init()")

		Sobald sich im webview irgendetwas ändert (Farb-Arrays, Scroll-Position ect.), teilt die main.js die Änderungen der extension.js mit
		(siehe "received_store_settings()" und "received_store_colors()"). Die Settings werden im global state von vscode gespeichert und sind nach einem Neustart
		wieder verfügbar (Picker-Status, Scroll-Position ect.). Die Farben werden nur vorübergehend gespeichert. Wenn der User die Farben ändert ohne die Palette
		zu speichern sind die Änderungen nach einem Neustart weg.

	*/

	'use strict';

	const 	vscode = require('vscode'),
			path = require('path'),
			fs = require('fs'),

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	sort_ci = (a, b) => { // Standard-Sortier-Funktion ".sort()" ist case-insensitiv, daher eigene Funktion!
		a = a.toLowerCase();
		b = b.toLowerCase();
		if (a < b) return -1;
		else if (a > b) return 1;
		return 0;
	},

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	infobox = (msg) => {
		msg = msg !== 0 ? msg : 'Unknown error! Please restart vscode!';
		vscode.window.showInformationMessage('Color Manager: ' + msg);
	},

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	show_webview = () => {
		// triggert ein erneutes Laden der "main.js". Die "main.js" wiederum fordert dann per Rückgabe von "webview_is_loaded" an die "extension.js" die Funktion
		// "webview_init() -> post_init()" an, die dann wiederum die Einstellungen und die Palette an die main.js zurücksendet (siehe Erklärung ganz oben)
		vscode.commands.executeCommand('cm_view.focus');
	},

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	load_colors = (path, result) => {

		const 	arr_n = [],
				arr_c = [];

		let arr_lines = [],
			lines_len = 0,
			line_current = '',
			n = 0,
			i = 0;

		try {
			arr_lines = fs.readFileSync(path, 'utf8').split('\n');
			lines_len = arr_lines.length;
		} catch (err) {
			if(err){
				infobox(0);
				result(false);
				return;
			}
		}

		// limit ermitteln
		c_max = vscode.workspace.getConfiguration('color-manager').paletteLimit;
		c_max = c_max < 1 ? 1 : c_max;

		// limitieren
		lines_len = lines_len > c_max ? c_max : lines_len;

		for (i = 0; i < lines_len; i++) {

			line_current = arr_lines[i].trim();

			if(line_current !== ''){
				// $c: 'my color', rgb(0, 255, 191); Nicht erlaubt: "'" und "'," (abstimmen mit save_colors)
				arr_n[n] = line_current.slice(line_current.indexOf("'", 0) + 1, line_current.lastIndexOf("'")).trim();
				arr_c[n] = line_current.slice(line_current.indexOf("',", 0) + 2, line_current.lastIndexOf(';')).trim();
				n++;
			}

		}

		result(n > 0 ? [arr_n, arr_c] : false);

	},

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	save_colors = (arr_n, arr_c, path, result) => {

		const c_len = arr_c.length;

		// $c: 'my color', rgb(0, 255, 191);
		let str = '',
			i = 0;

		for (i = 0; i < c_len; i++) {
			// Nicht erlaubt: "'" und "'," (abstimmen mit load_colors)
			str += "$c: '"+arr_n[i].replace(/',|'/g, ' ')+"', "+arr_c[i].replace(/',|'/g, ' ') + ';\n';
		}

		str = str.substr(0, str.length - 1); // letzten Linebreak entfernen

		fs.writeFile(path, str, (err) => {
			if(err) {
				infobox(0);
				result(false);
			}
			else{
				result(true);
			}
		});

	},

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	refresh_colors_mem = (arr_n, arr_c) => {
		// wird immer dann aufgerufen wenn eine neue Palette geladen wurde
		arr_n_mem = arr_n;
		arr_c_mem = arr_c;
	},

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	get_palettes = () => {

		// Paletten-Namen ermitteln

		const arr_return = [];

		let files = {},
			files_len = 0,
			n = 0,
			i = 0;

		try {
			files = fs.readdirSync(storage_path);
			files_len = files.length;
		} catch (err) {
			if(err) infobox(0);	// nur infobox / unten wird leeres Array zurückgeben!
		}

		if(files_len > 0){
			for (i = 0; i < files_len; i++) {
				if(path.extname(files[i]).toLowerCase() === '.scss') {
					arr_return[n] = files[i].slice(0,-5); // .scss entfernen
					n++;
				}
			}
		}

		return arr_return;

	},

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	no_selection_get_color_pos = (line, pos_cursor) => {

		const get_end_pos = (start_loop_pos, reg) => {

			pos_end = line_len; // pos_end erstmal auf Zeilenende setzen, da sich die Farbe auch genau am Zeilenende befinden kann (dann findet der Loop nämlich nichts)

			for (i = start_loop_pos; i < line_len; i++) {
				// sobald ein Zeichen erreicht wird dass nicht dem RegEx entspricht, dieses Zeichen als End-Position festlegen
				if(line_lc[i].match(reg) === null){
					pos_end = i;
					break;
				}
			}

		},

		line_lc = line.toLowerCase(),
		line_len = line.length;

		let pos_start = -1,
			pos_end = -1,
			c_type = -1, // 0 = #fff || 1 = 0xfff || 2 = rgb hsl
			char_current = '',
			i = 0;


		// Cursor ganz hinten ___________________________________________________________________________________________________________________________

		// Wenn sich der Cursor ganz hinten befindet (kurz vor Zeilenumbruch) grundsätzlich false zurückgeben!
		if(pos_cursor === line_len) return false; // ███ exit ███


		// HEX, RGB, HSL ___________________________________________________________________________________________________________________________

		// pos_start ermitteln ----------------------------------------------
		i = pos_cursor;

		for (i; i >= 0; i--) {

			char_current = line_lc[i];

			// hex #
			if(char_current === '#') {
				if(i + 4 <= line_len) { // i + 4 = Mindestlänge '#fff'
					pos_start = i;
					c_type = 0;
					break;
				}
			}
			// hex 0x
			else if(char_current === '0'){
				if(i + 5 <= line_len && line_lc[i + 1] === 'x'){ // i + 5 = Mindestlänge '0xfff'
					pos_start = i;
					c_type = 1;
					break;
				}
			}
			// rgb
			else if(char_current === 'r'){
				if(i + 9 < line_len && line_lc.substr(i + 1, 2) === 'gb'){ // i + 9 = Mindestlänge 'rgb(0,0,0)'
					pos_start = i;
					c_type = 2;
					break;
				}
			}
			// hsl
			else if(char_current === 'h'){
				if(i + 11 < line_len && line_lc.substr(i + 1, 2) === 'sl'){ // i + 11 = Mindestlänge 'hsl(0,0%,0%)'
					pos_start = i;
					c_type = 2;
					break;
				}
			}

		}


		// pos_end ermitteln ----------------------------------------------
		if(pos_start !== -1) {

			// HEX: #fff || 0xfff
			if(c_type === 0 || c_type === 1){

				// Startposition für "get_end_pos()" festlegen ->  +1 = "#" überspringen, +2 = "0x" überspringen
				const start_search_pos = c_type === 0 ? pos_start + 1 : pos_start + 2;

				// sobald ein Zeichen erreicht wird, das nicht Zahlen und Buchstaben von a bis f entspricht, dieses Zeichen als End-Position festlegen
				get_end_pos(start_search_pos, /[0-9a-f]/);

				// Hat die Farbe die Länge einer hex3 oder hex6a-Farbe ? (eigentlich müsste noch 5 als gültige Länge ausgeschlossen werden)
				if(pos_end - start_search_pos < 3 || pos_end - start_search_pos > 8) pos_end = -1; // keine HEX-Farbe █ █ █ pos_end = -1 █ █ █

			}
			// rgb || hsl
			else{

				pos_end = line_lc.indexOf(')', pos_start); // ggf. Klammer nicht gefunden █ █ █ pos_end = -1 █ █ █

				if(pos_end !== -1){
					pos_end++; // 1 hochzählen

					/* Hier ggf. irgendwann noch verfeinern und das gleiche regex einbauen wie in der main.js (getrennt für rgb und hsl)
					Hier wird nur ganz einfach überprüft ob "(" und Kommas auftauchen. Auf "rgb" und "hsl" wurde bereits oben bei pos_start geprüft
					und Klammer-zu ")" wurde kurz zuvor geprüft */
					if( line_lc.slice(pos_start, pos_end).match(/.+\(.+,.+/) === null ) pos_end = -1; // keine RGB|HSL-Farbe █ █ █ pos_end = -1 █ █ █

				}

			}

		}

		// End und Cursor-Pos prüfen ___________________________________________________________________________________________________________________________

		// befindet sich die End-Position vor der Cursor-Position?    z.B. in einem freien Raum zwischen 2 Farbwerten?    rgb(0,0,0)   I   #ddd
		if(pos_end !== -1 && pos_cursor > pos_end) pos_end = -1; // █ █ █ pos_end = -1 █ █ █


		// CSS-Farbe ___________________________________________________________________________________________________________________________

		/*
		!!! Achtung! Reihenfolge beachten!

		Suche nach CSS-Farben kann erst gemacht werden wenn überprüft wurde ob sich die Cursor-Position hinter der End-Position befindet!

		Beispiel:
		#e5e5e5, blue

		Cursor befand sich innerhalb von "blue". Der Loop ist bis zum "#" zurückgegangen, ist dann wieder nach vorne gegangen bist zum "," und hat somit einen gültigen
		HEX-Wert ermittelt. Dann wurde aber festgestellt, dass sich der Cursor hinter der End-Position befand. Also muss noch einmal nach CSS-Farben gesucht werden!

		!!! Achtung!

		Nicht versuchen die Suche nach CSS-Farben oben mit unterzubringen. Die Suche nach non-word-chars kommt sich mit der Suche nach RGB-Farben in die Quere,
		da RGB auch non-word-chars wie Kommas oder Leerzeichen entält. Daher CSS-Farben erst ganz zum Schluss suchen!

		Beispiel:
		red,green,blue
		rgb(255,255,0)


		*/

		if(pos_end === -1){ // zurückgesetzt oder immer noch -1

			// pos_start ermitteln ----------------------------------------------
			pos_start = 0; // erstmal auf 0 setzen, da sich eine Farbe auch ganz am Zeilenanfang befinden kann (dann findet der for-Loop nämlich nichts)

			i = pos_cursor;

			for (i; i >= 0; i--) {
				// sobald ein Zeichen erreicht wird dass nicht einem Buchstaben entspricht, dieses Zeichen als Start-Position festlegen
				if(line_lc[i].match(/\W/) !== null){ // W = NON-WORD
					pos_start = i + 1; // + 1, da der vorher geprüfte char ja noch ein Wort-Charakter war
					break;
				}
			}

			// pos_end ermitteln ----------------------------------------------

			// sobald ein Zeichen erreicht wird dass nicht einem Buchstaben entspricht, dieses Zeichen als End-Position festlegen
			get_end_pos(pos_start + 1, /\w/); // w = WORD

			// gültige CSS-Farbe?
			if(arr_csscolors.findIndex((el) => el.toLowerCase() === line_lc.slice(pos_start, pos_end).toLowerCase()) === -1) {
				pos_end = -1; // keine CSS-Farbe █ █ █ pos_end = -1 █ █ █
			}

		}

		// wurde eine "pos_end" ermittelt? ___________________________________________________________________________________________________________________________
		return pos_end !== -1 ? [pos_start, pos_end] : false;

	},

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	store_settings = () => {

		/*
			Muss jedesmal ausgeführt werden, wenn sich in der extension.js "p_path" ändert, oder wenn die main.js den Befehl "store_settings"
			postet (siehe "received_store_settings()"). Und natürlich beim Init falls "settings" neu erstellt wird oder auf "settings_init"
			zurückgesetzt wird (siehe "post_init()")

			Info! Die ursprüngliche Idee war es die settings nur beim Beenden der extension zu speichern (also unter "deactivate()"), aber das
			funktioniert leider nicht, siehe:

			https://github.com/microsoft/vscode/issues/144118 (momentan ist es nicht möglich unter "deactivate()" den globalState zu speichern)

			Was im Gegensatz zu normalen webviews ebenfalls nicht funktioniert ist das "onDidDispose"-Event, das ausgeführt wird wenn ein Webview
			geschlossen wird. Bei Activitybar-Webviews (bzw. WebviewView's) gibt es zwar auch ein "onDidDispose"-Event, das aber das wird nur getriggert
			wenn der User das webview von Hand ausblendet. (API sagt: Views are disposed when they are explicitly hidden by a user, this happens when a
			user right clicks in a view and unchecks the webview view). ???

			Daher bleibt nur die Möglichkeit den globalState immer sofort zu aktualisieren sobald sich etwas ändert! :(

			Alternativ könnte man noch per Listener überwachen ob sich p_path ändert, aber dann müsste ein Objekt verwendet werden z. B.:
			https://jsfiddle.net/5o1wf1bn/1/

			Was auch noch möglich wäre, ist eine json mit den Settings im globalen Storage-Path zu speichern - quasi ein eigener
			globalState per fsWriteFile bei deactivate() und fsReadFile bei activate()
			(fswriteFile unter deactivate funktioniert gut ... bereits getestet!)

		*/

		// p_path aktualisieren für nächste Sitzung, alle anderen Werte wurden bereits unter "received_store_settings()" aktualisiert
		settings.p_path = p_path;

		// aktuelle Einstellungen für nächste Sitzung speichern / siehe "activate()"
		activate_context.globalState.update('settings', settings);

		// autostart-Palette
		activate_context.globalState.update('intellisense_palette', intellisense_palette);

	},

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	received_store_settings = (msg) => {
		settings = msg.settings;
		store_settings();
	},

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	received_store_colors = (msg) => {

		/* Kopien der ungespeicherten Farb-Werten erstellen, falls das webview ausgeblendet wird! Falls der user das webview wieder einblendet, sind somit auch
		die ungepeicherten Farben noch sichtbar! Dazu wird unter "webview_init()" (ganz unten) nicht die aktuelle Palette erneut geladen, sondern es werden die
		von hier aus übertragenen Farben erneut geladen (falls "p_path" noch existiert und nicht manuell vom user gelöscht wurde) */

		arr_n_mem = msg.arr_n;
		arr_c_mem = msg.arr_c;

	},

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	received_insert = (msg) => {

		const active_editor = vscode.window.activeTextEditor;

		if(active_editor === undefined) return; // ███ exit ███

		let insert_val = msg.insert_val;

		// Hex als 0x-Hex einfügen?
		if(insert_val.substr(0,1) === '#'){
			if(vscode.workspace.getConfiguration('color-manager').insertClassicHex === true){
				insert_val = '0x' + insert_val.substr(1,insert_val.length);
			}
		}

		// selection ?
		const sel = active_editor.selections[0];

		// keine selection
		if( sel.start.line === sel.end.line && sel.start.character === sel.end.character ){

			const 	line = active_editor.document.lineAt(sel.start.line).text,
					arr_pos = no_selection_get_color_pos(line, sel.active.character);

			active_editor.edit(builder => {
				if(arr_pos === false) builder.replace(new vscode.Range(sel.start.line, sel.active.character, sel.start.line, sel.active.character), insert_val);
				else builder.replace(new vscode.Range(sel.start.line, arr_pos[0], sel.start.line, arr_pos[1]), insert_val);
			});

		}
		// selection !
		else{

			const sel_len = active_editor.selections.length;
			let s = 0;

			active_editor.edit(builder => {
				for (s; s < sel_len; s++) builder.replace(active_editor.selections[s], insert_val);
			});

		}


	},

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	received_save_active_doc = () => {
		const active_editor = vscode.window.activeTextEditor;
		if (active_editor !== undefined) active_editor.document.save();
	},

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	received_edit_palette_in_texteditor = () => {

		vscode.workspace.onDidSaveTextDocument((uri) => {

			if(uri.fileName.replace(/\\/g, '/').toLowerCase() === p_path.toLowerCase()) {

				load_colors(p_path, result => { // result = false || [ arr_n, arr_c ]
					if(result !== false) {

						post_refresh(result[0], result[1], false);

						// ungespeicherte Farben aktualisieren
						refresh_colors_mem(result[0], result[1]);

						// intellisense refresh?
						if(intellisense_palette === arr_p[p_cid]){ // wenn kein intellisense, dann intellisense_palette = ''
							create_items_and_subscribe(intellisense_palette, result[0], result[1]);
						}

					}
				});

			}
		});

		vscode.workspace.openTextDocument(p_path).then(doc => vscode.window.showTextDocument(doc, { preserveFocus: true }));

	},

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	received_change_palette = (msg) => {

		p_cid = msg.p_cid;
		p_path = storage_path + arr_p[p_cid] + '.scss';

		load_colors(p_path, result => { // result = false || [ arr_n, arr_c ]
			if(result !== false) {
				post_refresh(result[0], result[1], false);
				refresh_colors_mem(result[0], result[1]); // arr_mem aktualisieren
				store_settings(); // store p_path change
			}
		});

	},

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	received_save_palette = (msg) => {

		save_colors(msg.arr_n, msg.arr_c, p_path, success => {
			if (success === true) refresh_colors_mem(msg.arr_n, msg.arr_c); // arr_mem aktualisieren
		});

		// intellisense refresh?
		if(intellisense_palette === arr_p[p_cid]){ // wenn kein intellisense, dann intellisense_palette = ''
			create_items_and_subscribe(intellisense_palette, msg.arr_n, msg.arr_c);
		}
	},

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	received_add_palette = (msg) => {

		let arr_n_add = [],
			arr_c_add = [];

		// add
		if(msg.add_saveas === true){ // true = add, false = save as
			arr_n_add = [n_new]; // New Color
			arr_c_add = [c_new]; // #000
		}
		// save as
		else{
			arr_n_add = msg.arr_n;
			arr_c_add = msg.arr_c;
		}

		save_colors(arr_n_add, arr_c_add, storage_path + msg.fname + '.scss', success => {
			if (success === true){

				// Paletten aktualisieren und erstellte Palette als neue aktive Palette festlegen
				arr_p[p_len] = msg.fname;
				p_len++;

				arr_p.sort(sort_ci);

				p_cid = arr_p.findIndex((el) => el === msg.fname);
				p_path = storage_path + msg.fname + '.scss'; // p_path aktualisieren!

				// store p_path change
				store_settings();

				// arr_mem aktualisieren
				refresh_colors_mem(arr_n_add, arr_c_add);

				web_view.postMessage({
					command: 'palette_added_success',
					add_saveas: msg.add_saveas,
					arr_p: arr_p,
					p_len: p_len,
					p_cid: p_cid
				});

			}
		});

	},

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	received_rename_palette = (msg) => {

		fs.rename(storage_path + arr_p[msg.p_id] + '.scss', storage_path + msg.fname + '.scss', (err) => {
			if (err){
				infobox(0);
			}
			else{

				// Paletten-Array aktualisieren und sortieren
				arr_p[msg.p_id] = msg.fname;
				arr_p.sort(sort_ci);

				// p_cid und p_path aktualisieren, falls die umbenannte Palette die aktuell geladene Palette ist
				if(msg.p_id === p_cid){
					p_cid = arr_p.findIndex((el) => el === msg.fname);
					p_path = storage_path + arr_p[p_cid] + '.scss';
					store_settings(); // store p_path change
				}

				// sortiertes Paletten-Array an main.js zurückgeben und dort neu initialisieren
				web_view.postMessage({
					command: 'palette_renamed_success',
					arr_p: arr_p,
					p_len: p_len,
					p_cid: p_cid
				});

			}
		});

	},

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	received_delete_palette = (msg) => {

		let delete_id = msg.p_id,
			palette_changed = false, // false | true | 'no-palettes-left' (siehe main.js)
			arr_n_first_p = [],
			arr_c_first_p = [];

		fs.unlink(storage_path + arr_p[delete_id] + '.scss', (err) => {

			arr_p.splice(delete_id, 1);
			p_len--;

			if (err){
				infobox(0);
				delete_id = p_cid; // weiter unten versuchen die erste Palette zu laden
			}

			// Keine Paletten mehr übrig __________________________________________________________________________________________________________
			if(p_len === 0){
				palette_changed = 'no-palettes-left'; // keine Palette übrig / Verzeichnis leer -> siehe main.js
				p_path = '';
				p_cid = -1;
			}
			// noch welche übrig __________________________________________________________________________________________________________
			else{

				// gelöschte Palette ist aktuelle Palette -> erste Palette laden --------------------------------------------------------
				if(delete_id === p_cid){
					palette_changed = true; // -> siehe main.js
					p_path = storage_path + arr_p[0] + '.scss';  // p_path aktualisieren!
					p_cid = 0;

					load_colors(p_path, result => { // result = false || [ arr_n, arr_c ]

						// erste Palette leer oder befüllt?
						if(result !== false){
							arr_n_first_p = result[0];
							arr_c_first_p = result[1];
							refresh_colors_mem(result[0], result[1]); // arr_mem aktualisieren
						}
						else{ // leer
							arr_n_first_p = 'is-empty'; // siehe main.js
							refresh_colors_mem([], []); // arr_mem aktualisieren
						}

					});

				}
				// aktuell aktive Palette ist noch vorhanden  --------------------------------------------------------
				else{
					// p_cid neu ermitteln / wenn eine Palette mit niedrigerem Anfangsbuchstaben gelöscht wurde rutscht p_cid sonst nach oben
					if(delete_id < p_cid) p_cid--;
				}

			}

			store_settings(); // store p_path change

			web_view.postMessage({

				command: 'palette_deleted_success',
				palette_changed: palette_changed,

				arr_n: arr_n_first_p, // arr_n_first_p || 'is-empty'
				arr_c: arr_c_first_p,

				arr_p: arr_p,
				p_len: p_len,
				p_cid: p_cid

			});

		});

	},

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	received_color_manager_is_ready = () => {

		// Funktion ausführen wenn Color Manager sichtbar und bereit ist? (siehe "command_find_colors_in_selection")

		if(run_func_when_ready !== false) {
			run_func_when_ready();
			run_func_when_ready = false; // zurücksetzen / nur einmalig ausführen
		}

	},

	// intellisense ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

	startup_check_intellisense = () => {
		if(vscode.workspace.getConfiguration('color-manager').autoStartIntellisense === true){
			const gstate_p_name = activate_context.globalState.get('intellisense_palette');
			if (gstate_p_name !== '' && fs.existsSync(storage_path + gstate_p_name + '.scss') === true){
				add_palette_to_intellisense(gstate_p_name, false, false);
			}
		}
	},

	// ____________________________________________________________________________________________________________________________________________________
	add_palette_to_intellisense = (p_name, show_success_msg, call_store_settings) => {

		const create_items_and_subscribe = (arr_n, arr_c) => {

			const 	arr_items = [], // intellisense-Einträge
					insert_classic_hex = cm_config.insertClassicHex === true ? true : false, // Hex als 0x-Hex einfügen?
					colors_len = arr_n.length;

			let lang_id = '',
				item = {},
				i = 0;

			// intellisense items erzeugen
			for (i = 0; i < colors_len; i++){

				// #-Hex oder 0x-Hex ?
				if(insert_classic_hex === true){
					arr_c[i] = arr_c[i].substr(0,1) === '#' ? '0x' + arr_c[i].substr(1, arr_c[i].length) : arr_c[i];
				}

				item = new vscode.CompletionItem(arr_n[i]); // label
				item.documentation = arr_c[i];
				item.insertText = arr_c[i];
				item.kind = vscode.CompletionItemKind.Color;

				arr_items[i] = item;

			}

			// items zu allen benutzerdefinierten Sprachen hinzufügen
			for (i = 0; i < languages_len; i++) {

				lang_id = arr_languages[i];

				// reset: aktuelle intellisense-einträge der jeweiligen Sprache entfernen
				if(Object.keys(intellisense_providers).find(key => key === lang_id)){
					intellisense_providers[lang_id].dispose();
				}

				// hinzufügen
				intellisense_providers[lang_id] = vscode.languages.registerCompletionItemProvider(lang_id, {
					provideCompletionItems(document, position, token) {
						return arr_items;
					}
				});

				// subscribe
				activate_context.subscriptions.push(intellisense_providers[lang_id]);

			}

			// ende --------------------------------------------------------------------------------------

			// "intellisense_palette" aktualisieren
			intellisense_palette = p_name;

			/*
			!!! Achtung !!!
			Hier würde es zu einem Fehler kommen wenn vscode neu gestartet wird und die Palette automatisch von "startup_check_intellisense()" geladen wird.
			Wenn dann beim Startup sofort "store_settings()" aufgerufen wird dann zeigt das webview nicht die zueletzt verwendete Palette an, sondern es wird immer die
			erste Palette geladen und auch der Picker wird nicht angezeigt. Aus irgendeinem Grund werden dann die "settings_init" verwendet. Irgendwann nochmal
			genau nachprüfen! Daher wurde zusätlich "call_store_settings" eingebaut, damit beim Startup nicht "store_settings()" aufrufen wird!
			*/

			if(call_store_settings === true) store_settings(); // "intellisense_palette" speichern

			// Infobox?
			if(show_success_msg === true) infobox('Palette "'+intellisense_palette+'" added to intellisense!');

		},

		// const / start____________________________________________________________________________________________________________________________________________________

		cm_config = vscode.workspace.getConfiguration('color-manager'),
		arr_languages = cm_config.languages,
		languages_len = arr_languages.length;

		if(languages_len === 0){
			infobox('Intellisense not available! Specify some languages in the settings (see docs)!');
		}
		else{
			load_colors(storage_path + p_name + '.scss', result => { // result = false || [ arr_n, arr_c ]
				if(result !== false) create_items_and_subscribe(result[0], result[1]); // arr_n, arr_c
			});
		}

	},

	// ____________________________________________________________________________________________________________________________________________________
	command_remove_palette_from_intellisense = vscode.commands.registerCommand('extension.cm_palette_autocomplete_remove', () => {

		if(intellisense_providers !== {}){

			const keys = Object.keys(intellisense_providers);

			for (const key of keys) {
				intellisense_providers[key].dispose();
				delete intellisense_providers.key;
			}

			infobox('Palette "'+intellisense_palette+'" removed from intellisense!');
			intellisense_palette = '';
			store_settings(); // "intellisense_palette" in globalState speichern

		}

	}),

	// ____________________________________________________________________________________________________________________________________________________
	command_add_palette_to_intellisense = vscode.commands.registerCommand('extension.cm_palette_autocomplete_add', () => {

		// Quickpick anzeigen
		const 	arr_p_names = get_palettes(),
				p_names_len = arr_p_names.length,
				aoo_qp_options = [];

		let i = 0;

		if(p_names_len === 0) {
			infobox('Not possible! No palettes found!');
		}
		else{

			for (i = 0; i < p_names_len; i++) aoo_qp_options[i] = { 'id': i, 'label': arr_p_names[i], 'description': '' };

			vscode.window.showQuickPick(new Promise(resolve => resolve(aoo_qp_options)), { placeHolder: 'choose palette:', matchOnDescription: false, }).then((inp_val) => {
				if (!inp_val) return; // ███ exit ███ ESC / nichts angeklickt
				add_palette_to_intellisense(arr_p_names[inp_val.id], true, true);
			});

		}

	}),

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	command_restore_factory_palettes = vscode.commands.registerCommand('extension.cm_restore_factory', () => {

		// Verzeichnis erstellen
		if (fs.existsSync(storage_path) === false){
			fs.mkdir(storage_path, (err) => {
				if(err){
					infobox(0);
					return; // ███ exit ███
				}
			});
		}

		create_factory_palettes(result => { // result = false || Demo-Palette [ arr_n, arr_c ]
			if(result !== false){

				infobox('Factory palettes restored!');

				// webview ist sichtbar -> refresh
				if(cm_is_visible === true){
					// create_factory_palettes() hat p_path auf Demo-Palette geändert!
					store_settings();
					// ungespeicherte Farben aktualisieren
					refresh_colors_mem(result[0], result[1]);

					post_refresh(result[0], result[1], true); // refresh Palette Manager = true
				}

			}
		});

	}),

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	command_find_colors_in_selection = vscode.commands.registerCommand('extension.cm_find_colors_in_selection', () => {

		// _________________________________________________________________________________________________________________________________________________
		const post_colors_from_selection = () => {
			web_view.postMessage({ command: 'find_colors_in_selection', arr_add: arr_add });
		},

		// _________________________________________________________________________________________________________________________________________________
		extract_colors = (reg) => {
			arr_temp = selected_text.match(reg); // wenn kein match, dann arr_temp = null (kann nicht auf length geprüft werden)
			if(arr_temp !== null){
				arr_add.push(...arr_temp);
				add_len += arr_temp.length;
			}
		},

		// const / start _________________________________________________________________________________________________________________________________________________

		editor = vscode.window.activeTextEditor,
		sel_len = editor.selections.length,

		csscolors_len = arr_csscolors.length;

		let selected_text = '',
			arr_add = [],
			add_len = 0,
			arr_temp = [],

			css_color = '',
			reg = null,

			i = 0;

		// Text aus selections einlesen
		if(sel_len < 1){
			infobox('Not possible! Please select some text in your document!');
			return; // ███ exit ███
		}

		// toLowerCase !!!
		for (i = 0; i < sel_len; i++) selected_text += editor.document.getText(editor.selections[i]).toLowerCase();

		// Tabs und Zeilenumbrüche entfernen (falls sich gradient oder rgb/hsl-Wert über mehrere Zeilen erstreckt)
		selected_text = selected_text.trim().replace(/(?:\r\n|\r|\n|\t)/g, ' ');
		selected_text = selected_text.replace(/\s\s+/g, ' '); // doppelte leerzeichen entfernen

		// zuerst muss berücksichtigt werden, dass es gradients gibt und dass die Farbwerte innerhalb der Klammern nicht als Extra-Werte aufgenommen werden dürfen
		// daher zuerst auf gradients überprüfen und aus dem Text herausschneiden, sodass abschließend nach den restlichen Farben gesucht werden kann

		if(selected_text.indexOf('gradient') !== -1){

			reg = /((repeating-)?linear|radial)-gradient\(((?:\([^\)]*\)|[^\)\(]*)*)\)/gi;

			extract_colors(reg);

			// gradients aus selected_text entfernen!
			if(add_len > 0) selected_text = selected_text.replace(reg, '');

		}


		// hex, rgb, hsl (oben wurden ggf. die gradients aus "selected_text" entfernt, sodass nur die Farben übrig bleiben)

		// hex
		if(selected_text.indexOf('#') !== -1) extract_colors(/(#([0-9a-f]{3,4}){1,2}\b)/gi);

		// rgb
		if(selected_text.indexOf('rgb') !== -1) extract_colors(/rgba?\s*\(\s*((25[0-5]|2[0-4]\d|1\d{1,2}|\d\d?)\s*,\s*?){2}(25[0-5]|2[0-4]\d|1\d{1,2}|\d\d?)\s*,?\s*([01]\.?\d*?)?\)/gi);

		// hsl
		if(selected_text.indexOf('hsl') !== -1) extract_colors(/hsla?\s*\(\s*(0|360|35\d|3[0-4]\d|[12]\d\d|0?\d?\d)\s*,\s*(0|100|\d{1,2})%\s*,\s*(0|100|\d{1,2})%\s*,?\s*(0|1|0?\.?\d*?\s*)\)/gi);

		// 0x hex
		if(selected_text.indexOf('0x') !== -1){
			arr_temp = selected_text.match(/(0x([0-9a-f]{3,4}){1,2}\b)/gi); // wenn kein match, dann arr_temp = null (kann nicht auf length geprüft werden)
			if(arr_temp !== null){
				const temp_len = arr_temp.length;
				for (i = 0; i < temp_len; i++){
					arr_add[add_len] = arr_temp[i].replace('0x', '#'); // für Webview "0x" durch "#" ersetzen!
					add_len++;
				}

			}
		}

		// css-Farben
		for (i = 0; i < csscolors_len; i++){

			css_color = arr_csscolors[i];

			// scss-Variabeln müssen ausgeschlossen werden, z.B.: $green
			reg = new RegExp(`(?:\\s|:|,|;|'|"|\`)(${css_color})(\\W)`, 'i'); //    /(?:\s|:|,|;)(green)(\W)/i

			if(selected_text.match(reg) !== null){
				arr_add[add_len] = arr_csscolors[i];
				add_len++;
			}

		}
		// ---------------------------------------------------------------------------------------------------
		if(add_len === 0){
			infobox('Not possible! No color values found in selection!');
		}
		else{

			// Doppelte entfernen + sortieren
			if(add_len > 1){

				// Leerzeichen raus um anschließend Doppelte zu entfernen: rgb(0,0,0) und rgb(0,  0,  0) nur einmal hinzufügen
				// (lowercase bereits unter getText gemacht!)
				for (i = 0; i < add_len; i++) arr_add[i] = arr_add[i].replace(/\s+/g, '');

				// Doppelte entfernen
				arr_add = [...new Set(arr_add)];

				// sortieren
				arr_add.sort(sort_ci);

			}

			// webview sichtbar
			if(cm_is_visible === true) {
				post_colors_from_selection();
			}
			// webview ist nicht sichtbar
			else{
				// webview anzeigen / "post_colors_from_selection()" wird ausgeführt sobald die main.js "color_manager_is_ready" zurückgibt!
				run_func_when_ready = post_colors_from_selection;
				show_webview(); // -> post_colors_from_selection()
			}

		}

	}),

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	post_refresh = (arr_n, arr_c, refresh_pm) => {
		web_view.postMessage({
			command: 'refresh',

			arr_n: arr_n,
			arr_c: arr_c,

			arr_p: arr_p,
			p_len: p_len,
			p_cid: p_cid,

			refresh_pm: refresh_pm // refresh Palette Manager

		});
	},

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	show_picker = (p_color) => {

		// webview sichtbar
		if(cm_is_visible === true){
			web_view.postMessage({ command: 'open_picker', picker_color: p_color});
		}
		// webview ist nicht sichtbar
		else{

			// "show_webview()" triggert ein erneutes Laden der "main.js". Die "main.js" wiederum fordert dann per Rückgabe von "webview_is_loaded" an die "extension.js"
			// die Funktion "webview_init() -> post_init()" an, die dann wiederum die Einstellungen und die Palette an die main.js zurücksendet (siehe Erklärung ganz oben)

			// durch Setzen der beiden Varibalen wird der Picker Initialiseren der main.js direkt beim Start angezeigt!
			settings_overrides = { // siehe "post_init()"
				'picker_open': true,
				'picker_color': p_color,
				'picker_color_init': p_color // muss neu gesetzt werden, ansonsten wird die gespeicherte Farbe aus dem global state übergeben, siehe main.js / init_cm()
			};

			show_webview();

		}

	},

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	command_open_picker_from_selection = vscode.commands.registerCommand('extension.cm_open_picker_sel', () => {

		const 	editor = vscode.window.activeTextEditor,
				sel = editor.selections[0];

		let picker_color = ''; // fällt in main.js durch Prüfung, wenn nicht aktualisiert wird

		// keine selection
        if( sel.start.line === sel.end.line && sel.start.character === sel.end.character ){

			const 	line = editor.document.lineAt(sel.active.line).text,
					arr_pos = no_selection_get_color_pos(line, sel.active.character);

			if(arr_pos !== false) picker_color = line.slice(arr_pos[0], arr_pos[1]);

		}
		// selection
		else{
			picker_color = editor.document.getText(sel).trim();
		}

		show_picker(picker_color);

	}),

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	command_open_picker = vscode.commands.registerCommand('extension.cm_open_picker', () => {
		show_picker('#000');
	}),

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	command_open_palette = vscode.commands.registerCommand('extension.cm_open_palette', () => {

		// webview ist nicht sichtbar
		if(cm_is_visible === false){

			// "show_webview()" triggert ein erneutes Laden der "main.js". Die "main.js" wiederum fordert dann per Rückgabe von "webview_is_loaded" an die "extension.js"
			// die Funktion "webview_init() -> post_init()" an, die dann wiederum die Einstellungen und die Palette an die main.js zurücksendet (siehe Erklärung ganz oben)

			// nicht den Picker beim Starten angezeigen!
			settings_overrides = { // siehe "post_init()"
				'picker_open': false
			};

			show_webview();

		}

	}),

	// help + changelog  ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

	command_help = vscode.commands.registerCommand('extension.cm_help', () => {
		create_info_webview(extension_path+'/content/infos/help.html', 'Help');
	}),

	command_changelog = vscode.commands.registerCommand('extension.cm_changelog', () => {
		create_info_webview(extension_path+'/content/infos/changelog.html', 'Changelog');
	}),

	create_info_webview = (path_html_file, title) => {

		const create_html = () => {

			const 	body_html = fs.readFileSync(path_html_file, 'utf-8'),
					path_base = info_webview.asWebviewUri(vscode.Uri.joinPath(extension_uri, '/content/media/')),
					path_css = 	info_webview.asWebviewUri(vscode.Uri.joinPath(extension_uri, '/content/dist/css/info_webview.css')),
					path_js = 	info_webview.asWebviewUri(vscode.Uri.joinPath(extension_uri, '/content/js/info_webview.js'));

			return `
			<html>
				<head>
					<base href="${path_base}">
					<link href="${path_css}" rel="stylesheet">
				</head>
				<body>
					${body_html}
					<script src="${path_js}"></script>
				</body>
			</html>
			`;

		},

		panel = vscode.window.createWebviewPanel( 'Webview', title, vscode.ViewColumn.One, {
			enableScripts: true
		}),

		info_webview = panel.webview;

		info_webview.html = create_html();

	},

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	create_factory_palettes = (result) => {

		/* Info! Demo-Palette grundsätzlich dynamisch erzeugen, falls der User den Factory-Ordner im Extension-Verzeichnis manipuliert
		(somit ist wenigstens eine Palette verfügbar) */

		const copy_factory_palettes_to_storage = (callback) => {

			/* Info! "copyFileSync" funktioniert irgendwie nicht. "arr_p" kann innerhalb "copyFileSync" leider nicht befüllt werden und ist danach immer leer, da
			"copyFileSync" hier anscheined trotzdem zeitverzögert ausgeführt wird. Innerhalb "readdirSync" funktioniert es komischerweise, aber damit weiß man nur dass
			die Datei im Factory-Ordner existiert, aber nicht ob sie auch erfolgreich kopiert wurde. Daher ist diese Funktion als Callback-Funktion angelegt: erst wenn
			alle Dateien kopiert worden (oder zumindest der Versuch erfolgt ist) wird true zurückgeben */

			const factory_path = extension_path + '/content/factory palettes/palettes'; // Achtung! Groß/Kleinschreibung beachten (Linux!!!)

			let arr_files = [],
				files_len = 0,
				n = 0,
				copy_err = false,
				p_name = '';

			if (fs.existsSync(factory_path)) {
				arr_files = fs.readdirSync(factory_path),
				files_len = arr_files.length;
			}

			// Factory-Ordner existiert nicht oder leer (durch user gelöscht)
			if(files_len === 0){
				infobox('No factory palettes found! Try again and run command "restore factory palettes" or reinstall the extension!');
				callback(true); // █ █ █ callback █ █ █
			}
			else{

				arr_files.forEach(file => {

					fs.copyFile(factory_path+'/'+file, storage_path+'/'+file, (err) => {

						if(err){
							if(copy_err === false) {
								copy_err = true;
								infobox('At least 1 factory palette could not be created! Run command "restore factory palettes"');
							}
						}
						else{

							/* gleichzeitig noch Namen und Anzahl ermitteln, ABER den Namen nur zu "arr_p" hinzufügen, wenn er nicht bereits in
							"arr_p" vorhanden ist. Das passiert z.B. wenn der Befehl mehrfach aufgerufen wird (dann würden sich die Einträge verdoppeln) */

							p_name = file.slice(0, -5); // ".scss" entfernen

							if( arr_p.findIndex((el) => el.toLowerCase() === p_name.toLowerCase()) === -1) { // nicht "indexOf" verwenden, da User Groß/Kleinschreibung der Datei geändert haben könnte
								arr_p[p_len] = p_name;
								p_len++;
							}
						}

						// alle Dateien kopiert oder zumindest versucht?
						n++;
						if(n === files_len) callback(true); // █ █ █ callback █ █ █


					});

				});

			}

		},

		// _______________________________________________________________________________________________________________________________________
		create_demo_palette_and_sort = () => {

			// Demo-Palette dynamisch erzeugen und "arr_p" sortieren

			const 	demo_name = 'Demo Palette', // bei erstmaligem Öffnen anzuzeigende Palette
					arr_n_demo = ['Run command ´color manager help´ ...',  'corporate dark', 'corporate light', 'corporate blue', 'corporate green'],
					arr_c_demo = ['... to open the manual', '#20272F', '#eee', '#4EC5F1', '#0df2c9'];

			// p_path aktualisieren
			p_path = storage_path + demo_name + '.scss';

			/* Demo-Palette zu Factory-Paletten hinzufügen, ABER den Namen nur zu "arr_p" hinzufügen, wenn er nicht bereits in "arr_p" vorhanden ist.
			Das passiert z.B. wenn der Befehl mehrfach aufgerufen wird (dann würden sich die Einträge verdoppeln) */
			if( arr_p.findIndex((el) => el.toLowerCase() === demo_name.toLowerCase()) === -1) { // nicht "indexOf" verwenden, da User Groß/Kleinschreibung der Datei geändert haben könnte
				arr_p[p_len] = demo_name;
				p_len++;
			}

			// sortieren
			arr_p.sort(sort_ci);

			// p_cid der Demo-Palette ermitteln
			p_cid = arr_p.findIndex((el) => el === demo_name);

			save_colors(arr_n_demo, arr_c_demo, p_path, success => {
				if(success === true) result([arr_n_demo, arr_c_demo]);  // ███ result ███
				else result(false);  // ███ result ███
			});

		};

		// const / start _______________________________________________________________________________________________________________________________________

		// Factory Paletten in Userfolder kopieren
		copy_factory_palettes_to_storage(callback => {
			if (callback === true) create_demo_palette_and_sort(); // Demo-Palette dynamisch erzeugen ███ -> result ███
		});

	},

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	webview_init = () => {

		// _______________________________________________________________________________________________________________________________________
		const post_init = (arr_n, arr_c) => {

			// commando 'init' an main.js senden

			// wurden overrides festgelegt bevor die "settings" eingelesen wurde?
			// z.B. wenn Kommando aufgerufen wurde bevor das Webview initalisiert war (siehe "command_open_palette()" oder" "show_picker()")
			for (const key in settings_overrides) settings[key] = settings_overrides[key];
			settings_overrides = {}; // zurücksetzen !!!
			store_settings(); // erst nach settings_overrides ausführen!


			// post "init"
			web_view.postMessage({

				command: 'init',

				config: vscode.workspace.getConfiguration('color-manager'),

				settings: settings, // mode_current, c_cid, filter_open, filter_val, picker_open, picker_color, picker_color_init, scroll_pos, cm_width

				arr_n: arr_n, // arr_n
				arr_c: arr_c, // arr_c
				c_max: c_max,

				n_new: n_new,
				c_new: c_new,

				arr_p: arr_p,
				p_len: p_len,
				p_cid: p_cid

			});

		},

		// _______________________________________________________________________________________________________________________________________
		create_factory_palettes_then_post_init = () => {

			create_factory_palettes(result => { // █ █ aktualisiert p_path! █ █ wird unter "post_init()" in settings gespeichert!
				if(result !== false){  // result = false || Demo-Palette [ arr_n, arr_c ]
					post_init(result[0], result[1]); // █ █ █ post_init █ █ █
					refresh_colors_mem(result[0], result[1]); // ungespeicherte Farben aktualisieren
				}
			});

		},

		// _______________________________________________________________________________________________________________________________________
		load_colors_then_post_init = () => {

			load_colors(p_path, result => { // result = false || [ arr_n, arr_c ]
				post_init(result[0], result[1]); // █ █ █ post_init █ █ █
				refresh_colors_mem(result[0], result[1]); // arr_mem aktualisieren
			});

		},

		// _______________________________________________________________________________________________________________________________________
		check_and_get_palettes = () => {

			const reset_settings = () => {
				// alle Einstellungen der alten Palette zurücksetzen, da für neue Palette ungültig ("cm_width" ausgenommen)
				const temp = settings.cm_width;
				settings = settings_init;  // ██  ██ init-Settings ██  ██
				settings.cm_width = temp;
			};

			let i = 0;


			// Paletten-Array "arr_p" aus gefundenen scss Dateien erstellen
			// ----------------------------------------------------------------------------------------------------------------------------
			arr_p = get_palettes();
			p_len = arr_p.length;


			// keine scss-Dateien gefunden oder immer noch init-Wert -----------------------------------------------------------------
			if(p_len === 0){
				reset_settings();
				create_factory_palettes_then_post_init();
				return -1; // ███ return ███ -1 = fehler/factory restore || 0 = ok aber auf erste Palette gewechselt || 1 = erfolgreich
			}
			// scss-Dateien vorhanden --------------------------------------------------------------------------------------------------------
			else{

				// p_cid ermitteln / prüfen ob zuletzt verwendeter "p_path" noch existiert (bleibt -1 wenn nichts gefunden wird / siehe def globals)
				for (i = 0; i < p_len; i++) {
					if((storage_path + arr_p[i]).toLowerCase() + '.scss' === p_path.toLowerCase()){ // p_path kurz zuvor aus settings geholt, siehe "check_settings()"
						p_cid = i;
						break;
					}
				}

				// zuletzt verwendeter "p_path" wurde nicht gefunden! ------------------------------
				// (z.B. Datei durch User gelöscht)
				if(p_cid === -1){

					// erste scss-Datei aus dem Ordner laden
					p_path = storage_path + arr_p[0] + '.scss'; // █ █ p_path aktualisieren █ █ wird unter "post_init()" in settings gespeichert!
					p_cid = 0;

					// alle Einstellungen der alten Palette zurücksetzen, da für neue Palette ungültig ("cm_width" ausgenommen)
					reset_settings();

					return 0; // ███ return ███ -1 = fehler/factory restore || 0 = ok aber auf erste Palette gewechselt || 1 = erfolgreich

				}
				// zuletzt verwendeter "p_path" existiert noch! ------------------------------
				else{
					return 1; // ███ return ███ -1 = fehler/factory restore || 0 = ok aber auf erste Palette gewechselt || 1 = erfolgreich
				}

			}


		},

		// _______________________________________________________________________________________________________________________________________
		check_settings = () => {

			// -----------------------------------------------------------------------------------------------------------
			// Extension wird zum ersten Mal verwendet, da globalState('settings) noch undefined ist
			if(settings === undefined){
				settings = settings_init; // ██  ██ init-Settings ██  ██
			}
			// -----------------------------------------------------------------------------------------------------------
			// Extension wurde bereits verwendet
			else{

				/* p_path aus den settings holen und alles überprüfen was in der main.js zum Error führen könnte!

				███ Achtung! ███ Bei "settings.picker_color" ist es tatsächlich dazu gekommen, dass die Extension sich nicht mehr öffnen ließ
				weil picker_color = 0 war und das hat dazu geführt dass in der main.js die "substr"-Funktionen nicht mehr funktioniert
				haben. Error "substr is not a function ..." ("substr" mit int geht nicht)
				*/

				// 1. p_path
				if(settings.p_path !== undefined) { // bei "undefined" bleibt p_path = '' (siehe def globals)

					// p_path aktualisieren (toLowerCase für Vergleich unter "check_and_get_palettes()")
					p_path = settings.p_path.toLowerCase();

					// p_path auf Ausgangswert zurücksetzen, falls Pfad nicht existiert
					if (fs.existsSync(p_path) === false) p_path = '';

					// p_path aktualisieren: post_init() -> load_colors() -> store_settings()

				}

				/* 2. mode_current
				Info!!! Hier nicht auf 'no-palettes' prüfen. Wird zwar in den settings gespeichert, aber wenn unter "check_and_get_palettes()"
				festgestellt wird, dass der Ordner mit den Paletten leer ist werden sowieso die Factory-Paletten neu angelegt und die Standard-Settings geladen */

				if(['insert-listview', 'insert-compactview', 'edit'].indexOf(settings.mode_current) === -1){
					settings.mode_current = settings_init.mode_current;
				}

				// 3. c_cid (Info! "undefined" rutscht durch die kleiner-als-Prüfung, daher auch auf "undefined" prüfen!)
				if(Number.isInteger(settings.c_cid) === false || settings.c_cid < -1) settings.c_cid = settings_init.c_cid;

				// 4. filter_open
				if(settings.filter_open !== true && settings.filter_open !== false) settings.filter_open = settings_init.filter_open;

				// 5. filter_val
				if(typeof settings.filter_val !== 'string') settings.filter_val = settings_init.filter_val;

				// 6. picker_open
				if(settings.picker_open !== true && settings.picker_open !== false) settings.picker_open = settings_init.picker_open;

				// 7. picker_color
				if(typeof settings.picker_color !== 'string') settings.picker_color = settings_init.picker_color;

				// 8. picker_color_init
				if(typeof settings.picker_color_init !== 'string') settings.picker_color_init = settings_init.picker_color_init;

				// 9. scroll_pos
				if(Number.isInteger(settings.scroll_pos) === false || settings.scroll_pos < -1) settings.scroll_pos = settings_init.scroll_pos;

				// 10. cm_width / Nicht auf Mindestbreite prüfen! (wird in main.js gemacht)
				if(Number.isInteger(settings.cm_width) === false) settings.cm_width = settings_init.cm_width;

			}

		},

		// const / start _______________________________________________________________________________________________________________________________________

		settings_init = {

			// extension.js
			'p_path': '',

			// main.js
			'mode_current': 'insert-listview', 	// insert-listview | insert-compactview | edit | no-palettes
			'c_cid': -1,						// -1 | id
			'filter_open': false,				// bool
			'filter_val': '',					// '' | suchbegriff
			'picker_open': false,				// bool
			'picker_color': '',					// '' | farbwert
			'picker_color_init': '',			// '' | farbwert
			'scroll_pos': -1,					// -1 | scroll-Position
			'cm_width': 380,					// ui-Breite (380 nur für erstmaliges Anzeigen / kann später auch kleiner sein -> ca. 200 / siehe main.js)
		};


		/*
			!!! Info! Hier muss berücksichtigt werden ob die Extension initalisiert wird, oder ob die Extension bereits initalisiert wurde. Oder
			!!! einfach gesagt ob der User das webview bereits gesehehen hat und jetzt das webview nur erneut anzeigt. Wenn der User das Webview
			!!! bereits gesehen hat dann wurde zuvor "arr_n_mem" und "arr_c_mem" aus der main.js zurückgegeben. Das sind Kopien der beiden Farb-Arrays
			!!! mit den ungespeicherten Farb-Werten. Diese können in dem Fall jetzt an die neu geöffnete main.js wieder zurückgegeben werden.
			!!! Somit sieht der user immer den letzten Stand auch wenn die Palette nicht gespeichert wurde (siehe auch "store_colors()")

		*/

		check_settings();

		// !!! Extension wird initalisiert ---------------------------------------------------------------------------------------------------------
		if(cm_is_activating === true){
			cm_is_activating = false;

			// Erst-Verwendung (oder Storage-Path gelöscht) --------------------------
			if (fs.existsSync(storage_path) === false) {
				fs.mkdir(storage_path, (err) => {
					if(err){
						infobox(0);
						return;
					}
					else create_factory_palettes_then_post_init();
				});
			}
			// Erweiterung wurde in der Vergangenheit schon verwendet  --------------------------
			else{

				// alte "_settings.ini" löschen (< v0.6.4)
				if (fs.existsSync(storage_path+'_settings.ini') === true) fs.unlink(storage_path+'_settings.ini', () => { });

				// Paletten-Array "arr_p" aus gefundenen scss Dateien erstellen (aktualisiert ggf. "p_path"!)
				if(check_and_get_palettes() !== -1){ // -1 = fehler/factory restore || 0 = ok aber auf erste Palette gewechselt || 1 = erfolgreich
					load_colors_then_post_init(); // beim letzten Schließen von vscode verwendete Palette, oder erste Palette
				}

			}

		}
		// !!! Extension wurde bereits initalisiert (user zeigt webview erneut an) ---------------------------------------------------------------------------------------------------------
		else{

			// Paletten neu ermitteln, da der User in der Zwischenzeit die Paletten manuell gelöscht haben könnte

			// reset (ansonsten wird arr_p bei jedem erneuten Anzeigen verdoppelt)
			arr_p = [];
			p_len = 0;

			if(check_and_get_palettes() !== -1){ // -1 = fehler/factory restore || 0 = ok aber auf erste Palette gewechselt || 1 = erfolgreich

				if(check_and_get_palettes() === 0){ // 0 = auf erste Palette gewechselt / zuletzt verwendeter p_path existiert nicht mehr
					load_colors_then_post_init(); // erste Palette
				}
				else{ // 1 = erfolgreich / zuletzt verwendeter p_path existiert noch
					post_init(arr_n_mem, arr_c_mem); // █ █ █ post_init █ █ █ ungespeicherte Farben aus letzter session
				}

			}

		}


	},

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	webview_receive = (msg) => {

		switch (msg.command) {

			case 'webview_is_loaded':
				webview_init();
				break;

			case 'color_manager_is_ready':
				received_color_manager_is_ready();
				break;

			case 'store_settings':
				received_store_settings(msg);
				break;

			case 'store_colors':
				received_store_colors(msg);
				break;

			case 'insert':
				received_insert(msg);
				break;

			case 'save_active_doc':
				received_save_active_doc();
				break;

			case 'edit_palette_in_texteditor':
				received_edit_palette_in_texteditor();
				break;

			case 'change_palette':
				received_change_palette(msg);
				break;

			case 'save_palette':
				received_save_palette(msg);
				break;

			case 'add_palette':
				received_add_palette(msg);
				break;

			case 'rename_palette':
				received_rename_palette(msg);
				break;

			case 'delete_palette':
				received_delete_palette(msg);
				break;

		}

	},

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	webview_create_html = () => {

		const 	path_css = web_view.asWebviewUri(vscode.Uri.joinPath(extension_uri, '/content/dist/css/main.css')),
				path_js = web_view.asWebviewUri(vscode.Uri.joinPath(extension_uri, '/content/js/main.js'));

		return `
		<html>
			<head>
				<link href="${path_css}" rel="stylesheet">
			</head>
			<body>
				<script src="${path_js}"></script>
			</body>
		</html>
		`;

	},

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	webview_init_container = { resolveWebviewView(webview_view, webview_context, token) {

		// wird einmalig ausgeführt sobald das Activitybar-Icon angeklickt wird oder Fokus gesetzt wird:
		// vscode.commands.executeCommand('workbench.view.extension.color_manager_webview_container')

		web_view = webview_view.webview; //  █ █ █ set globals █ █ █

		web_view.options = {
			enableScripts: true,
			//retainContextWhenHidden: true,
			localResourceRoots: [ extension_uri ]
		};

		web_view.html = webview_create_html();

		web_view.onDidReceiveMessage(webview_receive);

		webview_view.onDidChangeVisibility(() => {
			cm_is_visible = webview_view.visible === true ? true : false;
		}, null, activate_context.subscriptions);

		cm_is_visible = true;

	}},

	// ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	activate = (context) => {

		//  █ █ █ set globals █ █ █
		activate_context = context;
		extension_uri = context.extensionUri;
		storage_path = (context.globalStoragePath.replace(/\\/g, '/') + '/'); // ███ Achtung!!! ███ Nicht ".toLowerCase()" -> Probleme auf Linux (Linux ist case-sensitiv! Info: Mac OS ist nicht case-sensitiv)
		extension_path = (extension_uri.fsPath.replace(/\\/g, '/')); // ███ Achtung!!! ███ Nicht ".toLowerCase()" -> Probleme auf Linux (Linux ist case-sensitiv! Info: Mac OS ist nicht case-sensitiv)

		// Einstellungen aus letzter Sitzung abrufen -> siehe "store_settings()"
		settings = context.globalState.get('settings'); // undefined ||  {mode_current, c_cid, filter_open, filter_val, p_path, picker_open, picker_color, picker_color_init, scroll_pos, cm_width}


		// webview
		context.subscriptions.push(vscode.window.registerWebviewViewProvider('cm_view', webview_init_container));

		// commands
		context.subscriptions.push(command_open_palette);
		context.subscriptions.push(command_open_picker);
		context.subscriptions.push(command_open_picker_from_selection);
		context.subscriptions.push(command_find_colors_in_selection);
		context.subscriptions.push(command_add_palette_to_intellisense);
		context.subscriptions.push(command_remove_palette_from_intellisense);
		context.subscriptions.push(command_restore_factory_palettes);
		context.subscriptions.push(command_help);
		context.subscriptions.push(command_changelog);

		// onStartupFinished
		startup_check_intellisense();


		// changelog anzeigen?
		const package_version = vscode.extensions.getExtension('royaction.color-manager').packageJSON.version;

		if(context.globalState.get('version') !== package_version){ // globalState.get('version') = undefined || str
			vscode.commands.executeCommand('extension.cm_changelog');
			context.globalState.update('version', package_version);
		}

	},

	// globals ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

	intellisense_providers = {},

	// const an main.js übergeben
	n_new = 'New Color',
	c_new = '#000',

	arr_csscolors = ['AliceBlue','AntiqueWhite','Aqua','Aquamarine','Azure','Beige','Bisque','Black','BlanchedAlmond','Blue','BlueViolet','Brown','BurlyWood','CadetBlue','Chartreuse','Chocolate','Coral','CornflowerBlue','Cornsilk','Crimson','Cyan','DarkBlue','DarkCyan','DarkGoldenRod','DarkGray','DarkGrey','DarkGreen','DarkKhaki','DarkMagenta','DarkOliveGreen','Darkorange','DarkOrchid','DarkRed','DarkSalmon','DarkSeaGreen','DarkSlateBlue','DarkSlateGray','DarkSlateGrey','DarkTurquoise','DarkViolet','DeepPink','DeepSkyBlue','DimGray','DimGrey','DodgerBlue','FireBrick','FloralWhite','ForestGreen','Fuchsia','Gainsboro','GhostWhite','Gold','GoldenRod','Gray','Grey','Green','GreenYellow','HoneyDew','HotPink','IndianRed','Indigo','Ivory','Khaki','Lavender','LavenderBlush','LawnGreen','LemonChiffon','LightBlue','LightCoral','LightCyan','LightGoldenRodYellow','LightGray','LightGrey','LightGreen','LightPink','LightSalmon','LightSeaGreen','LightSkyBlue','LightSlateGray','LightSlateGrey','LightSteelBlue','LightYellow','Lime','LimeGreen','Linen','Magenta','Maroon','MediumAquaMarine','MediumBlue','MediumOrchid','MediumPurple','MediumSeaGreen','MediumSlateBlue','MediumSpringGreen','MediumTurquoise','MediumVioletRed','MidnightBlue','MintCream','MistyRose','Moccasin','NavajoWhite','Navy','OldLace','Olive','OliveDrab','Orange','OrangeRed','Orchid','PaleGoldenRod','PaleGreen','PaleTurquoise','PaleVioletRed','PapayaWhip','PeachPuff','Peru','Pink','Plum','PowderBlue','Purple','RebeccaPurple','Red','RosyBrown','RoyalBlue','SaddleBrown','Salmon','SandyBrown','SeaGreen','SeaShell','Sienna','Silver','SkyBlue','SlateBlue','SlateGray','SlateGrey','Snow','SpringGreen','SteelBlue','Tan','Teal','Thistle','Tomato','Turquoise','Violet','Wheat','White','WhiteSmoke','Yellow','YellowGreen', 'transparent'];


	let activate_context = {},
		web_view = {},
		extension_uri = {},

		extension_path = '',
		storage_path = '',

		settings = {}, // mode_current, c_cid, filter_open, filter_val, p_path, picker_open, picker_color, picker_color_init, scroll_pos, cm_width
		settings_overrides = {},

		p_path = '', // Pfad der aktuellen Palette
		arr_p = [], // Paletten | scss-Dateien
		p_len = 0, // arr_p.length / Paletten-Anzahl bzw. gefundene scss-Dateien
		p_cid = -1, // palette current id

		c_max = 0, // colorwrapper-limit

		cm_is_activating = true,
		cm_is_visible = false,

		arr_n_mem = [],
		arr_c_mem = [],

		run_func_when_ready = false, // false || function

		intellisense_palette = '';


	exports.activate = activate;