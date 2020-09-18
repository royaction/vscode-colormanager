const 	vscode = require('vscode'),
		path = require('path'),
		fs = require('fs'),

activate = (context) => {

	const open_cm = (picker_mode, picker_color, intro_info) => { // picker_mode: 0 | 1 | 2     picker_color: false (ext_main) | string (ext_open_picker_sel)   intro_info: 0|1|2

		const init_webview = () => {


			// check_custom_styles ----------------------------------------------------------------------------
			const check_custom_styles = () => {

				/* 
				hier werden die von vscode festgelegten css-Variablen mit den Farben aus den settings neu definiert und mit "!important" priorisiert. Das Ganze 
				wird dann in eine css-Datei im Extension-Pfad geschrieben, da keine Datei-Einbindungen außerhalb vom Extension-Pfad erlaubt sind -> Content-Security-Policy!.
				(ursprüngliche Idee war eine CSS-Datei im User-Verzeichnis). NICHT ERNEUT RUMPROBIEREN! Aufgrund der Content-Security-Policy sind auch keine 
				Inline-CSS-Styles möglich ... und auch kein <style>-appends innerhalb der main.js ... alles ausprobiert!
				*/
	
				return new Promise(resolve => {
					
					const obj_settings_styles = vscode.workspace.getConfiguration("color-manager").styles;
					
	
					if(Object.entries(obj_settings_styles).length === 0 && obj_settings_styles.constructor === Object){
						resolve(true); // ██ nichts definiert: return true ██
					} 
					else{
						
						const obj_vscode_vars = {
							background: "--vscode-editor-background",
							foreground: "--vscode-editor-foreground",
							buttonBackground: "--vscode-button-background",
							buttonForeground: "--vscode-button-foreground",
							buttonHoverBackground: "--vscode-button-hoverBackground",
							buttonBorder: "--vscode-input-border",
							inputBackground: "--vscode-input-background",
							inputForeground: "--vscode-input-foreground",
							inputBorder: "--vscode-dropdown-border",
							dropdownForeground: "--vscode-dropdown-foreground",
							dropdownBackground: "--vscode-dropdown-background",
							dropdownHoverBackground: "--vscode-list-hoverBackground",
							
							selectionBorder: "--selection-border",
							popupBorder: "--popup-border",
							overlayBackground: "--overlay-background"
						};
						
						let str_user_overrides = '';
						
						for (key in obj_settings_styles) {
							if(obj_vscode_vars[key] !== undefined) str_user_overrides += obj_vscode_vars[key]+': '+obj_settings_styles[key]+'!important;';
						}
						
						if(str_user_overrides !== ''){
							
							str_user_overrides = ':root{'+str_user_overrides+'}';
							
							fs.writeFile(context.extensionPath+'/content/dist/user_overrides.css', str_user_overrides, (err) => { // Name "user_overrides.css" absimmen mit "webview_html_content()"!
								if(err){
									resolve(false); // ██ error: return false ██
								}
								else{
									custom_styles = true; // siehe "webview_html_content()" (s.u.)
									resolve(true); // ██ css erfolgreich erzeugt: return true ██
								}
							});
							
						}
						
					}
	
				});

			},

			// webview html ----------------------------------------------------------------------------
			webview_html_content = () => {
				
				// Achtung! vscode erlaubt nur einen Resourcen-Pfad! Zum Testen daher die main.js in den Unterordner "dist" kopieren und vor dem Release 
				// dann wieder eine Ebene hoch und erneut abspeichern (damit die .min erzeugt wird). Hier dann 'main.js' gegen 'main.min.js' tauschen!
				
				
				// Alle Pfade die hier definiert werden müssen auch bei createWebviewPanel unter "localResourceRoots" angegeben werden (s.u.)!
				const 	script_uri = vscode.Uri.file(path.join(context.extensionPath, 'content', 'main.js')).with({ scheme: 'vscode-resource' }),
						css_uri = vscode.Uri.file(path.join(context.extensionPath, 'content/dist', 'main.min.css')).with({ scheme: 'vscode-resource' }),
						media_path = vscode.Uri.file(path.join(context.extensionPath, 'content/media')).with({ scheme: 'vscode-resource' }).toString() + '/';
				
				let css_custom_uri = custom_styles === false ? '' : '<link rel="stylesheet" href="'+vscode.Uri.file(path.join(context.extensionPath, 'content/dist', 'user_overrides.css')).with({ scheme: 'vscode-resource' })+'"></link>'; 
						
				// Content-Security-Policy!
				return `
					<meta charset="UTF-8">
					<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: https: ${panel.webview.cspSource}; script-src vscode-resource:; style-src vscode-resource:;">
					<link rel="stylesheet" href="${css_uri}">
					${css_custom_uri}
					<script src="${script_uri}"></script>
					<base href="${media_path}">
				`;
				
				// Info! "img-src ... ${panel.webview.cspSource}" dient dazu um Bilder von externen URL's zu laden (wird im Moment aber nicht verwendet!)
				
				// <base href="${media_path}"> ist der root-Pfad für Bilder (siehe Changelog-Extension ... keine Pfadangabe nötig, sondern einfach nur Dateiname)
				
			},

			// sort arr_p ----------------------------------------------------------------------------
			sort_palettes = () => {

				arr_p.sort((a, b) => {
					a = a.toLowerCase();
					b = b.toLowerCase();
					if (a < b) return -1;
					else if (a > b) return 1;
					return 0;
				});

			},

			// globals init_webview -------------------------------------------------------------------

			arr_new_n = ['New Color'], // mit main.js abstimmen
			arr_new_c = ['#000']; // mit main.js abstimmen

			let active_editor = vscode.window.activeTextEditor,
				custom_styles = false;

			// start init_webview ____________________________________________________________________________________________________

			vscode.window.onDidChangeActiveTextEditor(e => {
				if(e) active_editor = vscode.window.activeTextEditor;
			});
			
			// global für panel.dispose() und Extension deactivate()
			global.store_state_on_exit = () => {
				// Benutzer hat aus irgendeinem Grund den storage-Ordner gelöscht
				if (fs.existsSync(storage_path) === false) return;

				const str_settings =
				'mode_current = '+arr_settings[0]+'\n'+ // insert-listview | insert-floatview | edit | edit-sort | edit-convert | no-palettes
				'c_cid = '+arr_settings[1]+'\n'+ // -1 | id
				'filter_open = '+arr_settings[2]+'\n'+   // 0 | 1
				'filter_val = '+arr_settings[3]+'\n'+   // leer | string
				'p_path = '+p_path+'\n'+
				'version = '+current_version 
				;

				fs.writeFile(storage_path+'_settings.ini', str_settings, (err) => {
					if(err) infobox('Error! Code: '+err.code);
				});
			};

			// webview erstellen und an global binden, damit die add-Extension darauf zugreifen kann
			global.panel = vscode.window.createWebviewPanel(
				'webview',
				'Color Manager', // Titel
				vscode.ViewColumn.Beside, {
					enableScripts: true,
					retainContextWhenHidden: true,
					localResourceRoots: [ vscode.Uri.file(path.join(context.extensionPath, 'content')), vscode.Uri.file(path.join(context.extensionPath, 'content/dist')), vscode.Uri.file(path.join(context.extensionPath, 'content/media')) ] // Content-Security-Policy!
				},

			);

			// message receiver main.js  --------------------------------------------------------------------------------------------------------------------
			panel.webview.onDidReceiveMessage(

				msg => {

					switch (msg.command) {

						// insert ----------------------------------------------------------
						case 'insert':

							//if(typeof vscode.window.activeTextEditor === 'undefined') return;
							
							let insert_colorval = msg.colorval;
							
							// Hex als 0x-Hex einfügen?
							if(insert_colorval.substr(0,1) === '#'){
								if(vscode.workspace.getConfiguration("color-manager").insertClassicHex === true){
									insert_colorval = '0x' + insert_colorval.substr(1,insert_colorval.length);
								}
							}

							// selection ?
							const sel = active_editor.selections[0];

							// keine selection
							if( sel.start.line === sel.end.line && sel.start.character === sel.end.character ){

								const 	line = active_editor.document.lineAt(sel.start.line).text,
										arr_pos = no_selection_get_color_pos(line, sel.active.character);

								active_editor.edit(builder => {
									if(arr_pos === false) builder.replace(new vscode.Range(sel.start.line, sel.active.character, sel.start.line, sel.active.character), insert_colorval);
									else builder.replace(new vscode.Range(sel.start.line, arr_pos[0], sel.start.line, arr_pos[1]), insert_colorval);
								});

							}
							// selection !
							else{

								const sel_len = active_editor.selections.length;
								let s = 0;

								active_editor.edit(builder => {
									for (s; s < sel_len; s++) builder.replace(active_editor.selections[s], insert_colorval);
								});

							}

							break;

						// store_webview_state ----------------------------------------------------------
						case 'store_webview_state':
							arr_settings[0] = msg.mode_current;
							arr_settings[1] = msg.c_cid; // -1 | id
							arr_settings[2] = msg.filter_open;  // 0 = nicht geöffnet | 1 = geöffnet
							arr_settings[3] = msg.filter_val;  // leer | string
							break;

						case 'save_active_doc':
							if (active_editor !== undefined) active_editor.document.save();
							break;

						// texteditor ----------------------------------------------------------
						case 'texteditor':

							vscode.workspace.onDidSaveTextDocument((uri) => {

								if(uri.fileName.toLocaleLowerCase() === p_path.replace(/\//g, '\\').toLocaleLowerCase()) {

									const arr_n_c_new = load_colors(p_path); // return false bei error ( und infobox error s.o.)

									if(arr_n_c_new !== false){

										panel.webview.postMessage({ command: 'refresh', arr_n_c: arr_n_c_new });

										// autocomplete refresh?
										if(autocomplete_palette === arr_p[p_cid]){ // wenn kein autocomplete, dann autocomplete_palette = ''

											const arr_colors_len = arr_n_c_new.length;

											let arr_colors = [];

											// 2D-Array mit neuen Farben erstellen (wie "load_colors()")
											for (i = 0; i < arr_colors_len; i++) {
												arr_colors[i] = [];
												arr_colors[i][0] = arr_n_c_new[i];
												arr_colors[i][1] = arr_n_c_new[i];
											}

											subscribe_autocomplete_providers(autocomplete_palette, arr_colors);
											infobox('Color Manager: intellisense for palette "'+autocomplete_palette+'" refreshed!');

										}

									}

								}
							});
							vscode.workspace.openTextDocument(p_path).then(doc => vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true }));
							break;

						// change palette ----------------------------------------------------------
						case 'change_palette':
							p_path = storage_path+arr_p[msg.p_cid]+".scss";
							const arr_n_c_new = load_colors(p_path); // return false bei error ( und infobox error s.o.)
							if(arr_n_c_new !== false) panel.webview.postMessage({ command: 'refresh', arr_n_c: arr_n_c_new });
							break;

						// save palette ----------------------------------------------------------
						case 'save_palette':

							save_colors(msg.arr_n, msg.arr_c, p_path, success => {
								if (success === true) panel.webview.postMessage({command: 'save_palette_success'});
							});

							// autocomplete refresh?
							if(autocomplete_palette === arr_p[p_cid]){ // wenn kein autocomplete, dann autocomplete_palette = ''

								const arr_colors_len = msg.arr_n.length;

								let arr_colors = [];

								// 2D-Array mit neuen Farben erstellen (wie "load_colors()")
								for (i = 0; i < arr_colors_len; i++) {
									arr_colors[i] = [];
									arr_colors[i][0] = msg.arr_n[i];
									arr_colors[i][1] = msg.arr_c[i];
								}

								subscribe_autocomplete_providers(autocomplete_palette, arr_colors);
								infobox('Color Manager: intellisense for palette "'+autocomplete_palette+'" refreshed!');

							}

							break;

						// add palette ----------------------------------------------------------
						case 'add_palette':

							// add
							if(msg.arr_n === false){
								var	arr_add_n = arr_new_n,
									arr_add_c = arr_new_c,
									arr_return = [ [ arr_new_n[0], arr_new_c[0] ] ];
							}
							// save as
							else{
								var arr_add_n = msg.arr_n,
									arr_add_c = msg.arr_c,
									arr_return = false;
							}

							save_colors(arr_add_n, arr_add_c, storage_path+msg.fname+".scss", success => {
								if (success === true){

									// Paletten aktualisieren und erstellte Palette als neue aktive Palette festlegen
									arr_p[p_len] = msg.fname;
									p_len++;

									sort_palettes();

									for (i = 0; i < p_len; i++) {
										if(arr_p[i] === msg.fname){
											p_cid = i;
											break;
										}
									}

									p_path = storage_path+msg.fname+".scss";

									panel.webview.postMessage({ command: 'add_palette_success', arr_return: arr_return, arr_p_l_c: [arr_p, p_len, p_cid]});

								}
							});

							break;

						// rename palette ----------------------------------------------------------
						case 'rename_palette':

							fs.rename(storage_path+arr_p[msg.p_id]+'.scss', storage_path+msg.fname+'.scss', (err) => {
								if (err) infobox('Error-Code: '+err.code);
								else{

									// Paletten-Array aktualisieren und sortieren
									arr_p[msg.p_id] = msg.fname;
									sort_palettes();

									// p_cid und p_path aktualisieren, falls die umbenannte Palette die aktuell geladene Palette ist
									if(msg.p_id === p_cid){

										for (i = 0; i < p_len; i++) {
											if(arr_p[i] === msg.fname){
												p_cid = i;
												break;
											}
										}

										p_path = storage_path+arr_p[p_cid]+'.scss';

									}

									// sortiertes Paletten-Array an main.js zurückgeben und dort neu initialisieren
									panel.webview.postMessage({ command: 'rename_palette_success', arr_p_l_c: [arr_p, p_len, p_cid] });

								}
							});

							break;

						// delete palette ----------------------------------------------------------
						case 'delete_palette':

							fs.unlink(storage_path+arr_p[msg.p_id]+'.scss', (err) => {
								if (err) infobox('Error-Code: '+err.code);
								else{

									arr_p.splice(msg.p_id, 1);
									p_len--;

									// erste Palette bzw. erste css-Datei laden, falls die gelöschte Palette die aktuell geladene Palette war
									var arr_n_c_new = true; // wenn unten true übergeben wird, dann hat sich die aktuelle Palette nicht geändert

									if(p_len > 0){
										if(msg.p_id === p_cid){
											// erste Palette laden
											p_cid = 0;
											p_path = storage_path+arr_p[0]+'.scss';
											arr_n_c_new = load_colors(p_path); // return false bei error ( und infobox error s.o.)
										}
									}
									else{
										arr_n_c_new = -2; // keine Palette übrig / Verzeichnis leer
									}

									// true für unveränderte Palette, oder aktualisiertes Paletten-Array an main.js zurückgeben
									if(arr_n_c_new !== false){
										panel.webview.postMessage({ command: 'delete_palette_success', arr_n_c: arr_n_c_new, arr_p_l_c: [arr_p, p_len, p_cid]});
									}

								}

							});

							break;

					}
				},
				undefined,
				context.subscriptions

			),

			// Webview schließen --------------------------------------------------------------------------------------
			panel.onDidDispose(() => {
				cm_is_open = false;
				store_state_on_exit();
			}, null, context.subscriptions);


			// -----------------------------------------------------------------------------------------------------------------
			// Start init_webview() ---------------------------------------------------------------------------------------
			// -----------------------------------------------------------------------------------------------------------------
			
			(async () => {
				
				// custom styles aus settings
				const check_custom_styles_result = await check_custom_styles();
				if(check_custom_styles_result === false) infobox('Error! Custom styles could not be loaded!');
				
				// Inhalte zuweisen
				panel.webview.html = webview_html_content();

				// post 'init' an main.js
				const arr_n_c_init = load_colors(p_path); // return false bei error ( und infobox error s.o.)
				
				// Hilfe anzeigen?
				let help_html = intro_info === 2 ? get_help_html() : false;
				// Test
				//help_html = get_help_html();
				
				if(arr_n_c_init !== false){
					panel.webview.postMessage({command: 'init', arr_settings: arr_settings, arr_n_c: arr_n_c_init, arr_p_l_c: [arr_p, p_len, p_cid], picker_mode: picker_mode, picker_color: picker_color, changelog_html: changelog_html, help_html: help_html});
					cm_is_open = true;
				}

			})();	

		},

		// Extension Main globals ________________________________________________________________________________________

		arr_settings_init = ['insert-listview', -1, 0, '', false], // mode_current, c_cid, filter_open, filter_val, changelog_html
		
		current_version = vscode.extensions.getExtension('royaction.color-manager').packageJSON.version;
		
		let arr_settings = [], // mode_current, c_cid, pm_open
			arr_p = [], // Paletten | scss-Dateien
			p_len = 0, // arr_p.length / Paletten-Anzahl bzw. gefundene scss-Dateien
			p_cid = -1, // palette current id
			changelog_html = false,
			i = 0;

		// Start Extension Main ███████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

		// Erst-Initialisierung
		if (fs.existsSync(storage_path) === false) {

			fs.mkdir(storage_path, (err) => {
				if(err) {
					infobox('Error! Code: '+err.code)
				}
				else{

					(async () => {

						const arr_create_factory_result = await create_factory_palettes();
						arr_p = arr_create_factory_result[0];
						p_len = arr_create_factory_result[1];
						p_cid = arr_create_factory_result[2];
						p_path = arr_create_factory_result[3];

						arr_settings = arr_settings_init;

						init_webview();

					})();

				}
			});

		}
		// schon mal benutzt ...
		else{

			// 'arr_settings' aus settings.ini erstellen --------------------------------------------------------------
			if (fs.existsSync(storage_path+'_settings.ini') === true){

				/*
					Manipulation prüfen, bzw. alles überprüfen was in der main.js zum Error führen könnte!

					[0] mode_current = insert-listview | insert-floatview | edit | edit-sort | edit-convert | no-palettes
					[1] c_id = -1 | int > 0
					[2] filter_open = 0 | 1
					[3] filter_val = leer | string
					[4] p_path = ...
					
					[5] version = ... Info! Wird bei der Prüfung getrennt berücksichtigt, da erst mit v0.5.8 hinzugekommen (bei den ersten Checks wird weiterhin nur auf Länge 5 geprüft)

				*/

				let check_failed = false,
					settings_len = 0;

				// start
				try {
					arr_settings = fs.readFileSync(storage_path+'_settings.ini', 'utf8').split('\n');
					settings_len = arr_settings.length;
				} catch (err) {
					if (err) check_failed = true;
				}


				if(settings_len < 5){
					check_failed = true;
				}
				else{
					
					let setting = '';

					for (i = 0; i < settings_len; i++) { // ███ 5 oder 6 ███

						setting = arr_settings[i].slice(arr_settings[i].indexOf("=",0)+2, arr_settings[i].length); // abstimmen mit onDispose() !

						// Achtung! Alle trimmen bis auf "filter_val" (z.B. Google Material-Palette -> wenn dort vernünftig nach Zahlen in den Namen gefiltert werden soll muss am Anfang ein Leerzeichen eingegeben werden)
						// Außerdem den Filterwert nicht in Int umwandeln falls nach Leerzeichen + Zahl gesucht wird: " 500"
						if(i !== 3){ // [3] = filter_val
							setting = setting.trim();
							if(setting !== '' && !isNaN(setting)) setting = parseInt(setting); // parseInt str-digit
						}

						arr_settings[i] = setting;

					}
					

					// [0] mode_current = insert-listview | insert-floatview | edit | edit-sort | edit-convert | no-palettes
					// Achtung!!! Hier nicht auf 'no-palettes' prüfen. Wird zwar beim Schließen in der ini abgespeichert, aber dieser Mode darf beim Starten nicht zugewiesen werden. Wenn unten beim Überprüfen
					// des Paletten-Ordners festgestellt wird, dass der Ordner leer ist werden sowieso die Factory-Paletten neu angelegt und die Standard-Settings geladen (mit 'insert-listview')
					if(['insert-listview', 'insert-floatview', 'edit', 'edit-sort', 'edit-convert'].indexOf(arr_settings[0], 0) === -1) check_failed = true;

					// [1] c_id = -1 | int > 0
					if(isNaN(arr_settings[1]) || ( !isNaN(arr_settings[1]) && (arr_settings[1] < -1) ) ) check_failed = true;

					// [2] filter_open = 0 | 1
					if(arr_settings[2] !== 0 && arr_settings[2] !== 1) check_failed = true;

					// [3] filter_val
					// leer oder string ... nicht prüfen (könnte alles Mögliche sein)

					// [4] p_path
					p_path = arr_settings[4];

					if (p_path === '' || fs.existsSync(p_path) === false){
						check_failed = true;
						p_path = ''; // ███ s.u. 1 ███
					}

				}
				
				// check failed -> Init-Settings
				if (check_failed === true){
					arr_settings = arr_settings_init;
				}
				else{
	
					// Version prüfen / Changelog anzeigen
					var get_changelog = false;
					
					// user möchte changelog über command anzeigen (ext_changelog)
					if(intro_info === 1){
						get_changelog = true;
					}
					// prüfen ob sich durch ein Update die Versionsnummer geändert hat und changelog beim Öffnen anzeigen
					else{
						
						if(settings_len === 6){	
							if (arr_settings[5].trim() !== current_version) get_changelog = true;
						}
						// v0.5.8 ("version =" noch nicht vorhanden) oder User hat manipuliert
						else{
							get_changelog = true;
						}
						
					}

					if (get_changelog === true) changelog_html = get_changelog_html();
					
					// Test
					// changelog_html = get_changelog_html();
					
					
				}

			}

			// Paletten-Array 'arr_p' aus gefundenen scss Dateien erstellen -------------------------------------------------------------------------------

			try {
				var files = fs.readdirSync(storage_path),
					files_len = files.length;
			} catch (err) {
				if (err) var files_len = 0;
			}

			if(files_len !== 0){

				// toLowerCase() extrem wichtig! Ab und an gab es vor v0.4.9 beim Öffnen immer mal wieder Probleme, dass der in der ini gespeicherte Pfad und der
				// ermittelte strorage path nicht überein gestimmt haben:
				// "c:/portable/VScode" <> "c:/portable/vscode"  ("VS" unterschiedlich)

				const 	p_path_lc = p_path.toLowerCase(),
						storage_path_lc = storage_path.toLowerCase();

				for (i = 0; i < files_len; i++) {

					if(path.extname(files[i]) === '.scss') {

						arr_p[p_len] = files[i].replace('.scss', '');
						p_len++;

						if(p_path !== '' && p_cid === -1){ // 'p_path' aus settings.ini ermittelt ███ s.o. 1 ███
							if(storage_path_lc+files[i].toLowerCase() === p_path_lc) p_cid = i;
						}

					}

				}

			}

			// keine scss-Dateien gefunden oder immer noch init-Wert (catch err / loop wurde nicht ausgeführt s.o.)
			if(p_len === 0){

				(async () => {

					const arr_create_factory_result = await create_factory_palettes();
					arr_p = arr_create_factory_result[0];
					p_len = arr_create_factory_result[1];
					p_cid = arr_create_factory_result[2];
					p_path = arr_create_factory_result[3];

					arr_settings = arr_settings_init;

					init_webview();

				})();

			}
			// scss-Dateien vorhanden
			else{

				//  falls der Pfad aus der settings.ini nicht gefunden wurde (z.B. Datei durch User gelöscht), dann erste scss-Datei aus dem Ordner laden
				if(p_cid === -1){
					p_path = storage_path+arr_p[0]+'.scss'; // ███ global 'p_path' aktualisieren ███
					p_cid = 0;
					arr_settings = arr_settings_init;
				}

				init_webview(); // ███ init webview ███

			}

		}

	},

	// von mehreren Extensions verwendet ██████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

	storage_path = context.globalStoragePath.replace(/\\/g, '/')+"/",

	// css Farben (von beiden Extensions verwendet) Achtung!!! 'transparent' am Ende eingefügt für 'no_selection_get_color_pos()'
	arr_csscolors = ['AliceBlue','AntiqueWhite','Aqua','Aquamarine','Azure','Beige','Bisque','Black','BlanchedAlmond','Blue','BlueViolet','Brown','BurlyWood','CadetBlue','Chartreuse','Chocolate','Coral','CornflowerBlue','Cornsilk','Crimson','Cyan','DarkBlue','DarkCyan','DarkGoldenRod','DarkGray','DarkGrey','DarkGreen','DarkKhaki','DarkMagenta','DarkOliveGreen','Darkorange','DarkOrchid','DarkRed','DarkSalmon','DarkSeaGreen','DarkSlateBlue','DarkSlateGray','DarkSlateGrey','DarkTurquoise','DarkViolet','DeepPink','DeepSkyBlue','DimGray','DimGrey','DodgerBlue','FireBrick','FloralWhite','ForestGreen','Fuchsia','Gainsboro','GhostWhite','Gold','GoldenRod','Gray','Grey','Green','GreenYellow','HoneyDew','HotPink','IndianRed','Indigo','Ivory','Khaki','Lavender','LavenderBlush','LawnGreen','LemonChiffon','LightBlue','LightCoral','LightCyan','LightGoldenRodYellow','LightGray','LightGrey','LightGreen','LightPink','LightSalmon','LightSeaGreen','LightSkyBlue','LightSlateGray','LightSlateGrey','LightSteelBlue','LightYellow','Lime','LimeGreen','Linen','Magenta','Maroon','MediumAquaMarine','MediumBlue','MediumOrchid','MediumPurple','MediumSeaGreen','MediumSlateBlue','MediumSpringGreen','MediumTurquoise','MediumVioletRed','MidnightBlue','MintCream','MistyRose','Moccasin','NavajoWhite','Navy','OldLace','Olive','OliveDrab','Orange','OrangeRed','Orchid','PaleGoldenRod','PaleGreen','PaleTurquoise','PaleVioletRed','PapayaWhip','PeachPuff','Peru','Pink','Plum','PowderBlue','Purple','Red','RosyBrown','RoyalBlue','SaddleBrown','Salmon','SandyBrown','SeaGreen','SeaShell','Sienna','Silver','SkyBlue','SlateBlue','SlateGray','SlateGrey','Snow','SpringGreen','SteelBlue','Tan','Teal','Thistle','Tomato','Turquoise','Violet','Wheat','White','WhiteSmoke','Yellow','YellowGreen', 'transparent'];


	// create_factory_palettes ________________________________________________________________________________________
	create_factory_palettes = async() => {
		
		return new Promise(resolve => {
		
			let arr_f = [], // = arr_p
				f_len = 0; // = p_len

			const factory_path = vscode.extensions.getExtension('royaction.color-manager').extensionPath + '/content/factory palettes/palettes',
		
			copy_factorypalettes_to_storage = async function() {
				
				if (fs.existsSync(factory_path)) {
					
					fs.readdirSync(factory_path).forEach(function(file){
						
						// gleichzeitig noch Namen und Anzahl ermitteln (s.u.)
						arr_f[f_len] = file.slice(0, -5); // ".scss" entfernen
						f_len++;
						
						// kopieren
						fs.copyFile(factory_path+'/'+file, storage_path+'/'+file, (err) => {
							if (err) throw err;
						});

					});
					
				}
				
			};
					
			// Start -----------------
		
			copy_factorypalettes_to_storage().then(function() {
				
				// die Demo-Palette grundsätzlich dynamisch erzeugen, falls der User den Factory-Ordner im Extension-Verzeichnis manipuliert (somit ist wenigstens eine Palette verfügbar)
				const 	demo_name = 'Demo Palette', // bei erstmaligem Öffnen anzuzeigende Palette
						demo_path = storage_path+demo_name+'.scss',
						arr_demo_n = ['This is the main purpose of the extension ... quickly insert colors by meaningful names',  'coorporate dark', 'coorporate light', 'coorporate blue', 'coorporate green'],
						arr_demo_c = ['run the command ´color manager help´ to open the manual', '#20272F', '#eee', '#4EC5F1', '#0df2c9'];
						
				let f_cid = 0; // = p_cid
						
				// Demo-Paletten-Name zu Factory-Platten-Namen hinzufügen
				arr_f[f_len] = demo_name;
				f_len++;
				
				// sortieren
				arr_f.sort(function (a, b) {
					if (a < b) return -1;
					else if (a > b) return 1;
					return 0;
				});
				
				// f_cid bzw. p_cid ermitteln
				for (i = 0; i < f_len; i++) {
					if(arr_f[i] === demo_name){
						f_cid = i;
						break;
					}
				}
				
				// Demo-Palette erzeugen -> return
				save_colors(arr_demo_n, arr_demo_c, demo_path, success => {
					if (success === true){
						resolve([arr_f, f_len, f_cid, demo_path]); // ███ resolve / return ███
					}
				});
				
			});
		
		});

	},

	// save_colors ________________________________________________________________________________________
	save_colors = async(arr_n, arr_c, path, callback_function) => {

		const c_len = arr_c.length;

		// $c: 'my color', rgb(0, 255, 191);
		let str = '';

		for (i = 0; i < c_len; i++) {
			// Nicht erlaubt: "'" und "'," (abstimmen mit load_colors)
			str += "$c: '"+arr_n[i].replace(/',|'/g, ' ')+"', "+arr_c[i].replace(/',|'/g, ' ')+";\n";
		}

		str = str.substr(0, str.length - 1); // letzten Linebreak entfernen

		fs.writeFile(path, str, (err) => {
			if(err) {
				infobox('Error! Code: '+err.code);
				callback_function(false);
			}
			else{
				callback_function(true);
			}
		});

	},

	load_colors = (path) => {

		try {
			var arr_lines = fs.readFileSync(path, 'utf8').split('\n');
		} catch (err) {
			if(err){
				if (err.code === 'ENOENT') infobox('Error: File not found!');
				return false;
			}
		}

		const lines_len = arr_lines.length;

		let arr_n_c = [],
			line_current = "",
			n = 0;

		for (i = 0; i < lines_len; i++) {

			line_current = arr_lines[i].trim();

			if(line_current !== ''){
				// $c: 'my color', rgb(0, 255, 191); Nicht erlaubt: "'" und "'," (abstimmen mit save_colors)
				arr_n_c[n] = [];
				arr_n_c[n][0] = line_current.slice(line_current.indexOf("'", 0) + 1, line_current.lastIndexOf("'")).trim();
				arr_n_c[n][1] = line_current.slice(line_current.indexOf("',", 0) + 2, line_current.lastIndexOf(";")).trim();
				n++;
			}

		}

		return n > 0 ? arr_n_c : -1;

	},

	// infobox ________________________________________________________________________________________
	infobox = (str) => {
		vscode.window.showInformationMessage(str);
	},
	
	// get_changelog_html ________________________________________________________________________________________
	get_changelog_html = () => {
		return fs.readFileSync(vscode.extensions.getExtension('royaction.color-manager').extensionPath+'/content/infos/changelog.html', 'utf8');
	},
	
	// get_help_html ________________________________________________________________________________________
	get_help_html = () => {
		return fs.readFileSync(vscode.extensions.getExtension('royaction.color-manager').extensionPath+'/content/infos/help.html', 'utf8');
	},

	// Farbwerte bei einfachem Cursor ermitteln ________________________________________________________________________________________
	no_selection_get_color_pos = (line, pos_cursor) => {

		const 	line_lc = line.toLowerCase(),
				line_len = line.length;

		let pos_start = -1,
			pos_end = -1,
			csys = -1, // 0 = hex || 1 = rgb hsl
			char_current = '',

			i = pos_cursor;

		for (i; i >= 0; i--) {

			char_current = line_lc.substr(i, 1);

			// hex #
			if(char_current === '#' && i + 4 <= line_len){ // i + 4 = Mindestlänge '#fff'
				pos_start = i;
				csys = 0;
				break;
			}
			// hex 0x 
			else if(char_current === '0'){ 
				if(i + 5 <= line_len && line_lc.substr(i+1, 1) === 'x'){ // i + 5 = Mindestlänge '0xfff'
					pos_start = i;
					csys = 0;
					break;
				}
			}
			// rgb 
			else if(char_current === 'r'){
				if(i + 9 < line_len && line_lc.substr(i+1, 2) === 'gb'){ // i + 9 = Mindestlänge 'rgb(0,0,0)'
					pos_start = i;
					csys = 1;
					break;
				}
			}
			// hsl
			else if(char_current === 'h'){
				if(i + 11 < line_len && line_lc.substr(i+1, 2) === 'sl'){ // i + 11 = Mindestlänge 'hsl(0,0%,0%)'
					pos_start = i;
					csys = 1;
					break;
				}
			}

		}

		// pos_end hex | rgb hsl --------------------------------------------------------------------------------------------
		if(pos_start !== -1){

			// pos_end hex
			if(csys === 0){

				for (i = pos_start + 1; i < line_lc.length + 1; i++) { // line.length + 1 = linebreak (wird in '_documentData._lines' nicht berücksichtigt)
					char_current = line_lc.substr(i, 1);
					if(char_current !== "x" && char_current.match(/[0-9a-f]/) === null){ // !== x -> "0xfff", ansonsten nur Zanhlen und Buchstaben von a bis f
						pos_end = i;
						break;
					}
				}
			}
			// pos_end rgb|hsl
			else{ // c_sys = 1
				pos_end = line_lc.indexOf(')', pos_start) + 1;
			}

			// befand sich der cursor in einem freien Raum zwischen 2 Farbwerten?    rgb(0,0,0)   I   #ddd
			if(pos_end !== -1 && pos_cursor > pos_end) pos_end = -1; // zurücksetzen (s.u.)

		}


		// css color || 'transparent' ? --------------------------------------------------------------------------------------------
		if(pos_end === -1) {

			const csscolors_len = arr_csscolors.length;

			for (i = 0; i < csscolors_len; i++){

				pos_start = line_lc.indexOf(arr_csscolors[i].toLowerCase());

				if(pos_start !== -1){
					pos_end = pos_start + arr_csscolors[i].length;
					if(pos_cursor >= pos_start && pos_cursor <= pos_end && line_lc.substr(pos_end, 1).match(/[a-z]/) === null){ // match: yellow green yellowgreen !
						break;
					}
					else{
						pos_end = -1; // zurücksetzen (s.u.)
					}
				}

			}

		}

		return pos_end !== -1 ? [pos_start, pos_end] : false;

	},

	// subscribe_autocomplete_providers ________________________________________________________________________________________
	subscribe_autocomplete_providers = (palette_name, arr_colors) => {

		const 	color_manager_config = vscode.workspace.getConfiguration("color-manager"),
				insert_classic_hex = color_manager_config.insertClassicHex === true ? true : false, // Hex als 0x-Hex einfügen?
				arr_languages = color_manager_config.languages,
				languages_len = arr_languages.length;

		if(languages_len === 0){
			infobox('Not possible! Specify some languages in the settings (see docs)!');
			return;
		}
		
		let lang_id = '';

		for (i = 0; i < languages_len; i++) {

			lang_id = arr_languages[i];

			// reset: aktuelle autocomplete-einträge zur jeweiligen Sprache entfernen (wenn vorhanden)
			if(Object.keys(obj_autocomplete_providers).find(key => key === lang_id)){
				obj_autocomplete_providers[lang_id].dispose();
			}

			// autocomplete provider in Objekt speichern
			obj_autocomplete_providers[lang_id] = vscode.languages.registerCompletionItemProvider(lang_id, {
				provideCompletionItems(document, position, token) {

					const createColorItem = (label,color) => {
						
						let item = new vscode.CompletionItem(label);
						
						item.documentation = color;
						
						// #-Hex oder 0x-Hex ?
						if(insert_classic_hex === false){ 
							item.insertText = color;
						}
						else{
							if(color.substr(0,1) === '#'){
								item.insertText = '0x' + color.substr(1,color.length);
							}
						}
						
						item.kind = vscode.CompletionItemKind.Color;

						return item;
					},

					colors_len = arr_colors.length;

					let arr_items = [];

					for (i = 0; i < colors_len; i++) arr_items[i] = createColorItem(arr_colors[i][0], arr_colors[i][1]);

					return arr_items;

				}

			});

			// subscribe
			context.subscriptions.push(obj_autocomplete_providers[lang_id]);

		}

		autocomplete_palette = palette_name;

	},

	// dispose_autocomplete_provider ________________________________________________________________________________________
	dispose_autocomplete_provider = () => {
		const keys = Object.keys(obj_autocomplete_providers);
		for (const key of keys) {
			obj_autocomplete_providers[key].dispose();
			delete obj_autocomplete_providers.key;
		}
	},

	// extension cm_open_palette ██████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

	ext_main = vscode.commands.registerCommand('extension.cm_open_palette', () => {
		if(cm_is_open === false) open_cm(0, false, 0);
	}),


	// extension cm_open_picker ██████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	ext_open_picker = vscode.commands.registerCommand('extension.cm_open_picker', () => {
		if(cm_is_open === false) open_cm(1, '#000', 0);
		else panel.webview.postMessage({ command: 'ext_open_picker', picker_color: '#000'});  // post message
	}),

	// extension cm_open_picker_sel ██████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

	ext_open_picker_sel = vscode.commands.registerCommand('extension.cm_open_picker_sel', () => {

		const 	editor = vscode.window.activeTextEditor,
				sel = editor.selections[0];

		let picker_color = ''; // fällt in main.js durch Prüfung, wenn nicht unten aktualisiert wird

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

		// open
		if(cm_is_open === false) open_cm(1, picker_color, 0);
		// post message
		else panel.webview.postMessage({ command: 'ext_open_picker', picker_color: picker_color});


	}),

	// ext_restore_factory ██████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

	ext_restore_factory = vscode.commands.registerCommand('extension.cm_restore_factory', () => {

		if(cm_is_open === true) panel.dispose();

		if (fs.existsSync(storage_path) === false){
			fs.mkdir(storage_path, (err) => {
				if(err) infobox('Error! Code: '+err.code)
			});
		}

		create_factory_palettes();
	}),
	
	// extension cm_changelog ██████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

	ext_changelog = vscode.commands.registerCommand('extension.cm_changelog', () => {
		// nicht geöffnet
		if(cm_is_open === false) open_cm(0, false, 1); // intro_info = 1 !!!
		// bereits offen
		else panel.webview.postMessage({ command: 'ext_changelog', changelog_html: get_changelog_html()});
	}),
	
	// extension cm_changelog ██████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

	ext_help = vscode.commands.registerCommand('extension.cm_help', () => {
		// nicht geöffnet
		if(cm_is_open === false) open_cm(0, false, 2); // intro_info = 2 !!!
		// bereits offen
		else panel.webview.postMessage({ command: 'ext_help', help_html: get_help_html()});
	}),

	// ext_palette_autocomplete_add ██████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

	ext_palette_autocomplete_add = vscode.commands.registerCommand('extension.cm_palette_autocomplete_add', () => {

		const error_msg = 'Not possible: open Color Manager and load a palette!';

		if(p_path === ''){ // main extension wurde noch nicht geöffnet oder initalisiert
			try {
				const arr_set = fs.readFileSync(storage_path+'_settings.ini', 'utf8').split('\n');
				p_path = arr_set[4].slice(arr_set[4].indexOf("=",0)+2, arr_set[4].length);
			} catch (err) {
				infobox(error_msg);
				return;
			}
		}

		const arr_autocomplete_colors = load_colors(p_path); // return false bei error ( und infobox error s.o.)

		if(arr_autocomplete_colors === false){
			infobox(error_msg);
			return;
		}

		subscribe_autocomplete_providers(p_path.slice(p_path.lastIndexOf("/")+1, p_path.lastIndexOf(".")), arr_autocomplete_colors);

		if(autocomplete_palette !== '') infobox('Color Manager: palette "'+autocomplete_palette+'" added to intellisense!'); // "autocomplete_palette" wird unter "subscribe_autocomplete_providers()" aktualisiert

	}),

	// ext_palette_autocomplete_remove ██████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	ext_palette_autocomplete_remove = vscode.commands.registerCommand('extension.cm_palette_autocomplete_remove', () => {
		if(obj_autocomplete_providers !== {}){
			dispose_autocomplete_provider();
			infobox('Color Manager: palette "'+autocomplete_palette+'" removed from intellisense!');
			autocomplete_palette = '';
		}
	}),

	// ext_palette_autocomplete_remove ██████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	ext_find_colors_in_selection = vscode.commands.registerCommand('extension.cm_find_colors_in_selection', () => {
		
		const extract_colors = function(reg){
			arr_temp = selected_text.match(reg); // wenn kein match, dann arr_temp = null (kann nicht auf length geprüft werden)
			if(arr_temp !== null){ 
				arr_add.push(...arr_temp); 
				add_len += arr_temp.length; 
			}
		}, 
		
		remove_duplicates = (arr) => {
			
			const a_len = arr.length;
			
			let obj = {}, 
				item = '', 
				arr_return = [], 
				x = 0, 
				y = 0;
			
			for (x; x < a_len; x++) {
				item = arr[x].replace(/\s+/g, ''); // Leerzeichen raus: rgb(0,0,0) und rgb(0, 0, 0) nur einmal hinzufügen (lowercase bereits unter getText gemacht s.u.)
				if (obj[item] !== true) {
					obj[item] = true;
					arr_return[y++] = arr[x];
				}
			}
			
			return arr_return;  
			
		},
		
		editor = vscode.window.activeTextEditor,
		sel_len = editor._selections.length,
		
		csscolors_len = arr_csscolors.length;

		let selected_text = "",
			arr_add = [],
			add_len = 0,
			arr_temp = [],
			css_color = '';
			
			
		// Start ---------------------------------------------------------------------------------------------------
		
		if(cm_is_open === false){
			infobox('Not possible! Please open the extension, so that the found colors can be added to a palette!');
			return; // ███ return ███
		}
		
		
		// Text aus selections einlesen
		if(sel_len < 1){
			infobox('Not possible! Please select some text in your document!');
			return; // ███ return ███
		}
		
		// toLowerCase !!!
		for (i = 0; i < sel_len; i++) selected_text += editor.document.getText(editor._selections[i]).toLowerCase();
		
		// Tabs und Zeilenumbrüche entfernen (falls sich gradient oder rgb/hsl-Wert über mehrere Zeilen erstreckt) 
		selected_text = selected_text.trim().replace(/(?:\r\n|\r|\n|\t)/g, ' ');
		selected_text = selected_text.replace(/\s\s+/g, ' '); // doppelte leerzeichen entfernen

		// zuerst muss berücksichtigt werden, dass es gradients gibt und dass die Farbwerte innerhalb der Klammern nicht als Extra-Werte aufgenommen werden dürfen
		// daher zuerst auf gradients überprüfen und aus dem Text herausschneiden, sodass abschließend nach den restlichen Farben gesucht werden kann	
	
		if(selected_text.indexOf('gradient') !== -1){
			
			const reg = /((repeating-)?linear|radial)-gradient\(((?:\([^\)]*\)|[^\)\(]*)*)\)/gi;
			
			let	arr_grad_positions = [],
				g_len = 0;

			// Start- und Endpositionen der gradients ermitteln
			while ((match = reg.exec(selected_text)) != null) {
				arr_grad_positions[g_len] = [];
				arr_grad_positions[g_len][0] = match.index;
				arr_grad_positions[g_len][1] = reg.lastIndex;
				g_len++;
			}
			
			if(g_len > 0){
				for (i = g_len - 1; i >= 0; i--) { // rückwärts entfernen (s.u.)
					
					// extrahieren
					arr_add[add_len] = selected_text.slice(arr_grad_positions[i][0],arr_grad_positions[i][1]); 
					add_len++;

					// gradients aus Text entfernen, für die nachfolgende Suche nach den restlichen Farben (s.u.)
					selected_text = selected_text.substr(0, arr_grad_positions[i][0] - 1) + selected_text.substr(arr_grad_positions[i][1] + 1);
					
				}
			}
			
		}
		
		// -----------------------------
		// hex, rgb, hsl (oben wurden ggf. die gradients aus "selected_text" entfernt, sodass nur die Farben übrig bleiben)
		
		// hex
		if(selected_text.indexOf('#') !== -1) extract_colors(/(#([0-9a-f]{3,4}){1,2}\b)/g);
		
		// rgb
		if(selected_text.indexOf('rgb') !== -1){
			extract_colors(/rgb\(\s*(0|255|25[0-4]|2[0-4]\d|1\d\d|0?\d?\d),\s*(0|255|25[0-4]|2[0-4]\d|1\d\d|0?\d?\d),\s*(0|255|25[0-4]|2[0-4]\d|1\d\d|0?\d?\d)\s*\)/g);
			
			if(selected_text.indexOf('rgba') !== -1){
				extract_colors(/rgba\(\s*(0|255|25[0-4]|2[0-4]\d|1\d\d|0?\d?\d)\s*,\s*(0|255|25[0-4]|2[0-4]\d|1\d\d|0?\d?\d)\s*,\s*(0|255|25[0-4]|2[0-4]\d|1\d\d|0?\d?\d)\s*,\s*(0|1|0?\.?\d*?)\s*\)/g);
			}
			
		}
		
		// hsl
		if(selected_text.indexOf('hsl') !== -1){
			extract_colors(/hsl\(\s*(0|360|35\d|3[0-4]\d|[12]\d\d|0?\d?\d)\s*,\s*(0|100|\d{1,2})%\s*,\s*(0|100|\d{1,2})%\s*\)/g);
			
			if(selected_text.indexOf('hsla') !== -1){
				extract_colors(/hsla\(\s*(0|360|35\d|3[0-4]\d|[12]\d\d|0?\d?\d)\s*,\s*(0|100|\d{1,2})%\s*,\s*(0|100|\d{1,2})%\s*,\s*(0|1|0?\.?\d*?)\s*\)/g);
			}
			
		}
		
		// 0x hex
		if(selected_text.indexOf('0x') !== -1){
			arr_temp = selected_text.match(/(0x([0-9a-f]{3,4}){1,2}\b)/g); // wenn kein match, dann arr_temp = null (kann nicht auf length geprüft werden)
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
			css_color = arr_csscolors[i].toLowerCase(); // toLowerCase !!!
			if(selected_text.indexOf(css_color) !== -1){
				arr_add[add_len] = css_color;
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
				arr_add = remove_duplicates(arr_add);
				arr_add.sort();
			}

			panel.webview.postMessage({ command: 'ext_find_colors_in_selection', arr_add: arr_add });
			
		}

	});

	//  global vars
	let cm_is_open = false,
		p_path = '', // Pfad der aktuellen Palette
		obj_autocomplete_providers = {},
		autocomplete_palette = '';


	// subscribe
	context.subscriptions.push(ext_main);
	context.subscriptions.push(ext_open_picker);
	context.subscriptions.push(ext_open_picker_sel);
	context.subscriptions.push(ext_restore_factory);
	context.subscriptions.push(ext_palette_autocomplete_add);
	context.subscriptions.push(ext_palette_autocomplete_remove);
	context.subscriptions.push(ext_find_colors_in_selection);
	context.subscriptions.push(ext_help);
	context.subscriptions.push(ext_changelog);

},

deactivate = () => {
	store_state_on_exit(); // unter activate() an global gebunden
};

exports.activate = activate;
exports.deactivate = deactivate;