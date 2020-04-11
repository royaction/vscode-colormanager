const 	vscode = require('vscode'),
		path = require('path'),
		fs = require('fs'),

activate = (context) => {

	const open_cm = (picker_mode, picker_color) => { // picker_mode: 0 | 1 | 2           picker_color: false (ext_main) | string (ext_open_picker_sel)

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

				const 	script_uri = vscode.Uri.file(path.join(context.extensionPath, 'content/dist', 'main.min.js')).with({ scheme: 'vscode-resource' }),
						css_uri = vscode.Uri.file(path.join(context.extensionPath, 'content/dist', 'main.min.css')).with({ scheme: 'vscode-resource' });
						css_custom_uri = custom_styles === false ? '' : '<link rel="stylesheet" href="'+vscode.Uri.file(path.join(context.extensionPath, 'content/dist', 'user_overrides.css')).with({ scheme: 'vscode-resource' })+'"></link>'; 	
						
				// Content-Security-Policy!
				return `
					<meta charset="UTF-8">
					<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src vscode-resource:; style-src vscode-resource:;">
					<link rel="stylesheet" href="${css_uri}">
					${css_custom_uri}
					<script src="${script_uri}"></script>
				`;

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
				'p_path = '+p_path
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
					localResourceRoots: [ vscode.Uri.file(path.join(context.extensionPath, 'content/dist')) ] // Content-Security-Policy!
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

				if(arr_n_c_init !== false){
					panel.webview.postMessage({command: 'init', arr_settings: arr_settings, arr_n_c: arr_n_c_init, arr_p_l_c: [arr_p, p_len, p_cid], picker_mode: picker_mode, picker_color: picker_color});
					cm_is_open = true;
				}

			})();	

		},

		// Extension Main globals ________________________________________________________________________________________

		arr_settings_init = ['insert-listview', -1, 0, '']; // mode_current, c_cid, filter_open, filter_val

		let arr_settings = [], // mode_current, c_cid, pm_open
			arr_p = [], // Paletten | scss-Dateien
			p_len = 0, // arr_p.length / Paletten-Anzahl bzw. gefundene scss-Dateien
			p_cid = -1, // palette current id
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

				*/

				let check_failed = false;

				// start
				try {
					arr_settings = fs.readFileSync(storage_path+'_settings.ini', 'utf8').split('\n');
				} catch (err) {
					if (err) check_failed = true;
				}

				if(arr_settings.length !== 5) check_failed = true; // ███ 5 ███

				let setting = '';

				for (i = 0; i < 5; i++) { // ███ 5 ███

					setting = arr_settings[i].slice(arr_settings[i].indexOf("=",0)+2, arr_settings[i].length); // abstimmen mit onDispose() !

					// Achtung! Alle trimmen bis auf "filter_val" (z.B. Google Material-Palette -> wenn dort vernünftig nach Zahlen in den Namen gefiltert werden soll muss am Anfang ein Leerzeichen eingegeben werden)
					// Außerdem den Filterwert nicht in Int umwandeln falls nach Leerzeichen + Zahl gesucht wird: " 500"
					if(i !== 3){ // [3] = filter_val
						setting = setting.trim();
						if(setting !== '' && !isNaN(setting)) setting = parseInt(setting); // parseInt str-digit
					}

					arr_settings[i] = setting;

				}

				if(i < 5){ // ███ 5 ███ // break / kein '=' gefunden!
					check_failed = true;
				}
				else{

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
				if (check_failed === true) arr_settings = arr_settings_init;

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

		// 'transparent' aus arr_csscolors entfernen
		let arr_csscolors_copy = arr_csscolors.slice();
		arr_csscolors_copy.pop();

				// Name + Farbwert unterschiedlich
		const	arr_famous_n = ['Android Green', 'Ebay Red', 'Ebay Blue', 'Ebay Yellow', 'Ebay Green', 'Facebook Blue', 'Google Blue', 'Google Red', 'Google Yellow', 'Google Green', 'Google Plus Red', 'Hello Kitty Pink', 'LikedIn Blue', 'Microsoft Red', 'Microsoft Green', 'Microsoft Blue', 'Microsoft Yellow', 'Microsoft Grey', 'Netflix Red', 'Pinterest Red', 'Quora Red', 'Spotify Green', 'Stackoverflow Orange', 'UPS Brown',  'UPS Yellow', 'Twitter Blue', 'Youtube Red'],
				arr_famous_c = ['#a4c639', '#e53238', '#0064d3', '#f4ae01', '#88b719', '#3b5998', '#4285f4', '#db4437', '#f4b400', '#0f9d58', '#d34836', '#B01455', '#0077B5', '#f25022', '#7fba00', '#00a4ef', '#ffb900', '#737373', '#e50914', '#e60023', '#b92b27', '#1db954', '#F48024',  '#330000',  '#ffd100', '#1da1f2', '#ff0000' ],

				arr_gradients_n = ['Basic Horizontal', 'Basic Vertical', 'Basic Diagonal', 'Basic Radial', 'Ellipse Farthest Corner Top Left', 'Ellipse Farthest Side Top Left', 'Stripes Pattern', 'Dots Pattern', 'Diagonal Border' ],
				arr_gradients_c = ['linear-gradient(to right, black 0%, white 100%)', 'linear-gradient(to bottom, black 0%, white 100%)', 'linear-gradient(135deg, black 0%, white 100%)', 'radial-gradient(ellipse at center, black 0%, white 100%)', 'radial-gradient(ellipse farthest-corner at top left, white 0%, black 50%)', 'radial-gradient(ellipse farthest-side at top left, white 0%, black 50%)', 'repeating-linear-gradient(45deg, transparent, transparent 10px, black 10px, black 20px) white', 'radial-gradient(white  2px, transparent 4px) 30px 30px / 15px 15px black', 'linear-gradient(45deg, white 0%, white 49%, black 50%, black 100%)' ],

				arr_demo_n = ['This is the main purpose of the extension ... quickly insert colors by meaningful names', 'coorporate dark', 'coorporate light', 'coorporate blue', 'coorporate green'],
				arr_demo_c = ['right-click on a color to see the context-menu ... and check out the intellisense command (see docs)', '#20272F', '#eee', '#4EC5F1', '#0df2c9'],

				arr_google_material_n = ['Red 50', 'Red 100', 'Red 200', 'Red 300', 'Red 400', 'Red 500', 'Red 600', 'Red 700', 'Red 800', 'Red 900', 'Red A100', 'Red A200', 'Red A400', 'Red A700', '', 'Pink 50', 'Pink 100', 'Pink 200', 'Pink 300', 'Pink 400', 'Pink 500', 'Pink 600', 'Pink 700', 'Pink 800', 'Pink 900', 'Pink A100', 'Pink A200', 'Pink A400', 'Pink A700', '', 'Purple 50', 'Purple 100', 'Purple 200', 'Purple 300', 'Purple 400', 'Purple 500', 'Purple 600', 'Purple 700', 'Purple 800', 'Purple 900', 'Purple A100', 'Purple A200', 'Purple A400', 'Purple A700', '', 'Deep Purple 50', 'Deep Purple 100', 'Deep Purple 200', 'Deep Purple 300', 'Deep Purple 400', 'Deep Purple 500', 'Deep Purple 600', 'Deep Purple 700', 'Deep Purple 800', 'Deep Purple 900', 'Deep Purple A100', 'Deep Purple A200', 'Deep Purple A400', 'Deep Purple A700', '', 'Indigo 50', 'Indigo 100', 'Indigo 200', 'Indigo 300', 'Indigo 400', 'Indigo 500', 'Indigo 600', 'Indigo 700', 'Indigo 800', 'Indigo 900', 'Indigo A100', 'Indigo A200', 'Indigo A400', 'Indigo A700', '', 'Blue 50', 'Blue 100', 'Blue 200', 'Blue 300', 'Blue 400', 'Blue 500', 'Blue 600', 'Blue 700', 'Blue 800', 'Blue 900', 'Blue A100', 'Blue A200', 'Blue A400', 'Blue A700', '', 'Light Blue 50', 'Light Blue 100', 'Light Blue 200', 'Light Blue 300', 'Light Blue 400', 'Light Blue 500', 'Light Blue 600', 'Light Blue 700', 'Light Blue 800', 'Light Blue 900', 'Light Blue A100', 'Light Blue A200', 'Light Blue A400', 'Light Blue A700', '', 'Cyan 50', 'Cyan 100', 'Cyan 200', 'Cyan 300', 'Cyan 400', 'Cyan 500', 'Cyan 600', 'Cyan 700', 'Cyan 800', 'Cyan 900', 'Cyan A100', 'Cyan A200', 'Cyan A400', 'Cyan A700', '', 'Teal 50', 'Teal 100', 'Teal 200', 'Teal 300', 'Teal 400', 'Teal 500', 'Teal 600', 'Teal 700', 'Teal 800', 'Teal 900', 'Teal A100', 'Teal A200', 'Teal A400', 'Teal A700', '', 'Green 50', 'Green 100', 'Green 200', 'Green 300', 'Green 400', 'Green 500', 'Green 600', 'Green 700', 'Green 800', 'Green 900', 'Green A100', 'Green A200', 'Green A400', 'Green A700', '', 'Light Green 50', 'Light Green 100', 'Light Green 200', 'Light Green 300', 'Light Green 400', 'Light Green 500', 'Light Green 600', 'Light Green 700', 'Light Green 800', 'Light Green 900', 'Light Green A100', 'Light Green A200', 'Light Green A400', 'Light Green A700', '', 'Lime 50', 'Lime 100', 'Lime 200', 'Lime 300', 'Lime 400', 'Lime 500', 'Lime 600', 'Lime 700', 'Lime 800', 'Lime 900', 'Lime A100', 'Lime A200', 'Lime A400', 'Lime A700', '', 'Yellow 50', 'Yellow 100', 'Yellow 200', 'Yellow 300', 'Yellow 400', 'Yellow 500', 'Yellow 600', 'Yellow 700', 'Yellow 800', 'Yellow 900', 'Yellow A100', 'Yellow A200', 'Yellow A400', 'Yellow A700', '', 'Amber 50', 'Amber 100', 'Amber 200', 'Amber 300', 'Amber 400', 'Amber 500', 'Amber 600', 'Amber 700', 'Amber 800', 'Amber 900', 'Amber A100', 'Amber A200', 'Amber A400', 'Amber A700', '', 'Orange 50', 'Orange 100', 'Orange 200', 'Orange 300', 'Orange 400', 'Orange 500', 'Orange 600', 'Orange 700', 'Orange 800', 'Orange 900', 'Orange A100', 'Orange A200', 'Orange A400', 'Orange A700', '', 'Deep Orange 50', 'Deep Orange 100', 'Deep Orange 200', 'Deep Orange 300', 'Deep Orange 400', 'Deep Orange 500', 'Deep Orange 600', 'Deep Orange 700', 'Deep Orange 800', 'Deep Orange 900', 'Deep Orange A100', 'Deep Orange A200', 'Deep Orange A400', 'Deep Orange A700', '', 'Brown 50', 'Brown 100', 'Brown 200', 'Brown 300', 'Brown 400', 'Brown 500', 'Brown 600', 'Brown 700', 'Brown 800', 'Brown 900', '', 'Gray 50', 'Gray 100', 'Gray 200', 'Gray 300', 'Gray 400', 'Gray 500', 'Gray 600', 'Gray 700', 'Gray 800', 'Gray 900', '', 'Blue Gray 50', 'Blue Gray 100', 'Blue Gray 200', 'Blue Gray 300', 'Blue Gray 400', 'Blue Gray 500', 'Blue Gray 600', 'Blue Gray 700', 'Blue Gray 800', 'Blue Gray 900'],
				arr_google_material_c = ['#FFEBEE', '#FFCDD2', '#EF9A9A', '#E57373', '#EF5350', '#F44336', '#E53935', '#D32F2F', '#C62828', '#B71C1C', '#FF8A80', '#FF5252', '#FF1744', '#D50000', '', '#FCE4EC', '#F8BBD0', '#F48FB1', '#F06292', '#EC407A', '#E91E63', '#D81B60', '#C2185B', '#AD1457', '#880E4F', '#FF80AB', '#FF4081', '#F50057', '#C51162', '', '#F3E5F5', '#E1BEE7', '#CE93D8', '#BA68C8', '#AB47BC', '#9C27B0', '#8E24AA', '#7B1FA2', '#6A1B9A', '#4A148C', '#EA80FC', '#E040FB', '#D500F9', '#AA00FF', '', '#EDE7F6', '#D1C4E9', '#B39DDB', '#9575CD', '#7E57C2', '#673AB7', '#5E35B1', '#512DA8', '#4527A0', '#311B92', '#B388FF', '#7C4DFF', '#651FFF', '#6200EA', '', '#E8EAF6', '#C5CAE9', '#9FA8DA', '#7986CB', '#5C6BC0', '#3F51B5', '#3949AB', '#303F9F', '#283593', '#1A237E', '#8C9EFF', '#536DFE', '#3D5AFE', '#304FFE', '', '#E3F2FD', '#BBDEFB', '#90CAF9', '#64B5F6', '#42A5F5', '#2196F3', '#1E88E5', '#1976D2', '#1565C0', '#0D47A1', '#82B1FF', '#448AFF', '#2979FF', '#2962FF', '', '#E1F5FE', '#B3E5FC', '#81D4FA', '#4FC3F7', '#29B6F6', '#03A9F4', '#039BE5', '#0288D1', '#0277BD', '#01579B', '#80D8FF', '#40C4FF', '#00B0FF', '#0091EA', '', '#E0F7FA', '#B2EBF2', '#80DEEA', '#4DD0E1', '#26C6DA', '#00BCD4', '#00ACC1', '#0097A7', '#00838F', '#006064', '#84FFFF', '#18FFFF', '#00E5FF', '#00B8D4', '', '#E0F2F1', '#B2DFDB', '#80CBC4', '#4DB6AC', '#26A69A', '#009688', '#00897B', '#00796B', '#00695C', '#004D40', '#A7FFEB', '#64FFDA', '#1DE9B6', '#00BFA5', '', '#E8F5E9', '#C8E6C9', '#A5D6A7', '#81C784', '#66BB6A', '#4CAF50', '#43A047', '#388E3C', '#2E7D32', '#1B5E20', '#B9F6CA', '#69F0AE', '#00E676', '#00C853', '', '#F1F8E9', '#DCEDC8', '#C5E1A5', '#AED581', '#9CCC65', '#8BC34A', '#7CB342', '#689F38', '#558B2F', '#33691E', '#CCFF90', '#B2FF59', '#76FF03', '#64DD17', '', '#F9FBE7', '#F0F4C3', '#E6EE9C', '#DCE775', '#D4E157', '#CDDC39', '#C0CA33', '#AFB42B', '#9E9D24', '#827717', '#F4FF81', '#EEFF41', '#C6FF00', '#AEEA00', '', '#FFFDE7', '#FFF9C4', '#FFF59D', '#FFF176', '#FFEE58', '#FFEB3B', '#FDD835', '#FBC02D', '#F9A825', '#F57F17', '#FFFF8D', '#FFFF00', '#FFEA00', '#FFD600', '', '#FFF8E1', '#FFECB3', '#FFE082', '#FFD54F', '#FFCA28', '#FFC107', '#FFB300', '#FFA000', '#FF8F00', '#FF6F00', '#FFE57F', '#FFD740', '#FFC400', '#FFAB00', '', '#FFF3E0', '#FFE0B2', '#FFCC80', '#FFB74D', '#FFA726', '#FF9800', '#FB8C00', '#F57C00', '#EF6C00', '#E65100', '#FFD180', '#FFAB40', '#FF9100', '#FF6D00', '', '#FBE9E7', '#FFCCBC', '#FFAB91', '#FF8A65', '#FF7043', '#FF5722', '#F4511E', '#E64A19', '#D84315', '#BF360C', '#FF9E80', '#FF6E40', '#FF3D00', '#DD2C00', '', '#EFEBE9', '#D7CCC8', '#BCAAA4', '#A1887F', '#8D6E63', '#795548', '#6D4C41', '#5D4037', '#4E342E', '#3E2723', '', '#FAFAFA', '#F5F5F5', '#EEEEEE', '#E0E0E0', '#BDBDBD', '#9E9E9E', '#757575', '#616161', '#424242', '#212121', '', '#ECEFF1', '#CFD8DC', '#B0BEC5', '#90A4AE', '#78909C', '#607D8B', '#546E7A', '#455A64', '#37474F', '#263238'],

				arr_coolors_n = ['Untitled @cabrandao', 'Untitled @cabrandao', 'Untitled @cabrandao', 'Untitled @cabrandao', 'Untitled @cabrandao', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @stinkav', 'Untitled @stinkav', 'Untitled @stinkav', 'Untitled @stinkav', 'Untitled @stinkav', '█████ CHECK OUT coolors.co FOR MORE █████', 'ManausSport @coelhodiana', 'ManausSport @coelhodiana', 'ManausSport @coelhodiana', 'ManausSport @coelhodiana', 'ManausSport @coelhodiana', '█████ CHECK OUT coolors.co FOR MORE █████', 'royale @aycai', 'royale @aycai', 'royale @aycai', 'royale @aycai', 'royale @aycai', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @mobock', 'Untitled @mobock', 'Untitled @mobock', 'Untitled @mobock', 'Untitled @mobock', '█████ CHECK OUT coolors.co FOR MORE █████', 'Colors001 @nixsiow', 'Colors001 @nixsiow', 'Colors001 @nixsiow', 'Colors001 @nixsiow', 'Colors001 @nixsiow', '█████ CHECK OUT coolors.co FOR MORE █████', 'Down 2 @fergusom', 'Down 2 @fergusom', 'Down 2 @fergusom', 'Down 2 @fergusom', 'Down 2 @fergusom', '█████ CHECK OUT coolors.co FOR MORE █████', 'Site @taelorgray', 'Site @taelorgray', 'Site @taelorgray', 'Site @taelorgray', 'Site @taelorgray', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @Bryan_Montoya', 'Untitled @Bryan_Montoya', 'Untitled @Bryan_Montoya', 'Untitled @Bryan_Montoya', 'Untitled @Bryan_Montoya', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @vanessapnz', 'Untitled @vanessapnz', 'Untitled @vanessapnz', 'Untitled @vanessapnz', 'Untitled @vanessapnz', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @nv.boson.30gev', 'Untitled @nv.boson.30gev', 'Untitled @nv.boson.30gev', 'Untitled @nv.boson.30gev', 'Untitled @nv.boson.30gev', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @ellen.withersova', 'Untitled @ellen.withersova', 'Untitled @ellen.withersova', 'Untitled @ellen.withersova', 'Untitled @ellen.withersova', '█████ CHECK OUT coolors.co FOR MORE █████', 'Salty fun @Tilvero', 'Salty fun @Tilvero', 'Salty fun @Tilvero', 'Salty fun @Tilvero', 'Salty fun @Tilvero', '█████ CHECK OUT coolors.co FOR MORE █████', 'Legendary 5 @morenom', 'Legendary 5 @morenom', 'Legendary 5 @morenom', 'Legendary 5 @morenom', 'Legendary 5 @morenom', '█████ CHECK OUT coolors.co FOR MORE █████', '17 @JollyMutt', '17 @JollyMutt', '17 @JollyMutt', '17 @JollyMutt', '17 @JollyMutt', '█████ CHECK OUT coolors.co FOR MORE █████', 'Bright II @TPackard', 'Bright II @TPackard', 'Bright II @TPackard', 'Bright II @TPackard', 'Bright II @TPackard', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @kohaku.no.tora', 'Untitled @kohaku.no.tora', 'Untitled @kohaku.no.tora', 'Untitled @kohaku.no.tora', 'Untitled @kohaku.no.tora', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @dkw001', 'Untitled @dkw001', 'Untitled @dkw001', 'Untitled @dkw001', 'Untitled @dkw001', '█████ CHECK OUT coolors.co FOR MORE █████', 'TLCPL FINAL @madmadmad', 'TLCPL FINAL @madmadmad', 'TLCPL FINAL @madmadmad', 'TLCPL FINAL @madmadmad', 'TLCPL FINAL @madmadmad', '█████ CHECK OUT coolors.co FOR MORE █████', 'TS V.2 @yvesshahar', 'TS V.2 @yvesshahar', 'TS V.2 @yvesshahar', 'TS V.2 @yvesshahar', 'TS V.2 @yvesshahar', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @JemGraham', 'Untitled @JemGraham', 'Untitled @JemGraham', 'Untitled @JemGraham', 'Untitled @JemGraham', '█████ CHECK OUT coolors.co FOR MORE █████', 'Color002 @nixsiow', 'Color002 @nixsiow', 'Color002 @nixsiow', 'Color002 @nixsiow', 'Color002 @nixsiow', '█████ CHECK OUT coolors.co FOR MORE █████', 'm @bridgebow', 'm @bridgebow', 'm @bridgebow', 'm @bridgebow', 'm @bridgebow', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @mobock', 'Untitled @mobock', 'Untitled @mobock', 'Untitled @mobock', 'Untitled @mobock', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @Skaje', 'Untitled @Skaje', 'Untitled @Skaje', 'Untitled @Skaje', 'Untitled @Skaje', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @yechi_95_aries', 'Untitled @yechi_95_aries', 'Untitled @yechi_95_aries', 'Untitled @yechi_95_aries', 'Untitled @yechi_95_aries', '█████ CHECK OUT coolors.co FOR MORE █████', 'gispy danger @silversomber', 'gispy danger @silversomber', 'gispy danger @silversomber', 'gispy danger @silversomber', 'gispy danger @silversomber', '█████ CHECK OUT coolors.co FOR MORE █████', 'leaggo 5 @Konst', 'leaggo 5 @Konst', 'leaggo 5 @Konst', 'leaggo 5 @Konst', 'leaggo 5 @Konst', '█████ CHECK OUT coolors.co FOR MORE █████', 'ns @srxtisntit', 'ns @srxtisntit', 'ns @srxtisntit', 'ns @srxtisntit', 'ns @srxtisntit', '█████ CHECK OUT coolors.co FOR MORE █████', 'sac.red by brettchester', 'sac.red by brettchester', 'sac.red by brettchester', 'sac.red by brettchester', 'sac.red by brettchester', '█████ CHECK OUT coolors.co FOR MORE █████', 'Crunchy Crackers @TreeBaron', 'Crunchy Crackers @TreeBaron', 'Crunchy Crackers @TreeBaron', 'Crunchy Crackers @TreeBaron', 'Crunchy Crackers @TreeBaron', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @cclocks8', 'Untitled @cclocks8', 'Untitled @cclocks8', 'Untitled @cclocks8', 'Untitled @cclocks8', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @pineappleproof', 'Untitled @pineappleproof', 'Untitled @pineappleproof', 'Untitled @pineappleproof', 'Untitled @pineappleproof', '█████ CHECK OUT coolors.co FOR MORE █████', 'mbi @maudetheberge', 'mbi @maudetheberge', 'mbi @maudetheberge', 'mbi @maudetheberge', 'mbi @maudetheberge', '█████ CHECK OUT coolors.co FOR MORE █████', 'kaz @Forlenko', 'kaz @Forlenko', 'kaz @Forlenko', 'kaz @Forlenko', 'kaz @Forlenko', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @saymju', 'Untitled @saymju', 'Untitled @saymju', 'Untitled @saymju', 'Untitled @saymju', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @sandersmeekes', 'Untitled @sandersmeekes', 'Untitled @sandersmeekes', 'Untitled @sandersmeekes', 'Untitled @sandersmeekes', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @kelly', 'Untitled @kelly', 'Untitled @kelly', 'Untitled @kelly', 'Untitled @kelly', '█████ CHECK OUT coolors.co FOR MORE █████', 'In Your Face @brod7996', 'In Your Face @brod7996', 'In Your Face @brod7996', 'In Your Face @brod7996', 'In Your Face @brod7996', '█████ CHECK OUT coolors.co FOR MORE █████', 'PM-16 @dbish', 'PM-16 @dbish', 'PM-16 @dbish', 'PM-16 @dbish', 'PM-16 @dbish', '█████ CHECK OUT coolors.co FOR MORE █████', 'OakBrook @geller78', 'OakBrook @geller78', 'OakBrook @geller78', 'OakBrook @geller78', 'OakBrook @geller78', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @narruc', 'Untitled @narruc', 'Untitled @narruc', 'Untitled @narruc', 'Untitled @narruc', '█████ CHECK OUT coolors.co FOR MORE █████', 'Pacman Palette @keanonweb', 'Pacman Palette @keanonweb', 'Pacman Palette @keanonweb', 'Pacman Palette @keanonweb', 'Pacman Palette @keanonweb', '█████ CHECK OUT coolors.co FOR MORE █████', 'R27 @insvale', 'R27 @insvale', 'R27 @insvale', 'R27 @insvale', 'R27 @insvale', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @jaagup.susi', 'Untitled @jaagup.susi', 'Untitled @jaagup.susi', 'Untitled @jaagup.susi', 'Untitled @jaagup.susi', '█████ CHECK OUT coolors.co FOR MORE █████', 'Beach Weekend @ajiwata', 'Beach Weekend @ajiwata', 'Beach Weekend @ajiwata', 'Beach Weekend @ajiwata', 'Beach Weekend @ajiwata', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @shapeshift', 'Untitled @shapeshift', 'Untitled @shapeshift', 'Untitled @shapeshift', 'Untitled @shapeshift', '█████ CHECK OUT coolors.co FOR MORE █████', 'Marieke by djenkal', 'Marieke by djenkal', 'Marieke by djenkal', 'Marieke by djenkal', 'Marieke by djenkal', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @krispykrista', 'Untitled @krispykrista', 'Untitled @krispykrista', 'Untitled @krispykrista', 'Untitled @krispykrista', '█████ CHECK OUT coolors.co FOR MORE █████', 'Feminina @carolinekvall', 'Feminina @carolinekvall', 'Feminina @carolinekvall', 'Feminina @carolinekvall', 'Feminina @carolinekvall', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @kelly', 'Untitled @kelly', 'Untitled @kelly', 'Untitled @kelly', 'Untitled @kelly', '█████ CHECK OUT coolors.co FOR MORE █████', 'bright @clabtl', 'bright @clabtl', 'bright @clabtl', 'bright @clabtl', 'bright @clabtl', '█████ CHECK OUT coolors.co FOR MORE █████', 'Bright @TPackard', 'Bright @TPackard', 'Bright @TPackard', 'Bright @TPackard', 'Bright @TPackard', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @shugar.188', 'Untitled @shugar.188', 'Untitled @shugar.188', 'Untitled @shugar.188', 'Untitled @shugar.188', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @kelly', 'Untitled @kelly', 'Untitled @kelly', 'Untitled @kelly', 'Untitled @kelly', '█████ CHECK OUT coolors.co FOR MORE █████', 'Web @irakvscss', 'Web @irakvscss', 'Web @irakvscss', 'Web @irakvscss', 'Web @irakvscss', '█████ CHECK OUT coolors.co FOR MORE █████', 'Leaggo3 @Konst', 'Leaggo3 @Konst', 'Leaggo3 @Konst', 'Leaggo3 @Konst', 'Leaggo3 @Konst', '█████ CHECK OUT coolors.co FOR MORE █████', 'Tropical @lynnbaumgartner', 'Tropical @lynnbaumgartner', 'Tropical @lynnbaumgartner', 'Tropical @lynnbaumgartner', 'Tropical @lynnbaumgartner', '█████ CHECK OUT coolors.co FOR MORE █████', 'Rainbow Brights @kamchugh', 'Rainbow Brights @kamchugh', 'Rainbow Brights @kamchugh', 'Rainbow Brights @kamchugh', 'Rainbow Brights @kamchugh', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @hyper.dub.soda', 'Untitled @hyper.dub.soda', 'Untitled @hyper.dub.soda', 'Untitled @hyper.dub.soda', 'Untitled @hyper.dub.soda', '█████ CHECK OUT coolors.co FOR MORE █████', 'ct_7 @olobolo', 'ct_7 @olobolo', 'ct_7 @olobolo', 'ct_7 @olobolo', 'ct_7 @olobolo', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @andrejmtm', 'Untitled @andrejmtm', 'Untitled @andrejmtm', 'Untitled @andrejmtm', 'Untitled @andrejmtm', '█████ CHECK OUT coolors.co FOR MORE █████', 'Warm Wall Paint by Zellene Guanlao', 'Warm Wall Paint by Zellene Guanlao', 'Warm Wall Paint by Zellene Guanlao', 'Warm Wall Paint by Zellene Guanlao', 'Warm Wall Paint by Zellene Guanlao', '█████ CHECK OUT coolors.co FOR MORE █████', '81 @AkaneHaruken13', '81 @AkaneHaruken13', '81 @AkaneHaruken13', '81 @AkaneHaruken13', '81 @AkaneHaruken13', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @JemGraham', 'Untitled @JemGraham', 'Untitled @JemGraham', 'Untitled @JemGraham', 'Untitled @JemGraham', '█████ CHECK OUT coolors.co FOR MORE █████', 'Fruit @TBone', 'Fruit @TBone', 'Fruit @TBone', 'Fruit @TBone', 'Fruit @TBone', '█████ CHECK OUT coolors.co FOR MORE █████', 'cold @Lesquee', 'cold @Lesquee', 'cold @Lesquee', 'cold @Lesquee', 'cold @Lesquee', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @kelly', 'Untitled @kelly', 'Untitled @kelly', 'Untitled @kelly', 'Untitled @kelly', '█████ CHECK OUT coolors.co FOR MORE █████', 'color-ips @christophwitzko', 'color-ips @christophwitzko', 'color-ips @christophwitzko', 'color-ips @christophwitzko', 'color-ips @christophwitzko', '█████ CHECK OUT coolors.co FOR MORE █████', 'label 2 @Iuliia', 'label 2 @Iuliia', 'label 2 @Iuliia', 'label 2 @Iuliia', 'label 2 @Iuliia', '█████ CHECK OUT coolors.co FOR MORE █████', 'Lapis Lazuili @JadeHarley_', 'Lapis Lazuili @JadeHarley_', 'Lapis Lazuili @JadeHarley_', 'Lapis Lazuili @JadeHarley_', 'Lapis Lazuili @JadeHarley_', '█████ CHECK OUT coolors.co FOR MORE █████', 'Lock Dev @saysora', 'Lock Dev @saysora', 'Lock Dev @saysora', 'Lock Dev @saysora', 'Lock Dev @saysora', '█████ CHECK OUT coolors.co FOR MORE █████', 'Beach @kali145', 'Beach @kali145', 'Beach @kali145', 'Beach @kali145', 'Beach @kali145', '█████ CHECK OUT coolors.co FOR MORE █████', 'frfere @Sesse998', 'frfere @Sesse998', 'frfere @Sesse998', 'frfere @Sesse998', 'frfere @Sesse998', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @Mahmuthana', 'Untitled @Mahmuthana', 'Untitled @Mahmuthana', 'Untitled @Mahmuthana', 'Untitled @Mahmuthana', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @kom1n', 'Untitled @kom1n', 'Untitled @kom1n', 'Untitled @kom1n', 'Untitled @kom1n', '█████ CHECK OUT coolors.co FOR MORE █████', 'CALENDAR @petkus', 'CALENDAR @petkus', 'CALENDAR @petkus', 'CALENDAR @petkus', 'CALENDAR @petkus', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @varunvachhar', 'Untitled @varunvachhar', 'Untitled @varunvachhar', 'Untitled @varunvachhar', 'Untitled @varunvachhar', '█████ CHECK OUT coolors.co FOR MORE █████', 'Seafoam @Kaje Jackson', 'Seafoam @Kaje Jackson', 'Seafoam @Kaje Jackson', 'Seafoam @Kaje Jackson', 'Seafoam @Kaje Jackson', '█████ CHECK OUT coolors.co FOR MORE █████', 'yessssss @Jhaff', 'yessssss @Jhaff', 'yessssss @Jhaff', 'yessssss @Jhaff', 'yessssss @Jhaff', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @tachenoir', 'Untitled @tachenoir', 'Untitled @tachenoir', 'Untitled @tachenoir', 'Untitled @tachenoir', '█████ CHECK OUT coolors.co FOR MORE █████', 'Website 4 @danziellia', 'Website 4 @danziellia', 'Website 4 @danziellia', 'Website 4 @danziellia', 'Website 4 @danziellia', '█████ CHECK OUT coolors.co FOR MORE █████', 'Untitled @ivchenkonastya96', 'Untitled @ivchenkonastya96', 'Untitled @ivchenkonastya96', 'Untitled @ivchenkonastya96', 'Untitled @ivchenkonastya96', '█████ CHECK OUT coolors.co FOR MORE █████', 'Pallet 23 @KitCeCe', 'Pallet 23 @KitCeCe', 'Pallet 23 @KitCeCe', 'Pallet 23 @KitCeCe', 'Pallet 23 @KitCeCe'],
				arr_coolors_c = ['hsl(198, 63%, 38%)', 'hsl(170, 40%, 60%)', 'hsl(139, 36%, 78%)', 'hsl(71, 100%, 87%)', 'hsl(344, 100%, 54%)', '', 'hsl(197, 93%, 29%)', 'hsl(187, 97%, 29%)', 'hsl(174, 100%, 33%)', 'hsl(167, 98%, 39%)', 'hsl(63, 69%, 85%)', '', 'hsl(207, 95%, 8%)', 'hsl(100, 100%, 99%)', 'hsl(174, 62%, 47%)', 'hsl(353, 81%, 51%)', 'hsl(35, 100%, 55%)', '', 'hsl(355, 78%, 56%)', 'hsl(105, 55%, 96%)', 'hsl(182, 43%, 76%)', 'hsl(203, 39%, 44%)', 'hsl(215, 50%, 23%)', '', 'hsl(21, 100%, 85%)', 'hsl(12, 100%, 82%)', 'hsl(358, 60%, 75%)', 'hsl(348, 25%, 61%)', 'hsl(263, 6%, 43%)', '', 'hsl(90, 1%, 31%)', 'hsl(1, 85%, 65%)', 'hsl(48, 100%, 70%)', 'hsl(198, 63%, 38%)', 'hsl(170, 40%, 60%)', '', 'hsl(197, 37%, 24%)', 'hsl(173, 58%, 39%)', 'hsl(43, 74%, 66%)', 'hsl(27, 87%, 67%)', 'hsl(12, 76%, 61%)', '', 'hsl(188, 56%, 23%)', 'hsl(176, 56%, 55%)', 'hsl(120, 100%, 98%)', 'hsl(0, 100%, 71%)', 'hsl(50, 100%, 71%)', '', 'hsl(235, 21%, 21%)', 'hsl(218, 17%, 62%)', 'hsl(197, 24%, 94%)', 'hsl(353, 86%, 54%)', 'hsl(350, 96%, 43%)', '', 'hsl(0, 0%, 100%)', 'hsl(165, 56%, 69%)', 'hsl(153, 100%, 82%)', 'hsl(5, 100%, 81%)', 'hsl(359, 100%, 70%)', '', 'hsl(0, 0%, 100%)', 'hsl(195, 100%, 6%)', 'hsl(205, 100%, 17%)', 'hsl(195, 100%, 33%)', 'hsl(197, 100%, 45%)', '', 'hsl(144, 15%, 87%)', 'hsl(19, 100%, 93%)', 'hsl(349, 100%, 90%)', 'hsl(351, 77%, 82%)', 'hsl(343, 13%, 56%)', '', 'hsl(4, 98%, 77%)', 'hsl(23, 60%, 76%)', 'hsl(37, 60%, 80%)', 'hsl(198, 16%, 66%)', 'hsl(201, 43%, 45%)', '', 'hsl(198, 78%, 64%)', 'hsl(53, 98%, 65%)', 'hsl(79, 54%, 51%)', 'hsl(13, 77%, 55%)', 'hsl(24, 96%, 55%)', '', 'hsl(7, 80%, 64%)', 'hsl(57, 72%, 85%)', 'hsl(172, 23%, 68%)', 'hsl(184, 31%, 51%)', 'hsl(87, 22%, 90%)', '', 'hsl(346, 84%, 61%)', 'hsl(42, 100%, 70%)', 'hsl(164, 95%, 43%)', 'hsl(195, 83%, 38%)', 'hsl(195, 83%, 16%)', '', 'hsl(225, 59%, 11%)', 'hsl(225, 40%, 18%)', 'hsl(213, 30%, 32%)', 'hsl(179, 44%, 55%)', 'hsl(171, 100%, 72%)', '', 'hsl(86, 67%, 71%)', 'hsl(153, 57%, 60%)', 'hsl(195, 53%, 43%)', 'hsl(242, 18%, 39%)', 'hsl(289, 19%, 28%)', '', 'hsl(201, 100%, 14%)', 'hsl(0, 69%, 50%)', 'hsl(31, 100%, 48%)', 'hsl(40, 97%, 64%)', 'hsl(51, 55%, 82%)', '', 'hsl(0, 0%, 0%)', 'hsl(221, 51%, 16%)', 'hsl(37, 98%, 53%)', 'hsl(0, 0%, 90%)', 'hsl(0, 0%, 100%)', '', 'hsl(264, 25%, 63%)', 'hsl(331, 71%, 80%)', 'hsl(312, 58%, 85%)', 'hsl(306, 25%, 92%)', 'hsl(230, 35%, 79%)', '', 'hsl(195, 70%, 22%)', 'hsl(187, 97%, 29%)', 'hsl(114, 88%, 94%)', 'hsl(211, 35%, 42%)', 'hsl(355, 87%, 66%)', '', 'hsl(309, 51%, 90%)', 'hsl(350, 21%, 78%)', 'hsl(325, 26%, 52%)', 'hsl(296, 39%, 31%)', 'hsl(237, 63%, 15%)', '', 'hsl(240, 1%, 86%)', 'hsl(280, 3%, 77%)', 'hsl(210, 4%, 29%)', 'hsl(206, 16%, 35%)', 'hsl(192, 73%, 36%)', '', 'hsl(240, 27%, 18%)', 'hsl(232, 17%, 35%)', 'hsl(309, 6%, 58%)', 'hsl(11, 24%, 72%)', 'hsl(21, 35%, 92%)', '', 'hsl(195, 70%, 22%)', 'hsl(162, 70%, 34%)', 'hsl(133, 47%, 68%)', 'hsl(104, 27%, 80%)', 'hsl(42, 58%, 89%)', '', 'hsl(35, 100%, 55%)', 'hsl(34, 100%, 71%)', 'hsl(0, 0%, 100%)', 'hsl(176, 63%, 87%)', 'hsl(174, 62%, 47%)', '', 'hsl(214, 35%, 37%)', 'hsl(202, 46%, 72%)', 'hsl(182, 82%, 93%)', 'hsl(12, 83%, 62%)', 'hsl(218, 23%, 21%)', '', 'hsl(191, 95%, 43%)', 'hsl(195, 89%, 28%)', 'hsl(50, 94%, 49%)', 'hsl(42, 100%, 91%)', 'hsl(1, 79%, 48%)', '', 'hsl(207, 95%, 8%)', 'hsl(352, 93%, 53%)', 'hsl(172, 80%, 59%)', 'hsl(100, 100%, 99%)', 'hsl(35, 100%, 55%)', '', 'hsl(14, 92%, 54%)', 'hsl(42, 100%, 50%)', 'hsl(198, 100%, 46%)', 'hsl(79, 100%, 36%)', 'hsl(214, 73%, 19%)', '', 'hsl(222, 15%, 87%)', 'hsl(211, 29%, 74%)', 'hsl(188, 36%, 52%)', 'hsl(222, 19%, 27%)', 'hsl(240, 5%, 11%)', '', 'hsl(190, 82%, 72%)', 'hsl(173, 81%, 83%)', 'hsl(173, 33%, 95%)', 'hsl(342, 67%, 90%)', 'hsl(330, 70%, 83%)', '', 'hsl(229, 19%, 22%)', 'hsl(218, 19%, 38%)', 'hsl(180, 1%, 75%)', 'hsl(0, 0%, 100%)', 'hsl(18, 83%, 63%)', '', 'hsl(209, 53%, 16%)', 'hsl(199, 100%, 29%)', 'hsl(198, 63%, 38%)', 'hsl(202, 78%, 49%)', 'hsl(186, 28%, 93%)', '', 'hsl(20, 100%, 80%)', 'hsl(0, 87%, 73%)', 'hsl(328, 38%, 37%)', 'hsl(251, 88%, 9%)', 'hsl(319, 16%, 39%)', '', 'hsl(257, 30%, 27%)', 'hsl(230, 24%, 35%)', 'hsl(131, 11%, 49%)', 'hsl(89, 30%, 60%)', 'hsl(61, 90%, 77%)', '', 'hsl(150, 14%, 84%)', 'hsl(81, 28%, 90%)', 'hsl(44, 88%, 66%)', 'hsl(60, 1%, 14%)', 'hsl(120, 2%, 20%)', '', 'hsl(211, 87%, 25%)', 'hsl(60, 38%, 87%)', 'hsl(47, 87%, 66%)', 'hsl(28, 83%, 61%)', 'hsl(10, 94%, 60%)', '', 'hsl(140, 71%, 44%)', 'hsl(198, 82%, 23%)', 'hsl(193, 99%, 47%)', 'hsl(240, 100%, 99%)', 'hsl(0, 0%, 46%)', '', 'hsl(197, 93%, 29%)', 'hsl(205, 42%, 45%)', 'hsl(212, 60%, 95%)', 'hsl(89, 47%, 40%)', 'hsl(68, 100%, 37%)', '', 'hsl(45, 100%, 50%)', 'hsl(343, 79%, 58%)', 'hsl(202, 66%, 39%)', 'hsl(158, 49%, 39%)', 'hsl(0, 0%, 100%)', '', 'hsl(212, 14%, 19%)', 'hsl(176, 56%, 55%)', 'hsl(120, 100%, 98%)', 'hsl(0, 100%, 71%)', 'hsl(50, 100%, 71%)', '', 'hsl(284, 79%, 24%)', 'hsl(347, 83%, 60%)', 'hsl(46, 100%, 62%)', 'hsl(166, 60%, 52%)', 'hsl(154, 85%, 37%)', '', 'hsl(63, 28%, 72%)', 'hsl(39, 100%, 83%)', 'hsl(8, 70%, 62%)', 'hsl(350, 30%, 34%)', 'hsl(353, 22%, 23%)', '', 'hsl(5, 100%, 81%)', 'hsl(46, 74%, 92%)', 'hsl(168, 69%, 84%)', 'hsl(188, 45%, 78%)', 'hsl(222, 10%, 41%)', '', 'hsl(173, 70%, 35%)', 'hsl(233, 22%, 23%)', 'hsl(59, 100%, 75%)', 'hsl(18, 100%, 72%)', 'hsl(355, 78%, 60%)', '', 'hsl(186, 100%, 55%)', 'hsl(130, 76%, 68%)', 'hsl(67, 100%, 55%)', 'hsl(42, 84%, 49%)', 'hsl(17, 100%, 54%)', '', 'hsl(29, 79%, 72%)', 'hsl(4, 99%, 66%)', 'hsl(52, 31%, 77%)', 'hsl(132, 56%, 86%)', 'hsl(76, 57%, 91%)', '', 'hsl(144, 73%, 90%)', 'hsl(278, 82%, 87%)', 'hsl(332, 84%, 77%)', 'hsl(54, 63%, 81%)', 'hsl(200, 87%, 82%)', '', 'hsl(60, 53%, 97%)', 'hsl(90, 4%, 90%)', 'hsl(96, 5%, 81%)', 'hsl(0, 2%, 64%)', 'hsl(352, 6%, 49%)', '', 'hsl(210, 50%, 60%)', 'hsl(54, 100%, 73%)', 'hsl(23, 100%, 63%)', 'hsl(1, 100%, 61%)', 'hsl(354, 45%, 44%)', '', 'hsl(76, 100%, 95%)', 'hsl(164, 95%, 43%)', 'hsl(187, 73%, 39%)', 'hsl(346, 84%, 61%)', 'hsl(42, 100%, 62%)', '', 'hsl(15, 94%, 7%)', 'hsl(10, 85%, 21%)', 'hsl(7, 85%, 31%)', 'hsl(16, 92%, 38%)', 'hsl(39, 92%, 54%)', '', 'hsl(182, 82%, 93%)', 'hsl(187, 37%, 83%)', 'hsl(201, 22%, 68%)', 'hsl(201, 11%, 41%)', 'hsl(197, 20%, 18%)', '', 'hsl(0, 0%, 21%)', 'hsl(183, 31%, 34%)', 'hsl(0, 0%, 100%)', 'hsl(0, 0%, 85%)', 'hsl(204, 42%, 27%)', '', 'hsl(229, 19%, 22%)', 'hsl(180, 1%, 75%)', 'hsl(0, 0%, 100%)', 'hsl(18, 83%, 63%)', 'hsl(218, 19%, 38%)', '', 'hsl(1, 100%, 68%)', 'hsl(0, 0%, 85%)', 'hsl(60, 100%, 96%)', 'hsl(179, 100%, 40%)', 'hsl(53, 100%, 70%)', '', 'hsl(44, 100%, 52%)', 'hsl(19, 97%, 51%)', 'hsl(334, 100%, 50%)', 'hsl(265, 83%, 57%)', 'hsl(217, 100%, 61%)', '', 'hsl(124, 29%, 78%)', 'hsl(64, 30%, 80%)', 'hsl(31, 91%, 86%)', 'hsl(355, 74%, 76%)', 'hsl(335, 9%, 38%)', '', 'hsl(225, 59%, 11%)', 'hsl(225, 40%, 18%)', 'hsl(213, 30%, 32%)', 'hsl(179, 44%, 55%)', 'hsl(0, 0%, 100%)', '', 'hsl(46, 74%, 92%)', 'hsl(88, 25%, 78%)', 'hsl(152, 28%, 66%)', 'hsl(176, 31%, 55%)', 'hsl(138, 25%, 39%)', '', 'hsl(52, 50%, 91%)', 'hsl(13, 68%, 63%)', 'hsl(234, 20%, 30%)', 'hsl(151, 24%, 60%)', 'hsl(37, 79%, 75%)', '', 'hsl(208, 53%, 32%)', 'hsl(346, 84%, 61%)', 'hsl(42, 100%, 70%)', 'hsl(164, 95%, 43%)', 'hsl(30, 100%, 99%)', '', 'hsl(20, 100%, 75%)', 'hsl(4, 100%, 77%)', 'hsl(20, 98%, 82%)', 'hsl(54, 67%, 81%)', 'hsl(101, 50%, 84%)', '', 'hsl(52, 100%, 65%)', 'hsl(356, 100%, 67%)', 'hsl(0, 0%, 100%)', 'hsl(126, 83%, 68%)', 'hsl(206, 100%, 60%)', '', 'hsl(97, 13%, 80%)', 'hsl(133, 18%, 59%)', 'hsl(165, 19%, 40%)', 'hsl(186, 21%, 26%)', 'hsl(201, 20%, 23%)', '', 'hsl(180, 46%, 95%)', 'hsl(14, 28%, 91%)', 'hsl(30, 38%, 85%)', 'hsl(17, 53%, 79%)', 'hsl(28, 26%, 59%)', '', 'hsl(201, 38%, 29%)', 'hsl(203, 17%, 51%)', 'hsl(203, 18%, 68%)', 'hsl(38, 8%, 81%)', 'hsl(47, 73%, 58%)', '', 'hsl(0, 0%, 0%)', 'hsl(0, 0%, 100%)', 'hsl(0, 0%, 29%)', 'hsl(0, 1%, 48%)', 'hsl(352, 100%, 68%)', '', 'hsl(221, 95%, 22%)', 'hsl(228, 66%, 42%)', 'hsl(207, 76%, 38%)', 'hsl(190, 95%, 45%)', 'hsl(0, 0%, 100%)', '', 'hsl(208, 53%, 32%)', 'hsl(346, 84%, 61%)', 'hsl(42, 100%, 70%)', 'hsl(164, 95%, 43%)', 'hsl(0, 0%, 99%)', '', 'hsl(180, 29%, 78%)', 'hsl(182, 16%, 55%)', 'hsl(190, 13%, 36%)', 'hsl(76, 57%, 91%)', 'hsl(4, 99%, 66%)', '', 'hsl(96, 20%, 5%)', 'hsl(339, 100%, 56%)', 'hsl(61, 100%, 54%)', 'hsl(172, 80%, 59%)', 'hsl(0, 0%, 100%)', '', 'hsl(0, 99%, 64%)', 'hsl(187, 66%, 48%)', 'hsl(45, 99%, 70%)', 'hsl(240, 9%, 91%)', 'hsl(240, 22%, 96%)', '', 'hsl(31, 90%, 69%)', 'hsl(23, 90%, 68%)', 'hsl(15, 87%, 66%)', 'hsl(9, 85%, 65%)', 'hsl(3, 86%, 64%)', '', 'hsl(235, 21%, 21%)', 'hsl(218, 17%, 62%)', 'hsl(197, 24%, 94%)', 'hsl(353, 86%, 54%)', 'hsl(346, 100%, 42%)', '', 'hsl(226, 13%, 38%)', 'hsl(177, 20%, 61%)', 'hsl(167, 40%, 82%)', 'hsl(0, 9%, 98%)', 'hsl(24, 100%, 86%)', '', 'hsl(178, 93%, 39%)', 'hsl(178, 58%, 52%)', 'hsl(179, 59%, 63%)', 'hsl(184, 72%, 77%)', 'hsl(174, 100%, 88%)', '', 'hsl(181, 70%, 48%)', 'hsl(0, 0%, 100%)', 'hsl(24, 83%, 93%)', 'hsl(17, 100%, 68%)', 'hsl(349, 78%, 62%)', '', 'hsl(255, 45%, 18%)', 'hsl(250, 26%, 44%)', 'hsl(266, 32%, 64%)', 'hsl(292, 28%, 68%)', 'hsl(327, 43%, 79%)', '', 'hsl(200, 15%, 43%)', 'hsl(173, 36%, 55%)', 'hsl(178, 94%, 87%)', 'hsl(154, 100%, 93%)', 'hsl(140, 100%, 99%)', '', 'hsl(292, 50%, 17%)', 'hsl(190, 87%, 25%)', 'hsl(168, 76%, 47%)', 'hsl(85, 97%, 62%)', 'hsl(108, 100%, 81%)', '', 'hsl(193, 34%, 30%)', 'hsl(51, 100%, 85%)', 'hsl(36, 72%, 56%)', 'hsl(359, 58%, 39%)', 'hsl(358, 77%, 19%)'],

				// Name + Farbwert identisch
				arr_rgb = ['rgb(255, 255, 255)', 'rgb(0, 0, 0)', 'rgb(4, 0, 3)', 'rgb(9, 0, 7)', 'rgb(13, 0, 10)', 'rgb(18, 0, 14)', 'rgb(22, 0, 19)', 'rgb(27, 0, 23)', 'rgb(31, 0, 28)', 'rgb(36, 0, 32)', 'rgb(40, 0, 38)', 'rgb(45, 0, 43)', 'rgb(50, 0, 48)', 'rgb(58, 0, 59)', 'rgb(64, 0, 68)', 'rgb(68, 0, 72)', 'rgb(69, 0, 77)', 'rgb(72, 0, 81)', 'rgb(74, 0, 86)', 'rgb(77, 0, 91)', 'rgb(79, 0, 95)', 'rgb(80, 0, 100)', 'rgb(82, 0, 104)', 'rgb(83, 0, 109)', 'rgb(84, 0, 118)', 'rgb(86, 0, 122)', 'rgb(88, 0, 132)', 'rgb(86, 0, 136)', 'rgb(87, 0, 141)', 'rgb(87, 0, 145)', 'rgb(87, 0, 150)', 'rgb(85, 0, 154)', 'rgb(84, 0, 159)', 'rgb(84, 0, 163)', 'rgb(84, 0, 168)', 'rgb(79, 0, 177)', 'rgb(78, 0, 182)', 'rgb(77, 0, 186)', 'rgb(76, 0, 191)', 'rgb(70, 0, 200)', 'rgb(68, 0, 204)', 'rgb(66, 0, 209)', 'rgb(60, 0, 214)', 'rgb(58, 0, 218)', 'rgb(55, 0, 223)', 'rgb(46, 0, 232)', 'rgb(43, 0, 236)', 'rgb(40, 0, 241)', 'rgb(36, 0, 245)', 'rgb(33, 0, 250)', 'rgb(25, 0, 255)', 'rgb(16, 0, 255)', 'rgb(12, 0, 255)', 'rgb(4, 0, 255)', 'rgb(0, 0, 255)', 'rgb(0, 4, 255)', 'rgb(0, 16, 255)', 'rgb(0, 21, 255)', 'rgb(0, 25, 255)', 'rgb(0, 29, 255)', 'rgb(0, 38, 255)', 'rgb(0, 42, 255)', 'rgb(0, 46, 255)', 'rgb(0, 51, 255)', 'rgb(0, 63, 255)', 'rgb(0, 67, 255)', 'rgb(0, 72, 255)', 'rgb(0, 84, 255)', 'rgb(0, 89, 255)', 'rgb(0, 93, 255)', 'rgb(0, 97, 255)', 'rgb(0, 106, 255)', 'rgb(0, 110, 255)', 'rgb(0, 114, 255)', 'rgb(0, 119, 255)', 'rgb(0, 127, 255)', 'rgb(0, 135, 255)', 'rgb(0, 140, 255)', 'rgb(0, 152, 255)', 'rgb(0, 157, 255)', 'rgb(0, 161, 255)', 'rgb(0, 165, 255)', 'rgb(0, 174, 255)', 'rgb(0, 178, 255)', 'rgb(0, 182, 255)', 'rgb(0, 187, 255)', 'rgb(0, 195, 255)', 'rgb(0, 199, 255)', 'rgb(0, 216, 255)', 'rgb(0, 220, 255)', 'rgb(0, 225, 255)', 'rgb(0, 229, 255)', 'rgb(0, 233, 255)', 'rgb(0, 242, 255)', 'rgb(0, 246, 255)', 'rgb(0, 250, 255)', 'rgb(0, 255, 255)', 'rgb(0, 255, 246)', 'rgb(0, 255, 242)', 'rgb(0, 255, 238)', 'rgb(0, 255, 225)', 'rgb(0, 255, 216)', 'rgb(0, 255, 212)', 'rgb(0, 255, 203)', 'rgb(0, 255, 199)', 'rgb(0, 255, 195)', 'rgb(0, 255, 191)', 'rgb(0, 255, 187)', 'rgb(0, 255, 178)', 'rgb(0, 255, 174)', 'rgb(0, 255, 170)', 'rgb(0, 255, 157)', 'rgb(0, 255, 152)', 'rgb(0, 255, 144)', 'rgb(0, 255, 135)', 'rgb(0, 255, 131)', 'rgb(0, 255, 127)', 'rgb(0, 255, 123)', 'rgb(0, 255, 114)', 'rgb(0, 255, 110)', 'rgb(0, 255, 106)', 'rgb(0, 255, 102)', 'rgb(0, 255, 89)', 'rgb(0, 255, 84)', 'rgb(0, 255, 80)', 'rgb(0, 255, 76)', 'rgb(0, 255, 63)', 'rgb(0, 255, 59)', 'rgb(0, 255, 55)', 'rgb(0, 255, 46)', 'rgb(0, 255, 42)', 'rgb(0, 255, 38)', 'rgb(0, 255, 25)', 'rgb(0, 255, 21)', 'rgb(0, 255, 16)', 'rgb(0, 255, 12)', 'rgb(0, 255, 8)', 'rgb(0, 255, 0)', 'rgb(8, 255, 0)', 'rgb(12, 255, 0)', 'rgb(21, 255, 0)', 'rgb(25, 255, 0)', 'rgb(29, 255, 0)', 'rgb(42, 255, 0)', 'rgb(46, 255, 0)', 'rgb(51, 255, 0)', 'rgb(55, 255, 0)', 'rgb(63, 255, 0)', 'rgb(67, 255, 0)', 'rgb(72, 255, 0)', 'rgb(76, 255, 0)', 'rgb(89, 255, 0)', 'rgb(93, 255, 0)', 'rgb(97, 255, 0)', 'rgb(110, 255, 0)', 'rgb(114, 255, 0)', 'rgb(119, 255, 0)', 'rgb(123, 255, 0)', 'rgb(131, 255, 0)', 'rgb(135, 255, 0)', 'rgb(140, 255, 0)', 'rgb(144, 255, 0)', 'rgb(153, 255, 0)', 'rgb(161, 255, 0)', 'rgb(165, 255, 0)', 'rgb(178, 255, 0)', 'rgb(182, 255, 0)', 'rgb(187, 255, 0)', 'rgb(191, 255, 0)', 'rgb(199, 255, 0)', 'rgb(203, 255, 0)', 'rgb(208, 255, 0)', 'rgb(212, 255, 0)', 'rgb(221, 255, 0)', 'rgb(225, 255, 0)', 'rgb(242, 255, 0)', 'rgb(246, 255, 0)', 'rgb(250, 255, 0)', 'rgb(255, 255, 0)', 'rgb(255, 250, 0)', 'rgb(255, 242, 0)', 'rgb(255, 238, 0)', 'rgb(255, 233, 0)', 'rgb(255, 229, 0)', 'rgb(255, 221, 0)', 'rgb(255, 216, 0)', 'rgb(255, 212, 0)', 'rgb(255, 199, 0)', 'rgb(255, 191, 0)', 'rgb(255, 187, 0)', 'rgb(255, 178, 0)', 'rgb(255, 174, 0)', 'rgb(255, 170, 0)', 'rgb(255, 165, 0)', 'rgb(255, 161, 0)', 'rgb(255, 153, 0)', 'rgb(255, 148, 0)', 'rgb(255, 144, 0)', 'rgb(255, 131, 0)', 'rgb(255, 127, 0)', 'rgb(255, 119, 0)', 'rgb(255, 110, 0)', 'rgb(255, 106, 0)', 'rgb(255, 102, 0)', 'rgb(255, 97, 0)', 'rgb(255, 89, 0)', 'rgb(255, 85, 0)', 'rgb(255, 80, 0)', 'rgb(255, 76, 0)', 'rgb(255, 63, 0)', 'rgb(255, 59, 0)', 'rgb(255, 55, 0)', 'rgb(255, 51, 0)', 'rgb(255, 38, 0)', 'rgb(255, 34, 0)', 'rgb(255, 29, 0)', 'rgb(255, 21, 0)', 'rgb(255, 17, 0)', 'rgb(255, 12, 0)', 'rgb(255, 0, 0)', 'rgb(255, 0, 0)', 'rgb(255, 0, 0)', 'rgb(255, 0, 0)', 'rgb(255, 0, 0)', 'rgb(255, 0, 0)', 'rgb(255, 0, 0)', 'rgb(255, 0, 0)', 'rgb(255, 0, 0)', 'rgb(255, 0, 0)', 'rgb(255, 0, 0)', 'rgb(255, 0, 0)', 'rgb(255, 0, 0)', 'rgb(255, 0, 0)', 'rgb(255, 0, 0)', 'rgb(255, 0, 0)', 'rgb(255, 0, 0)', 'rgb(255, 0, 0)' ],

				// alphabetisch!
				arr_dp_p = [ 'coolors.co best picks', 'CSS Colors', 'Demo Palette', 'Famous Colors', 'Google Material Palette 2014', 'Gradients and Patterns', 'RGB Rainbow'],
				arr_dp_n = [ arr_coolors_n, arr_csscolors_copy, arr_demo_n, arr_famous_n, arr_google_material_n, arr_gradients_n, arr_rgb ],
				arr_dp_c = [ arr_coolors_c, arr_csscolors_copy, arr_demo_c, arr_famous_c, arr_google_material_c, arr_gradients_c, arr_rgb ],


				dp_len = arr_dp_p.length,
				init_p = 2; // bei erstmaligem Öffnen anzuzeigende Palette

		return new Promise(resolve => {

			const save_default_palettes = (x) => {
				x++;
				p_path = storage_path+arr_dp_p[x]+'.scss';

				save_colors(arr_dp_n[x], arr_dp_c[x], p_path, success => {
					if (success === true){
						if(x < dp_len - 1){
							save_default_palettes(x); // ███ Selbstaufruf ███
						}
						else{
							resolve([arr_dp_p, dp_len, init_p, storage_path+arr_dp_p[init_p]+'.scss']); // ███ return ███
						}
					}
				});

			};

			// Start
			save_default_palettes(-1);

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
		if(cm_is_open === false) open_cm(0, false); // ███ picker_mode = 0, picker_color = false ███
	}),


	// extension cm_open_picker ██████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	ext_open_picker = vscode.commands.registerCommand('extension.cm_open_picker', () => {
		if(cm_is_open === false) open_cm(1, '#000'); // ███ picker_mode = 2, picker_color = str ███
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
		if(cm_is_open === false) open_cm(1, picker_color); // ███ picker_mode = 2, picker_color = str ███
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
	});


	// activate global vars
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

},

deactivate = () => {
	store_state_on_exit(); // unter activate() an global gebunden
};

exports.activate = activate;
exports.deactivate = deactivate;



