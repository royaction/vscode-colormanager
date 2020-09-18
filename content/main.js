(function() {
	
	// Todo: Falls es irgendwann mal ein webview blur event geben sollte, dann die Krücke für ctrl-combos unter doc_keydown() und colorwrapper_mousedown() entfernen 
	// und in dem Fall per vscode api eine message an das webview senden und ctrl_key + shift_key auf false setzen und die "multiselect"-Klasse vom main wrapper entfernen 
	// (genaue Problembeschreibung siehe doc_keydown)
	
	
	// rgba_to_hsla _______________________________________________________________________________________________________________________________________________
	const rgba_to_hsla = (arr) => {

		const 	r = arr[0] / 255,
				g = arr[1] / 255,
				b = arr[2] / 255,
				min = Math.min(r, g, b),
				max = Math.max(r, g, b);

		let h, s, l = (max + min) / 2;

		if (max === min) {
			h = s = 0;
		}
		else{

			const dif = max - min;

			s = l > 0.5 ? dif / (2 - max - min) : dif / (max + min);

			switch (max) {
				case r:
					h = (g - b) / dif + (g < b ? 6 : 0);
					break;
				case g:
					h = (b - r) / dif + 2;
					break;
				case b:
					h = (r - g) / dif + 4;
					break;
			}

			h /= 6;
		}

		return arr.length === 3 ? [Math.round(h*360), Math.round(s*100), Math.round(l*100)] : [Math.round(h*360), Math.round(s*100), Math.round(l*100), arr[3]];

	},

	// hsla_to_rgba _______________________________________________________________________________________________________________________________________________

	hsla_to_rgba = (arr) => {

		const 	h = arr[0] / 360,
				s = arr[1] / 100,
				l = arr[2] / 100;

		let r = 0,
			g = 0,
			b = 0;

		if(s === 0){
			r = g = b = l;
		}else{

			const hue2rgb = (p, q, t) => {
				if(t < 0) t += 1;
				if(t > 1) t -= 1;
				if(t < 1/6) return p + (q - p) * 6 * t;
				if(t < 1/2) return q;
				if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
				return p;
			},

			q = l < 0.5 ? l * (1 + s) : l + s - l * s,
			p = 2 * l - q;

			r = hue2rgb(p, q, h + 1/3);
			g = hue2rgb(p, q, h);
			b = hue2rgb(p, q, h - 1/3);

		}

		return arr.length === 3 ? [Math.round(r*255), Math.round(g*255), Math.round(b*255)] : [Math.round(r*255), Math.round(g*255), Math.round(b*255), arr[3]];

	},

	// rgb hsl: string <> array _______________________________________________________________________________________________________________________________________________
	str_rgba_hsla_to_arr = (str) => {

		const 	arr_tmp = str.replace(/\s/g, '').split(','),
				r = parseInt(arr_tmp[0].substr(arr_tmp[0].indexOf('(') + 1, arr_tmp[0].length)),
				g = parseInt(arr_tmp[1]),
				b = parseInt(arr_tmp[2]);

		return arr_tmp.length === 4 ? [ r,g,b, parseFloat( arr_tmp[3].slice(0,-1) ) ] : [r,g,b]; // rgba hsla | rgb hsl

	},

	arr_rgba_hsla_to_str = (arr, c_sys) => { // c_sys = 'rgb' || 'hsl'
		if(c_sys === 'hsl') return arr.length === 3 ? c_sys+'('+arr[0]+', '+arr[1]+'%, '+arr[2]+'%)' : c_sys+'a('+arr[0]+', '+arr[1]+'%, '+arr[2]+'%, '+arr[3]+')';
		else return arr.length === 3 ? c_sys+'('+arr[0]+', '+arr[1]+', '+arr[2]+')' : c_sys+'a('+arr[0]+', '+arr[1]+', '+arr[2]+', '+arr[3]+')';
	},

	// str_rgba_to_hex _______________________________________________________________________________________________________________________________________________
	str_rgba_to_hex = (str_rgb) => {
		const 	arr_tmp = str_rgb.slice(str_rgb.indexOf('(', 0) + 1, str_rgb.lastIndexOf(')')).split(','),
				hex = (arr_tmp[0] | 1 << 8).toString(16).slice(1) + (arr_tmp[1] | 1 << 8).toString(16).slice(1) + (arr_tmp[2] | 1 << 8).toString(16).slice(1);
		return arr_tmp.length === 3 ? '#'+hex : '#'+hex + (Math.round(arr_tmp[3] * 255) + 0x10000).toString(16).substr(-2);
	},

	// hex_to_rgba _______________________________________________________________________________________________________________________________________________
	hex_to_rgba = (hex, return_option) => { // true = return string, false = return array

		if(hex.length === 4) hex = convert_short_hex(hex, 36); // type: 36 = #fff -> #ffffff | 48 = #fff3 -> #ffffff33 | 63 = #ffffff -> #fff | 84 = #ffffff33 -> #fff3
		else if(hex.length === 5) hex = convert_short_hex(hex, 48); // type: 36 = #fff -> #ffffff | 48 = #fff3 -> #ffffff33 | 63 = #ffffff -> #fff | 84 = #ffffff33 -> #fff3

		const 	r = parseInt(hex.substring(1, 3), 16),
				g = parseInt(hex.substring(3, 5), 16),
				b = parseInt(hex.substring(5, 7), 16);

		let a = false;

		// alpha?
		if(hex.length === 9) a = parseFloat((parseInt(hex.substring(7, 9), 16) / 255).toFixed(2));

		// string
		if(return_option === true){
			return a === false ? 'rgb('+r+', '+g+', '+b+')' : 'rgba('+r+', '+g+', '+b+', '+a+')';
		}
		// array
		else{
			return a === false ? [r,g,b] : [r,g,b,a];
		}

	},

	// css color <> hex _______________________________________________________________________________________________________________________________________________

	obj_css_colors = { 'AliceBlue':'#f0f8ff', 'AntiqueWhite':'#faebd7', 'Aqua':'#00ffff', 'AquaMarine':'#7fffd4', 'Azure':'#f0ffff', 'Beige':'#f5f5dc', 'Bisque':'#ffe4c4', 'Black':'#000000', 'BlanchedAlmond':'#ffebcd', 'Blue':'#0000ff', 'BlueViolet':'#8a2be2', 'Brown':'#a52a2a', 'Burlywood':'#deb887', 'CadetBlue':'#5f9ea0', 'Chartreuse':'#7fff00', 'Chocolate':'#d2691e', 'Coral':'#ff7f50', 'CornFlowerBlue':'#6495ed', 'CornSilk':'#fff8dc', 'Crimson':'#dc143c', 'Cyan':'#00ffff', 'DarkBlue':'#00008b', 'DarkCyan':'#008b8b', 'DarkGoldenRod':'#b8860b', 'DarkGray':'#a9a9a9', 'DarkGrey':'#a9a9a9', 'DarkGreen':'#006400', 'DarkKhaki':'#bdb76b', 'DarkMagenta':'#8b008b', 'DarkOliveGreen':'#556b2f', 'DarkOrange':'#ff8c00', 'DarkOrchid':'#9932cc', 'DarkRed':'#8b0000', 'DarkSalmon':'#e9967a', 'DarkSeaGreen':'#8fbc8f', 'DarkSlateBlue':'#483d8b', 'DarkSlateGray':'#2f4f4f', 'DarkSlateGrey':'#2f4f4f', 'DarkTurquoise':'#00ced1', 'DarkViolet':'#9400d3', 'DeepPink':'#ff1493', 'DeepSkyBlue':'#00bfff', 'DimGray':'#696969', 'DimGrey':'#696969', 'DodgerBlue':'#1e90ff', 'FireBrick':'#b22222', 'FloralWhite':'#fffaf0', 'ForestGreen':'#228b22', 'Fuchsia':'#ff00ff', 'Gainsboro':'#dcdcdc', 'GhostWhite':'#f8f8ff', 'Gold':'#ffd700', 'GoldenRod':'#daa520', 'Gray':'#808080', 'Grey':'#808080', 'Green':'#008000', 'GreenYellow':'#adff2f', 'Honeydew':'#f0fff0', 'HotPink':'#ff69b4', 'IndianRed':'#cd5c5c', 'Indigo':'#4b0082', 'Ivory':'#fffff0', 'Khaki':'#f0e68c', 'Lavender':'#e6e6fa', 'LavenderBlush':'#fff0f5', 'LawnGreen':'#7cfc00', 'LemonChiffon':'#fffacd', 'LightBlue':'#add8e6', 'LightCoral':'#f08080', 'LightCyan':'#e0ffff', 'LightGoldenRodYellow':'#fafad2', 'LightGray':'#d3d3d3', 'LightGrey':'#d3d3d3', 'LightGreen':'#90ee90', 'LightPink':'#ffb6c1', 'LightSalmon':'#ffa07a', 'LightSeaGreen':'#20b2aa', 'LightSkyBlue':'#87cefa', 'LightSlateGray':'#778899', 'LightSlateGrey':'#778899', 'LightSteelBlue':'#b0c4de', 'LightYellow':'#ffffe0', 'Lime':'#00ff00', 'LimeGreen':'#32cd32', 'Linen':'#faf0e6', 'Magenta':'#ff00ff', 'Maroon':'#800000', 'MediumAquaMarine':'#66cdaa', 'MediumBlue':'#0000cd', 'Mediumorchid':'#ba55d3', 'MediumPurple':'#9370d8', 'MediumSeaGreen':'#3cb371', 'MediumSlateBlue':'#7b68ee', 'MediumSpringGreen':'#00fa9a', 'MediumTurquoise':'#48d1cc', 'MediumVioletRed':'#c71585', 'MidnightBlue':'#191970', 'MintCream':'#f5fffa', 'MistyRose':'#ffe4e1', 'Moccasin':'#ffe4b5', 'NavajoWhite':'#ffdead', 'Navy':'#000080', 'OldLace':'#fdf5e6', 'Olive':'#808000', 'OliveDrab':'#6b8e23', 'Orange':'#ffa500', 'OrangeRed':'#ff4500', 'Orchid':'#da70d6', 'PaleGoldenRod':'#eee8aa', 'PaleGreen':'#98fb98', 'PaleTurquoise':'#afeeee', 'PaleVioletRed':'#d87093', 'PapayaWhip':'#ffefd5', 'PeachPuff':'#ffdab9', 'Peru':'#cd853f', 'Pink':'#ffc0cb', 'Plum':'#dda0dd', 'PowderBlue':'#b0e0e6', 'Purple':'#800080', 'RebeccaPurple':'#663399', 'Red':'#ff0000', 'RosyBrown':'#bc8f8f', 'RoyalBlue':'#4169e1', 'SaddleBrown':'#8b4513', 'Salmon':'#fa8072', 'SandyBrown':'#f4a460', 'SeaGreen':'#2e8b57', 'SeaShell':'#fff5ee', 'Sienna':'#a0522d', 'Silver':'#c0c0c0', 'SkyBlue':'#87ceeb', 'SlateBlue':'#6a5acd', 'SlateGray':'#708090', 'SlateGrey':'#708090', 'Snow':'#fffafa', 'SpringGreen':'#00ff7f', 'SteelBlue':'#4682b4', 'Tan':'#d2b48c', 'Teal':'#008080', 'Thistle':'#d8bfd8', 'Tomato':'#ff6347', 'Turquoise':'#40e0d0', 'Violet':'#ee82ee', 'Wheat':'#f5deb3', 'White':'#ffffff', 'WhiteSmoke':'#f5f5f5', 'Yellow':'#ffff00', 'YellowGreen':'#9acd32', 'transparent':'transparent'},

	css_to_hex = (key) => {
		return obj_css_colors_lowercase[key.toLowerCase()]; // Keine case-intensitive Suche nach Objekt-Schlüsseln möglich, daher zusätzliches Objekt 'window.obj_css_colornames_lowercase' (siehe Init)
	},

	/*hex_to_css = (hex) => {
		return Object.keys(obj_css_colors).find(key => obj_css_colors[key] === hex.toLowerCase());
	},*/

	convert_short_hex = (hex, type) => { // type: 36 = #fff -> #ffffff | 48 = #fff3 -> #ffffff33 | 63 = #ffffff -> #fff | 84 = #ffffff33 -> #fff3
		if(type === 36) 	 return '#' + hex.substr(1,1).repeat(2) + hex.substr(2,1).repeat(2) + hex.substr(3,1).repeat(2);
		else if(type === 48) return '#' + hex.substr(1,1).repeat(2) + hex.substr(2,1).repeat(2) + hex.substr(3,1).repeat(2) + hex.substr(4,1).repeat(2);
		else if(type === 63) return '#' + hex.substr(1,1) + hex.substr(3,1) + hex.substr(5,1);
		else if(type === 84) return '#' + hex.substr(1,1) + hex.substr(3,1) + hex.substr(5,1) + hex.substr(7,1);
	},

	// check color _______________________________________________________________________________________________________________________________________________

	// return: false | 1 = HEX6 | 2 = HEX6a | 3 = HEX3 | 4 = HEX3a | 5 = rgb | 6 = rgba | 7 = hsl | 8 = hsla | 9 = css color | 10 = gradient

	check_color = (str) => { // Werte kommen immer getrimmt an (siehe inputs: keydown, fosusout)

		// hex3|6(a): 1 - 4 -----------------------------------------------------------------
		if(str.substr(0,1) === '#'){

			if(str.match(/^#[0-9a-f]+$/gi) === null){
				return false;
			}
			else{
				const str_len = str.length;
				if(str_len === 7) return 1; 	 // HEX6:  1  #ffffff
				else if(str_len === 9) return 2; // HEX6a: 2  #ffffff33
				else if(str_len === 4) return 3; // HEX3:  3  #fff
				else if(str_len === 5) return 4; // HEX3a: 4  #fff3
				else return false;
			}

		}
		// rgb: 5 | rbga: 6 -----------------------------------------------------------------
		else if(str.substr(0,2).toLowerCase() === 'rg'){

			str = str.replace(/\s/g, '').toLowerCase(); // Leerzeichen raus + lowercase, dafür regex weniger aufwendig

			if(str.substr(3,1) === 'a'){ // rgba: 6
				return str.match(/^rgba\((0|255|25[0-4]|2[0-4]\d|1\d\d|0?\d?\d),(0|255|25[0-4]|2[0-4]\d|1\d\d|0?\d?\d),(0|255|25[0-4]|2[0-4]\d|1\d\d|0?\d?\d),(0|1|0?\.?\d*?)\)$/) === null ? false : 6;
			}
			else{ // rgb: 5
				return str.match(/^rgb\((0|255|25[0-4]|2[0-4]\d|1\d\d|0?\d?\d),(0|255|25[0-4]|2[0-4]\d|1\d\d|0?\d?\d),(0|255|25[0-4]|2[0-4]\d|1\d\d|0?\d?\d)\)$/) === null ? false : 5;
			}

		}
		// hsl: 7 | hsla: 8 -----------------------------------------------------------------
		else if(str.substr(0,2).toLowerCase() === 'hs'){

			str = str.replace(/\s/g, '').toLowerCase(); // Leerzeichen raus + lowercase, dafür regex weniger aufwendig

			if(str.substr(3,1) === 'a'){ // hsla: 8
				return str.match(/^hsla\((0|360|35\d|3[0-4]\d|[12]\d\d|0?\d?\d),(0|100|\d{1,2})%,(0|100|\d{1,2})%,(0|1|0?\.?\d*?)\)$/) === null ? false : 8;
			}
			else{ // hsl: 7
				return str.match(/^hsl\((0|360|35\d|3[0-4]\d|[12]\d\d|0?\d?\d),(0|100|\d{1,2})%,(0|100|\d{1,2})%\)$/) === null ? false : 7;
			}

		}
		else{

			// gradient: 10 -----------------------------------------------------------------
			if(str.toLowerCase().indexOf('gradient') !== -1){

				// umfangreiche RegEx-Tests zu aufwendig, daher nur einfacher Test und dann einem dummy den übergebenen Wert als Hintergrund zuweisen
				// und mit get_computed_style überprüfen, ob computed style "gradient" zurückliefert
				if(str.match(/.*gradient\s*\(((?:\([^\)]*\)|[^\)\(]*)*)\)/gi) !== null){
					$check_gradient_dummy.style.background = str;
					const style = get_computed_style($check_gradient_dummy, 'background');
					$check_gradient_dummy.style.background = ''; // reset wichtig!
					return style.indexOf('gradient') === -1 ? false : 10;
				}
				else{
					return false;
				}

			}
			// !!! Alle vorherigen Tests fehlgeschlagen: entweder CSS Farbe (9) oder false -----------------------------------------------------------------
			else{
				return Object.keys(obj_css_colors).find(key => key.toLowerCase() === str.toLowerCase()) === undefined ? false : 9;
			}

		}

	},

	get_computed_style = ($elem, prop) => {
		return window.getComputedStyle ? window.getComputedStyle($elem, null).getPropertyValue(prop) : $elem.style[prop.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); })];
	},

	color_error_bg = 'linear-gradient(135deg, transparent 0%, transparent 47%, red 50%, transparent 53%, transparent 100%)',


	// color picker █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	open_picker = (str_color) => {

		const get_picker_dimensions = () => { // drag head muss Zugriff haben (siehe 'drag_head_mousedown()')

			const sat_rect_bcr = $sat_rect.getBoundingClientRect();

			sat_rect_top = parseInt(sat_rect_bcr.top + window.scrollY);
			sat_rect_left = parseInt(sat_rect_bcr.left);
			sat_rect_width = $sat_rect.offsetWidth;
			sat_rect_height = $sat_rect.offsetHeight;
			sat_pointer_width = $sat_pointer.offsetWidth;

			// identisch mit sat_rect (bei CSS-Änderung anpassen!)
			alpha_slider_top = sat_rect_top;
			alpha_slider_height = sat_rect_height;
			alpha_pointer_width = $alpha_pointer.offsetWidth; // !!!

			hue_slider_top = sat_rect_top;
			hue_slider_height = sat_rect_height;
			hue_pointer_width = alpha_pointer_width; // !!!

		},

		// hsla > control positions _______________________________________________________________________________________________________________________________________________

		picker_hsla_to_control_positions = ([h,s,l,a]) => {

			alpha_pointer_y = Math.round( alpha_slider_height - (a * alpha_slider_height) );
			sat_pointer_x   = Math.round( s * (sat_rect_width / 100) );
			sat_pointer_y   = Math.round( sat_rect_height - (sat_rect_height * l / 100) );
			hue_pointer_y   = Math.round( hue_slider_height / (360 / h) );

			$alpha_pointer.style.transform = 'translate(-'+(alpha_pointer_width/2)+'px, '+ parseInt(alpha_pointer_y - ( alpha_pointer_width /2 ) )+'px)';
			$sat_pointer.style.transform = 'translate('+(sat_pointer_x - (sat_pointer_width/2))+'px ,'+(sat_pointer_y - (sat_pointer_width/2))+'px)';
			$hue_pointer.style.transform = 'translate(-'+(hue_pointer_width/2)+'px, '+ parseInt(hue_pointer_y - ( hue_pointer_width /2 ) )+'px)';

		},

		// mouse move _______________________________________________________________________________________________________________________________________________

		picker_mousemove_hue_slider = (e) => {

			const hue_pointer_y = Math.max( Math.min( (e.pageY - hue_slider_top), hue_slider_height ), 0);
			$hue_pointer.style.transform = 'translate(-'+(hue_pointer_width/2)+'px, '+ parseInt(hue_pointer_y - (hue_pointer_width/2) )+'px)';
			arr_picker_hsla[0] = Math.round( hue_pointer_y / hue_slider_height * 360 ); // ███ h ███

			// bg styles
			$alpha_slider.style.background = 'linear-gradient(to bottom, hsl('+arr_picker_hsla[0]+','+arr_picker_hsla[1]+'%,'+arr_picker_hsla[2]+'%)'+', transparent)';
			$sat_rect.style.background = 'hsl('+arr_picker_hsla[0]+', 100%, 50%)';
			$sat_pointer.style.background = 'hsl('+arr_picker_hsla[0]+','+arr_picker_hsla[1]+'%,'+arr_picker_hsla[2]+'%)';
			$hue_pointer.style.background = 'hsl('+arr_picker_hsla[0]+', 100%, 50%)';
			$picker_preview_new.style.background = 'hsla('+arr_picker_hsla[0]+','+ arr_picker_hsla[1]+'%,'+ arr_picker_hsla[2]+'%,'+arr_picker_hsla[3]+')';

			$picker_controls_info.textContent = arr_picker_hsla[0];

			picker_set_color_str();

		},

		picker_mousemove_sat_rect = (e) => {

			sat_pointer_x = Math.max( Math.min( (e.pageX - sat_rect_left), sat_rect_width), 0);
			sat_pointer_y = Math.max( Math.min( (e.pageY - sat_rect_top), sat_rect_height), 0);
			arr_picker_hsla[1] = Math.round(sat_pointer_x / sat_rect_width * 100);	// ███ s ███
			arr_picker_hsla[2] = Math.round(100 - (sat_pointer_y / sat_rect_height * 100)); // ███ l ███
			$sat_pointer.style.transform = 'translate('+(sat_pointer_x - (sat_pointer_width/2))+'px ,'+(sat_pointer_y - (sat_pointer_width/2) )+'px)';

			// bg styles
			$alpha_slider.style.background = 'linear-gradient(to bottom, hsl('+arr_picker_hsla[0]+','+arr_picker_hsla[1]+'%,'+arr_picker_hsla[2]+'%)'+', transparent)';
			$sat_pointer.style.background = 'hsl('+arr_picker_hsla[0]+','+arr_picker_hsla[1]+'%,'+arr_picker_hsla[2]+'%)';
			$picker_preview_new.style.background = 'hsla('+arr_picker_hsla[0]+','+ arr_picker_hsla[1]+'%,'+ arr_picker_hsla[2]+'%,'+arr_picker_hsla[3]+')';

			$picker_controls_info.textContent = arr_picker_hsla[1]+','+arr_picker_hsla[2];

			picker_set_color_str();

		},

		picker_mousemove_alpha_slider = (e) =>  {

			const alpha_pointer_y = Math.max(Math.min((e.pageY - alpha_slider_top), alpha_slider_height), 0);
			arr_picker_hsla[3] = parseFloat((1 - (alpha_pointer_y / alpha_slider_height)).toFixed(2)); // ███ a ███
			$alpha_pointer.style.transform = 'translate(-'+(alpha_pointer_width/2)+'px, '+ parseInt(alpha_pointer_y - (alpha_pointer_width/2) )+'px)';

			// bg styles
			$picker_preview_new.style.background = 'hsla('+arr_picker_hsla[0]+','+ arr_picker_hsla[1]+'%,'+ arr_picker_hsla[2]+'%,'+arr_picker_hsla[3]+')';

			$picker_controls_info.textContent = arr_picker_hsla[3];

			picker_set_color_str();

		},

		// controls mousedown _______________________________________________________________________________________________________________________________________________

		picker_alpha_slider_mousedown = (e) => {
			mousehold_alpha = true;
			$picker_wrapper_outer.classList.add('picker-mousehold'); // pointer-events: all / Klasse wird gesetzt wenn Slider bewegt werden, damit bei document mouseup keine darunterliegenden Elemente getriggert werden!
			$picker_controls_info.className = 'alpha';
			document.addEventListener('mousemove', picker_doc_mousemove_alpha, false);
			document.addEventListener('mouseup', picker_doc_mouseup, false);
			picker_mousemove_alpha_slider(e);
		},

		picker_sat_rect_mousedown = (e) => {
			mousehold_sat = true;
			$picker_wrapper_outer.classList.add('picker-mousehold'); // pointer-events: all / Klasse wird gesetzt wenn Slider bewegt werden, damit bei document mouseup keine darunterliegenden Elemente getriggert werden!
			$picker_controls_info.className = 'sat';
			document.addEventListener('mousemove', picker_doc_mousemove_sat, false);
			document.addEventListener('mouseup', picker_doc_mouseup, false);
			picker_mousemove_sat_rect(e);
		},

		picker_hue_slider_mousedown = (e) => {
			mousehold_hue = true;
			$picker_wrapper_outer.classList.add('picker-mousehold'); // pointer-events: all / Klasse wird gesetzt wenn Slider bewegt werden, damit bei document mouseup keine darunterliegenden Elemente getriggert werden!
			$picker_controls_info.className = 'hue';
			document.addEventListener('mousemove', picker_doc_mousemove_hue, false);
			document.addEventListener('mouseup', picker_doc_mouseup, false);
			picker_mousemove_hue_slider(e);
		},

		// doc mouse _______________________________________________________________________________________________________________________________________________

		// doc mousemove
		picker_doc_mousemove_alpha = (e) => { picker_mousemove_alpha_slider(e); },
		picker_doc_mousemove_sat =   (e) => { picker_mousemove_sat_rect(e); },
		picker_doc_mousemove_hue =   (e) => { picker_mousemove_hue_slider(e); },

		// doc mouseup
		picker_doc_mouseup = () => {

			if(mousehold_alpha === true){
				mousehold_alpha = false;
				document.removeEventListener('mousemove', picker_doc_mousemove_alpha, false);
			}
			else if(mousehold_sat === true){
				mousehold_sat = false;
				document.removeEventListener('mousemove', picker_doc_mousemove_sat, false);
			}
			else if(mousehold_hue === true){
				mousehold_hue = false;
				document.removeEventListener('mousemove', picker_doc_mousemove_hue, false);
			}

			$picker_controls_info.textContent = '';
			$picker_controls_info.className = '';

			document.removeEventListener('mouseup', picker_doc_mouseup, false);
			$picker_wrapper_outer.classList.remove('picker-mousehold'); // pointer-events: all entfernen

		},

		// preview _______________________________________________________________________________________________________________________________________________
		picker_preview_color = () => {
			$alpha_slider.style.background = 'linear-gradient(to bottom, hsl('+arr_picker_hsla[0]+','+arr_picker_hsla[1]+'%,'+arr_picker_hsla[2]+'%)'+', transparent)';
			$sat_rect.style.background = 'hsl('+arr_picker_hsla[0]+', 100%, 50%)';
			$sat_pointer.style.background = 'hsl('+arr_picker_hsla[0]+','+arr_picker_hsla[1]+'%,'+arr_picker_hsla[2]+'%)';
			$hue_pointer.style.background = 'hsl('+arr_picker_hsla[0]+', 100%, 50%)';
			$picker_preview_new.style.background = 'hsla('+arr_picker_hsla[0]+','+ arr_picker_hsla[1]+'%,'+ arr_picker_hsla[2]+'%,'+arr_picker_hsla[3]+')';
		},

		// replace color text _______________________________________________________________________________________________________________________________________________
		picker_set_color_str = () => {

			// alpha?
			const arr_tmp = arr_picker_hsla[3] < 1 ? arr_picker_hsla : [arr_picker_hsla[0], arr_picker_hsla[1], arr_picker_hsla[2]];

			// picker_csys: 0 = HEX | 1 = rgba | 2 = hsla
			if(picker_csys === 1) picker_color = arr_rgba_hsla_to_str(hsla_to_rgba(arr_tmp), 'rgb'); // c_sys = 'rgb' || 'hsl'
			else if(picker_csys === 2) picker_color = arr_rgba_hsla_to_str(arr_tmp, 'hsl') // c_sys = 'rgb' || 'hsl'
			else picker_color = str_rgba_to_hex(arr_rgba_hsla_to_str( hsla_to_rgba(arr_tmp), 'rgb'));

			$picker_color_text.textContent = picker_color;

			// falls immer noch error-bg / spätestens jetzt hat der user die controls bewegt und einen korrekten Wert erzeugt
			if(picker_color_check_failed === true) picker_color_check_failed = false;

		},

		// replace color text _______________________________________________________________________________________________________________________________________________
		picker_invalid_color = () => {
			$sat_rect.style.background = '#f00'; // rot weil hue-slider bei init ganz oben
			$picker_color_text.textContent = str_invalid_color;
			$picker_preview_sel.style.background = 'linear-gradient(135deg, transparent 0%, transparent 48%, red 50%, transparent 52%, transparent 100%)';
			$picker_preview_new.style.background = '#fff';
		},

		// switch color system _______________________________________________________________________________________________________________________________________________
		picker_btn_switch_mousedown = () => {

			if(picker_color_check_failed === false){

				picker_color = switch_color_system(picker_color);

				// picker_csys: 0 = HEX6 | HEX6a | HEX3 | HEX3a | CSS Color
				// 				1 = rgba
				//				2 = hsla

				const tmp = picker_color.substr(0,2);

				// rgb
				if(tmp === 'rg') picker_csys = 1;
				// hsl
				else if(tmp === 'hs') picker_csys = 2;
				// hex | css color
				else picker_csys = 0;

				$picker_color_text.textContent = picker_color;

			}

		},

		// add replace _______________________________________________________________________________________________________________________________________________
		picker_add_colors = () => {
			add_colors([picker_color], [picker_color], c_cid, false);
			$picker_preview_sel.style.background = picker_color;
		},

		picker_replace_color = () => {
			const 	arr_replace_ids = get_selected_ids(),
					replace_len = arr_replace_ids.length;
			if(replace_len > 0){
				for (i = 0; i < replace_len; i++) {
					arr_c[arr_replace_ids[i]] = picker_color;
					arr_b[arr_replace_ids[i]] = picker_color_check_failed === false ? picker_color : color_error_bg;
					$color_inputs_c[arr_replace_ids[i]].value = picker_color_check_failed === false ? picker_color : str_invalid_color;
					$color_spans[arr_replace_ids[i]].style.background = arr_b[arr_replace_ids[i]];
				}
			}
		},

		// insert doc  _______________________________________________________________________________________________________________________________________________
		picker_btn_insert_mousedown = () => {
			vscode.postMessage({ // ███ vscode APi ███
				command: 'insert',
				colorval: picker_color
			})
		},

		// window resize  _______________________________________________________________________________________________________________________________________________
		picker_check_color = (str_color) => {

			// return: false | 1 = HEX6 | 2 = HEX6a | 3 = HEX3 | 4 = HEX3a | 5 = rgb | 6 = rgba | 7 = hsl | 8 = hsla | 9 = css color | 10 = gradient

			const check_result = check_color(str_color);

			// false || gradient
			if(check_result === false || check_result === 10){
				picker_color_check_failed = true;
				picker_color = 0;
				arr_picker_hsla = arr_picker_hsla_default;
			}
			else{

				picker_color_check_failed = false;
				picker_color = str_color;

				// hex(a)
				if(check_result >= 1 && check_result <= 4){

					// HEX3 HEX3a ?
					if(check_result === 3) str_color = convert_short_hex(str_color, 36); // type: 36 = #fff -> #ffffff | 48 = #fff3 -> #ffffff33 | 63 = #ffffff -> #fff | 84 = #ffffff33 -> #fff3
					else if(check_result === 4) str_color = convert_short_hex(str_color, 48); // type: 36 = #fff -> #ffffff | 48 = #fff3 -> #ffffff33 | 63 = #ffffff -> #fff | 84 = #ffffff33 -> #fff3

					// HEX -> HSL
					arr_picker_hsla = rgba_to_hsla( hex_to_rgba(str_color, false) ); // hex_to_rgba: true = return string, false = return array

					// picker_color mit alpha 1 ergänzen, wenn HEX keinen alpha-Wert hatte
					if(check_result === 1 || check_result === 3) arr_picker_hsla[3] = 1; // alpha 1

					picker_csys = 0; // 0 = HEX | 1 = rgba | 2 = hsla

				}
				// rgb(a)
				else if(check_result === 5 || check_result === 6){
					arr_picker_hsla = rgba_to_hsla( str_rgba_hsla_to_arr(str_color) );
					if(check_result === 5) arr_picker_hsla[3] = 1; // alpha 1
					picker_csys = 1; // 0 = HEX | 1 = rgba | 2 = hsla
				}
				// hsl(a)
				else if(check_result === 7 || check_result === 8){
					arr_picker_hsla = str_rgba_hsla_to_arr(str_color);
					if(check_result === 7) arr_picker_hsla[3] = 1; // alpha 1
					picker_csys = 2; // 0 = HEX | 1 = rgba | 2 = hsla
				}
				// css color
				else if(check_result === 9){

					if(str_color.toLowerCase() === 'transparent'){
						arr_picker_hsla = [0,0,0,0];
					}
					else{
						arr_picker_hsla = rgba_to_hsla(hex_to_rgba( css_to_hex(str_color), false ), false); // true = return string, false = return array
						arr_picker_hsla[3] = 1;// alpha 1
					}

					picker_csys = 0; // 0 = HEX | 1 = rgba | 2 = hsla

				}

			}

		},

		// outer wrapper scroll  _______________________________________________________________________________________________________________________________________________
		picker_outer_wrapper_scroll = () => {
			get_picker_dimensions(); // offset top der Controls aktualisieren red
		},

		// picker drag  _______________________________________________________________________________________________________________________________________________
		picker_head_mousedown = (e) => {
			drag_head_mousedown(e, $picker_wrapper, $picker_wrapper_outer, get_picker_dimensions); // mouseup_func = get_picker_dimensions() (Picker-Positionen bei mouseup aktualisieren)
		},

		// window resize  _______________________________________________________________________________________________________________________________________________
		picker_window_resize = () => {

			// wenn Picker höher als Fenster, dann overflow scroll
			if($picker_wrapper.offsetHeight > window.outerHeight) $picker_wrapper_outer.style.overflowY = 'scroll';
			else $picker_wrapper_outer.overflowY = 'hidden';

			// Positionen / Abmessungen für Controls aktualisieren
			get_picker_dimensions();
			picker_hsla_to_control_positions(arr_picker_hsla);

		},

		// window resize  _______________________________________________________________________________________________________________________________________________
		picker_window_scroll_end = () => {

			if(this.scroll_to) clearTimeout(this.scroll_to);

			this.scroll_to = setTimeout(() => {
				get_picker_dimensions(); // Positionen / Abmessungen für Controls aktualisieren
			}, 20);

		},

		// close _______________________________________________________________________________________________________________________________________________
		picker_close = () => {
			drag_head_splice($picker_wrapper);
			picker_mode = 0; // 0 = nicht geöffnet | 1 = palette mode | 2 = doc mode
			window.removeEventListener("scroll", picker_window_scroll_end, false);
			window.removeEventListener("resize", picker_window_resize, false);
			document.body.removeChild($picker_wrapper_outer);
		},

		// def const ---------------------------------------------------
		$picker_wrapper_outer    = document.createElement("div"),

		$picker_wrapper          = document.createElement("div"),

		$picker_head          	 = document.createElement("div"),
		$picker_btn_close        = document.createElement("p"),

		$picker_preview_wrapper  = document.createElement("div"),
		$picker_btn_add_replace  = document.createElement("p"),
		$picker_preview_new      = document.createElement("span"),
		$picker_preview_sel      = document.createElement("span"),

		$picker_btn_switch		 = document.createElement("p"),
		$picker_color_text       = document.createElement("div"),

		$picker_controls_info 	 = document.createElement("div"),

		$picker_controls_wrapper = document.createElement("div"),
		$alpha_slider            = document.createElement("div"),
		$alpha_pointer           = document.createElement("div"),
		$hue_slider              = document.createElement("div"),
		$hue_pointer             = document.createElement("div"),
		$sat_rect                = document.createElement("div"),
		$sat_pointer             = document.createElement("div"),

		$picker_btn_insert       = document.createElement("p"),

		arr_picker_hsla_default = [0, 0, 100, 1], // falls check_color false zurückgibt

		str_invalid_color = 'INVALID COLOR VALUE';

		// def let ---------------------------------------------------
		let arr_picker_hsla = [],

			mousehold_hue   = false,
			mousehold_sat   = false,
			mousehold_alpha = false,

			sat_pointer_x = 0,
			sat_pointer_y = 0,

			sat_rect_top = 0,
			sat_rect_left = 0,
			sat_rect_width = 0,
			sat_rect_height = 0,
			sat_pointer_width = 0,

			hue_slider_top = 0,
			hue_slider_height = 0,
			hue_pointer_width = 0,

			alpha_slider_top = 0,
			alpha_slider_height = 0,
			alpha_pointer_width = 0,

			picker_csys = 0, // 0 = HEX | 1 = rgb | 2 = hsl

			picker_color_check_failed = false;

		// def window ---------------------------------------------------

		window.picker_refresh_external = (str_color) => {

			if(picker_mode !== 2 ) $picker_wrapper.className = 'picker-mode-'+picker_mode+' drag-head-wrapper'; // 1 = ext_picker | 2 = ext_open_picker_sel

			picker_check_color(str_color); // -> picker_color_check_failed = true|false

			if(picker_color_check_failed === false){
				$picker_preview_sel.style.background = 'hsla('+arr_picker_hsla[0]+','+ arr_picker_hsla[1]+'%,'+ arr_picker_hsla[2]+'%,'+arr_picker_hsla[3]+')';
				$picker_color_text.textContent = picker_color;
				picker_hsla_to_control_positions(arr_picker_hsla);
				picker_preview_color();
			}
			else{
				picker_invalid_color();
			}

		}

		// START open_picker ____________________________________________________________________________________________________________

		// 0x-Hex > "0x" durch "#" ersetzen?
		if(str_color.substr(0,2) === '0x') str_color = '#' + str_color.substr(2,str_color.length);

		picker_check_color(str_color); // aktualisiert arr_picker_hsla + picker_color_check_failed + picker_csys

		$picker_wrapper_outer.id = 'picker-wrapper-outer';
		$picker_wrapper_outer.className = 'drag-head-wrapper-outer'; // drag head
		$picker_wrapper_outer.addEventListener("scroll", picker_outer_wrapper_scroll, false); // unwahrscheinlich aber nötig (falls Picker höher als Fenster)

		$picker_wrapper.id = 'picker-wrapper';
		$picker_wrapper.className = 'picker-mode-'+picker_mode+' drag-head-wrapper'; // 1 = palette mode | 2 = doc mode

		// picker head ------------------------------------------
		$picker_head.id = 'picker-head';
		$picker_head.className = 'drag-head'; // drag head
		$picker_head.addEventListener("mousedown", picker_head_mousedown, false);
		$picker_wrapper.appendChild($picker_head);

		// btn close ------------------------------------------
		$picker_btn_close.id  = 'picker-btn-close';
		$picker_btn_close.addEventListener("click", picker_close, false);
		$picker_wrapper.appendChild($picker_btn_close);

		// preview wrapper  ---------------------------------------
		$picker_preview_wrapper.id = 'picker-preview-wrapper';

		// btn add replace
		$picker_btn_add_replace.id = 'picker-btn-add-replace';
		if(picker_mode === 1) $picker_btn_add_replace.addEventListener("mousedown", picker_add_colors, false); // mousedown, wegen doc mouseup
		else $picker_btn_add_replace.addEventListener("mousedown", picker_replace_color, false); // mousedown, wegen doc mouseup

		// span selected
		$picker_preview_sel.id = 'picker-preview-sel';
		$picker_preview_sel.style.background = picker_color_check_failed === false ? 'hsla('+arr_picker_hsla[0]+','+ arr_picker_hsla[1]+'%,'+ arr_picker_hsla[2]+'%,'+arr_picker_hsla[3]+')' : '';

		// span new
		$picker_preview_new.id = 'picker-preview-new';

		$picker_preview_wrapper.appendChild($picker_btn_add_replace);
		$picker_preview_wrapper.appendChild($picker_preview_new);
		$picker_preview_wrapper.appendChild($picker_preview_sel);
		$picker_wrapper.appendChild($picker_preview_wrapper);

		// btn switch / color val -----------------------------------------
		$picker_btn_switch.id = 'picker-btn-switch';
		$picker_btn_switch.addEventListener("mousedown", picker_btn_switch_mousedown, false); // mousedown, wegen doc mouseup
		$picker_color_text.id = 'picker-text-switch';

		$el = document.createElement("div");
		$el.id = 'picker-switch-wrapper';
		$el.appendChild($picker_btn_switch);
		$el.appendChild($picker_color_text);
		$picker_wrapper.appendChild($el);

		// controls info
		$picker_controls_info.id = 'picker_controls_info';
		$picker_wrapper.appendChild($picker_controls_info);

		// controls wrapper -----------------------------------------
		$picker_controls_wrapper.id = 'picker-controls-wrapper';

		// alpha slider + pointer
		$alpha_slider.id = 'alpha-slider';
		$alpha_slider.addEventListener("mousedown", picker_alpha_slider_mousedown, false);
		$alpha_pointer.id = 'alpha-pointer';
		$alpha_pointer.className = 'pointer';
		$alpha_slider.appendChild($alpha_pointer);
		$picker_controls_wrapper.appendChild($alpha_slider);

		// sat rect + div bg + pointer
		$sat_rect.id = 'sat-rect';
		$sat_rect.addEventListener("mousedown", picker_sat_rect_mousedown, false);
		$sat_pointer.id = 'sat-pointer';
		$sat_pointer.className = 'pointer';
		$el = document.createElement("div");
		$sat_rect.appendChild($el);
		$sat_rect.appendChild($sat_pointer);
		$picker_controls_wrapper.appendChild($sat_rect);

		$el = null;

		// hue slider + pointer
		$hue_slider.id = 'hue-slider';
		$hue_slider.addEventListener("mousedown", picker_hue_slider_mousedown, false);
		$hue_pointer.id = 'hue-pointer';
		$hue_pointer.className = 'pointer';
		$hue_slider.appendChild($hue_pointer);
		$picker_controls_wrapper.appendChild($hue_slider);

		$picker_wrapper.appendChild($picker_controls_wrapper);


		// btn insert -----------------------------------------------
		$picker_btn_insert.id = 'picker-btn-insert';
		$picker_wrapper.appendChild($picker_btn_insert);
		$picker_btn_insert.addEventListener("mousedown", picker_btn_insert_mousedown, false); // mousedown, wegen doc mouseup


		// window listener ---------------------------------------------------------
		window.addEventListener("scroll", picker_window_scroll_end, false);
		window.addEventListener("resize", picker_window_resize, false);


		// ---------------------------------------------------------
		if(picker_color_check_failed === false){
			$picker_color_text.textContent = picker_color;
			picker_preview_color();
		}
		else{
			// anzuzeigende Farbe bleibt auf init (siehe css)
			picker_invalid_color();
		}


		drag_head_push($picker_wrapper);

		// append ---------------------------------------------------------
		$picker_wrapper_outer.appendChild($picker_wrapper);
		document.body.appendChild($picker_wrapper_outer);

		// sichtbar ---------------------------------------------------

		// vertikal zentrieren
		const picker_height = $picker_wrapper.offsetHeight;
		$picker_wrapper.style.transform = picker_height < window_height ? 'translateY('+Math.round((window_height - picker_height) / 2 )+'px)' : 'translateY(0)';

		get_picker_dimensions();

		if(picker_color_check_failed === false) picker_hsla_to_control_positions(arr_picker_hsla);


	},

	// open_picker_external █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	open_picker_external = (picker_mode_new, picker_color) => { // picker_color getrimmt (siehe extension.js)

		// picker bereits geöffnet oder noch geschlossen ?
		if(picker_mode === 0){
			picker_mode = picker_mode_new;
			open_picker(picker_color);
		}
		else{
			picker_mode = picker_mode_new;
			picker_refresh_external(picker_color);
		}

	},

	// switch_color_system █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

	// benutzt von picker und color color wrapper switch

	switch_color_system = (str_color) => {

		let check_result = check_color(str_color); // return: false | 1 = HEX6 | 2 = HEX6a | 3 = HEX3 | 4 = HEX3a | 5 = rgb | 6 = rgba | 7 = hsl | 8 = hsla | 9 = css color | 10 = gradient

		// HEX3 -> HEX6 -> RGB > HSL -> CSS

		// hex(a): HEX3 -> HEX6 | HEX6 -> RGB -----------------------------------------------------------------------------------------------------
		if(check_result === 1 || check_result === 2){
			return hex_to_rgba(str_color, true); // true = return string, false = return array
		}
		// HEX3 -> HEX6 -----------------------------------------------------------------------------------------------------
		else if(check_result === 3){
			return convert_short_hex(str_color, 36); // type: 36 = #fff -> #ffffff | 48 = #fff3 -> #ffffff33 | 63 = #ffffff -> #fff | 84 = #ffffff33 -> #fff3
		}
		// HEX4 -> HEX8 -----------------------------------------------------------------------------------------------------
		else if(check_result === 4){
			return convert_short_hex(str_color, 48); // type: 36 = #fff -> #ffffff | 48 = #fff3 -> #ffffff33 | 63 = #ffffff -> #fff | 84 = #ffffff33 -> #fff3
		}
		// rgb(a): RGB -> HSL -----------------------------------------------------------------------------------------------------
		else if(check_result === 5 || check_result === 6){
			return arr_rgba_hsla_to_str( rgba_to_hsla( str_rgba_hsla_to_arr(str_color) ), 'hsl');
		}
		// hsl(a): HSL -> HEX -----------------------------------------------------------------------------------------------------
		else if(check_result === 7 || check_result === 8){

			// hsl -> hex ACHTUNG!!! Hier Ungenauigkeiten (siehe Erklärung ganz oben)
			str_color = str_rgba_to_hex(arr_rgba_hsla_to_str(hsla_to_rgba( str_rgba_hsla_to_arr(str_color) ), 'rgb'));

			// HEX3 | HEX3a möglich?
			const arr_tmp = str_color.split('');

			// HEX3?
			if(arr_tmp[1] === arr_tmp[2] && arr_tmp[3] === arr_tmp[4] && arr_tmp[5] === arr_tmp[6]){

				// HEX3
				if(check_result === 7){
					str_color = '#'+arr_tmp[1] + arr_tmp[3] + arr_tmp[5];
				}
				// check_result 8 / HEX3a
				else{
					if(arr_tmp[7] === arr_tmp[8]) str_color = '#'+arr_tmp[1] + arr_tmp[3] + arr_tmp[5] + arr_tmp[7];
				}

			}

			return str_color;

		}
		// css-color: CSS -> HEX -----------------------------------------------------------------------------------------------------
		else if(check_result === 9){

			if(str_color.toLowerCase() === 'transparent'){
				return '#0000';
			}
			else{
				str_color = css_to_hex(str_color);
				// HEX3 möglich?
				const arr_tmp = str_color.split('');
				return arr_tmp[1] === arr_tmp[2] && arr_tmp[3] === arr_tmp[4] && arr_tmp[5] === arr_tmp[6] ? '#'+arr_tmp[1]+arr_tmp[3]+arr_tmp[5] : str_color;
			}

		}
		// false | gradient -----------------------------------------------------------------------------------------------------
		else{
			return false;
		}

	},


	// add_colors █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

	// benutzt von picker, control-button und contextmenu

	add_colors = (arr_new_n, arr_new_c, insert_pos, select_added) => { // arr_new_n = array oder true (neue Farbe)        insert_pos entspricht entweder c_cid oder c_len (wenn am Ende eingefügt werden soll)

		const refresh_filter_visibility_without_dynamic_scroll = () => {
			for (i = filter_insert_pos; i < filtered_ids_len; i++) $color_wrappers[arr_filtered_ids[i]].className = 'color-wrapper';
		},

		compensate_dynamic_scroll_padding = (len) => {
			$main_wrapper.style.padding = (visible_index_start_mem * color_wrapper_height) + 'px 0 ' + ((len - visible_index_end_mem) * color_wrapper_height) + 'px 0';
		},

		scroll_y_before = window.scrollY; // scroll-Position speichern (muss gemacht werden bevor ggf. die nicht mehr aktuellen filter id's ausgeblendet werden und bevor dynamic scroll aktiviert wird)

		let len_before = filter_open === 0 ? c_len : filtered_ids_len,
			filter_insert_pos = 0;

		// arr_new_n = true? (Neue Farbe)
		if(arr_new_n === true){
			arr_new_n = ['New Color'];
			arr_new_c = ['#000'];
			new_len = 1;
		}
		// Farb-Array übergeben
		else{
			new_len = arr_new_n.length;
		}

		// Filter
		if(filter_open === 1){

			// Filter leer (am Anfang einfügen)
			if(filtered_ids_len < 1){
				insert_pos = 0; 
				// "filter_insert_pos" bleibt 0 (s.o.) 
				i = 0; // reset ???
				arr_filtered_ids = [...Array(new_len)].map((_,i) => i + 0); // 0 fortlaufend hochzählen bis new_nen erreicht:[0, 1, 2, ...]
				filtered_ids_len = new_len;
			}
			// Filter nicht leer
			else{
				
				// position von insert_pos im Filter-Array ermitteln ...				
				if(insert_pos !== -1){ 
					filter_insert_pos = arr_filtered_ids.indexOf(insert_pos);  
				}
				// 
				else{ // nichts markiert: c_cid = -1 (am Anfang vom Filter-Array einfügen)
					insert_pos = arr_filtered_ids[0]; 
					// "filter_insert_pos" bleibt 0 (s.o.)
				}

				// ... und alle Nachfolgenden hochzählen
				for (i = filter_insert_pos; i < filtered_ids_len; i++){
					$color_wrappers[arr_filtered_ids[i]].className = 'hide'; // ausblenden / nicht mehr aktuell da sich id ändert
					arr_filtered_ids[i] += new_len;
				}

				//  neue fortlaufende filter-ids erzeugen und in arr_filtered_ids einfügen
				i = 0; // reset ???
				let arr_temp = [...Array(new_len)].map((_,i) => i + insert_pos); // fortlaufend hochzählen bis new_nen erreicht: [100, 101, 102, ...]
				arr_filtered_ids.splice(filter_insert_pos, 0, ...arr_temp);
				filtered_ids_len += new_len;

			}

		}
		// kein Filter
		else{
			if(insert_pos === -1) insert_pos = 0; // nichts markiert: c_cid = -1 (am Anfang einfügen)
		}

		// neue Farben in Farb-Arrays einfügen
		arr_n.splice(insert_pos, 0, ...arr_new_n);
		arr_c.splice(insert_pos, 0, ...arr_new_c);
		arr_b.splice(insert_pos, 0, ...arr_new_c);

		c_len += new_len;

		// neue wrapper erzeugen (erstmal am Ende einfügen) und später dann refresh_color_wrappers()
		create_color_wrappers(c_len - new_len, c_len);


		// floatview
		if(mode_current === 'insert-floatview'){
			if(filter_open === 1) refresh_filter_visibility_without_dynamic_scroll();
		}
		// listview
		else{

			// dynamic scroll ist bereits aktiv  ________________________________________________________________________________________________________________________________________
			if(dynamic_scroll_is_active === true){

				const n_visible_wrappers = current_visible_wrappers * 3;

				// scroll-Position ganz unten bzw. am Ende ------------------------------------------------------------------------------------
				if(visible_index_end_mem === len_before){ // len_before = c_len oder filtered_ids_len (s.o.)


					const visible_index_start_mem_old = visible_index_start_mem;

					// neu berechnen: wenn die scroll-Postion ganz unten ist und es werden dort 1000 Farben hinzugefügt, dann müssen die visible Indexe neu berechnet werden,
					// weil sich der sichtbare Bereich dann nicht mehr am Ende befindet sonder "in der Mitte" (bzw. weiter vorne)
					recalc_visible_index_mem();


					// ohne Filter
					if(filter_open === 0){
						for (i = 0; i < n_visible_wrappers; i++){
							if(visible_index_start_mem_old + i < visible_index_start_mem) $color_wrappers[visible_index_start_mem_old + i].className = 'hide';
							$color_wrappers[visible_index_start_mem + i].className = 'color-wrapper';
						}
					}
					// Filter
					else{
						for (i = 0; i < n_visible_wrappers; i++){
							if(visible_index_start_mem_old + i < visible_index_start_mem) $color_wrappers[arr_filtered_ids[visible_index_start_mem + i]].className = 'hide'; // verantwortlich für Scroll-Sprünge!
							$color_wrappers[arr_filtered_ids[visible_index_start_mem + i]].className = 'color-wrapper';
						}

						// Scroll-Position ausgleichen s.o. (keine Ahnung warum hier noch zusätzlich die neuen wrapper-Höhen dazu müssen, aber ansonsten gibt es Sprünge)
						window.scrollTo(0, scroll_y_before + (color_wrapper_height * new_len));

					}

				}
				// scroll-Position Mitte oder Anfang ------------------------------------------------------------------------------------
				else{

					// hier muss nur der gefilterete Zustand berücksichtigt werden. Wenn nicht gefiltert ist bleibt der sichtbare Bereich gleich
					// und es wird ganz unten nur ein refresh gemacht!

					if(filter_open === 1){
						for (i = 0; i < n_visible_wrappers; i++){
							$color_wrappers[arr_filtered_ids[visible_index_start_mem + i]].className = 'color-wrapper';
						}
					}

				}

				// padding kompensieren: genau wie sonst nur zusätzlich "+ new_len" (len_before entspricht entweder c_len oder filtered_ids_len s.o.)
				compensate_dynamic_scroll_padding(len_before + new_len);


			}
			// soll dynamic scroll aktiviert werden?  ________________________________________________________________________________________________________________________________________
			else {

				let len = filter_open === 0 ? c_len : filtered_ids_len; // wurden beide oben hochgezählt!

				// dynamic scroll muss jetzt aktiviert werden  -------------------------------------------
				if(len > dynamic_scroll_limit){

					if (color_wrapper_height === 0) dynamic_scroll_get_values();

					recalc_visible_index_mem();

					// ohne filter: wrapper davor|dahinter ausblenden + reorder
					if(filter_open === 0){
						for (i = 0; i < len; i++) { // c_len
							$color_wrappers[i].className = i < visible_index_start_mem || i > visible_index_end_mem ? 'hide' : 'color-wrapper';
						}
					}
					// gefiltert
					else{
						for (i = 0; i < len; i++) { // filtered_ids_len
							$color_wrappers[arr_filtered_ids[i]].className = i < visible_index_start_mem || i > visible_index_end_mem ? 'hide' : 'color-wrapper';
						}
					}

					// padding-Ausgleich
					compensate_dynamic_scroll_padding(len); // entweder neue c_len oder neue filtered_ids_len (s.o.)

					$main_wrapper.style.padding = (visible_index_start_mem * color_wrapper_height) + 'px 0 ' + ((len - visible_index_end_mem) * color_wrapper_height) + 'px 0';

					window.scrollTo(0, scroll_y_before); // s.o.
					dynamic_scroll_bind_listener();

				}
				// dynamic scroll muss nicht aktiviert werden  -------------------------------------------
				else{
					if(filter_open === 1) refresh_filter_visibility_without_dynamic_scroll();
				}

			}

		}

		// float + listview
		refresh_color_wrappers(insert_pos);
		
		// c_cid setzen
		
		/*if(c_cid !== -1){ // c_cid vorhanden
			$color_inp_wrappers[c_cid].className = '';
			c_cid = filter_open === 0 ? insert_pos : arr_filtered_ids[filter_insert_pos];
		}*/
		
		if(c_cid === -1){
			c_cid = filter_open === 0 ? 0 : arr_filtered_ids[0];
			store_webview_state(); // c_cid aktualisieren
		}
		
		// neu Hinzugefügte markieren?
		if(select_added === true){

			if(sel_len > 0) reset_selection(true);
			
			let loop_start = insert_pos,
				loop_end = insert_pos + new_len;

			for (i = loop_start; i < loop_end; i++) {
				$color_inp_wrappers[i].className = 'selected';
				arr_sel_ids[sel_len] = i;
				sel_len++;
			}
			
			// c_cid aus selected id's entfernen sonst doppelt, siehe: get_selected_ids()
			if(c_cid >= loop_start && c_cid < loop_end){
				arr_sel_ids.splice(arr_sel_ids.indexOf(c_cid), 1); 
				sel_len--;
			}

		}
		
		// c_cid markieren (erst hier, falls vorher im Loop mit "selected" überschrieben)
		$color_inp_wrappers[c_cid].className = 'active';
		
		// wenn sich der aktive bzw. neu hinzugefügte wrappper außerhalb des sichtbaren Bereichs befindet, dann dorthin scrollen
		scroll_to_active();
		
		// Statusbar aktualisieren
		set_statusbar_counter();
		set_statusbar_active(); 

	},

	// get_selected_ids █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

	get_selected_ids = () => {

		let arr_return = [];

		if (sel_len === 0) {
			if (c_cid !== -1) arr_return[0] = c_cid;
		}
		else{
			arr_return = arr_sel_ids.slice();
			if (c_cid !== -1) arr_return.push(c_cid);
			arr_return.sort(function(a, b){return a-b});
		}

		return arr_return;

	},

	// delete_colors █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

	// benutzt von wrapper-delete-button und contextmenu

	delete_colors = () => {

		const 	arr_delete_ids = get_selected_ids(), // werden sortiert zurückgegeben!
				delete_len = arr_delete_ids.length;

		if (delete_len === 0) return; //  ███ return ███

		let len_before = filter_open === 0 ? c_len : filtered_ids_len,
			loop_start = 0,
			loop_end = 0,
			arr_temp = [],
			n = 0;


		// arr_filtered_ids aktualisieren ?
		if(filter_open === 1){

			// position von erster Delete-ID im Filter-Array ermitteln
			var filter_delete_start_pos = arr_filtered_ids.indexOf(arr_delete_ids[0]),
				id_minus_compensate = 0;

			for (i = filter_delete_start_pos; i < filtered_ids_len; i++) {

				// Nur ausblenden wenn dynamic scroll deaktiviert ist! Wenn dynamic scroll aktiv ist, wird einfach nur der sichtbare Bereich aktualisiert (s.u.)
				if (dynamic_scroll_is_active === false) $color_wrappers[arr_filtered_ids[i]].className = 'hide'; // nicht mehr aktuellen wrapper ausblenden

				// match delete id
				if(arr_delete_ids.indexOf(arr_filtered_ids[i]) !== -1){
					id_minus_compensate++; // "Lücken-Ausgleich" hochzählen
				}
				// Alle Nachfolgenden die nicht ausgewählt wurden, aktualisieren bzw. runterzählen
				else{
					arr_temp[n] = arr_filtered_ids[i] - id_minus_compensate;
					n++;
				}

			}

			// Filtered ID's aktualisieren
			arr_filtered_ids = [...arr_filtered_ids.splice(0, filter_delete_start_pos), ...arr_temp];
			filtered_ids_len -= delete_len;

		}


		// entfernen (rückwärts)
		loop_start = c_len - 1;
		loop_end = c_len - delete_len;
		n = 1;

		for (i = loop_start; i >= loop_end; i--) {

			$color_wrapper_main.removeChild($color_wrappers[i]); // wrapper am Ende entfernen (später dann refresh_color_wrappers() s.u.)

			// active- und selected-Klassen entfernen
			$color_inp_wrappers[arr_delete_ids[delete_len - n]].className = '';

			// Farb-Arrays aktualisieren
			arr_n.splice(arr_delete_ids[delete_len - n], 1); // Info! "arr_delete_ids" wurde sortiert: siehe "get_selected_ids()"
			arr_c.splice(arr_delete_ids[delete_len - n], 1);
			arr_b.splice(arr_delete_ids[delete_len - n], 1);

			n++;

		}

		// in den Collectoren auch erstmal am Ende entfernen (später dann refresh_color_wrappers() s.u.)
		$color_wrappers.splice(c_len - delete_len, delete_len);
		$color_inputs_n.splice(c_len - delete_len, delete_len);
		$color_inputs_c.splice(c_len - delete_len, delete_len);
		$color_inp_wrappers.splice(c_len - delete_len, delete_len);
		$color_spans.splice(c_len - delete_len, delete_len);

		c_len -= delete_len;


		// Listview: dynamic scroll ________________________________________________________________________________________________________________
		if(dynamic_scroll_is_active === true){


			// dynamic scroll deaktivieren -------------------------------------------------------------------
			if(len_before - delete_len <= dynamic_scroll_limit){

				dynamic_scroll_remove(); // entfernt window-scroll-listener und padding vom main wrapper

				// kein Filter
				if(filter_open === 0){
					for (i = 0; i < c_len; i++) $color_wrappers[i].className = 'color-wrapper'; // alle sichtbar machen
				}
				// Filter (oben aktualisiert)
				else{
					for (i = 0; i < filtered_ids_len; i++) $color_wrappers[arr_filtered_ids[i]].className = 'color-wrapper'; // nur gefilterte sichtbar machen
				}

			}
			// dynamic scroll beibehalten -------------------------------------------------------------------
			else{

				const n_visible_wrappers = current_visible_wrappers * 3;

				// scroll-Position ganz unten bzw. am Ende
				if(visible_index_end_mem === len_before){ // len_before = c_len oder filtered_ids_len (s.o.)
					visible_index_start_mem -= delete_len;
					visible_index_end_mem -= delete_len;
				}

				// ohne Filter
				if(filter_open === 0){
					for (i = 0; i < n_visible_wrappers; i++) $color_wrappers[visible_index_start_mem + i].className = 'color-wrapper';
				}
				// Filter
				else{
					for (i = 0; i < n_visible_wrappers; i++) $color_wrappers[arr_filtered_ids[visible_index_start_mem + i]].className = 'color-wrapper';

				}

				// padding kompensieren
				$main_wrapper.style.padding = (visible_index_start_mem * color_wrapper_height) + 'px 0 ' + ((len_before - delete_len - visible_index_end_mem) * color_wrapper_height) + 'px 0';

			}

		}
		// Listview ohne dynamic scroll oder Floatview ________________________________________________________________________________________________________________
		else{

			// Info!!! Trifft auch auf "insert-floatview" zu, da dort dynamic scoll niemals aktiv ist!

			if(filter_open === 1){ // Filter: aktualisierte gefilterte wrapper einblenden
				for (i = filter_delete_start_pos; i < filtered_ids_len; i++) $color_wrappers[arr_filtered_ids[i]].className = 'color-wrapper';
			}

		}


		// Palette leer oder alle gefilterten Einträge gelöscht?
		if(len_before === delete_len){ // len_before = c_len oder filtered_ids_len !
			c_cid = -1;
		}
		// refresh + aktiven wrapper markieren
		else{

			refresh_color_wrappers(arr_delete_ids[0]);

			// c_cid aktualisieren!
			if(c_cid !== -1){

				// ohne Filter
				if(filter_open === 0){
					c_cid = arr_delete_ids[0] > c_len - 1 ? c_len - 1 : arr_delete_ids[0]; // befindet sich gelöschte c_cid hinter aktualisierter Länge?
				}
				// Filter
				else{
					c_cid = filter_delete_start_pos === len_before - 1 ? arr_filtered_ids[filter_delete_start_pos - 1] : arr_filtered_ids[filter_delete_start_pos];  // befindet sich gelöschte c_cid hinter aktualisierter Länge?
				}

				$color_inp_wrappers[c_cid].className = 'active';

			}

		}
		
		store_webview_state(); // c_cid aktualisieren

		// reset selection vars
		if(sel_len > 0){
			arr_sel_ids = [];
			sel_len = 0;
		}

		set_statusbar_counter();
		set_statusbar_active();

	},


	// create_controls █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	create_controls = () => {


		// btn_mode_click ________________________________________________________________________________________________________________
		const btn_mode_click = (e) => {

			// -----------------------------------------------------------------------------------------------------
			const switch_floatview_to_listview = () => {

				// muss dynamisches scrollen aktiviert werden?
				if( (filter_open === 0 && c_len > dynamic_scroll_limit) || (filter_open === 1 && filtered_ids_len > dynamic_scroll_limit) ){

					if(color_wrapper_height === 0) dynamic_scroll_get_values();

					// ungefiltert
					if (filter_open === 0) {
						for (i = 0; i < c_len; i++){
							$color_wrappers[i].title = ''; // title entfernen
							if(i > visible_index_end_mem) $color_wrappers[i].className = 'hide'; // ab "visible_index_end_mem" ausblenden
						}
					}
					// gefiltert
					else{

						let arr_filtered_ids_copy = arr_filtered_ids.slice(),
							found_index = -1;

						for (i = 0; i < c_len; i++){

							// title entfernen
							$color_wrappers[i].title = '';

							// gefilterte wrapper ab "visible_index_end_mem" ausblenden
							// nachfolgende wrapper sind teilweise schon durch die Filterung nicht mehr sichtbar, daher nur die gefilterten, noch sichtbaren wrapper ausblenden
							if(i > visible_index_end_mem){
								found_index = arr_filtered_ids_copy.indexOf(i);
								arr_filtered_ids_copy.splice(found_index, 1); // entfernen um nachfolgende Suchen beschleunigen
								if (found_index !== -1) $color_wrappers[i].className = 'hide';
							}

						}

					}

					// dynamic scroll aktivieren

					// grundsätzlich zum Anfang scrollen (falls im floatview gescrollt war)
					window.scrollTo(0,0);

					scroll_y = 0 ;
					scroll_y_pos = -1;
					visible_index_start_mem = 0;
					visible_index_end_mem = current_visible_wrappers * 3; // "current_visible_wrappers" kurz zuvor ermittelt -> "dynamic_scroll_get_values()" (s.o.)

					// padding kompensieren
					const is_filtered = filter_open === 1 && filtered_ids_len > 0 ? true : false;
					dynamic_scroll_compensate(is_filtered);

					// scroll listener
					dynamic_scroll_bind_listener();

				}
				// dynamic scroll nicht nötig / alle wrapper sind auch in der listview sichtbar
				else{
					for (i = 0; i < c_len; i++) $color_wrappers[i].title = ''; // nur title entfernen
				}


			},

			// -----------------------------------------------------------------------------------------------------
			switch_listview_to_floatview = () => {

				const add_title = (n) => {
					$color_wrappers[n].title = arr_n[n] === arr_c[n] ? arr_n[n] : arr_n[n]+': '+arr_c[n];
					// Sort-Mode noch aktiv? -> drag mousedown deaktivieren
					if(sort_mode === true) $color_wrappers[n].removeEventListener("mousedown", colorwrapper_drag_mousedown, false);
				}

				$main_wrapper.className = 'hide'; // ███ Performance ███

				// dynamic scroll aktiv
				if(c_len > dynamic_scroll_limit){

					dynamic_scroll_remove();

					// ungefiltert / alle wrapper sichtbar machen
					if (filtered_ids_len === 0) {
						for (i = 0; i < c_len; i++){
							add_title(i);
							$color_wrappers[i].className = 'color-wrapper';
						}
					}
					// gefiltert / nur gefilterte wrapper sichtbar machen
					else{

						let arr_filtered_ids_copy = arr_filtered_ids.slice(),
							found_index = -1;

						for (i = 0; i < c_len; i++){
							add_title(i);
							found_index = arr_filtered_ids_copy.indexOf(i);
							arr_filtered_ids_copy.splice(found_index, 1); // entfernen um nachfolgende Suchen beschleunigen
							if (found_index !== -1) $color_wrappers[i].className = 'color-wrapper';

						}
					}

				}
				// dynamic scroll NICHT aktiv
				else{
					for (i = 0; i < c_len; i++) add_title(i);
				}

				sort_mode = false;
				convert_mode = false;

				// Nur zur Info! Wird unten sowieso durch listview-Klasse ersetzt!
				// $main_wrapper.className = ''; // ███ Performance ███

			},

			// ------------------------------------------------------------------------------------------------------
			toggle_edit_sort = (on) => {

				// drag mousedown bind|unbind
				if(on === true){
					sort_mode = true;
					for (i = 0; i < c_len; i++) $color_wrappers[i].addEventListener("mousedown", colorwrapper_drag_mousedown, false);
				}
				else{
					sort_mode = false;
					for (i = 0; i < c_len; i++) $color_wrappers[i].removeEventListener("mousedown", colorwrapper_drag_mousedown, false);
				}

			};

			// Start btn_mode_click -----------------------------------------------------------------------------------------------------
			let mode_new = '';

			// diese Klassennamen werden auf den body gelegt und bestimmen was angezeigt wird, und was nicht (siehe css)

			switch (e.currentTarget.command) {

				// btn-toggle-insert-edit --------------------------------------------------------
				case 'toggle-insert-edit':

					// Edit-Mode noch aktiv -> Insert Mode öffnen
					if(mode_current === 'edit' || mode_current === 'edit-sort' || mode_current === 'edit-convert'){

						// Sort-Mode noch aktiv?
						if(sort_mode === true) toggle_edit_sort(false); // drag mousedown deaktivieren

						// Convert-Mode noch aktiv?
						if(convert_mode === true) convert_mode = false;

						// insert-listview öffnen
						mode_new = 'insert-listview';

					}
					// Insert Mode noch aktiv -> Edit Mode öffnen
					else{
						// floatview noch aktiv
						if(mode_current === 'insert-floatview') switch_floatview_to_listview();
						mode_new = 'edit';
					}

					break;
				// btn-toggle-insertview --------------------------------------------------------
				case 'toggle-insert-view':

					// floatview noch aktiv -> listview öffnen
					if(mode_current === 'insert-floatview'){
						switch_floatview_to_listview();
						mode_new = 'insert-listview';
					}
					// listview noch aktiv -> floatview öffnen
					else{
						switch_listview_to_floatview();
						mode_new = 'insert-floatview';
					}

					break;
				// btn-toggle-edit-sort --------------------------------------------------------
				case 'toggle-edit-sort':

					if(sort_mode === false){
						toggle_edit_sort(true); // drag mousedown aktivieren
						mode_new = 'edit-sort';
					}
					else{
						toggle_edit_sort(false); // drag mousedown deaktivieren
						mode_new = 'edit';
					}

					break;
				// btn-toggle-edit-convert --------------------------------------------------------
				case 'toggle-edit-convert':

					if(convert_mode === false){
						mode_new = 'edit-convert';
						convert_mode = true;
					}
					else{
						mode_new = 'edit';
						convert_mode = false;
					}

					break;
			}

			// neue Klasse zuweisen
			$main_wrapper.className = mode_new; // siehe css (ändert pointer-events ect.)
			mode_current = mode_new;

			// fixed wrapper höhe bzw. body padding kompensieren
			set_controls_height();

			store_webview_state();

		},

		// dropdown input ________________________________________________________________________________________________________________
		dropdown_input_click = () => {

			// öffnen
			if($dropdown_input.opened === false){
				$dropdown_input.opened = true;

				const dropdown_li_mouseup = (e) => {

					if(e.currentTarget.l_id !== p_cid){
						p_cid = e.currentTarget.l_id;
						vscode.postMessage({ // ███ vscode APi ███
							command: 'change_palette',
							p_cid: p_cid,
						})
						$dropdown_input.value = arr_p[p_cid];
					}

					dropdown_close(); // immer schließen, auch wenn aktuelle Palette geklickt

				};

				for (i = 0; i < p_len; i++) {
					$dropdown_li[i] = document.createElement('li');
					$dropdown_li[i].l_id = i; // l_id = list id
					$dropdown_li[i].textContent = arr_p[i];
					$dropdown_li[i].addEventListener('mouseup', dropdown_li_mouseup, false);
					$dropdown_ul.appendChild($dropdown_li[i]);
				}

				$dropdown_ul.className = ''; // hide entfernen
				$dropdown_wrapper.appendChild($dropdown_ul);

			}

		},

		// schließen --------------------------------------------------------
		dropdown_close = () => {
			$dropdown_input.value = arr_p[p_cid];
			$dropdown_input.opened = false;
			$dropdown_li = [];
			$dropdown_ul.innerHTML = '';
			$dropdown_ul.className = 'hide';
		},

		// input focusout + doc mouseup --------------------------------------------------------

		// input focusout
		dropdown_input_focusout = () => {
			document.addEventListener('mouseup', dropdown_doc_mouseup, false); // Sobald der Focus den input verlässt, in "dropdown_doc_mouseup()" prüfen wohin der nächste Klick geht
		},

		dropdown_doc_mouseup = (e) => {

			// Auf property 'l_id' prüfen, die nur bei den Dropdown li's definiert ist (s.o.). Wenn nicht vorhanden, handelt es sich um ein anderes Element (Dropdown schließen)
			if(e.target.l_id === undefined) dropdown_close();

			document.removeEventListener('mouseup', dropdown_doc_mouseup, false); // unbind self

		},

		// dropdown filter --------------------------------------------------------
		dropdown_input_keyup = (e) => {

			e.preventDefault();

			if( e.keyCode === 27 ) { // esc
				$dropdown_input.value = arr_p[p_cid];
				for (i = 0; i < p_len; i++)  $dropdown_li[i].className = '';
				$dropdown_ul.className = '';
				return;
			}

			const val = $dropdown_input.value.toLowerCase();

			let n = 0;

			for (i = 0; i < p_len; i++) {
				if(arr_p[i].toLowerCase().indexOf(val) !== -1){
					$dropdown_li[i].className = '';
					n++;
				}
				else{
					$dropdown_li[i].className = 'hide';
				}
			}

			$dropdown_ul.className = n === 0 ? 'hide' : ''; // bei leer 'hide', sonst scrollbar zu sehen

		},

		// btn add click ________________________________________________________________________________________________________________
		btn_add_click = () => {
			add_colors(true, true, c_cid, false); // true = new color, true = new color, insert-pos
		},

		// btn add click ________________________________________________________________________________________________________________
		btn_restore_click = () => {
			dialogbox('Restore?', true, confirm => {
				if (confirm === true){
					
					// ähnlich wie vscode message 'refresh' ganz unten!
					
					reset_current_palette();

					if(c_len_restore > 0){
						
						// restore arrays
						arr_n = arr_n_restore.slice();
						arr_c = arr_c_restore.slice();
						c_len = c_len_restore;
	
						// re-init
						create_color_wrappers(0,c_len);
	
						// gefiltert
						if(filter_open === 1){
							filter_colors(); // aktiviert selbstständig dynamic scroll wenn nötig!
						}
						// nicht gefiltert
						else{
							if(mode_current !== 'insert-floatview' && c_len > dynamic_scroll_limit) init_dynamic_scroll(); // list-view dynamic scroll aktivieren?
						}
						
					}

				}
			});
		},

		// btn add click ________________________________________________________________________________________________________________
		btn_texteditor_click = () => {
			vscode.postMessage({ // ███ vscode APi ███
				command: 'texteditor'
			})
		},

		// btn random click ________________________________________________________________________________________________________________
		btn_random_click = () => {

			dialogbox('Randomize?', true, confirm => {
				if (confirm === true){

					for (i = 0; i < c_len; i++) {
						arr_n[i] = 'Color '+(i+1);
						arr_c[i] = arr_rgba_hsla_to_str([Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256)], 'rgb');
						arr_b[i] = arr_c[i];
					}

					refresh_color_wrappers(0);

				}
			});

		},

		// btn sort name / value ________________________________________________________________________________________________________________
		btn_sort_click = (e) => {

			const sort_type = e.currentTarget.sort_type; // 0 = by name, 1 = by value, 2 = hue, 3 = reverse

			let sort = true;

			// Name / Wert ------------------------------------------------------
			if(sort_type === 0 || sort_type === 1 ){

				let arr_tmp = [];

				for (i = 0; i < c_len; i++){
					arr_tmp[i] = [arr_n[i], arr_c[i], arr_b[i]];
				}

				arr_tmp.sort(function(a,b) {
					if (a[sort_type] === b[sort_type]) return 0;
					else return (a[sort_type] < b[sort_type]) ? -1 : 1;
				});

				for (i = 0; i < c_len; i++){
					arr_n[i] = arr_tmp[i][0];
					arr_c[i] = arr_tmp[i][1];
					arr_b[i] = arr_tmp[i][2];
				}

			}
			// hue ------------------------------------------------------
			else if(sort_type === 2){

				// alle vorhandenen Farben in HSL umwandeln und anhand hue sortieren

				let arr_tmp = [],
					arr_hsl = [],
					check_result = false;

				for (i = 0; i < c_len; i++) {

					check_result = check_color(arr_c[i]); // return: false | 1 = HEX6 | 2 = HEX6a | 3 = HEX3 | 4 = HEX3a | 5 = rgb | 6 = rgba | 7 = hsl | 8 = hsla | 9 = css color | 10 = gradient

					// hex(a)
					if(check_result >= 1 && check_result <= 4){
						arr_hsl[i] = rgba_to_hsla( hex_to_rgba(arr_c[i], false) ); // hex_to_rgba: true = return string, false = return array
					}
					// rgb(a)
					else if(check_result === 5 || check_result === 6){
						arr_hsl[i] = rgba_to_hsla( str_rgba_hsla_to_arr(arr_c[i]) );
					}
					// hsl(a)
					else if(check_result === 7 || check_result === 8){
						arr_hsl[i] = str_rgba_hsla_to_arr(arr_c[i]);
					}
					// css color
					else if(check_result === 9){
						arr_hsl[i] = rgba_to_hsla(hex_to_rgba( css_to_hex(arr_c[i]), false ));  // hex_to_rgba: true = return string, false = return array
					}
					// false oder gradient
					else{
						arr_hsl[i] = [-1]; // -1, da hue zwischen 0 und 360 liegt (s.u.)
					}

				}

				if(arr_hsl.length === 0){
					sort = false;
				}
				else{

					// hue sortieren
					arr_tmp = arr_hsl.map(function(c, i) {
						return {color: c, index: i};
					}).sort(function(a, b) {
						return a.color[0] - b.color[0]; // hue
					}).map(function(obj) {
						return [arr_n[obj.index], arr_c[obj.index], arr_b[obj.index]];
					});

					for (i = 0; i < c_len; i++){
						arr_n[i] = arr_tmp[i][0];
						arr_c[i] = arr_tmp[i][1];
						arr_b[i] = arr_tmp[i][2];
					}

				}

			}
			// reverse arrays ------------------------------------------------------
			else if(sort_type === 3){
				arr_n.reverse();
				arr_c.reverse();
				arr_b.reverse();
			}

			// aktualisieren
			if(sort === true){
				refresh_color_wrappers(0); // inputs und spans aktualisieren
				if (filter_open === 1) filter_colors(); // hide-Klassen neu setzen
			}

		},

		// btn convert ________________________________________________________________________________________________________________
		btn_convert_click = (e) => {

			const check_short_hex = (hex) => { // HEX3 | HEX3a möglich?

				const arr_tmp = hex.split('');

				// HEX3?
				if(arr_tmp[1] === arr_tmp[2] && arr_tmp[3] === arr_tmp[4] && arr_tmp[5] === arr_tmp[6]){
					// HEX3a?
					if(arr_tmp.length === 9) {
						if(arr_tmp[7] === arr_tmp[8]) hex = '#'+arr_tmp[1] + arr_tmp[3] + arr_tmp[5] + arr_tmp[7];
					}
					else{
						hex = '#'+arr_tmp[1] + arr_tmp[3] + arr_tmp[5];
					}
				}

				return hex;

			},

			// 0 = hex, 1 = rgb, 2 = hsl
			convert_type = e.currentTarget.convert_type;


			let str_color = '',
				str_color_conv = false,
				check_result = false;


			// Start
			for (i = 0; i < c_len; i++) {

				str_color_conv = false; // reset
				str_color = arr_c[i];
				check_result = check_color(str_color);  // return: false | 1 = HEX6 | 2 = HEX6a | 3 = HEX3 | 4 = HEX3a | 5 = rgb | 6 = rgba | 7 = hsl | 8 = hsla | 9 = css color | 10 = gradient

				// hex -----------------------------------------------------------------------------------------------------
				if(check_result >= 1 && check_result <= 4){

					// hex -> rgb
					if(convert_type === 1){
						str_color_conv = hex_to_rgba(str_color, true); // true = return string, false = return array
					}
					// hex -> hsl
					else if(convert_type === 2){
						str_color_conv = arr_rgba_hsla_to_str( rgba_to_hsla( hex_to_rgba(str_color, false) ), 'hsl'); // hex_to_rgba: true = return string, false = return array
					}

				}
				// rgb -----------------------------------------------------------------------------------------------------
				else if(check_result === 5 || check_result === 6){

					// rgb -> hex
					if(convert_type === 0){
						str_color_conv = check_short_hex(str_rgba_to_hex(str_color));
					}
					// rgb -> hsl
					else if(convert_type === 2){
						str_color_conv = arr_rgba_hsla_to_str( rgba_to_hsla( str_rgba_hsla_to_arr(str_color) ), 'hsl');
					}

				}
				// hsl -----------------------------------------------------------------------------------------------------
				else if(check_result === 7 || check_result === 8){

					// ACHTUNG!!! Hier Ungenauigkeiten (siehe Erklärung ganz oben)

					// hsl -> hex
					if(convert_type === 0){
						str_color_conv = check_short_hex( str_rgba_to_hex(arr_rgba_hsla_to_str(hsla_to_rgba( str_rgba_hsla_to_arr(str_color) ), 'rgb')) );
					}
					// hsl -> rgb
					else if(convert_type === 1){
						str_color_conv = arr_rgba_hsla_to_str( hsla_to_rgba( str_rgba_hsla_to_arr(str_color) ), 'rgb');
					}

				}
				// css color -----------------------------------------------------------------------------------------------------
				else if(check_result === 9){

					// css -> hex
					if(convert_type === 0){
						str_color_conv = check_short_hex(css_to_hex(str_color));
					}
					// css -> rgb
					else if(convert_type === 1){
						str_color_conv = hex_to_rgba( css_to_hex(str_color), true); // true = return string, false = return array
					}
					// css -> hsl
					else{
						str_color_conv = arr_rgba_hsla_to_str( rgba_to_hsla( hex_to_rgba(css_to_hex(str_color), false) ), 'hsl'); // hex_to_rgba: true = return string, false = return array
					}

				}

				// aktualisieren?
				if(str_color_conv !== false){
					arr_c[i] = str_color_conv;
					$color_inputs_c[i].value = str_color_conv;
				}

			}

		},

		// def const
		$toggle_wrapper = document.createElement('div'),
		$dropdown_wrapper = document.createElement('div'),
		$dropdown_ul = document.createElement('ul'),
		$edit_wrapper = document.createElement('div'),
		$edit_btn_wrapper = document.createElement('div'),
		$float_wrapper = document.createElement('div');

		// def var
		let $dropdown_li = [];

		// def window

		// btn save click (global für shortcuts) ________________________________________________________________________________________________________________
		window.btn_save_click = () => {

			dialogbox('Save?', true, confirm => {
				if (confirm === true){
					vscode.postMessage({ // ███ vscode APi ███
						command: 'save_palette', // -> extension.js -> 'save_palette_success()' (s.u.)
						arr_n: arr_n,
						arr_c: arr_c,
						c_len: c_len
					})
				}
			});

		};

		window.$main_wrapper = document.createElement('div');
		window.$controls_wrapper = document.createElement('div');
		window.$dropdown_input = document.createElement('input');
		window.$btn_filter = document.createElement('p');
		window.$filter_wrapper = document.createElement('div');
		window.$filter_input = document.createElement('input');
		window.$sb_counter = document.createElement('span');
		window.$sb_active = document.createElement('span');

		// start create_controls ___________________________________________________________________________________________________________________


		$controls_wrapper.id = 'controls-wrapper';
		$toggle_wrapper.id = 'toggle-wrapper';

		$edit_wrapper.id = 'edit-wrapper';

		$edit_btn_wrapper.id = 'edit-btn-wrapper';
		$float_wrapper.className = "float-wrapper";

		// fixed wrapper -------------------------------------------------------------------------------------------------------------

		// toggle insert / edit mode
		$el = document.createElement('p');
		$el.id = 'btn-toggle-insert-edit';
		$el.title = 'toggle edit options';
		$el.command = 'toggle-insert-edit';
		$el.addEventListener('mousedown', btn_mode_click, false);
		$toggle_wrapper.appendChild($el);

		// dropdown input wrapper
		$dropdown_wrapper.className = 'dropdown-wrapper';
		$dropdown_ul.className = 'hide';

		$dropdown_input.value = arr_p[p_cid];
		$dropdown_input.opened = false;
		$dropdown_input.title = 'load palette';
		$dropdown_input.addEventListener('mousedown', dropdown_input_click, false);
		$dropdown_input.addEventListener('focusout', dropdown_input_focusout, false);
		$dropdown_input.addEventListener('keyup', dropdown_input_keyup, false);
		$dropdown_wrapper.appendChild($dropdown_input);
		$toggle_wrapper.appendChild($dropdown_wrapper);

		// btn toggle insertview / nur sichtbar im Insert Mode
		$el = document.createElement('p');
		$el.id = 'btn-toggle-insertview';
		$el.title = 'toggle view';
		$el.command = 'toggle-insert-view';
		$el.addEventListener('mousedown', btn_mode_click, false);
		$toggle_wrapper.appendChild($el);

		// btn filter
		$btn_filter.id = 'btn-filter';
		$btn_filter.title = 'toggle filter';
		$btn_filter.addEventListener("click", () => toggle_filter(true) );
		$toggle_wrapper.appendChild($btn_filter);

		// filter wrapper
		$filter_wrapper.id = 'filter-wrapper';
		$filter_wrapper.className = 'hide';

		$filter_input.addEventListener('keyup', filter_colors, false);
		$filter_wrapper.appendChild($filter_input);

		$controls_wrapper.appendChild($toggle_wrapper); // ███ document position 2 ███
		$controls_wrapper.appendChild($filter_wrapper);

		// edit wrapper -------------------------------------------------------------------------------------------------------------

		// button add
		$el = document.createElement('p');
		$el.id = 'btn-add';
		$el.title = 'add color';
		$el.addEventListener('mousedown', btn_add_click, false);
		$edit_btn_wrapper.appendChild($el);


		// button sort / Mode 'edit-sort' --------------------------
		$el = document.createElement('p');
		$el.id = 'btn-toggle-edit-sort';
		$el.title = 'toggle sort-mode';
		$el.command = 'toggle-edit-sort';
		$el.addEventListener('mousedown', btn_mode_click, false);
		$edit_btn_wrapper.appendChild($el);

		$el = document.createElement('p');
		$el.id = 'btn-sort-name';
		$el.sort_type = 0;
		$el.addEventListener('mousedown', btn_sort_click, false);
		$edit_btn_wrapper.appendChild($el);

		$el = document.createElement('p');
		$el.id = 'btn-sort-value';
		$el.sort_type = 1;
		$el.addEventListener('mousedown', btn_sort_click, false);
		$edit_btn_wrapper.appendChild($el);

		$el = document.createElement('p');
		$el.id = 'btn-sort-hue';
		$el.sort_type = 2;
		$el.addEventListener('mousedown', btn_sort_click, false);
		$edit_btn_wrapper.appendChild($el);

		$el = document.createElement('p');
		$el.id = 'btn-sort-reverse';
		$el.sort_type = 3;
		$el.addEventListener('mousedown', btn_sort_click, false);
		$edit_btn_wrapper.appendChild($el);

		// button convert / Mode 'edit-convert' --------------------------
		$el = document.createElement('p');
		$el.id = 'btn-toggle-edit-convert';
		$el.title = 'toggle color-converter';
		$el.command = 'toggle-edit-convert';
		$el.addEventListener('mousedown', btn_mode_click, false);
		$edit_btn_wrapper.appendChild($el);

		$el = document.createElement('p');
		$el.id = 'btn-convert-hex';
		$el.convert_type = 0;
		$el.addEventListener('mousedown', btn_convert_click, false);
		$edit_btn_wrapper.appendChild($el);

		$el = document.createElement('p');
		$el.id = 'btn-convert-rgb';
		$el.convert_type = 1;
		$el.addEventListener('mousedown', btn_convert_click, false);
		$edit_btn_wrapper.appendChild($el);

		$el = document.createElement('p');
		$el.id = 'btn-convert-hsl';
		$el.convert_type = 2;
		$el.addEventListener('mousedown', btn_convert_click, false);
		$edit_btn_wrapper.appendChild($el);


		// button random --------------------------
		$el = document.createElement('p');
		$el.id = 'btn-random';
		$el.title = 'randomize palette';
		$el.addEventListener('mousedown', btn_random_click, false);
		$edit_btn_wrapper.appendChild($el);

		// float wrapper --------------------------------------------

		// button palette manager --------------------------
		$el = document.createElement('p');
		$el.id = 'btn-pm-open';
		$el.title = 'open palette manager';
		$el.addEventListener('mousedown', palette_manager_open, false);
		$float_wrapper.appendChild($el);

		// button texteditor --------------------------
		$el = document.createElement('p');
		$el.id = 'btn-texteditor';
		$el.title = 'open palette in vscode';
		$el.addEventListener('mousedown', btn_texteditor_click, false);
		$float_wrapper.appendChild($el);

		// button restore --------------------------
		$el = document.createElement('p');
		$el.id = 'btn-restore';
		$el.title = 'restore palette';
		$el.addEventListener('mousedown', btn_restore_click, false);
		$float_wrapper.appendChild($el);

		// button save --------------------------
		$el = document.createElement('p');
		$el.id = 'btn-save';
		$el.title = 'save palette';
		$el.addEventListener('mousedown', btn_save_click, false);
		$float_wrapper.appendChild($el);

		$el = null;

		// zusammenbauen --------------------------------------------

		$edit_btn_wrapper.appendChild($float_wrapper);

		$edit_wrapper.appendChild($edit_btn_wrapper);

		// append
		$controls_wrapper.appendChild($edit_wrapper); // ███ document position 3 ███

		$main_wrapper.className = 'hide'; // ███ Performance / wird nach create_colorwrapprs() entfernt ███
		$main_wrapper.appendChild($controls_wrapper);

		// statusbar
		$el = document.createElement('div');
		$el.id = 'statusbar';
		$sb_active.title = 'scroll to active';
		$sb_active.addEventListener('click', scroll_to_active, false);
		$el.appendChild($sb_counter);
		$el.appendChild($sb_active);
		$main_wrapper.appendChild($el);

	},

	// filter █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

	toggle_filter = (refresh) => {

		// filter input einblenden
		if(filter_open === 0){
			filter_open = 1;
			$filter_wrapper.className = '';
			$btn_filter.className = 'active';
			was_filtered = false;
			$filter_input.focus();
		}
		// filter input ausblenden / Filterung aufheben
		else{

			const reset_wrappers = () => {
				$color_wrapper_main.className = 'hide'; // ███ Performance ███
				for (i = 0; i < c_len; i++) $color_wrappers[i].className = 'color-wrapper';
				$color_wrapper_main.className = ''; // ███ Performance ███
			}

			if(mode_current === 'insert-floatview'){
				reset_wrappers();
			}
			else{

				if(refresh === true){

					if(filtered_ids_len < c_len) reset_wrappers();

					if(c_len > dynamic_scroll_limit){

						// Dynamic Scroll Abmessungen bereits ermittelt? Dieser Fall tritt ein, wenn die Extension im floatview und im gefilterten Zustand geöffnet
						// wird und dann auf listview gewechselt wurde. In diesem Fall sind die für dynamic scroll erforderlichen Abmessungen noch nicht gemacht.
						if (color_wrapper_height === 0) dynamic_scroll_get_values();

						// zum Anfang scrollen
						window.scrollTo(0,0);
						scroll_y_pos = 0;
						visible_index_start_mem = 0;
						visible_index_end_mem = current_visible_wrappers * 3;

						for (i = 0; i < c_len; i++) $color_wrappers[i].className = i > visible_index_end_mem ? 'hide' : 'color-wrapper';

						$main_wrapper.style.padding = '0 0 ' + ((c_len - visible_index_end_mem) * color_wrapper_height) + 'px 0';

						if(dynamic_scroll_is_active === false) dynamic_scroll_bind_listener(); // scroll-listener wurde während der Filterung entfernt (neu binden)

					}

				}

			}

			filter_open = 0;
			filter_val = '';

			arr_filtered_ids = [];
			filtered_ids_len = 0;

			was_filtered = false;

			$btn_filter.className = '';
			$filter_wrapper.className = 'hide';
			$filter_input.value = '';

			set_statusbar_counter();
			set_statusbar_active();

		}

		set_controls_height();

		store_webview_state();

	},

	// filter colors _____________________________________________________________________
	filter_colors = () => {

		// erster Filterdurchlauf: roten Auswahlrahmen bzw. active-Klasse von aktueller c_cid entfernen, sonst sind nach der Filterung
		// u.U. 2 rote Rahmen vorhanden, da die c_cid unten im Suchlauf ggf. auf -1 gesetzt wird
		if(init === false){ // beim Öffnen aber weiterhin markieren (nur wenn user manuell filtert)!
			
			if(was_filtered === false){
				was_filtered = true;
				if(c_cid !== -1){
					$color_inp_wrappers[c_cid].className = ''; // active Klasse entfernen
					c_cid = -1;
				}
			}
			
		}

		filter_val = $filter_input.value.toLowerCase();

		// grundsätzlich zum Anfang scrollen
		window.scrollTo(0,0);

		if(dynamic_scroll_is_active === true){
			scroll_y_pos = 0;
			visible_index_start_mem = 0;
			visible_index_end_mem = current_visible_wrappers * 3;
		}

		// reset
		arr_filtered_ids = [];
		filtered_ids_len = 0;

		// ohne dynamic scroll (wrapper sofort ein- oder ausblenden) --------------------------------------------------------------------
		if(mode_current === 'insert-floatview' ||  (mode_current !== 'insert-floatview' && c_len < dynamic_scroll_limit)){
			for (i = 0; i < c_len; i++) {
				// match ----------------
				if(arr_c[i].toLowerCase().indexOf(filter_val) !== -1 || arr_n[i].toLowerCase().indexOf(filter_val) !== -1){
					$color_wrappers[i].className = 'color-wrapper';
					arr_filtered_ids[filtered_ids_len] = i;
					filtered_ids_len++;
				}
				// kein match ----------------
				else{
					$color_wrappers[i].className = 'hide';
					if(i === c_cid) c_cid = -1;
				}
			}
		}
		// dynamic scroll möglich (wird aktiviert oder deaktiviert, abhängig davon wie viele gefilterte Einträge gefunden werden) -------------------------------------------------
		else{

			// erstmal nur id's speichern + alle unsichtbar machen
			for (i = 0; i < c_len; i++) {
				// match ----------------
				if(arr_c[i].toLowerCase().indexOf(filter_val) !== -1 || arr_n[i].toLowerCase().indexOf(filter_val) !== -1){
					arr_filtered_ids[filtered_ids_len] = i;
					filtered_ids_len++;
				}
				// kein match ----------------
				else{
					if(i === c_cid) c_cid = -1;
				}

				// erstmal alle unsichtbar machen, da noch nicht absehbar ist ob anschließend dynamic scroll aktiviert werden soll oder nicht
				$color_wrappers[i].className = 'hide';

			}

			if(filtered_ids_len > dynamic_scroll_limit){

				// nur bis 'visible_index_end_mem', da ja ganz nach oben gescrollt wurde ! s.o.
				for (i = 0; i < visible_index_end_mem; i++){
					$color_wrappers[arr_filtered_ids[i]].className = 'color-wrapper';
				}

				// dynamic scroll momentan aktiv?
				if(dynamic_scroll_is_active === false) dynamic_scroll_bind_listener();


				// padding ausgleichen
				$main_wrapper.style.padding = '0 0 ' + ((filtered_ids_len - visible_index_end_mem) * color_wrapper_height) + 'px 0';

			}
			else{

				if(dynamic_scroll_is_active === true) dynamic_scroll_remove();

				if(filtered_ids_len !== 0){
					for (i = 0; i < filtered_ids_len; i++) {
						$color_wrappers[arr_filtered_ids[i]].className = 'color-wrapper';
					}
				}

			}

		}

		set_statusbar_counter();
		set_statusbar_active();

		store_webview_state();

	},

	// palette_manager █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

	palette_manager_open = () => {

		if(pm_open === true) return;

		// close pm
		const pm_close_click = () => {
			drag_head_splice($pm_wrapper);
			document.body.removeChild($pm_wrapper_outer);
			pm_open = false;
		},

		// add ---------------------------------------------------------------

		pm_add_save_as_input_keydown = (e) => {
			if(e.keyCode === 13){
				const $this = e.currentTarget;
				pm_add_save_as_palette($this.value, $this.add_saveas); // add_saveas: true = add, false = save as
			}
		},

		pm_add_save_as_btn_click = (e) => {
			const $inp = e.currentTarget.previousElementSibling;
			pm_add_save_as_palette($inp.value, $inp.add_saveas); // add_saveas: true = add, false = save as
		},

		pm_add_save_as_palette = (fname, add_saveas) => { // add_saveas: true = add, false = save as

			fname = fname.trim();

			// leer, existiert bereits, illegale chars ?
			if(pm_check_filename(fname) === false) return;

			dialogbox('Save?', true, confirm => {
				if (confirm === true){

					// add
					if(add_saveas === true){
						var arr_add_n = false, // nichts übergeben / 'arr_new_n' aus extension.js wird verwendet
							arr_add_c = false;
					}
					// save as
					else{
						var arr_add_n = arr_n, // aktuelle Farben übergeben
							arr_add_c = arr_c;
					}

					vscode.postMessage({ // ███ vscode APi ███
						command: 'add_palette', // -> extension.js -> 'add_palette_success()' (s.u.)
						arr_n: arr_add_n,
						arr_c: arr_add_c,
						fname: fname
					});

				}
			});

		},

		// rename ---------------------------------------------------------------
		pm_rename_inputs_keydown = (e) => {
			if(e.keyCode === 13) pm_rename_palette(e.currentTarget.parentNode.t_id, e.currentTarget.value);
		},

		pm_rename_btn_click = (e) => {
			const t_id = e.currentTarget.parentNode.t_id;
			pm_rename_palette(t_id, $pm_list_inputs[t_id].value);
		},

		pm_rename_palette = (t_id, fname) => {

			fname = fname.trim();

			// Name unverändert ?
			if( fname.toLowerCase() === arr_p[t_id].toLowerCase() ) return;

			// leer, existiert bereits, illegale chars ?
			if(pm_check_filename(fname) === false) return;

			dialogbox('Rename?', true, confirm => {
				if (confirm === true){
					vscode.postMessage({ // ███ vscode APi ███
						command: 'rename_palette', // -> extension.js -> 'rename_palette_success()' (s.u.)
						p_id: t_id,
						fname: fname
					});
				}
			});

		},

		// add + rename ---------------------------------------------------------------
		pm_check_filename = (fname) => {

			if(fname === '') return false;

			// prüfen ob Dateiname bereits existiert
			for (i = 0; i < p_len; i++) {
				if(fname.toLowerCase() === arr_p[i].toLowerCase()){
					dialogbox('Not possible! Name already exists!', false, confirm => {});
					return false;
				}
			}

			if (fname.match(/[\\\\/:*?\'<>|]/g)) {
				dialogbox('Not possible! These chars are not allowed: \\ / : * ? " < > | ', false, confirm => {});
				return false;
			}

			return true;

		},

		// delete palette ---------------------------------------------------------------
		pm_delete_click = (e) => {

			const t_id = e.currentTarget.parentNode.t_id;

			dialogbox('Delete?', true, confirm => {
				if (confirm === true){

					pm_remove_list_wrapper_id = t_id; // siehe "delete_palette_success"

					vscode.postMessage({ // ███ vscode APi ███
						command: 'delete_palette',  // -> extension.js -> 'delete_palette_success()' (s.u.)
						p_id: t_id,
					});

				}
			});

		},

		// head drag  _______________________________________________________________________________________________________________________________________________
		pm_head_mousedown = (e) => {
			drag_head_mousedown(e, $pm_wrapper, $pm_wrapper_outer, false); // mouseup_func = false
		},

		// def const ---------------------------------------------------------------
		$pm_wrapper_outer = document.createElement('div'),
		$pm_wrapper = document.createElement('div');

		// globals (siehe "delete_palette_success" + "add_palette_success")

		window.$pm_list_wrapper_main = null;
		window.$pm_list_wrappers = [];
		window.$pm_list_inputs = [];
		window.pm_remove_list_wrapper_id = -1;

		window.pm_create_listwrappers = (loop_start, loop_stop, reorder) => {

			for (i = loop_start; i < loop_stop; i++) {

				// wrapper
				$pm_list_wrappers[i] = document.createElement('div');
				$pm_list_wrappers[i].t_id = i; // t_id = this id

				// input
				$pm_list_inputs[i] = document.createElement('input');
				$pm_list_inputs[i].value = arr_p[i];
				$pm_list_inputs[i].addEventListener('keydown', pm_rename_inputs_keydown, false);
				$pm_list_wrappers[i].appendChild($pm_list_inputs[i]);

				// btn rename
				$el = document.createElement('p');
				$el.addEventListener('mousedown', pm_rename_btn_click, false);
				$pm_list_wrappers[i].appendChild($el);

				// btn delete
				$el = document.createElement('p');
				$el.addEventListener('mousedown', pm_delete_click, false);
				$pm_list_wrappers[i].appendChild($el);

				$pm_list_wrapper_main.appendChild($pm_list_wrappers[i]);

			}

			if(reorder === true){
				for (i = 0; i < p_len; i++) $pm_list_inputs[i].value = arr_p[i]; // nur input-Werte ändern, wrapper.t_id ändert sich nicht
			}

		};

		// start palette_manager_open --------------------------------------------------------------------------------------------------

		let $el_wrapper = document.createElement('div'); // dummy (mehrfach verwendet)

		$pm_wrapper_outer.id = 'pm-wrapper-outer';
		$pm_wrapper_outer.className = 'drag-head-wrapper-outer'; // drag head
		$pm_wrapper.id = 'pm-wrapper';
		$pm_wrapper.className = 'drag-head-wrapper'; // drag head

		$pm_list_wrapper_main = document.createElement('div'); // global definiert, wegen 'delete_palette_success'!
		$pm_list_wrapper_main.id = 'pm-list-wrapper';

		// Titel + close button ---------------------------
		$el = document.createElement('p');
		$el.addEventListener('mousedown', pm_close_click, false);
		$el_wrapper.id = 'pm-head'; // drag head
		$el_wrapper.className = 'drag-head'; // drag head
		$el_wrapper.addEventListener('mousedown', pm_head_mousedown, false); // drag head
		$el_wrapper.appendChild($el);
		$pm_wrapper.appendChild($el_wrapper);

		// input + button 'add' ---------------------------
		$el_wrapper = document.createElement('div');
		$el = document.createElement('input');
		$el.add_saveas = true; // add_saveas: true = add, false = save as
		$el.addEventListener('keydown', pm_add_save_as_input_keydown, false);
		$el_wrapper.appendChild($el);

		$el = document.createElement('p');
		$el.add_saveas = true; // add_saveas: true = add, false = save as
		$el.addEventListener('mousedown', pm_add_save_as_btn_click, false);
		$el_wrapper.appendChild($el);

		$pm_wrapper.appendChild($el_wrapper);

		// input + button 'save as' ---------------------------
		$el_wrapper = document.createElement('div');
		$el = document.createElement('input');
		$el.add_saveas = false; // add_saveas: true = add, false = save as
		$el.addEventListener('keydown', pm_add_save_as_input_keydown, false);
		$el_wrapper.appendChild($el);

		$el = document.createElement('p');
		$el.add_saveas = false; // add_saveas: true = add, false = save as
		$el.addEventListener('mousedown', pm_add_save_as_btn_click, false);
		$el_wrapper.appendChild($el);

		$pm_wrapper.appendChild($el_wrapper);

		// label Datei-Liste 'rename | delete palette'
		$el = document.createElement('span');
		$pm_wrapper.appendChild($el);

		$el = null;

		// Datei-Liste  ---------------------------

		pm_create_listwrappers(0, p_len, false); // reorder = false

		$pm_wrapper.appendChild($pm_list_wrapper_main);
		$pm_wrapper_outer.appendChild($pm_wrapper);

		// append
		document.body.appendChild($pm_wrapper_outer);

		drag_head_push($pm_wrapper);

		pm_open = true;

	},

	// dialogbox █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	dialogbox = (text, show_cancel, callback_function) => {

		const dib_click_ok = () => {
			callback_function(true);
			dib_close();
		},

		dib_keydown_dynamic_scroll = (e) => {
			if( e.keyCode === 9 ) e.preventDefault();// tab
			else if( e.keyCode === 13 ) dib_click_ok(); // enter
			else if( e.keyCode === 27 ) { // esc
				callback_function(false);
				dib_close();
			}
		},

		dib_close = () => {
			document.removeEventListener('keydown', dib_keydown_dynamic_scroll, false); // unbind
			$main_wrapper.removeChild($dib_wrapper);
			$el_active.focus(); // Fokus zurücksetzen
			document.addEventListener("keypress", doc_keypress, false); // globale shortcuts wiederherstellen
		},

		$el_active = document.activeElement,

		// outer wrapper
		$dib_wrapper = document.createElement('div'),
		$dib_wrapper_inner = document.createElement('div');

		// Start -------------------------------------------------------------------

		// globale shortcuts vorrübergehend deaktivieren
		document.removeEventListener("keypress", doc_keypress, false);

		$dib_wrapper.id = 'dib-wrapper';

		// text
		$el = document.createElement('span');
		$el.textContent = text;
		$dib_wrapper_inner.appendChild($el);

		// ok
		$el = document.createElement('p'); // Text siehe css (pseudo-Text 'OK')
		$el.addEventListener('click', dib_click_ok, false);
		$dib_wrapper_inner.appendChild($el);

		// cancel
		if(show_cancel === true){

			let dib_click_cancel = () => {
				callback_function(false);
				dib_close();
			};

			$el = document.createElement('p');  // Text siehe css (pseudo-Text 'Cancel')
			$el.addEventListener('click', dib_click_cancel, false);
			$dib_wrapper_inner.appendChild($el);
		}

		$el = null;

		// append
		$dib_wrapper.appendChild($dib_wrapper_inner);
		$main_wrapper.appendChild($dib_wrapper);

		$el_active.blur(); // Wichtig! Fokus auf aktivem Element entfernen, sonst werden ggf. Key-Events gefeuert wenn der focus auf einem input verbleibt!

		setTimeout(() => { // trotz blur ist timeout nötig
			document.addEventListener('keydown', dib_keydown_dynamic_scroll, false); // Keydown!!! Sonst Überschneidung mit  Palette Manager Inputs!
		}, 0);

	},

	// color wrapper █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	
	// die nachfolgenden Funktionen stehen alle im Zusammenhang mit den color wrappern und werden unter "create_color_wrappers" zugwiesen (s.u.) 

	// main colorwrapper mousedown _______________________________________________________________________________________________
	colorwrapper_main_mousedown = (e) => {

		// Rechtsklick
		if((e.which && e.which === 3) || (e.button && e.button === 2)){
			context_is_open = true;
		}
		// Linksklick
		else{
			if(ctrl_key === false && shift_key === false && sel_len > 0) reset_selection(true);
			context_is_open = false;
		}
		
	},

	// colorwrapper_mouseup _______________________________________________________________________________________________
	colorwrapper_mouseup = (e) => {

		// Info! // reset selection siehe "colorwrapper_main_mousedown()"

		// Contextmenü: Rechtsklick auf einzelnen wrapper erlauben (nur abbrechen wenn mehrere markiert)
		if(context_is_open === true && sel_len > 0) return; // ███ return ███

		let set_c_cid = -1;
		
		// einfacher Klick --------------------------------------------------------------------------------------------------------------
		if(ctrl_key === false && shift_key === false){
			if(c_cid !== -1) $color_inp_wrappers[c_cid].className = ''; // alten Auswahlrahmen entfernen
			set_c_cid = e.currentTarget.wid;
		}
		// ctrl | shift --------------------------------------------------------------------------------------------------------------
		else{
			
			if(sort_mode === true){
				dialogbox('Multiple selections not possible in sort mode!', false, confirm => {});
				return; // ███ return ███
			}

			const sel_id = e.currentTarget.wid;

			// ctrl ---------------------------------------------------------
			if(ctrl_key === true){
					
				// ausgewählter wrapper entspricht c_cid -> demarkieren
				if(sel_id === c_cid){
					$color_inp_wrappers[c_cid].className = '';
					c_cid = -1;
					store_webview_state(); // "c_cid" aktualisieren!
				}
				else{
					
					// prüfen ob bereits markiert
					const sel_pos = arr_sel_ids.indexOf(sel_id);
					
					// wrapper war nicht markiert ------
					if(sel_pos === -1){
						
						// active oder selected-Klasse?
						if(c_cid === -1){ // c_cid nicht vorhanden -> active-Klasse hinzufügen
							set_c_cid = sel_id; // s.u.
						}
						
						else{ // c_cid vorhanden -> selected-Klasse hinzufügen
							arr_sel_ids[sel_len] = sel_id;
							sel_len++;
							$color_inp_wrappers[sel_id].className = 'selected';
						}
						
					}
					// wrapper war bereits markiert ------
					else{ 
						// selection entfernen
						arr_sel_ids.splice(sel_pos, 1); 
						sel_len--;
						$color_inp_wrappers[sel_id].className = '';
					}

				}

			}
			// shift ---------------------------------------------------------
			else{

				let loop_start = 0,
					loop_end = 0,
					skip_loop = false;

				// c_cid vorhanden ------
				if (c_cid !== -1) {
					
					// sel_id unterhalb von c_cid
					if(sel_id > c_cid){
						loop_start = filter_open === 0 ? c_cid + 1 : arr_filtered_ids.indexOf(c_cid) + 1;
						loop_end = filter_open === 0 ? sel_id : arr_filtered_ids.indexOf(sel_id);
					}
					// sel_id oberhalb von c_cid
					else if(sel_id < c_cid){
						loop_start = filter_open === 0 ? sel_id : arr_filtered_ids.indexOf(sel_id);
						loop_end = filter_open === 0 ? c_cid - 1 : arr_filtered_ids.indexOf(c_cid) - 1;
					}
					else{ // sel_id === id_first (nichts machen)
						skip_loop = true;
					}

				}
				// keine c_cid ------
				else{

					// keine Selection (Start bei erstem wrapper / Ende bei sel_id)
					if(sel_len === 0){
						loop_start = 0; // gefiltert ebenfalls 0 (siehe loop unten)
						loop_end = filter_open === 0 ? sel_id - 1 : arr_filtered_ids.indexOf(sel_id) - 1;
						set_c_cid = sel_id; // aktiven wrapper setzen
					}
					// Selection vorhanden
					else{

						// sortieren um höchste und niedrigste id zu ermitteln
						if(sel_len > 1) arr_sel_ids.sort(function(a, b){return a-b});

						let id_first = filter_open === 0 ? arr_sel_ids[0] : arr_filtered_ids.indexOf(arr_sel_ids[0]);
						
						// sel_id unterhalb von erstem selektierten wrapper
						if(sel_id > id_first){
							loop_start = id_first + 1;
							loop_end = filter_open === 0 ? sel_id : arr_filtered_ids.indexOf(sel_id);
						}
						// sel_id oberhalb von erstem selektierten wrapper
						else if(sel_id < id_first){
							loop_start = filter_open === 0 ? sel_id : arr_filtered_ids.indexOf(sel_id);
							loop_end = id_first - 1;
						}
						else{ // sel_id === id_first (nichts machen)
							skip_loop = true;
						}
						
						set_c_cid = id_first; // aktiven wrapper setzen
	

					}

				}
				
				// alte Auswahl entfernen + sel array reset
				reset_selection(true); 
				
				// neue Auswahl markieren
				if(skip_loop === false){
					
					if(filter_open === 0){ // ohne Filter
						for (i = loop_start; i <= loop_end; i++) {
							$color_inp_wrappers[i].className = 'selected';
							arr_sel_ids[sel_len] = i;
							sel_len++;
						}
					}
					else{ // Filter
						for (i = loop_start; i <= loop_end; i++) {
							$color_inp_wrappers[arr_filtered_ids[i]].className = 'selected';
							arr_sel_ids[sel_len] = arr_filtered_ids[i];
							sel_len++;
						}
					}
					
				}
				
			}

		}
		
		// c_cid setzen
		if(set_c_cid !== -1){
			c_cid = set_c_cid;
			$color_inp_wrappers[c_cid].className = 'active';
			store_webview_state(); // "c_cid" aktualisieren!
			set_statusbar_active();
		}

	},

	// colorwrapper mousedown _______________________________________________________________________________________________
	colorwrapper_mousedown = (e) => {
		// Verhindern, dass "colorwrapper_input_focusin()" nochmal die c_cid überprüft wenn auf einen input geklickt wurde (nicht tragisch, aber muss nicht sein)
		if(e.target.tagName.toLowerCase() === "input" ) prevent_inp_focusin = true;
		
		// siehe doc_keydown()
		if (ctrl_combo === true) {
			ctrl_combo = false;
			ctrl_key = false;
			shift_key = false;
			$color_wrapper_main.classList.remove('multi-select');
		}
		
	},

	// focusin beide inputs  ______________________________________________________________________________________________
	colorwrapper_input_focusin = (e) => {

		//Info! Dient nur zur Navigation mit tab-Taste! Wenn tab in einen neuen wrapper springt muss dieser als aaktiv markiert werden

		// siehe "colorwrapper_mousedown()"
		if(prevent_inp_focusin === true){
			prevent_inp_focusin = false;
			return;
		}

		this_wid = e.currentTarget.wid;
		if(this_wid !== c_cid){
			if(c_cid !== -1) $color_inp_wrappers[c_cid].className = ''; // alten Auswahlrahmen entfernen
			c_cid = this_wid;
			$color_inp_wrappers[c_cid].className = 'active';
			store_webview_state(); // "c_cid" aktualisieren!
		}

	},

	// colorwrapper_colorspan_click ______________________________________________________________________________________________
	colorwrapper_colorspan_click = () => {
		if(context_is_open === true) return;

		const colorval = arr_c[c_cid]; // "c_cid" wird kurz zuvor unter "colorwrapper_mouseup()" ermittelt

		vscode.postMessage({ // ███ vscode APi ███
			command: 'insert',
			colorval: colorval
		})

		// insert-Animation
		if(current_ani_id !== c_cid){
			current_ani_id = c_cid;
			$color_wrappers[c_cid].className = 'color-wrapper ani-insert';
		}
		// mehrfacher Click auf gleichen wrapper
		else{
			$color_wrappers[c_cid].className = 'color-wrapper'; // Animationsklasse entfernen
			setTimeout(() => {
				$color_wrappers[c_cid].className = 'color-wrapper ani-insert'; // Animationsklasse erneut hinzufügen
			}, 0);
		}

	},

	// colorwrapper_switch_click ______________________________________________________________________________________________
	colorwrapper_switch_click = () => {
		if(context_is_open === true) return;

		const switched_color = switch_color_system(arr_c[c_cid]);
		if(switched_color !== false){
			arr_c[c_cid] = switched_color;
			$color_inputs_c[c_cid].value = switched_color;
		}

	},

	// name-input ______________________________________________________________________________________________
	colorwrapper_input_n_focusout = () => {
		if(context_is_open === true) return;
		if(c_cid !== -1) cw_input_n_check(c_cid); // wird z.B. auch gefeuert wenn man eine andere Palette lädt (daher auf -1 prüfen)
	},

	colorwrapper_input_n_keyup = () => {
		cw_input_n_check(c_cid);
	},

	cw_input_n_check = (id) => {
		let val = $color_inputs_n[id].value;
		val = val.indexOf(":") !== -1 ? val.replace(/\:/g, ".") : val; // Doppelpunkt nicht erlaubt (siehe settings-Datei)
		arr_n[id] = val; // array aktualisieren
	},

	// color-input ______________________________________________________________________________________________
	colorwrapper_input_c_focusout = (e) => {
		if(context_is_open === true) return;
		if(c_cid !== -1) cw_input_c_check(c_cid); // hier kann nicht mit 'c_cid' gearbeitet werden, da focusin eher gefeuert wird und die 'c_cid' aktualisiert (s.o.)
		//if(c_cid !== -1) cw_input_c_check(e.currentTarget.parentNode.parentNode.wid); // hier kann nicht mit 'c_cid' gearbeitet werden, da focusin eher gefeuert wird und die 'c_cid' aktualisiert (s.o.)
	},

	colorwrapper_input_c_keyup = (e) => {
		if(e.keyCode === 13) cw_input_c_check(c_cid);
	},

	cw_input_c_check = (id) => {
		const val = $color_inputs_c[id].value.trim();
		arr_b[id] = check_color(val) === false ? color_error_bg : val;
		arr_c[id] = val;
		$color_spans[id].style.background = arr_b[id];
	},

	// create_color_wrappers ________________________________________________________________________________________________________________________

	create_color_wrappers = (loop_start, loop_stop) => {

		// list-view
		if(mode_current !== 'insert-floatview'){
			// bei Init dynamic scroll ? Wenn Anzahl der color-wrapper 'dynamic_scroll_limit' übersteigt, dann allen wrappern erstmal 'hide'-Klasse zuweisen (danach weiter bei message/init s.u.)
			// mit dynamischem scrollen || ohne dynamisches scrollen (sofort sichtbar)
			var class_name = (c_len > dynamic_scroll_limit || filter_open === 1) ? 'hide' : 'color-wrapper',
				set_title = false;
		}
		// float-view
		else{
			var class_name = filter_open === 1 ? 'hide' : 'color-wrapper',
				set_title = true;
		}

		// ███ Init: create main-wrapper (append s.u.) ███
		if(init === true){

			// def window
			window.$color_wrappers = [];
			window.$color_spans = [];
			window.$color_inp_wrappers = [];
			window.$color_inputs_n = [];
			window.$color_inputs_c = [];
			window.$color_mode_switches = [];
			window.$color_wrapper_main = document.createElement('div');

			$color_wrapper_main.id = 'color-wrapper-main';

			$color_wrapper_main.addEventListener('contextmenu', open_context, false);
			$color_wrapper_main.addEventListener('mousedown', colorwrapper_main_mousedown, false);
			
		}
		else{
			$main_wrapper.className = mode_current+" hide"; // ███ Performance s.u. ███
		}

		for (i = loop_start; i < loop_stop; i++) {

			arr_b[i] = check_color(arr_c[i]) === false ? color_error_bg : arr_c[i];

			$color_wrappers[i] = document.createElement('div');
			$color_wrappers[i].wid = i; // wid = wrapper-id
			$color_wrappers[i].className = class_name;
			$color_wrappers[i].addEventListener('mousedown', colorwrapper_mousedown, false);
			$color_wrappers[i].addEventListener('mouseup', colorwrapper_mouseup, false);
			// sort mode aktiv? (siehe init)
			if (sort_mode === true) $color_wrappers[i].addEventListener("mousedown", colorwrapper_drag_mousedown, false);
			// floatview title-tooltip?
			if (set_title === true) $color_wrappers[i].title = arr_n[i] === arr_c[i] ? arr_n[i] : arr_n[i]+': '+arr_c[i];

			$color_spans[i] = document.createElement('span');
			$color_spans[i].addEventListener('click', colorwrapper_colorspan_click, false);
			$color_spans[i].style.background = arr_b[i];

			$color_inp_wrappers[i] = document.createElement('div');

			$color_inputs_n[i] = document.createElement('input');
			$color_inputs_n[i].wid = i; // wid = wrapper-id
			$color_inputs_n[i].addEventListener('focusin', colorwrapper_input_focusin, false);
			$color_inputs_n[i].addEventListener('focusout', colorwrapper_input_n_focusout, false);
			$color_inputs_n[i].addEventListener('keyup', colorwrapper_input_n_keyup, false);
			$color_inputs_n[i].value = arr_n[i];

			$color_inputs_c[i] = document.createElement('input');
			$color_inputs_c[i].wid = i; // wid = wrapper-id
			$color_inputs_c[i].addEventListener('focusin', colorwrapper_input_focusin, false);
			$color_inputs_c[i].addEventListener('focusout', colorwrapper_input_c_focusout, false);
			$color_inputs_c[i].addEventListener('keyup', colorwrapper_input_c_keyup, false);
			$color_inputs_c[i].value = arr_c[i];

			$color_mode_switches[i] = document.createElement('p');
			$color_mode_switches[i].addEventListener('click', colorwrapper_switch_click, false);

			// delete button <i>
			$el = document.createElement('i');
			$el.addEventListener('click', delete_colors, false);

			// append
			$color_inp_wrappers[i].appendChild($color_inputs_n[i]);
			$color_inp_wrappers[i].appendChild($color_inputs_c[i]);
			$color_inp_wrappers[i].appendChild($color_mode_switches[i]);
			$color_wrappers[i].appendChild($el); // delete button <i>
			$color_wrappers[i].appendChild($color_spans[i]);
			$color_wrappers[i].appendChild($color_inp_wrappers[i]);

			$color_wrapper_main.appendChild($color_wrappers[i]);

		}

		// ███ Init: append main-wrapper ███
		if(init === true){
			if(c_cid !== -1 && c_cid < c_len) $color_inp_wrappers[c_cid].className = 'active'; // < c_len, falls User im Texteditor zwischenzeitlich Farben entfernt hat
			set_statusbar_active();
			$main_wrapper.appendChild($color_wrapper_main); // ███ document position 4 ███
		}
		else{
			$main_wrapper.className = mode_current; // ███ Performance s.o. ███
		}

		if(filter_open === 0) set_statusbar_counter(); // wird anderenfalls später durch die Filter-Funktion gemacht

	},
	
	// drag drop ________________________________________________________________________________________________________________________

	colorwrapper_drag_mousedown = (e) => {

		$el_drag = e.currentTarget;
		$el_hover = $el_drag;
		drag_id = $el_drag.wid;

		for (i = 0; i < c_len; i++) { $color_wrappers[i].addEventListener('mouseenter', colorwrapper_drag_mouseenter, false); }
		document.addEventListener('mouseup', colorwrapper_drag_doc_mouseup, false);

		if(c_cid !== -1) $color_inp_wrappers[c_cid].className = ''; // 'active' entfernen init oder re-init

		$el_drag.className = 'color-wrapper drag-element';
		$color_inp_wrappers[drag_id].className = 'active';
		c_cid = drag_id;

	},

	colorwrapper_drag_mouseenter = (e) => {

		hover_id = e.currentTarget.wid;

		$color_spans[drag_id].style.background = arr_b[hover_id];
		$color_inputs_n[drag_id].value         = arr_n[hover_id];
		$color_inputs_c[drag_id].value         = arr_c[hover_id];

		$color_spans[hover_id].style.background = arr_b[drag_id];
		$color_inputs_n[hover_id].value         = arr_n[drag_id];
		$color_inputs_c[hover_id].value         = arr_c[drag_id];

		// Dreieckstausch
		const 	tmp_c = arr_c[drag_id],
				tmp_n = arr_n[drag_id],
				tmp_b = arr_b[drag_id];

		arr_c[drag_id] = arr_c[hover_id];
		arr_n[drag_id] = arr_n[hover_id];
		arr_b[drag_id] = arr_b[hover_id];

		arr_c[hover_id] = tmp_c;
		arr_n[hover_id] = tmp_n;
		arr_b[hover_id] = tmp_b;

		$color_inp_wrappers[drag_id].className = '';
		$color_inp_wrappers[hover_id].className = 'active';

		$el_drag.className = 'color-wrapper';

		$el_hover = e.currentTarget;
		$el_hover.className = 'color-wrapper drag-element';

		$el_drag = $el_hover; // !!!

		drag_id = hover_id;
		c_cid = hover_id;

	},

	colorwrapper_drag_doc_mouseup = () => {
		for (i = 0; i < c_len; i++) { $color_wrappers[i].removeEventListener('mouseenter', colorwrapper_drag_mouseenter, false); }
		document.removeEventListener('mouseup', colorwrapper_drag_doc_mouseup, false);
		$el_drag.className = 'color-wrapper'; // drag-Klasse entfernen
	},

	// context menu  █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

	set_context_click_area = () => {
		$color_wrapper_main.style.minHeight = (window_height - controls_height - statusbar_height - 4)+"px"; // -4 = Toleranz (2 würde eigentlich reichen)     Statusbar-Höhe entspricht padding-bottom des Body (siehe css)
	},

	open_context = (e) => {
		
		if(sort_mode === true){
			dialogbox('Contextmenu not available in sort mode!', false, confirm => {});
			return; // ███ return ███
		}
		
		const context_open_picker = () => {
			if(c_cid !== -1){
				open_picker_external(2, arr_c[c_cid]);
			}
			else{ // user hat c_cid mit ctrl deaktiviert
				if(sel_len > 0) open_picker_external(2, arr_c[arr_sel_ids[0]]);
			}
		},

		// add ------------------------------------
		context_add_click = () => {
			if(empty_area_clicked === true && c_len > 0) add_colors(true, true, c_len, true); // true = new color, true = new color, insert-pos
			else add_colors(true, true, c_cid, false);
		},

		// duplicate ------------------------------------
		context_duplicate_click = () => {

			const 	arr_dup_ids = get_selected_ids(), // werden sortiert zurückgegeben!
					dup_len = arr_dup_ids.length;

			let arr_dup_n = [],
				arr_dup_c = [];

			for (i = 0; i < dup_len; i++) {
				arr_dup_n[i] = arr_n[arr_dup_ids[i]];
				arr_dup_c[i] = arr_c[arr_dup_ids[i]];
			}

			add_colors(arr_dup_n, arr_dup_c, arr_dup_ids[dup_len - 1] + 1, true);

		},

		// verwendet von copy und cut ------------------------------------
		context_copy_cut_colors = () => {

			// reset
			if(copy_len > 0){
				arr_copy_n = [];
				arr_copy_c = [];
			}

			const arr_copy_ids = get_selected_ids(); // werden sortiert zurückgegeben!

			copy_len = arr_copy_ids.length;

			for (i = 0; i < copy_len; i++){
				arr_copy_n[i] = arr_n[arr_copy_ids[i]];
				arr_copy_c[i] = arr_c[arr_copy_ids[i]];
			}

		},

		// copy ------------------------------------
		context_copy_click = () => {
			context_copy_cut_colors();
		},

		// cut ------------------------------------
		context_cut_click = () => {
			context_copy_cut_colors();
			delete_colors();
		},

		// paste ------------------------------------
		context_paste_click = () => {

			let paste_pos = -1;

			if(empty_area_clicked === true){
				paste_pos = c_len;
			}
			else{

				if (c_cid !== -1) {
					paste_pos = c_cid;
				}
				else{
					// c_cid vom user per ctrl deaktiviert (hinter höchster ausgewählter id einfügen)
					const arr_sorted_sel_ids = get_selected_ids(); // werden sortiert zurückgegeben!
					paste_pos = arr_sorted_sel_ids[sel_len - 1];
				}
			}

			add_colors(arr_copy_n, arr_copy_c, paste_pos, true);

		},

		// select all ------------------------------------
		context_select_all = () => {

			if(sel_len > 0) reset_selection(false); // false: nur arrays zurücksetzen, Klassen können erhalten bleiben da sowieso alle markiert werden

			if(filter_open === 0){
				arr_sel_ids = [...Array(c_len)].map((_,i) => i + 0); // 0 fortlaufend hochzählen
				sel_len = c_len;
				for (i = 0; i < c_len; i++) $color_inp_wrappers[i].className = 'selected';

			}
			else{
				arr_sel_ids = arr_filtered_ids;
				sel_len = filtered_ids_len;
				for (i = 0; i < filtered_ids_len; i++) $color_inp_wrappers[arr_filtered_ids[i]].className = 'selected';
			}
			
			// c_cid entfernen sonst doppelt, siehe: get_selected_ids()
			if(c_cid !== -1){
				arr_sel_ids.splice(arr_sel_ids.indexOf(c_cid), 1); 
				sel_len--;
				$color_inp_wrappers[c_cid].className = 'active'; // neu setzen, da im loop mit 'selected' überschrieben
			}

		},

		// mouseup / close ------------------------------------
		context_doc_mouseup_keyup = () => {
			document.removeEventListener('keyup', context_doc_mouseup_keyup, false); // unbind self
			document.removeEventListener('mouseup', context_doc_mouseup_keyup, false);
			document.body.removeChild($context_ul);
		},

		// Position? ------------------------------------
		context_set_position = () => {
			// y: -4 = Toleranz (sonst scrollbar im body / 2 würde eigentlich reichen)
			$context_ul.style.top = e.clientY + context_height <= window_height ? e.clientY +'px' : window_height - context_height - 4 +'px';
			$context_ul.style.left = e.clientX + context_width >= window_width ? window_width - context_width+'px' :  e.clientX+'px';
		};

		// def window
		if(typeof copy_len === 'undefined'){
			window.copy_len = 0;
			window.arr_copy_n = [];
			window.arr_copy_c = [];
		}

		// leerer Bereich innerhalb von $color_wrapper_main angeklickt: nur cut/paste erlauben
		var empty_area_clicked = e.target === $color_wrapper_main ? true : false;

		window.$context_ul = document.createElement('ul');

		// start context menu -------------------------------------------------------------------------------

		$context_ul.id = 'context-ul';

		// picker
		$el = document.createElement('li');
		$el.id = 'context-li-picker';
		if(empty_area_clicked === false) $el.addEventListener('mouseup', context_open_picker, false);
		else $el.className = 'context-li-disabled';
		$context_ul.appendChild($el);

		// add
		$el = document.createElement('li');
		$el.id = 'context-li-add';
		$el.addEventListener('mouseup', context_add_click, false);
		$context_ul.appendChild($el);

		// duplicate
		$el = document.createElement('li');
		$el.id = 'context-li-duplicate';
		if(empty_area_clicked === false) $el.addEventListener('mouseup', context_duplicate_click, false);
		else $el.className = 'context-li-disabled';
		$context_ul.appendChild($el);

		// delete
		$el = document.createElement('li');
		$el.id = 'context-li-delete';
		if(empty_area_clicked === false) $el.addEventListener('mouseup', delete_colors, false);
		else $el.className = 'context-li-disabled';
		$context_ul.appendChild($el);

		// select all
		$el = document.createElement('li');
		$el.id = 'context-li-select';
		if((filter_open === 1 && filtered_ids_len > 0) || (filter_open === 0 && c_len > 0)) $el.addEventListener('mouseup', context_select_all, false);
		else $el.className = 'context-li-disabled';
		$context_ul.appendChild($el);

		// copy
		$el = document.createElement('li');
		$el.id = 'context-li-copy';
		if(empty_area_clicked === false) $el.addEventListener('mouseup', context_copy_click, false);
		else $el.className = 'context-li-disabled';
		$context_ul.appendChild($el);

		// cut
		$el = document.createElement('li');
		$el.id = 'context-li-cut';
		if(empty_area_clicked === false) $el.addEventListener('mouseup', context_cut_click, false);
		else $el.className = 'context-li-disabled';
		$context_ul.appendChild($el);

		// paste
		$el = document.createElement('li');
		$el.id = 'context-li-paste';
		if(copy_len > 0) $el.addEventListener('mouseup', context_paste_click, false);
		else $el.className = 'context-li-disabled';
		$context_ul.appendChild($el);


		$el = null;

		document.addEventListener('mouseup', context_doc_mouseup_keyup, false);
		document.addEventListener('keyup', context_doc_mouseup_keyup, false);

		// beim ersten Öffnen, zuerst zum body hinzufügen und dann ausrichten ...
		if(context_height === 0){
			document.body.appendChild($context_ul);
			context_height = $context_ul.clientHeight;
			context_width = $context_ul.clientWidth;
			context_set_position();
		}
		// ... ansonsten erst ausrichten und dann zum body hinzufügen
		else{
			context_set_position();
			document.body.appendChild($context_ul);
		}

		// Fokus von aktivem Element entfernen
		document.activeElement.blur();

	},

	// dynamic scroll █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

	dynamic_scroll_limit = 200, // sollte okay sein für drehbare Monitore im Hochformat und verkleinerter Ansicht in vscode !

	dynamic_scroll_get_values = () => {

		// wrapper-Höhe messen
		if(color_wrapper_height === 0){

			// listview aktiv
			if(mode_current !== "insert-floatview"){
				// Listview! Ersten wrapper sichtbar machen, um Höhe zu ermitteln (wrapper haben kurz zuvor alle 'hide' erhalten / siehe 'create_color_wrappers')
				// Update: entweder ersten wrapper sichtbar machen, oder wenn im floatview im gefilterten Zustand geöffnet wurde, dann den wrapper mit
				// der ersten Filter-ID sichtbat machen
				const wrapper_id = filtered_ids_len === 0 ? 0 : arr_filtered_ids[0];
				$color_wrappers[wrapper_id].className = 'color-wrapper';
				color_wrapper_height = $color_wrappers[wrapper_id].offsetHeight;
			}
			// floatview aktiv
			else{
				// Wenn die Extension im floatview geöffnet wird, und dann zum listview mit dynamic scroll gewechselt wird, dann wird dem ersten wrapper kurzzeitig
				// eine Klasse zugewiesen, die die scss-Variable "$wrapper_height" enthält und somit genau der Höhe der Listview-Wrapper entspricht!
				$color_wrappers[0].classList.add('meassure-list-wrapper-height');
				color_wrapper_height = $color_wrappers[0].offsetHeight; // Höhe messen
				$color_wrappers[0].classList.remove('meassure-list-wrapper-height');
			}

		}

		current_visible_wrappers = Math.ceil((window_height - controls_height) / color_wrapper_height);
		visible_index_end_mem = current_visible_wrappers * 3; // * 3: dreifache Höhe der aktuell sichbaren color-wrapper (siehe dynamic_scroll)

	},

	init_dynamic_scroll = () => {
		dynamic_scroll_get_values(); // aktualisiert 'visible_index_end_mem'
		for (i = 0; i < visible_index_end_mem; i++) $color_wrappers[i].className = "color-wrapper";
		dynamic_scroll();
		dynamic_scroll_bind_listener();
	},

	dynamic_scroll_bind_listener = () => {
		document.addEventListener("keydown", doc_keydown_dynamic_scroll, false);
		window.addEventListener('scroll', window_dynamic_scroll, false);
		dynamic_scroll_is_active = true;
	},


	window_dynamic_scroll = () => {
		/*if(this.resize_to) clearTimeout(this.resize_to);
		this.resize_to = setTimeout(() => {
			dynamic_scroll();
		}, 10);*/

		dynamic_scroll();

	},

	dynamic_scroll = () => {

		// Info! Es ist immer die dreifache Höhe der aktuell sichtbaren color-wrapper zu sehen, sonst würde man beim Scrollen das Einblenden sehen!
		// alle anderen wrapper davor oder danach erhalten die hide-Klasse

		const scroll_y = window.scrollY; 

		let visible_index_start = Math.floor(scroll_y / color_wrapper_height),
			visible_index_end = 0,
			is_filtered = filter_open === 1 && filtered_ids_len > 0 ? true : false;

		// sichtbares Fenster + ein Fenster davor + ein Fenster dahinter
		if(visible_index_start >= current_visible_wrappers){
			visible_index_end = visible_index_start + (current_visible_wrappers * 2);
			visible_index_start -= current_visible_wrappers;
		}
		// drei Fenster-Höhen beginnend ab 0
		else{
			visible_index_start = 0;
			visible_index_end = current_visible_wrappers * 3;
		}

		// drei Fenster-Höhen beginnend ab Ende

		// ungefiltert
		if(is_filtered === false){
			if(visible_index_end >= c_len){
				visible_index_end = c_len;
				visible_index_start = c_len - (current_visible_wrappers * 3);
			}
		}
		// gefiltert
		else{
			if(visible_index_end >= filtered_ids_len){
				visible_index_end = filtered_ids_len;
				visible_index_start = filtered_ids_len - (current_visible_wrappers * 3);
			}
		}


		// aufwärts -------------------------------------------------------------------------------------------------
		if(scroll_y <= scroll_y_pos){

			const dif = visible_index_start_mem - visible_index_start;

			// ungefiltert
			if(is_filtered === false){
				for (i = 0; i < dif; i++) {
					$color_wrappers[visible_index_start + i].className = 'color-wrapper';
					$color_wrappers[visible_index_end + i].className = 'hide';
				}
			}
			// gefiltert
			else{
				for (i = 0; i < dif; i++) {
					$color_wrappers[arr_filtered_ids[visible_index_start + i]].className = 'color-wrapper';
					$color_wrappers[arr_filtered_ids[visible_index_end + i]].className = 'hide';
				}
			}

		}
		// abwärts -------------------------------------------------------------------------------------------------
		else{

			const dif = visible_index_start - visible_index_start_mem;

			// ungefiltert
			if(is_filtered === false){
				for (i = 0; i < dif; i++) {
					$color_wrappers[visible_index_start_mem + i].className = 'hide';
					$color_wrappers[visible_index_end_mem + i].className = 'color-wrapper';
				}
			}
			// gefiltert
			else{
				for (i = 0; i < dif; i++) {
					$color_wrappers[arr_filtered_ids[visible_index_start_mem + i]].className = 'hide';
					$color_wrappers[arr_filtered_ids[visible_index_end_mem + i]].className = 'color-wrapper';
				}
			}

		}

		// vars aktualisieren
		scroll_y_pos = scroll_y;
		visible_index_start_mem = visible_index_start;
		visible_index_end_mem = visible_index_end;

		// ausgeblendete wrapper mittels padding kompensieren
		dynamic_scroll_compensate(is_filtered);

	},

	dynamic_scroll_compensate = (is_filtered) => {
		if(is_filtered === false) $main_wrapper.style.padding = (visible_index_start_mem * color_wrapper_height) + 'px 0 ' + ((c_len - visible_index_end_mem) * color_wrapper_height) + 'px 0';
		else $main_wrapper.style.padding = (visible_index_start_mem * color_wrapper_height) + 'px 0 ' + ((filtered_ids_len - visible_index_end_mem) * color_wrapper_height) + 'px 0';
	},

	dynamic_scroll_remove = () => {
		window.removeEventListener('scroll', window_dynamic_scroll, false);
		document.removeEventListener("keydown", doc_keydown_dynamic_scroll, false);
		dynamic_scroll_is_active = false;
		$main_wrapper.style.padding = '';
	},

	recalc_visible_index_mem = () => {

		// ███ Berechnungen identisch wie bei dynamic_scroll() (nur auf die beiden "_mem"-Variablen angepasst) ███

		visible_index_start_mem = Math.floor(window.scrollY / color_wrapper_height);
		visible_index_end_mem = 0;

		// sichtbares Fenster + ein Fenster davor + ein Fenster dahinter
		if(visible_index_start_mem >= current_visible_wrappers){
			visible_index_end_mem = visible_index_start_mem + (current_visible_wrappers * 2);
			visible_index_start_mem -= current_visible_wrappers;
		}
		// drei Fenster-Höhen beginnend ab 0
		else{
			visible_index_start_mem = 0;
			visible_index_end_mem = current_visible_wrappers * 3;
		}

		let len = filter_open === 0 ? c_len : filtered_ids_len;

		// drei Fenster-Höhen beginnend ab Ende
		if(visible_index_end_mem >= len){
			visible_index_end_mem = len;
			visible_index_start_mem = len - (current_visible_wrappers * 3);
		}

	},

	// statusbar █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	set_statusbar_counter = () => {
		$sb_counter.textContent = filter_open === 0 ? c_len+' entries' : filtered_ids_len+' / '+c_len+' entries';
	},
	
	set_statusbar_active = () => {
		let c = filter_open === 0 ? c_cid + 1 : arr_filtered_ids.indexOf(c_cid) + 1; 
		$sb_active.textContent = c_cid !== -1 ? 'a: '+ c  : 'a: n';
	},

	// scroll_to_active █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	scroll_to_active = () => {
		
		let active_y = 0; // bei c_cid = -1 wird ganz nach oben gescrollt!
		
		if(c_cid !== -1){ 

			// dynamic scroll ist aktiv
			if(dynamic_scroll_is_active === true){

				const c_cid_wrapper_top = color_wrapper_height * c_cid;

				if(c_cid_wrapper_top <= scroll_y_pos || c_cid_wrapper_top >= scroll_y_pos + window_height - controls_height - color_wrapper_height){ // - color_wrapper_height = 1 wrapper Toleranz
					active_y = c_cid_wrapper_top;
				}

			}
			// dynamic scroll ist nicht aktiv
			else{
				
				// if(color_wrapper_height === 0) color_wrapper_height = $color_wrappers[0].offsetHeight;

				const 	c_cid_wrapper_top = $color_wrappers[c_cid].offsetTop,
						scroll_y = window.scrollY;

				if(c_cid_wrapper_top <= scroll_y || c_cid_wrapper_top >= scroll_y + window_height - controls_height){ // - color_wrapper_height = 1 wrapper Toleranz
					active_y = c_cid_wrapper_top - controls_height;
				}

			}
		
		}
		
		window.scrollTo(0, active_y);

	},

	// set_controls_height █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	set_controls_height = () => {
		controls_height = $controls_wrapper.offsetHeight;
		document.body.style.paddingTop = controls_height+"px";
		set_context_click_area();
	},

	// drag head █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

	// muss beim Öffnen eines widgets ausgeführt werden !
	drag_head_push = ($wrapper) => {

		// def globals
		if(typeof $drag_wrapper === 'undefined'){
			window.$drag_wrapper = null;
			window.$drag_wrapper_outer = null;
			window.drag_mouseup_func = false;
			window.arr_drag_head_elements = [];
			window.drag_head_elements_len = 0;
		}

		if(drag_head_elements_len === 0) window.addEventListener("resize", drag_head_window_resize, false);
		arr_drag_head_elements[drag_head_elements_len] = $wrapper;
		drag_head_elements_len++;
	},

	// muss beim Schließen eines widgets ausgeführt werden !
	drag_head_splice = ($wrapper) => {

		for (i = 0; i < drag_head_elements_len; i++) {
			if($wrapper === arr_drag_head_elements[i]){
				arr_drag_head_elements.splice(i, 1);
				drag_head_elements_len--;
				break;
			}
		}

		if(drag_head_elements_len === 0) window.removeEventListener("resize", drag_head_window_resize, false);

	},

	drag_head_mousedown = (e, $wrapper, $wrapper_outer, mouseup_func) => { // mouseup_func = false | function (vom widget übergebene Spezial-Funktion, die bei mouseup ausgeführt wird)

		// global vars setzen
		$drag_wrapper = $wrapper;
		$drag_wrapper_outer = $wrapper_outer;
		drag_mouseup_func = mouseup_func;

		const bcr = $drag_wrapper.getBoundingClientRect();

		$drag_wrapper.start_top = parseInt(bcr.top);
		$drag_wrapper.start_left = parseInt(bcr.left);
		$drag_wrapper.start_x = e.pageX;
		$drag_wrapper.start_y = e.pageY;
		$drag_wrapper.dragged = true;

		$drag_wrapper.style.margin = 0; // override css '0 auto'
		$drag_wrapper.classList.add('drag'); // Nicht per className! (picker-mode-... muss erhalten bleiben)

		$drag_wrapper_outer.classList.add('mousehold'); // pointer events all / darunterliegende Elemente "überdecken" // Nicht per className! (siehe get_picker_dimensions)

		document.addEventListener("mousemove", drag_head_doc_mousemove, false);
		document.addEventListener("mouseup", drag_head_doc_mouseup, false);

		drag_head_doc_mousemove(e);

	},

	drag_head_doc_mousemove = (e) => {

		$drag_wrapper.style.transform = 'translate('+($drag_wrapper.start_left + e.pageX - $drag_wrapper.start_x)+'px ,'+($drag_wrapper.start_top + e.pageY - $drag_wrapper.start_y)+'px)';

		// fix vscode 1.36.1: seit dieser Version keine Mausbewegungen außerhalb des sichtbaren Bereichs mehr möglich
		if(e.pageX >= window_width || e.pageX <= 0 || e.pageY >= window_height || e.pageY <= 0){
			drag_head_doc_mouseup(e)
		}

	},

	drag_head_doc_mouseup = (e) => {

		document.removeEventListener("mousemove", drag_head_doc_mousemove, false);
		document.removeEventListener("mouseup", drag_head_doc_mouseup, false);
		$drag_wrapper_outer.classList.remove('mousehold');

		// überprüfen ob Picker aus sichtbarem Bereich verschwunden ist
		let current_x = ($drag_wrapper.start_left + e.pageX - $drag_wrapper.start_x),
			current_y = ($drag_wrapper.start_top + e.pageY - $drag_wrapper.start_y),
			set_pos = false;

		if(current_x >= window_width - 100){
			current_x = window_width - 100;
			set_pos = true;
		}
		else if(current_x + $drag_wrapper.offsetWidth <= 100){
			current_x = -$drag_wrapper.offsetWidth + 100;
			set_pos = true;
		}

		if(current_y >= window.innerHeight - 100){
			current_y = window.innerHeight - 100;
			set_pos = true;
		}
		else if(current_y <= 0){
			current_y = 0;
			set_pos = true;
		}

		if(set_pos === true) $drag_wrapper.style.transform = 'translate('+current_x+'px ,'+current_y+'px)';

		// mouseup-Spezial-Funktion ausführen?
		if(drag_mouseup_func !== false) drag_mouseup_func();

		// reset
		$drag_wrapper = null;
		$drag_wrapper_outer = null;
		drag_mouseup_func = false;

	},

	drag_head_window_resize = () => {

		let bcr = null;

		for (i = 0; i < drag_head_elements_len; i++) {

			// wenn widget verschoben wurde, dann widget wieder "responsive machen"
			if(arr_drag_head_elements[i].dragged === true){
				arr_drag_head_elements[i].dragged = false;
				arr_drag_head_elements[i].classList.remove('drag');
				// reset margin 0 -> 'margin: 0 auto' aus css übernimmt wieder
				arr_drag_head_elements[i].style.margin = '';
				// translateX entfernen / translateY überschreibt translateX (translateY kann erhalten bleiben, da für responsive Zentrierung unwichtig)
				arr_drag_head_elements[i].style.transform = 'translateY('+(arr_drag_head_elements[i].getBoundingClientRect().top)+'px)';
			}

			// überprüfen ob widget aus sichtbarem Bereich verschwunden ist
			bcr = arr_drag_head_elements[i].getBoundingClientRect();

			if(bcr.top > window.innerHeight - 100){
				arr_drag_head_elements[i].style.transform = 'translateY('+(window.innerHeight - 100)+'px)';
			}
			else if(bcr.top < 0){
				current_y = 0;
				arr_drag_head_elements[i].style.transform = 'translateY(0px)';
			}

		}

	},


	// window_resize_end █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	window_resize_end = () => {

		if(this.resize_to) clearTimeout(this.resize_to);

		this.resize_to = setTimeout(() => {

			window_width = window.innerWidth;

			const window_height_new = window.innerHeight;

			// noch nicht ermittelt (floatview aktiv), ansonsten Error Division durch 0
			if(color_wrapper_height !== 0) current_visible_wrappers = Math.ceil((window_height_new - controls_height) / color_wrapper_height);

			// ggf. hat sich durch Button-Verschiebungen die Höhe geändert
			const controls_height_after = $controls_wrapper.clientHeight;

			if(controls_height_after !== controls_height){
				controls_height = controls_height_after;
				document.body.style.paddingTop = controls_height+"px";
			}

			// dynamic scroll anpassen ?
			if (mode_current !== 'insert-floatview' && c_len > dynamic_scroll_limit){

				current_visible_wrappers = Math.ceil((window_height_new - controls_height) / color_wrapper_height);

				// Fensterhöhe hat sich vergrößert -> wrapper die dazu gekommen sind sichtbar machen

				// Den Fall, dass sich die Fensterhöhe verkleinert, einfach ignorieren / das reguliert sich beim Scrollen früher oder später automatisch

				if(window_height_new > window_height){

					recalc_visible_index_mem();

					for (i = visible_index_start_mem; i < visible_index_end_mem; i++) $color_wrappers[i].className = 'color-wrapper';

					// padding kompensieren
					$main_wrapper.style.padding = (visible_index_start_mem * color_wrapper_height) + 'px 0 ' + ((c_len - visible_index_end_mem) * color_wrapper_height) + 'px 0';

				}

			}

			window_height = window_height_new;

			set_context_click_area();

		}, 20);

	},

	// siehe: btn_add_click + btn_sort_click █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	refresh_color_wrappers = (loop_start_pos) => {

		//document.body.className = 'hide'; // ███ Performance ███

		// list-view
		if(mode_current !== 'insert-floatview'){
			for (i = loop_start_pos; i < c_len; i++) {
				$color_inputs_n[i].value = arr_n[i];
				$color_inputs_c[i].value = arr_c[i];
				$color_spans[i].style.background = arr_b[i];
			}
		}
		// float-view (identisch mit oben, aber zusätzlich title-Attribut ändern)
		else{
			for (i = loop_start_pos; i < c_len; i++) {
				$color_inputs_n[i].value = arr_n[i];
				$color_inputs_c[i].value = arr_c[i];
				$color_spans[i].style.background = arr_b[i];
				$color_wrappers[i].title = arr_n[i] === arr_c[i] ? arr_n[i] : arr_n[i]+': '+arr_c[i];
			}
		}

		//document.body.className = ''; // ███ Performance ███

	},

	// store_webview_state █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	store_webview_state = () => {
		vscode.postMessage({ // ███ vscode APi ███
			command: 'store_webview_state',
			mode_current: mode_current,
			c_cid: c_cid,
			filter_open: filter_open, // 0 = nicht geöffnet | 1 = geöffnet
			filter_val: filter_val // leer | string
		})
	},

	// changelog + Help █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	
	// Achtung! Nicht zu einer Funktion zusammenfassen (auch wenn ähnlich)!!! Es kann nämlich sein, dass der User kurz nach einem Update als erstes 
	// die Hilfe anzeigen möchte und dann muss trotzdem noch das neueste Changelog angezeigt werden! (mit z-index daruten / siehe css)
	
	show_changelog = (changelog_html) => {

		const changelog_close = () => {
			document.body.classList.remove('overflow-y-hidden');
			document.body.removeChild($changelog_wrapper);
		},

		$changelog_wrapper = document.createElement('div');

		// Start ---
		$changelog_wrapper.id = 'changelog-wrapper';
		$changelog_wrapper.className = 'info-wrapper';

		// html
		$changelog_wrapper.innerHTML = changelog_html;

		// close top
		$el = document.createElement('p');
		$el.className = 'info-close';
		$el.addEventListener('click', changelog_close, false);
		$changelog_wrapper.appendChild($el);

		// close unten
		$el = document.createElement('p');
		$el.id = 'btn-changelog-close-bottom'; // Text siehe css (pseudo-Text)
		$el.addEventListener('click', changelog_close, false);
		$changelog_wrapper.appendChild($el);


		document.body.classList.add('overflow-y-hidden');

		// append
		document.body.appendChild($changelog_wrapper);

	},
	
	show_help = (help_html) => {

		const help_close = () => {
			document.body.classList.remove('overflow-y-hidden');
			document.body.removeChild($help_wrapper);
		},
		
		div_toggle_click = (e) => {
			const 	$this = e.target,
					toggle_status = $this.toggle_status;	
			$this.className = toggle_status === false ? 'div-toggle show' : 'div-toggle';
			$this.toggle_status = toggle_status === true ? false : true;
		},

		$help_wrapper = document.createElement('div');

		// Start ---
		$help_wrapper.id = 'help-wrapper';
		$help_wrapper.className = 'info-wrapper';

		// html
		$help_wrapper.innerHTML = help_html;
		
		// toggle
		const	$div_toggle = $help_wrapper.getElementsByClassName('div-toggle'),  
				toggle_len = $div_toggle.length;
				
		for (i = 0; i < toggle_len; i++) {
			$div_toggle[i].toggle_status = false; 
			$div_toggle[i].addEventListener('click', div_toggle_click, false);
		}

		// close
		$el = document.createElement('p');
		$el.className = 'info-close';
		$el.addEventListener('click', help_close, false);
		$help_wrapper.appendChild($el);

		document.body.classList.add('overflow-y-hidden');

		// append
		document.body.appendChild($help_wrapper);

	},

	// store_webview_state █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	reset_selection = (reset_selected_class) => {
		if(reset_selected_class === true) for (i = 0; i < sel_len; i++) $color_inp_wrappers[arr_sel_ids[i]].className = '';
		arr_sel_ids = [];
		sel_len = 0;
	},

	// key events █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	doc_keypress = (e) => {

		if (e.ctrlKey === true && e.which === 19){

			// strg + shift + s
			if(e.shiftKey === true){
				if(mode_current !== 'no-palettes') btn_save_click();
			}
			// strg + s
			else{
				vscode.postMessage({ // ███ vscode APi ███
					command: 'save_active_doc'
				})
			}

		}

	},

	doc_keydown = (e) => {
		
		// ctrl
		if (e.ctrlKey === true && ctrl_key === false) {
			$color_wrapper_main.classList.add('multi-select');
			ctrl_key = true;
		}
		
		// shift
		if (e.shiftKey === true && shift_key === false) {
			$color_wrapper_main.classList.add('multi-select');
			shift_key = true;
		}
		
		// Achtung! Wenn man aus dem Webview heraus die Command Palette mit "ctrl + shift + p" aufruft, dann verliert das Webview augenblicklich
		// den Focus und "doc_keyup" wird nicht mehr ausgeführt. Wenn man dann in das Webview zurückkehrt sind die beiden Variablen ctrl_key
		// oder shift_key immer noch true (auch wenn die Tasten dann gar nicht mehr gedrückt werden) und plötzlich wird mit einfachen Mausklicks 
		// eine Mehrfachauswahl gemacht. Daher hier zuerst prüfen ob eine Tastenkombination gedrückt wurde!
		
		// combo: ctrl + beliebige taste
		if(ctrl_key === true && e.key.toLowerCase() !== 'control') ctrl_combo = true; // siehe: colorwrapper_mousedown()

		
	},

	doc_keyup = () => {
		
		ctrl_combo = false;
		
		if(ctrl_key === true) {
			$color_wrapper_main.classList.remove('multi-select');
			ctrl_key = false;
		}
		
		if(shift_key === true) {
			$color_wrapper_main.classList.remove('multi-select');
			shift_key = false;
		}
		
	},

	// wird nur gebunden wenn dynamic scroll aktiv ist
	doc_keydown_dynamic_scroll = (e) => {

		// bei Home und End-Taste wird es bei großen Paletten mit dynamic scroll sehr stockend, und es gibt Probleme beim
		// Ausblenden nicht sichtbarer wrapper (Bild hoch/runter macht aber keine Probleme). Daher das Verhalten simulieren:

		const scroll_to = (direction) =>{

			const n_visible_wrappers = current_visible_wrappers * 3;

			let len = filter_open === 0 ? c_len : filtered_ids_len,
				visible_index_start_mem_new = 0,
				visible_index_end_mem_new = 0,
				p_top = 0,
				p_bottom = 0,
				scroll_to_y = 0;

			// scroll-Listener vorübergehend entfernen wegen scrollto (s.u.)
			window.removeEventListener('scroll', window_dynamic_scroll, false);

			// home
			if(direction === false){
				visible_index_end_mem_new = n_visible_wrappers;
				p_bottom = (len - visible_index_end_mem_new) * color_wrapper_height;
				// visible_index_start_mem_new = 0;
				// p_top = 0;
				// scroll_to_y = 0;
			}
			// end
			else{
				visible_index_start_mem_new = len - n_visible_wrappers;
				visible_index_end_mem_new = len;
				p_top = visible_index_start_mem_new * color_wrapper_height;
				scroll_to_y = document.body.scrollHeight;
				// p_bottom = 0;
			}

			// ohne Filter
			if(filter_open === 0){
				for (i = 0; i < n_visible_wrappers; i++) {
					$color_wrappers[visible_index_start_mem + i].className = 'hide'; // noch aktuelle wrapper ausblenden
					$color_wrappers[visible_index_start_mem_new + i].className = 'color-wrapper'; // neue wrapper einblenden
				}
			}
			// gefiltert
			else{
				for (i = 0; i < n_visible_wrappers; i++) {
					$color_wrappers[arr_filtered_ids[visible_index_start_mem + i]].className = 'hide'; // noch aktuelle wrapper ausblenden
					$color_wrappers[arr_filtered_ids[visible_index_start_mem_new + i]].className = 'color-wrapper'; // neue wrapper einblenden
				}
			}

			visible_index_start_mem = visible_index_start_mem_new;
			visible_index_end_mem = visible_index_end_mem_new;

			$main_wrapper.style.padding = p_top + 'px 0 ' + p_bottom + 'px 0';
			window.scrollTo(0, scroll_to_y);
			window.addEventListener('scroll', window_dynamic_scroll, false); // rebind scroll listener

		};

		// start -----------------------------------------------------------------------------------------------------

		if(e.target.tagName.toLowerCase() !== 'input'){
			if(e.key.toLowerCase() === 'home'){
				e.preventDefault();
				scroll_to(false);
			}
			else if(e.key.toLowerCase() === 'end'){
				e.preventDefault();
				scroll_to(true);
			}
		}


	},

	// reset_current_palette █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	reset_current_palette = () => {

		// grundsätzlich zum Anfang scrollen
		window.scrollTo(0,0);

		// dynamic scroll entfernen?
		if(dynamic_scroll_is_active === true){
			dynamic_scroll_remove();
			scroll_y_pos = 0;
			visible_index_start_mem = 0;
			visible_index_end_mem = current_visible_wrappers * 3;
		}

		arr_n = [];
		arr_c = [];
		arr_b = [];
		c_len = 0;
		c_cid = -1;

		arr_filtered_ids = [];
		filtered_ids_len = 0;

		arr_sel_ids = [];
		sel_len = 0;
		
		$color_wrappers = [];
		$color_spans = [];
		$color_inp_wrappers = [];
		$color_inputs_n = [];
		$color_inputs_c = [];
		
		$color_wrapper_main.innerHTML = '';
		
		// falls neue Palette leer ist, vorrübergehend auf "0 entries" und "a: n" setzen!
		set_statusbar_counter(); 
		set_statusbar_active();

	},

	// create_color_arrays █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	create_color_arrays = (arr_n_c) => {

		window.c_len = arr_n_c !== -1 ? arr_n_c.length : 0; // -1 = Palette leer (siehe extension.js / load_colors())
		window.arr_n = [];
		window.arr_c = [];
		window.arr_b = []; // wird nach erfolgreichem color-check befüllt

		for (i = 0; i < c_len; i++) { // Einfachheit-halber in 2 Arrays aufteilen
			arr_n[i] = arr_n_c[i][0];
			arr_c[i] = arr_n_c[i][1];
		}

		window.arr_n_restore = arr_n.slice();
		window.arr_c_restore = arr_c.slice();
		window.c_len_restore = c_len;

		if(c_cid > c_len - 1) c_cid = -1; // Benutzer hat Farben in der scss von Hand gelöscht

	},

	// create_palette_arrays █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	create_palette_arrays = (arr_p_l_c) => {
		window.arr_p = arr_p_l_c[0];
		window.p_len = arr_p_l_c[1];
		window.p_cid = arr_p_l_c[2];
	},

	// vscode API
	vscode = acquireVsCodeApi();


	// global vars █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

	// dynamic scroll
	var dynamic_scroll_is_active = false,
		color_wrapper_height = 0,
		current_visible_wrappers = 0,
		color_wrapper_height = 0,
		visible_index_start_mem = 0,
		visible_index_end_mem = 0,
		scroll_y_pos = -1, // init: nicht 0 / siehe dynamic_scroll()

		controls_height = 0,
		context_height = 0,
		context_width = 0,
		arr_filtered_ids = [],
		filtered_ids_len = 0,
		was_filtered = false,
		pm_open = false, // status palette manager
		$el = null, // dummy zur Wiederverwertung beim Erstellen von mehreren Elementen, die keine ID oder Klasse benötigen

		ctrl_key = false,
		shift_key = false,
		ctrl_combo = false,

		arr_sel_ids = [],
		sel_len = 0,
		
		// color wrapper clicks
		current_ani_id = -1,
		prevent_inp_focusin = false,
		context_is_open = false,
		
		// drag
		$el_drag = null,
		$el_hover = null,
		drag_id = 0,
		hover_id = 0,		

		i = 0,

		init = true; // ███ Init = true ███


	// Start █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████


	window.addEventListener('message', e => {
		const msg = e.data;

		switch (msg.command) {

			case 'init':

				const init_color_manager = () => {

					// _settings.ini -> arr_settings = [mode_current, c_cid, filter_open, filter_val] ... scss-Pfad wird in extension.js aus Array entfernt, da hier nicht benötigt
					const arr_settings = msg.arr_settings;

					// def globals

					window.mode_current = arr_settings[0]; // insert-listview | insert-floatview | edit | edit-sort | edit-convert | no-palettes
					window.sort_mode = mode_current === 'edit-sort' ? true : false;
					window.convert_mode = mode_current === 'edit-convert' ? true : false;
					window.c_cid = arr_settings[1];  // -1 | id
					window.filter_open = arr_settings[2]; // 0 = geschlossen | 1 = geöffnet
					window.filter_val = arr_settings[3]; // leer | string

					// Picker Status ? (abhängig davon welche Extension aufgerufen wurde - siehe extension.js)
					window.picker_mode = msg.picker_mode; // 0 = nicht geöffnet | 1 = ext_picker | 2 = ext_open_picker_sel
					window.picker_color = msg.picker_color; // false | Farbwert-String

					// Keine case-intensitive Suche nach Objekt-Schlüsseln möglich, daher zusätzliches Objekt 'window.obj_css_colornames_lowercase'
					window.obj_css_colors_lowercase = {};
					const obj_keys = Object.getOwnPropertyNames(obj_css_colors);
					for (i = 0; i < 149; i++) obj_css_colors_lowercase[obj_keys[i].toLowerCase()] = obj_css_colors[obj_keys[i]]; // 147 + 1: zusätzlich 'transparent' eingefügt (s.o)

					// create arrays  -----------------------------------------

					create_palette_arrays(msg.arr_p_l_c);
					create_color_arrays(msg.arr_n_c);

					// html erzeugen -----------------------------------------

					create_controls();

					// color wrapper erzeugen (vorher dummy für gradient-check erzeugen, da bei 'create_color_wrappers()' benötigt)
					window.$check_gradient_dummy = document.createElement('div'); // siehe check_gradient()
					document.body.appendChild($check_gradient_dummy); // ███ document position 1 ███ sofort hinzufügen, da bei 'create_color_wrappers()' benötigt
					create_color_wrappers(0, c_len);

					$main_wrapper.className = mode_current; // wurde unter 'create_controls()' erstellt
					document.body.appendChild($main_wrapper);

					// Picker öffnen ?
					if(picker_mode !== 0) open_picker(picker_color);

					// sichtbar -----------------------------------------

					window.statusbar_height = $sb_counter.clientHeight; // siehe set_context_click_area();

					// gefiltert oder dynamic scroll nötig ? Unter "create_controls()" haben bei Filterung oder entsprechender c_len erstmal
					// alle wrapper die hide-Klasse erhalten / hätte man dort schon berücksichtigen können aber das würde die Funktion zu
					// unübersichtlich machen

					if(c_len !== 0){ // c_len = 0: Palette leer

						// filter
						if(filter_open === 1){
							filter_open = 0; // kurzzeitig auf 0 setzen -> wird unter toggle_filter() getoggelt (also wieder auf 1 gesetzt)
							if(filter_val !== '') $filter_input.value = filter_val;
							toggle_filter(false); // -> █ set_controls_height() █    refresh_color_wrappers = false (beim Öffnen des Filter sowieso egal / wird nur beim Schließen berücksichtigt)
							if (mode_current !== 'insert-floatview' && c_len > dynamic_scroll_limit) dynamic_scroll_get_values();
							filter_colors(); // entfernt hide-Klassen aus "create_controls()" (siehe Erklärung oben)
						}
						// kein filter
						else{
							set_controls_height(); // █ set_controls_height() █
							// dynamic scroll aktivieren?
							if (mode_current !== 'insert-floatview' && c_len > dynamic_scroll_limit) init_dynamic_scroll(); // entfernt hide-Klassen aus "create_controls()" (siehe Erklärung oben)
						}

					}
					else{
						set_controls_height(); // █ set_controls_height() █
					}

					set_context_click_area(); 

					window.addEventListener("resize", window_resize_end, false);

					document.addEventListener('keydown', doc_keydown, false);
					document.addEventListener('keyup', doc_keyup, false);
					document.addEventListener('keypress', doc_keypress, false);

					init = false; // ███ Init = false ███

					// Changelog anzeigen?
					if (msg.changelog_html !== false) show_changelog(msg.changelog_html);
					
					// Hilfe anzeigen?
					if (msg.help_html !== false) show_help(msg.help_html);
	

				},


				// ---------------------------------------------------------------------------------------------------------

				// Achtung!!! Hin- und wieder kommt es vor dass beim Öffnen die Fensterhöhe nicht korrekt abgemessen wird (bzw. 0 ist), daher selbstauafrufende Funktion
				// die sich maximal 1 Sekunde lang selbst aufruft um die Fensterhöhe zu ermitteln

				get_window_dimensions = () => {

					window.window_height = window.innerHeight;
					window.window_width = window.innerWidth;

					if(window_height < 1 && get_dim_attempts < 100){
						setTimeout(() => {
							get_dim_attempts++;
							get_window_dimensions();
						}, 10);
					}
					else{
						init_color_manager();
					}

				};

				let get_dim_attempts = 0;


				// Start
				get_window_dimensions();


				break;

			// _________________________________________________________________________________________________________________________________
			case 'refresh':

				reset_current_palette();
				create_color_arrays(msg.arr_n_c);

				if(c_len > 0){

					create_color_wrappers(0, c_len);
					
					// gefiltert
					if(filter_open === 1){
						filter_colors(); // aktiviert selbstständig dynamic scroll wenn nötig!
					}
					// nicht gefiltert
					else{ 
						if(mode_current !== 'insert-floatview' && c_len > dynamic_scroll_limit) init_dynamic_scroll(); // list-view dynamic scroll aktivieren?
					}

				}

				break;

			// _________________________________________________________________________________________________________________________________
			case 'add_palette_success':

				create_palette_arrays(msg.arr_p_l_c); // sortierte Paletten aktualisierte p_cid reinitialisieren (siehe extension.js)

				// Paletten Manager aktualisieren
				pm_create_listwrappers(p_len-1, p_len, true); // einzelnen Wrapper am Ende hinzufügen, reorder = true
				$dropdown_input.value = arr_p[p_cid];

				// add | save as ?
				if(msg.arr_return !== false){ // add: neu erstellte Palette laden

					if(mode_current === 'no-palettes'){
						mode_current = 'edit';
						document.body.className = mode_current;
					}

					// aktuell noch gefiltert? (dynamic scroll wird unter "reset_current_palette()" deaktiviert)
					if(filter_open === 1) toggle_filter(false); // refresh_color_wrappers = false (werden unter 'reset_current_palette()' sowieso gelöscht)

					reset_current_palette();
					create_color_arrays(msg.arr_return);
					create_color_wrappers(0,c_len);

					if(mode_current !== 'insert-floatview' && c_len > dynamic_scroll_limit) init_dynamic_scroll();
				}

				break;
			// _________________________________________________________________________________________________________________________________
			case 'save_palette_success':
				arr_n_restore = arr_n.slice(); // restore arrays aktualisieren !
				arr_c_restore = arr_c.slice();
				c_len_restore = c_len;
				break;
			// _________________________________________________________________________________________________________________________________
			case 'rename_palette_success':
				create_palette_arrays(msg.arr_p_l_c); // sortierte Paletten und ggf. aktualisierte p_cid reinitialisieren (siehe extension.js)
				$dropdown_input.value = arr_p[p_cid];
				break;
			// _________________________________________________________________________________________________________________________________
			case 'delete_palette_success':

				const refresh_palettes = () => {
					arr_p.splice(pm_remove_list_wrapper_id, 1);
					p_len--;
					for (i = 0; i < p_len; i++) $pm_list_wrappers[i].t_id = i; // wrapper-id's aktualisieren (t_id = this id)
				};

				$pm_list_wrapper_main.removeChild($pm_list_wrappers[pm_remove_list_wrapper_id]);
				$pm_list_wrappers.splice(pm_remove_list_wrapper_id, 1);
				pm_remove_list_wrapper_id = -1; // Ordnung halber

				// █ return: true █ -> eine andere Palette als die aktuell Geladene wurde gelöscht
				if(msg.arr_n_c === true){
					refresh_palettes();
				}
				// aktuelle palette wurde gelöscht
				else{

					// aktuell noch gefiltert? (dynamic scroll wird unter "reset_current_palette()" deaktiviert)
					if(filter_open === 1) toggle_filter(false); // refresh_color_wrappers = false (werden unter 'reset_current_palette()' sowieso gelöscht)

					// █ return: -2 █ -> keine Palette übrig / Verzeichnis leer (siehe extension.js)
					if(msg.arr_n_c === -2){
						arr_p = [];
						p_cid = -1;
						p_len = 0;
						reset_current_palette();
						$dropdown_input.value = '';
						mode_current = 'no-palettes';
						document.body.className = mode_current;
					}
					// █ return: array || -1 █ -> erste Palette im Verzeichnis wurde geladen (-1: erste Palette ist leer)
					else{

						refresh_palettes();

						// aktuelle Palette wurde gelöscht, dafür wurde die erste Palette im Verzeichnis geladen
						p_cid = 0;

						reset_current_palette();

						// █ return: array █
						if(msg.arr_n_c !== -1){
							create_color_arrays(msg.arr_n_c);
							create_color_wrappers(0,c_len);
							if(mode_current !== 'insert-floatview' && c_len > dynamic_scroll_limit) init_dynamic_scroll();
							$dropdown_input.value = arr_p[p_cid];
						}

					}

				}

				break;

			// _________________________________________________________________________________________________________________________________
			case 'ext_open_picker':
				open_picker_external(1, msg.picker_color);
				break;

			// _________________________________________________________________________________________________________________________________
			case 'ext_find_colors_in_selection':

				const add_len = msg.arr_add.length;

				dialogbox('Add '+add_len+' colors?', true, confirm => {
					if (confirm === true) add_colors(msg.arr_add, msg.arr_add, c_cid, true);
				});

				break;
				
			// _________________________________________________________________________________________________________________________________
			case 'ext_changelog':
				show_changelog(msg.changelog_html);
				break;
			// _________________________________________________________________________________________________________________________________
			case 'ext_help':
				show_help(msg.help_html);
				break;

		}
	});

}())
