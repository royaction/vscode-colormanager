(() => {

	'use strict';

	/*
	TODO: Falls es irgendwann mal ein webview blur event geben sollte, dann die Krücke für ctrl-combos unter doc_keydown() und colorwrapper_mousedown() entfernen
	und in dem Fall per vscode api eine message an das webview senden und ctrl_key + shift_key auf false setzen und die "multiselect"-Klasse vom main wrapper entfernen
	(genaue Problembeschreibung siehe doc_keydown)
	*/

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
	hex_to_rgba = (hex, return_str) => { // true = return string, false = return array

		if(hex.length === 4) hex = convert_short_hex(hex, 36); // type: 36 = #fff -> #ffffff | 48 = #fff3 -> #ffffff33 | 63 = #ffffff -> #fff | 84 = #ffffff33 -> #fff3
		else if(hex.length === 5) hex = convert_short_hex(hex, 48); // type: 36 = #fff -> #ffffff | 48 = #fff3 -> #ffffff33 | 63 = #ffffff -> #fff | 84 = #ffffff33 -> #fff3

		const 	r = parseInt(hex.substring(1, 3), 16),
				g = parseInt(hex.substring(3, 5), 16),
				b = parseInt(hex.substring(5, 7), 16);

		let a = false;

		// alpha?
		if(hex.length === 9) a = hex_get_alpha(hex);

		// string
		if(return_str === true){
			return a === false ? 'rgb('+r+', '+g+', '+b+')' : 'rgba('+r+', '+g+', '+b+', '+a+')';
		}
		// array
		else{
			return a === false ? [r,g,b] : [r,g,b,a];
		}

	},

	// _______________________________________________________________________________________________________________________________________________

	hex_get_alpha = (hex) => {
		// Info! Momentan nur Übergabe von HEX6a möglich! Da alpha-Transparenzen bei shorthex aus nur einem Zeichen besteht sind keine 2-stelligen
		// alpha-Transparenzen möglich! (bei allen UI-Funktionen sind aber 2-stellige alpha-Transparenzen möglich)
		return parseFloat((parseInt(hex.slice(-2), 16) / 255).toFixed(2));
	},

	// _______________________________________________________________________________________________________________________________________________

	hex_add_alpha = (hex, alpha) => { // genauer als Umwandlung von hex in hsla und Rückwandlung in hexa!
		return alpha === 0 ? hex + '00' : hex + (Math.round(Math.min(Math.max(alpha || 1, 0), 1) * 255)).toString(16);
	},

	// css color <> hex _______________________________________________________________________________________________________________________________________________

	css_to_hex = (key) => {

		return{
		'aliceblue':'#f0f8ff', 'antiquewhite':'#faebd7', 'aqua':'#00ffff', 'aquamarine':'#7fffd4', 'azure':'#f0ffff', 'beige':'#f5f5dc',
		'bisque':'#ffe4c4', 'black':'#000000', 'blanchedalmond':'#ffebcd', 'blue':'#0000ff', 'blueviolet':'#8a2be2', 'brown':'#a52a2a',
		'burlywood':'#deb887', 'cadetblue':'#5f9ea0', 'chartreuse':'#7fff00', 'chocolate':'#d2691e', 'coral':'#ff7f50', 'cornflowerblue':'#6495ed',
		'cornsilk':'#fff8dc', 'crimson':'#dc143c', 'cyan':'#00ffff', 'darkblue':'#00008b', 'darkcyan':'#008b8b', 'darkgoldenrod':'#b8860b',
		'darkgray':'#a9a9a9', 'darkgrey':'#a9a9a9', 'darkgreen':'#006400', 'darkkhaki':'#bdb76b', 'darkmagenta':'#8b008b', 'darkolivegreen':'#556b2f',
		'darkorange':'#ff8c00', 'darkorchid':'#9932cc', 'darkred':'#8b0000', 'darksalmon':'#e9967a', 'darkseagreen':'#8fbc8f', 'darkslateblue':'#483d8b',
		'darkslategray':'#2f4f4f', 'darkslategrey':'#2f4f4f', 'darkturquoise':'#00ced1', 'darkviolet':'#9400d3', 'deeppink':'#ff1493',
		'deepskyblue':'#00bfff', 'dimgray':'#696969', 'dimgrey':'#696969', 'dodgerblue':'#1e90ff', 'firebrick':'#b22222', 'floralwhite':'#fffaf0',
		'forestgreen':'#228b22', 'fuchsia':'#ff00ff', 'gainsboro':'#dcdcdc', 'ghostwhite':'#f8f8ff', 'gold':'#ffd700', 'goldenrod':'#daa520',
		'gray':'#808080', 'grey':'#808080', 'green':'#008000', 'greenyellow':'#adff2f', 'honeydew':'#f0fff0', 'hotpink':'#ff69b4', 'indianred':'#cd5c5c',
		'indigo':'#4b0082', 'ivory':'#fffff0', 'khaki':'#f0e68c', 'lavender':'#e6e6fa', 'lavenderblush':'#fff0f5', 'lawngreen':'#7cfc00',
		'lemonchiffon':'#fffacd', 'lightblue':'#add8e6', 'lightcoral':'#f08080', 'lightcyan':'#e0ffff', 'lightgoldenrodyellow':'#fafad2',
		'lightgray':'#d3d3d3', 'lightgrey':'#d3d3d3', 'lightgreen':'#90ee90', 'lightpink':'#ffb6c1', 'lightsalmon':'#ffa07a', 'lightseagreen':'#20b2aa',
		'lightskyblue':'#87cefa', 'lightslategray':'#778899', 'lightslategrey':'#778899', 'lightsteelblue':'#b0c4de', 'lightyellow':'#ffffe0',
		'lime':'#00ff00', 'limegreen':'#32cd32', 'linen':'#faf0e6', 'magenta':'#ff00ff', 'maroon':'#800000', 'mediumaquamarine':'#66cdaa',
		'mediumblue':'#0000cd', 'mediumorchid':'#ba55d3', 'mediumpurple':'#9370d8', 'mediumseagreen':'#3cb371', 'mediumslateblue':'#7b68ee',
		'mediumspringgreen':'#00fa9a', 'mediumturquoise':'#48d1cc', 'mediumvioletred':'#c71585', 'midnightblue':'#191970', 'mintcream':'#f5fffa',
		'mistyrose':'#ffe4e1', 'moccasin':'#ffe4b5', 'navajowhite':'#ffdead', 'navy':'#000080', 'oldlace':'#fdf5e6', 'olive':'#808000',
		'olivedrab':'#6b8e23', 'orange':'#ffa500', 'orangered':'#ff4500', 'orchid':'#da70d6', 'palegoldenrod':'#eee8aa', 'palegreen':'#98fb98',
		'paleturquoise':'#afeeee', 'palevioletred':'#d87093', 'papayawhip':'#ffefd5', 'peachpuff':'#ffdab9', 'peru':'#cd853f', 'pink':'#ffc0cb',
		'plum':'#dda0dd', 'powderblue':'#b0e0e6', 'purple':'#800080', 'rebeccapurple':'#663399', 'red':'#ff0000', 'rosybrown':'#bc8f8f',
		'royalblue':'#4169e1', 'saddlebrown':'#8b4513', 'salmon':'#fa8072', 'sandybrown':'#f4a460', 'seagreen':'#2e8b57', 'seashell':'#fff5ee',
		'sienna':'#a0522d', 'silver':'#c0c0c0', 'skyblue':'#87ceeb', 'slateblue':'#6a5acd', 'slategray':'#708090', 'slategrey':'#708090',
		'snow':'#fffafa', 'springgreen':'#00ff7f', 'steelblue':'#4682b4', 'tan':'#d2b48c', 'teal':'#008080', 'thistle':'#d8bfd8', 'tomato':'#ff6347',
		'turquoise':'#40e0d0', 'violet':'#ee82ee', 'wheat':'#f5deb3', 'white':'#ffffff', 'whitesmoke':'#f5f5f5', 'yellow':'#ffff00',
		'yellowgreen':'#9acd32', 'transparent':'transparent'
		}[key.toLowerCase()];

	},

	// _______________________________________________________________________________________________________________________________________________
	short_hex_possible = (hex) => {
		if(hex[1] === hex[2] && hex[3] === hex[4] && hex[5] === hex[6]){
			if(hex.length === 7){
				return 63; // HEX6 -> HEX3
			}
			else{ // len = 9 HEX6a
				if(hex[7] === hex[8]) return 84; // HEX6a -> HEX3a
			}
		}
		return false;
	},

	convert_short_hex = (hex, type) => { // type: 36 = #fff -> #ffffff | 48 = #fff3 -> #ffffff33 | 63 = #ffffff -> #fff | 84 = #ffffff33 -> #fff3
		if(type === 36) 	 return '#' + hex[1].repeat(2) + hex[2].repeat(2) + hex[3].repeat(2);
		else if(type === 48) return '#' + hex[1].repeat(2) + hex[2].repeat(2) + hex[3].repeat(2) + hex[4].repeat(2);
		else if(type === 63) return '#' + hex[1] + hex[3] + hex[5];
		else if(type === 84) return '#' + hex[1] + hex[3] + hex[5] + hex[7];
	},


	// check color _______________________________________________________________________________________________________________________________________________

	// return: false | 1 = HEX6 | 2 = HEX6a | 3 = HEX3 | 4 = HEX3a | 5 = rgb | 6 = rgba | 7 = hsl | 8 = hsla | 9 = css color | 10 = gradient

	check_colors = (str) => { // Werte kommen immer getrimmt an (siehe inputs: keydown, fosusout)

		str = str.toLowerCase(); // regex weniger aufwendig

		// hex3|6(a): 1 - 4 -----------------------------------------------------------------
		if(str[0] === '#'){

			if(str.match(/^#[0-9a-f]+$/) === null){
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
		else if(str.substr(0,2) === 'rg'){ // nicht einfach nur "r", da "repeating-linear-gradient" auch mit "r" beginnt

			str = str.replace(/\s/g, ''); // Leerzeichen raus dafür regex weniger aufwendig

			if(str.substr(3,1) === 'a'){ // rgba: 6
				return str.match(/^rgba\((0|255|25[0-4]|2[0-4]\d|1\d\d|0?\d?\d),(0|255|25[0-4]|2[0-4]\d|1\d\d|0?\d?\d),(0|255|25[0-4]|2[0-4]\d|1\d\d|0?\d?\d),(0|1|0?\.?\d*?)\)$/) === null ? false : 6;
			}
			else{ // rgb: 5
				return str.match(/^rgb\((0|255|25[0-4]|2[0-4]\d|1\d\d|0?\d?\d),(0|255|25[0-4]|2[0-4]\d|1\d\d|0?\d?\d),(0|255|25[0-4]|2[0-4]\d|1\d\d|0?\d?\d)\)$/) === null ? false : 5;
			}

		}
		// hsl: 7 | hsla: 8 -----------------------------------------------------------------
		else if(str.substr(0,2) === 'hs'){

			str = str.replace(/\s/g, ''); // Leerzeichen raus dafür regex weniger aufwendig

			if(str.substr(3,1) === 'a'){ // hsla: 8
				return str.match(/^hsla\((0|360|35\d|3[0-4]\d|[12]\d\d|0?\d?\d),(0|100|\d{1,2})%,(0|100|\d{1,2})%,(0|1|0?\.?\d*?)\)$/) === null ? false : 8;
			}
			else{ // hsl: 7
				return str.match(/^hsl\((0|360|35\d|3[0-4]\d|[12]\d\d|0?\d?\d),(0|100|\d{1,2})%,(0|100|\d{1,2})%\)$/) === null ? false : 7;
			}

		}
		else{

			// gradient: 10 -----------------------------------------------------------------
			if(str.indexOf('gradient') !== -1){

				let ret = false;

				// umfangreiche RegEx-Tests zu aufwendig, daher nur einfacher Test und dann einem dummy den übergebenen Wert als Hintergrund zuweisen
				// und mit get_computed_style überprüfen, ob computed style "gradient" zurückliefert
				if(str.match(/.*gradient\s*\(((?:\([^\)]*\)|[^\)\(]*)*)\)/) !== null){

					// gradient dummy erzeugen
					if(check_gradient_created === false){
						check_gradient_created = true;
						$check_gradient_dummy = document.createElement('div');
						document.body.appendChild($check_gradient_dummy);
					}

					// style-property setzen
					$check_gradient_dummy.style.background = str;

					// style-property prüfen: wenn der gradient ungültig ist hat er eine Länge von 0, ansonsten hat er die Länge von "str"
					ret = $check_gradient_dummy.style['background'].length > 0 ? 10 : false;

					// reset wichtig!
					$check_gradient_dummy.style.background = '';

				}

				return ret;

			}
			// !!! Alle vorherigen Tests fehlgeschlagen: entweder CSS Farbe (9) oder false -----------------------------------------------------------------
			else{

				return [
				'aliceblue','antiquewhite','aqua','aquamarine','azure','beige','bisque','black','blanchedalmond','blue','blueviolet','brown','burlywood', 'cadetblue',
				'chartreuse','chocolate','coral','cornflowerblue','cornsilk','crimson','cyan','darkblue','darkcyan','darkgoldenrod','darkgray','darkgrey','darkgreen',
				'darkkhaki','darkmagenta','darkolivegreen','darkorange','darkorchid','darkred','darksalmon','darkseagreen','darkslateblue','darkslategray',
				'darkslategrey','darkturquoise','darkviolet','deeppink','deepskyblue','dimgray','dimgrey','dodgerblue','firebrick','floralwhite','forestgreen','fuchsia',
				'gainsboro','ghostwhite','gold','goldenrod','gray','grey','green','greenyellow','honeydew','hotpink','indianred','indigo','ivory','khaki','lavender',
				'lavenderblush','lawngreen','lemonchiffon','lightblue','lightcoral','lightcyan','lightgoldenrodyellow','lightgray','lightgrey','lightgreen','lightpink',
				'lightsalmon','lightseagreen','lightskyblue','lightslategray','lightslategrey','lightsteelblue','lightyellow','lime','limegreen','linen','magenta',
				'maroon','mediumaquamarine','mediumblue','mediumorchid','mediumpurple','mediumseagreen','mediumslateblue','mediumspringgreen','mediumturquoise',
				'mediumvioletred','midnightblue','mintcream','mistyrose','moccasin','navajowhite','navy','oldlace','olive','olivedrab','orange','orangered','orchid',
				'palegoldenrod','palegreen','paleturquoise','palevioletred','papayawhip','peachpuff','peru','pink','plum','powderblue','purple','rebeccapurple','red',
				'rosybrown','royalblue','saddlebrown','salmon','sandybrown','seagreen','seashell','sienna','silver','skyblue','slateblue','slategray','slategrey','snow',
				'springgreen','steelblue','tan','teal','thistle','tomato','turquoise','violet','wheat','white','whitesmoke','yellow','yellowgreen', 'transparent'
				].indexOf(str) === -1 ? false : 9;
			}

		}

	},

	// _______________________________________________________________________________________________________________________________________________
	get_color_metrics = (str_color) => {

		// Wird verwendet von "open_picker()" und "colorwrapper_switch_click()" verwendet.

		// "csys" + "arr_hsla" und ggf. "css_hex_init" zurückgeben!

		let csys = check_colors(str_color), // false | 1 = HEX6 | 2 = HEX6a | 3 = HEX3 | 4 = HEX3a | 5 = rgb | 6 = rgba | 7 = hsl | 8 = hsla | 9 = css color | 10 = gradient
			arr_hsla = [],
			css_hex_init = '';

		// gradient
		if(csys !== false) {

			if(csys === 10){
				csys = false; // 10 -> false
			}
			else{

				picker_color = str_color;

				// hex(a)
				if(csys >= 1 && csys <= 4){

					// HEX3 HEX3a ?
					if(csys === 3) str_color = convert_short_hex(str_color, 36); // type: 36 = #fff -> #ffffff | 48 = #fff3 -> #ffffff33 | 63 = #ffffff -> #fff | 84 = #ffffff33 -> #fff3
					else if(csys === 4) str_color = convert_short_hex(str_color, 48); // type: 36 = #fff -> #ffffff | 48 = #fff3 -> #ffffff33 | 63 = #ffffff -> #fff | 84 = #ffffff33 -> #fff3

					// HEX -> HSL
					arr_hsla = rgba_to_hsla( hex_to_rgba(str_color, false) ); // hex_to_rgba: true = return string, false = return array

					// picker_color mit alpha 1 ergänzen, wenn HEX keinen alpha-Wert hatte
					if(csys === 1 || csys === 3) arr_hsla[3] = 1; // alpha 1

				}
				// rgb(a)
				else if(csys === 5 || csys === 6){
					arr_hsla = rgba_to_hsla( str_rgba_hsla_to_arr(str_color) );
					if(csys === 5) arr_hsla[3] = 1; // alpha 1
				}
				// hsl(a)
				else if(csys === 7 || csys === 8){
					arr_hsla = str_rgba_hsla_to_arr(str_color);
					if(csys === 7) arr_hsla[3] = 1; // alpha 1
				}
				// css color
				else if(csys === 9){

					if(str_color.toLowerCase() === 'transparent'){
						css_hex_init = '#000000'; // █ █ █ init-vars setzen █ █ █ für Vergleiche unter "picker_set_color_str()"
						arr_hsla = [0,0,0,0];
					}
					else{
						css_hex_init = css_to_hex(str_color); // █ █ █ init-vars setzen █ █ █ für Vergleiche unter "picker_set_color_str()"
						arr_hsla = rgba_to_hsla(hex_to_rgba( css_hex_init, false ), false); // true = return string, false = return array
						arr_hsla[3] = 1;// alpha 1
					}

				}

			}

		}

		return [csys, arr_hsla, css_hex_init];

	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	open_picker = (p_color, p_color_init) => { // p_color_init = undefined || str

		// hsla > control positions _______________________________________________________________________________________________________________________________________________

		const picker_hsla_to_control_positions = ([h,s,l,a]) => {

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

			hue_pointer_y = Math.max( Math.min( (e.pageY - hue_slider_top), hue_slider_height ), 0);
			$hue_pointer.style.transform = 'translate(-'+(hue_pointer_width/2)+'px, '+ parseInt(hue_pointer_y - (hue_pointer_width/2) )+'px)';
			arr_hsla[0] = Math.round( hue_pointer_y / hue_slider_height * 360 ); // ███ h ███

			// bg styles
			$alpha_slider.style.background = 'linear-gradient(to bottom, hsl('+arr_hsla[0]+','+arr_hsla[1]+'%,'+arr_hsla[2]+'%)'+', transparent)';
			$sat_rect.style.background = 'hsl('+arr_hsla[0]+', 100%, 50%)';
			$sat_pointer.style.background = 'hsl('+arr_hsla[0]+','+arr_hsla[1]+'%,'+arr_hsla[2]+'%)';
			$hue_pointer.style.background = 'hsl('+arr_hsla[0]+', 100%, 50%)';
			$picker_preview_new.style.background = 'hsla('+arr_hsla[0]+','+ arr_hsla[1]+'%,'+ arr_hsla[2]+'%,'+arr_hsla[3]+')';

			$picker_controls_info.textContent = arr_hsla[0];

			picker_set_color_str();

		},

		picker_mousemove_sat_rect = (e) => {

			sat_pointer_x = Math.max( Math.min( (e.pageX - sat_rect_left), sat_rect_width), 0);
			sat_pointer_y = Math.max( Math.min( (e.pageY - sat_rect_top), sat_rect_height), 0);
			arr_hsla[1] = Math.round(sat_pointer_x / sat_rect_width * 100);	// ███ s ███
			arr_hsla[2] = Math.round(100 - (sat_pointer_y / sat_rect_height * 100)); // ███ l ███
			$sat_pointer.style.transform = 'translate('+(sat_pointer_x - (sat_pointer_width/2))+'px ,'+(sat_pointer_y - (sat_pointer_width/2) )+'px)';

			// bg styles
			$alpha_slider.style.background = 'linear-gradient(to bottom, hsl('+arr_hsla[0]+','+arr_hsla[1]+'%,'+arr_hsla[2]+'%)'+', transparent)';
			$sat_pointer.style.background = 'hsl('+arr_hsla[0]+','+arr_hsla[1]+'%,'+arr_hsla[2]+'%)';
			$picker_preview_new.style.background = 'hsla('+arr_hsla[0]+','+ arr_hsla[1]+'%,'+ arr_hsla[2]+'%,'+arr_hsla[3]+')';

			$picker_controls_info.textContent = arr_hsla[1]+','+arr_hsla[2];

			picker_set_color_str();

		},

		picker_mousemove_alpha_slider = (e) =>  {

			alpha_pointer_y = Math.max(Math.min((e.pageY - alpha_slider_top), alpha_slider_height), 0);
			arr_hsla[3] = parseFloat((1 - (alpha_pointer_y / alpha_slider_height)).toFixed(2)); // ███ a ███
			$alpha_pointer.style.transform = 'translate(-'+(alpha_pointer_width/2)+'px, '+ parseInt(alpha_pointer_y - (alpha_pointer_width/2) )+'px)';

			// bg styles
			$picker_preview_new.style.background = 'hsla('+arr_hsla[0]+','+ arr_hsla[1]+'%,'+ arr_hsla[2]+'%,'+arr_hsla[3]+')';

			$picker_controls_info.textContent = arr_hsla[3];

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
		picker_doc_mousemove_alpha = (e) => picker_mousemove_alpha_slider(e),
		picker_doc_mousemove_sat =   (e) => picker_mousemove_sat_rect(e),
		picker_doc_mousemove_hue =   (e) => picker_mousemove_hue_slider(e),

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



			picker_color = p_color; // "p_color" wird unter "picker_set_color_str()" aktualisiert
			store_settings(); // "picker_color" speichern (wurde unter "picker_set_color_str()" aktualisiert)

		},
		// _______________________________________________________________________________________________________________________________________________
		picker_set_color_str = () => {

			// arr_hsla in aktuelles Farbsystem umwandeln und den Wert neben dem convert-Button anzeigen

			// p_csys: 1 = HEX6 | 2 = HEX6a | 3 = HEX3 | 4 = HEX3a | 5 = rgb | 6 = rgba | 7 = hsl | 8 = hsla | 9 = css color | 10 = gradient

			// [h,s,l]  ||  [h,s,l,a]  ?
			const arr_hsl_or_hsla = arr_hsla[3] < 1 ? arr_hsla : [arr_hsla[0], arr_hsla[1], arr_hsla[2]];


			// p_color_is_invalid zurücksetzen? Spätestens jetzt hat User eines der 3 Controls bewegt und damit ist "INVALID COLOR VALUE" nicht mehr gültig!
			if(p_color_is_invalid === true) p_color_is_invalid = false;


			// aktuelles Farbsystem ist rgb(a) --------------------------------------------------------------------------------------
			if(p_csys === 5 || p_csys === 6) {
				p_color = arr_rgba_hsla_to_str(hsla_to_rgba(arr_hsl_or_hsla), 'rgb'); // c_sys = 'rgb' || 'hsl'
			}
			// aktuelles Farbsystem ist hsl(a) --------------------------------------------------------------------------------------
			else if(p_csys === 7 || p_csys === 8) {
				p_color = arr_rgba_hsla_to_str(arr_hsl_or_hsla, 'hsl'); // c_sys = 'rgb' || 'hsl'
			}
			// aktuelles Farbsystem ist hex oder css --------------------------------------------------------------------------------------
			else{


				// Wenn der Hex noch immer auf dem Ausgangswert ist, dann alpha-Transparenz an Ausgangswert anhängen, da bessere
				// Präzision als Umwandlung von hex in hsla und Rückumwandlung

				let convert_arr_hsla_to_hex = false;

				// Ausgangswert war rgb(a) oder hsl(a)
				if(p_csys_init > 4 && p_csys_init < 9) {
					convert_arr_hsla_to_hex = true;
				}
				// Ausgangswert war hex|css ...
				else{

					// ... aber hex|css hat sich geändert (sat-rect oder hue-slider wurden bewegt)
					if( arr_hsla[0] !== arr_hsla_init[0] || arr_hsla[1] !== arr_hsla_init[1] || arr_hsla[2] !== arr_hsla_init[2]) {
						convert_arr_hsla_to_hex = true;
					}
					// ... und hex|css ist noch immer auf Ausgangswert, NUR alpha ist anders!
					else{

						//  Ausgangsfarbe war HEX6 || HEX6a
						if(p_csys_init === 1 || p_csys_init === 2){

							p_color = p_color_init.substr(0,7); // bei HEX6a, die ursprüngliche Transparenz vorerst abschneiden (HEX6 bleibt so)

							// ist aktuell eine Transparenz vorhanden?
							if(arr_hsla[3] < 1){
								p_color = hex_add_alpha(p_color, arr_hsla[3]); // da alpha bei shorthex aus nur einem Zeichen besteht sind keine 2-stelligen alpha-Transparenzen möglich (daher Umwandung in normalen Hex)
							}

						}
						//  Ausgangsfarbe war HEX3 || HEX3a
						else if(p_csys_init === 3 || p_csys_init === 4) {

							p_color = p_color_init.substr(0,4); // bei HEX3a, die ursprüngliche Transparenz vorerst abschneiden (HEX3 bleibt so)

							// ist aktuell eine Transparenz vorhanden?
							if(arr_hsla[3] < 1){
								// da alpha bei shorthex aus nur einem Zeichen besteht sind keine 2-stelligen alpha-Transparenzen möglich (daher Umwandung in normalen Hex)
								p_color = hex_add_alpha( convert_short_hex(p_color, 36), arr_hsla[3] );
							}

						}
						//  Ausgangsfarbe war CSS
						else if(p_csys_init === 9) {

							// aktuell ist keine Transparenz vorhanden
							if(arr_hsla[3] === 1){

								// aktuelles Farbsystem ist CSS
								if(p_csys === 9){

									// Sonderfall: Ausgangswert war "transparent"
									if(p_color_init.toLowerCase() === 'transparent'){
										p_color = css_hex_init; // wenn alpha-Slider ganz oben, "#000000" anzeigen!
									}
									// Zurücksetzen auf CSS-Namen
									else{
										p_color = p_color_init;
									}

								}
								// aktuelles Farbsystem ist HEX6 || HEX6a
								else if(p_csys === 1 || p_csys === 2){
									p_color = css_hex_init; // Zurücksetzen auf HEX6-Wert des CSS-Namens
								}
								// aktuelles Farbsystem ist HEX3 || HEX3a
								else if(p_csys === 3 || p_csys === 4){
									p_color = convert_short_hex(css_hex_init, 63); // Zurücksetzen auf HEX3-Wert des CSS-Namens
								}


							}
							// Transparenz ist vorhanden
							else{

								// Sonderfall: Ausgangswert war "transparent"
								if(p_color_init.toLowerCase() === 'transparent' && arr_hsl_or_hsla[3] === 0){
									p_color = p_color_init; // wenn alpha-Slider ganz unten, "Transparent" anzeigen
								}
								// bei css-Farbe mit Transparenz ergibt sich immer HEX6a!
								else{
									p_color = hex_add_alpha( css_hex_init, arr_hsla[3] );
								}

							}

						}

					}
				}


				if(convert_arr_hsla_to_hex === true) p_color = str_rgba_to_hex(arr_rgba_hsla_to_str( hsla_to_rgba(arr_hsl_or_hsla), 'rgb'));

			} // Ende hex || css


			// set picker str ---------------------------------------------------------------------------------------------------------------------
			$picker_color_text.textContent = p_color;

		},

		// _______________________________________________________________________________________________________________________________________________
		picker_preview_new_color = () => {
			$alpha_slider.style.background = 'linear-gradient(to bottom, hsl('+arr_hsla[0]+','+arr_hsla[1]+'%,'+arr_hsla[2]+'%)'+', transparent)';
			$sat_rect.style.background = 'hsl('+arr_hsla[0]+', 100%, 50%)';
			$sat_pointer.style.background = 'hsl('+arr_hsla[0]+','+arr_hsla[1]+'%,'+arr_hsla[2]+'%)';
			$hue_pointer.style.background = 'hsl('+arr_hsla[0]+', 100%, 50%)';
			$picker_preview_new.style.background = 'hsla('+arr_hsla[0]+','+ arr_hsla[1]+'%,'+ arr_hsla[2]+'%,'+arr_hsla[3]+')';
		},

		//  _______________________________________________________________________________________________________________________________________________
		picker_preview_init_color_valid = () => {
			$picker_preview_init.style.background = 'hsla('+arr_hsla_init[0]+','+ arr_hsla_init[1]+'%,'+ arr_hsla_init[2]+'%,'+arr_hsla_init[3]+')';
			$picker_color_text.textContent = p_color;
		},

		picker_preview_init_color_invalid = () => {
			$sat_rect.style.background = '#f00'; // rot weil hue-slider bei init ganz oben stehen muss
			$picker_color_text.textContent = str_invalid_color;
			$picker_preview_init.style.background = 'linear-gradient(135deg, transparent 0%, transparent 48%, red 50%, transparent 52%, transparent 100%)';
			$picker_preview_new.style.background = p_color_invalid; // #ffffff
		},

		// switch color system _______________________________________________________________________________________________________________________________________________
		picker_btn_switch_mousedown = () => {

			if(p_color_is_invalid === true) return; // ███ exit ███

			// Auf Ausgangsfarbe zurücksetzen? (da HSL zu HEX-Umwandlung zu Ungenauigkeiten führt / vscode-onboard-Picker macht genau das Gleiche)

			let reset_color = false;

			// p_csys: false | 1 = HEX6 | 2 = HEX6a | 3 = HEX3 | 4 = HEX3a | 5 = rgb | 6 = rgba | 7 = hsl | 8 = hsla | 9 = css color | 10 = gradient

			// --------------------------------------------------------------------------------------------------------

			// (noch) aktuelles System ist hsl (also eine Stufe vor Sprung zu CSS oder HEX)
			if(p_csys === 7 || p_csys === 8){

				// H, S und L haben sich nicht geändert!
				if( arr_hsla[0] === arr_hsla_init[0] || arr_hsla[1] === arr_hsla_init[1] || arr_hsla[2] === arr_hsla_init[2]) {

					// aktuelle Farbe hat keine Transparenz ------------------------------
					if(arr_hsla[3] === 1) {

						// Ausgangsfarbe war HEX6
						if(p_csys_init === 1) {
							p_color = p_color_init; // zurücksetzen
							p_csys = p_csys_init; // zurücksetzen
							reset_color = true;
						}
						// Ausgangsfarbe war HEX6a
						else if(p_csys_init === 2) {
							p_color = p_color_init.substr(0,7); // alpha abschneiden
							p_csys = 1; // HEX6
							reset_color = true;
						}
						// Ausgangsfarbe war CSS
						else if(p_csys_init === 9) {

							// Sonderfall: Ausgangswert war "transparent"
							if(p_color_init.toLowerCase() === 'transparent'){
								p_color = '#000000';
								p_csys = 1;
							}
							else{
								p_color = p_color_init; // zurücksetzen
								p_csys = p_csys_init; // zurücksetzen
							}

							reset_color = true;

						}

					}
					// aktuelle Farbe hat Transparenz ---------------------------------------
					else{

						// Ausgangsfarbe war HEX6 || HEX6a
						if(p_csys_init === 1 || p_csys_init === 2) {
							p_color = hex_add_alpha(p_color_init.substr(0,7), arr_hsla[3]);
							p_csys = 2; // HEX6a
							reset_color = true;
						}
						// Ausgangsfarbe war CSS
						else if(p_csys_init === 9) {

							// Sonderfall: Ausgangswert war "transparent"
							if(p_color_init.toLowerCase() === 'transparent' && arr_hsla[3] === 0){
								p_color = p_color_init;
								p_csys = p_csys_init; // zurücksetzen
							}
							else{
								p_color = hex_add_alpha(css_hex_init, arr_hsla[3]);
								p_csys = 2; // HEX6a
							}

							reset_color = true;

						}

					}

				}

			}

			// --------------------------------------------------------------------------------------------------------

			if(reset_color === false) {
				const arr_result = switch_color_system(p_color);
				p_csys = arr_result[0];
				p_color = arr_result[1];
			}

			$picker_color_text.textContent = p_color;

			// global aktualisieren
			picker_color = p_color;


		},

		// reset color _______________________________________________________________________________________________________________________________________________
		picker_preview_init_click = () => {
			if(p_color_init_is_invalid === false) picker_refresh(p_color_init);
		},

		// btn add replace _______________________________________________________________________________________________________________________________________________

		picker_add_colors = () => {
			if(p_color_is_invalid === true) return; // ███ exit ███
			add_colors([p_color], [p_color], c_cid, false);
			$picker_preview_init.style.background = p_color;
		},

		picker_replace_color = () => {

			if(p_color_is_invalid === true) return; // ███ exit ███

			const 	arr_replace_ids = get_selected_ids(),
					replace_len = arr_replace_ids.length;

			let i = 0;

			if(replace_len > 0){

				for (i = 0; i < replace_len; i++) {
					arr_c[arr_replace_ids[i]] = p_color;
					arr_b[arr_replace_ids[i]] = p_csys !== false ? p_color : color_error_bg;
					$color_inputs_c[arr_replace_ids[i]].value = p_csys !== false ? p_color : str_invalid_color;
					$color_spans[arr_replace_ids[i]].style.background = arr_b[arr_replace_ids[i]];
				}

				store_colors(); // Farben für erneutes Öffnen aktualisieren!

			}
		},

		// insert doc  _______________________________________________________________________________________________________________________________________________
		picker_btn_insert_mousedown = () => {

			if(p_color_is_invalid === true) return; // ███ exit ███

			vscode.postMessage({ // ███ vscode APi ███
				command: 'insert',
				insert_val: p_color
			});

		},

		// outer wrapper scroll  _______________________________________________________________________________________________________________________________________________
		picker_outer_wrapper_scroll = () => {
			get_picker_dimensions(); // offset top der Controls aktualisieren red
		},

		// window resize  _______________________________________________________________________________________________________________________________________________
		picker_window_resize = () => {

			// wenn Picker höher als Fenster, dann overflow scroll
			if($picker_wrapper.offsetHeight > window.outerHeight) $picker_wrapper_outer.style.overflowY = 'scroll';
			else $picker_wrapper_outer.overflowY = 'hidden';

			// Positionen / Abmessungen für Controls aktualisieren
			get_picker_dimensions();
			picker_hsla_to_control_positions(arr_hsla);

		},

		// _______________________________________________________________________________________________________________________________________________
		picker_prevent_insert = (on) => {

			/* Solange Picker offen ist, verhindern dass beim Anklicken der colorspans Farben im Dokument eingefügt werden

			Info! 'picker-no-insert' nicht auf $main_wrapper setzen da auch mit geöffnetem Picker der Mode gewechselt werden kann
			(unter toggle_mode() werden sämtliche Klassen auf $main_wrapper überschrieben)

			Achtung! settimeout: Das Setzen der Cursor-Klasse mit einem kurzem Versatz ausführen! Grund: Die Cursor auf allen color-wrappern zu ändern
			ist bei großen Paletten ein unglaublicher Performance-Killer und das führt dazu dass der Picker beim Öffnen und Schließen mit einer sichtbaren
			Verzögerung angezeigt bzw. ausgeblendet wird! */

			if(on === true){
				prevent_doc_insert = true; // siehe "colorwrapper_colorspan_click()"
				setTimeout(() => document.body.classList.add('picker-no-insert'), 0); // Performance s.o.
			}
			else{
				prevent_doc_insert = false;
				setTimeout(() => document.body.classList.remove('picker-no-insert'), 0); // Performance s.o.
			}

		},

		// _______________________________________________________________________________________________________________________________________________
		picker_check_hex_prefix = (str_color) => { // "0x" durch "#" ersetzen?
			return str_color.substr(0,2) === '0x' ? '#' + str_color.substr(2, str_color.length) : str_color;
		},

		// _______________________________________________________________________________________________________________________________________________
		picker_set_init_vars = () => {

			// Ausgangswerte festlegen: p_csys, arr_hsla und ggf. css_hex_init (für Farbe beim Öffnen, oder wenn der Picker aktualisiert wird ("picker_refresh()")

			let arr_result = get_color_metrics(p_color_init); // [csys, arr_hsla, css_hex_init]

			p_csys = arr_result[0]; // csys (false, 1 ... 9)

			// erfolgreich
			if(p_csys !== false){
				arr_hsla = arr_result[1]; // arr_hsla
				css_hex_init = arr_result[2]; // css_hex_init
			}
			// nicht erfolgreich
			else{
				p_color_init_is_invalid = true;
				p_color_is_invalid = true;
				arr_hsla = arr_hsla_invalid.slice();
				p_color = p_color_invalid;
				p_color_init = p_color_invalid;
				p_csys = 1; // p_color_invalid / #ffffff
			}

			// speichern für Vergleiche
			arr_hsla_init = arr_hsla.slice();
			p_csys_init = p_csys;


			// 2 unterschiedliche Farben für "p_color" und "p_color_init" übergeben? (nur bei "init_cm()" der Fall)
			if(p_color !== p_color_init){

				arr_result = get_color_metrics(p_color); // [csys, arr_hsla, css_hex_init]

				p_csys = arr_result[0]; // csys (false, 1 ... 9)

				// erfolgreich
				if(p_csys !== false){
					p_color_is_invalid = false;
					arr_hsla = arr_result[1]; // arr_hsla
				}
				// nicht erfolgreich
				else{
					p_color_is_invalid = true;
					p_color = p_color_invalid;
					arr_hsla = arr_hsla_invalid.slice();
					p_csys = 1; // p_color_invalid / #ffffff
				}

			}

			// globals aktualisieren
			picker_color = p_color;
			picker_color_init = p_color_init;

		},

		// def const _______________________________________________________________________________________________________________________________________________
		$picker_wrapper_outer    = document.createElement('div'),

		$picker_wrapper          = document.createElement('div'),

		$picker_head          	 = document.createElement('div'),
		$picker_btn_close        = document.createElement('p'),

		$picker_preview_wrapper  = document.createElement('div'),
		$picker_btn_add  		 = document.createElement('p'),
		$picker_btn_replace  	 = document.createElement('p'),
		$picker_preview_new      = document.createElement('span'),
		$picker_preview_init     = document.createElement('span'),

		$picker_btn_switch		 = document.createElement('p'),
		$picker_color_text       = document.createElement('div'),

		$picker_controls_info 	 = document.createElement('div'),

		$picker_controls_wrapper = document.createElement('div'),
		$alpha_slider            = document.createElement('div'),
		$alpha_pointer           = document.createElement('div'),
		$hue_slider              = document.createElement('div'),
		$hue_pointer             = document.createElement('div'),
		$sat_rect                = document.createElement('div'),
		$sat_pointer             = document.createElement('div'),

		$picker_btn_insert       = document.createElement('p'),

		p_color_invalid = '#ffffff',
		arr_hsla_invalid = [0, 0, 100, 1], // = "#ffffff"
		str_invalid_color = 'INVALID COLOR VALUE';


		// def let -----------------------------------------------------------------------------------------------------------------------------
		let arr_hsla = [],
			arr_hsla_init = [],

			p_csys = false,  // false | 1 = HEX6 | 2 = HEX6a | 3 = HEX3 | 4 = HEX3a | 5 = rgb | 6 = rgba | 7 = hsl | 8 = hsla | 9 = css color
			p_csys_init = false,

			p_color_init_is_invalid = false,
			p_color_is_invalid = false,

			css_hex_init = '',

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

			hue_pointer_y = 0,
			hue_slider_top = 0,
			hue_slider_height = 0,
			hue_pointer_width = 0,

			alpha_pointer_y = 0,
			alpha_slider_top = 0,
			alpha_slider_height = 0,
			alpha_pointer_width = 0,

			$el = null; // dummy (mehrfach verwendet)

		// def window -----------------------------------------------------------------------------------------------------------------------------

		window.get_picker_dimensions = () => {

			// Info! Wird auch bei "window_scroll_end()" ausgeführt und an "drag_head_mousedown()" übergeben!

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

		};

		// -----------------------------------------------------------------------------------------------------------------------------
		window.picker_refresh = (p_color_new) => {

			// ggf. "0x"-Hex durch "#"-Hex ersetzen
			p_color_new = picker_check_hex_prefix(p_color_new);

			p_color = p_color_new;
			p_color_init = p_color_new; // "picker_refresh()" wird nur von Funktionen aufgerufen bei denen die Init-Farbe immer auch die anzuzeigende Farbe ist!
			picker_set_init_vars();

			if(p_color_init_is_invalid === false) picker_preview_init_color_valid(); // "p_color_init_is_invalid" wird in "picker_set_init_vars()" gesetzt!
			else picker_preview_init_color_invalid();

			picker_hsla_to_control_positions(arr_hsla);
			picker_preview_new_color();

		};

		// -----------------------------------------------------------------------------------------------------------------------------
		window.picker_close = () => {
			drag_head_splice($picker_head);
			window.removeEventListener('resize', picker_window_resize, false);
			document.body.removeChild($picker_wrapper_outer);
			picker_prevent_insert(false);
			picker_open = false;
			store_settings(); // picker_open, picker_color, picker_color_init
		};

		// _________________________________________________________________________________________________________________________________________________
		// START open_picker _______________________________________________________________________________________________________________________________
		// _________________________________________________________________________________________________________________________________________________

		// "p_color_init" gesetzt? Info! Nur "init_cm()" übergibt "p_color" und "p_color_init". Alle anderen Funktionen (z.B. Contextmenu) übergeben nur "p_color".
		if(p_color_init === undefined) p_color_init = p_color;

		// ggf. "0x"-Hex durch "#"-Hex ersetzen
		p_color = picker_check_hex_prefix(p_color);
		p_color_init = picker_check_hex_prefix(p_color_init);

		// "p_csys" + "arr_hsla" festlegen!
		picker_set_init_vars();

		// ---------------------------------------------------------------------------------------------------------------------------------

		$picker_wrapper_outer.id = 'picker-wrapper-outer';
		$picker_wrapper_outer.className = 'drag-head-wrapper-outer'; // drag head
		$picker_wrapper_outer.addEventListener('scroll', picker_outer_wrapper_scroll, false); // unwahrscheinlich aber nötig (falls Picker höher als Fenster)

		$picker_wrapper.id = 'picker-wrapper';
		$picker_wrapper.className = 'drag-head-wrapper';

		// picker head ------------------------------------------
		$picker_head.id = 'picker-head';
		$picker_wrapper.appendChild($picker_head);

		// btn close ------------------------------------------
		$picker_btn_close.id  = 'picker-btn-close';
		$picker_btn_close.addEventListener('click', picker_close, false);
		$picker_wrapper.appendChild($picker_btn_close);

		// preview wrapper  ---------------------------------------
		$picker_preview_wrapper.id = 'picker-preview-wrapper';

		// btn add / replace
		$picker_btn_add.id = 'picker-btn-add';
		$picker_btn_add.addEventListener('mousedown', picker_add_colors, false); // mousedown, wegen doc mouseup

		$picker_btn_replace.id = 'picker-btn-replace';
		$picker_btn_replace.addEventListener('mousedown', picker_replace_color, false); // mousedown, wegen doc mouseup

		// span preview init
		$picker_preview_init.id = 'picker-preview-init';
		$picker_preview_init.addEventListener('mousedown', picker_preview_init_click, false); // mousedown, wegen doc mouseup

		// span preview new
		$picker_preview_new.id = 'picker-preview-new';

		$picker_preview_wrapper.appendChild($picker_btn_add);
		$picker_preview_wrapper.appendChild($picker_btn_replace);
		$picker_preview_wrapper.appendChild($picker_preview_new);
		$picker_preview_wrapper.appendChild($picker_preview_init);
		$picker_wrapper.appendChild($picker_preview_wrapper);

		// btn switch / color val -----------------------------------------
		$picker_btn_switch.id = 'picker-btn-switch';
		$picker_btn_switch.addEventListener('mousedown', picker_btn_switch_mousedown, false); // mousedown, wegen doc mouseup
		$picker_color_text.id = 'picker-text-switch';

		$el = document.createElement('div');
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
		$alpha_slider.addEventListener('mousedown', picker_alpha_slider_mousedown, false);
		$alpha_pointer.id = 'alpha-pointer';
		$alpha_pointer.className = 'pointer';
		$alpha_slider.appendChild($alpha_pointer);
		$picker_controls_wrapper.appendChild($alpha_slider);

		// sat rect + div bg + pointer
		$sat_rect.id = 'sat-rect';
		$sat_rect.addEventListener('mousedown', picker_sat_rect_mousedown, false);
		$sat_pointer.id = 'sat-pointer';
		$sat_pointer.className = 'pointer';
		$el = document.createElement('div');
		$sat_rect.appendChild($el);
		$sat_rect.appendChild($sat_pointer);
		$picker_controls_wrapper.appendChild($sat_rect);

		// hue slider + pointer
		$hue_slider.id = 'hue-slider';
		$hue_slider.addEventListener('mousedown', picker_hue_slider_mousedown, false);
		$hue_pointer.id = 'hue-pointer';
		$hue_pointer.className = 'pointer';
		$hue_slider.appendChild($hue_pointer);
		$picker_controls_wrapper.appendChild($hue_slider);

		$picker_wrapper.appendChild($picker_controls_wrapper);


		// btn insert -----------------------------------------------
		$picker_btn_insert.id = 'picker-btn-insert';
		$picker_wrapper.appendChild($picker_btn_insert);
		$picker_btn_insert.addEventListener('mousedown', picker_btn_insert_mousedown, false); // mousedown, wegen doc mouseup


		// window listener ---------------------------------------------------------
		window.addEventListener('resize', picker_window_resize, false);


		// ---------------------------------------------------------
		if(p_color_init_is_invalid === false) picker_preview_init_color_valid(); // "p_color_init_is_invalid" wird in "picker_set_init_vars()" gesetzt!
		else picker_preview_init_color_invalid();


		picker_preview_new_color();

		// drag head
		drag_head_push($picker_head, $picker_wrapper, $picker_wrapper_outer, get_picker_dimensions); // custom_func_when_moved = get_picker_dimensions() (Picker-Positionen aktualisieren)


		picker_prevent_insert(true);

		// append ---------------------------------------------------------
		$picker_wrapper_outer.appendChild($picker_wrapper);
		document.body.appendChild($picker_wrapper_outer);

		// sichtbar ---------------------------------------------------

		get_picker_dimensions();

		// controls auf Positionen verschieben (kann erst nach "get_picker_dimensions()" gemacht werden)
		picker_hsla_to_control_positions(arr_hsla);


		store_settings(); // picker_open, picker_color, picker_color_init ("picker_open" kurz zuvor unter "prepare_open_picker()" gesetzt)

	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	prepare_open_picker = (p_color) => {

		// picker bereits geöffnet oder noch geschlossen ?
		if(picker_open === false){
			picker_open = true;
			open_picker(p_color);
		}
		else{
			picker_refresh(p_color);
		}

	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

	// benutzt von picker und color wrapper switch

	switch_color_system = (str_color) => {

		const check_result = check_colors(str_color); // return: false | 1 = HEX6 | 2 = HEX6a | 3 = HEX3 | 4 = HEX3a | 5 = rgb | 6 = rgba | 7 = hsl | 8 = hsla | 9 = css color | 10 = gradient
		let	str_color_new = '',
		csys_new = -1;


		// HEX6a -> HEX3a (wenn möglich) -> RGBa > HSLa -> CSS

		// HEX6a -> HEX3a || RGBa -----------------------------------------------------------------------------------------------------
		if(check_result === 1 || check_result === 2){

			// HEX3(a) möglich?
			const short_hex_result = short_hex_possible(str_color); // false || 63 || 84

			// -> HEX3
			if(short_hex_result === 63){
				str_color_new = convert_short_hex(str_color, 63); // type: 36 = #fff -> #ffffff | 48 = #fff3 -> #ffffff33 | 63 = #ffffff -> #fff | 84 = #ffffff33 -> #fff3
				csys_new = 3;
			}
			// -> HEX3a
			else if(short_hex_result === 84){
				str_color_new = convert_short_hex(str_color, 84); // type: 36 = #fff -> #ffffff | 48 = #fff3 -> #ffffff33 | 63 = #ffffff -> #fff | 84 = #ffffff33 -> #fff3
				csys_new = 4;
			}
			// -> RGB
			else{
				str_color_new = hex_to_rgba(str_color, true); // true = return string, false = return array
				csys_new = 4 + check_result; // ergibt 5 oder 6 (rgb || rgba)
			}

		}
		// HEX3 -> RGB -----------------------------------------------------------------------------------------------------
		else if(check_result === 3){
			str_color_new = hex_to_rgba( convert_short_hex(str_color, 36), true); // true = return string, false = return array
			csys_new = 5;
		}
		// HEX3a -> RGBa -----------------------------------------------------------------------------------------------------
		else if(check_result === 4){
			str_color_new = hex_to_rgba( convert_short_hex(str_color, 48), true); // true = return string, false = return array
			csys_new = 6;
		}
		// RGB(a) -> HSL(a) -----------------------------------------------------------------------------------------------------
		else if(check_result === 5 || check_result === 6){
			str_color_new = arr_rgba_hsla_to_str( rgba_to_hsla( str_rgba_hsla_to_arr(str_color) ), 'hsl');
			csys_new = 2 + check_result; // ergibt 7 oder 8
		}
		// HSL(a) -> HEX -----------------------------------------------------------------------------------------------------
		else if(check_result === 7 || check_result === 8){

			// HSL -> HEX ACHTUNG!!! Hier Ungenauigkeiten (siehe Erklärung ganz oben)
			str_color_new = str_rgba_to_hex(arr_rgba_hsla_to_str(hsla_to_rgba( str_rgba_hsla_to_arr(str_color) ), 'rgb'));

		}
		// css-color: CSS -> HEX -----------------------------------------------------------------------------------------------------
		else if(check_result === 9){
			str_color_new = str_color.toLowerCase() === 'transparent' ? '#00000000' : css_to_hex(str_color);
			csys_new = 1;
		}
		// gradient -----------------------------------------------------------------------------------------------------
		else if(check_result === 10){
			csys_new = false;
		}

		return [csys_new, str_color_new];

	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	convert_colors = (convert_type, arr_convert_ids) => { // arr_convert_ids = [] || true (alle umwandeln)

		const check_short_hex = (hex) => { // HEX3 | HEX3a möglich?
			if(hex.length === 7) {
				if(short_hex_possible(hex) === 63) hex = convert_short_hex(hex, 63); // type: 36 = #fff -> #ffffff | 48 = #fff3 -> #ffffff33 | 63 = #ffffff -> #fff | 84 = #ffffff33 -> #fff3
			}
			else if(hex.length === 9) {
				if(short_hex_possible(hex) === 84) hex = convert_short_hex(hex, 84); // type: 36 = #fff -> #ffffff | 48 = #fff3 -> #ffffff33 | 63 = #ffffff -> #fff | 84 = #ffffff33 -> #fff3
			}
			return hex;
		},

		// ________________________________________________________________________________________________________________

		convert_ids_len = arr_convert_ids === true ? c_len : arr_convert_ids.length,
		change_title = mode_current === 'insert-compactview' ? true : false;

		let cv_id = -1,
			str_color = '',
			str_color_conv = false,
			check_result = false,
			i = 0;

		// Start
		for (i = 0; i < convert_ids_len; i++) {

			// alle umwandeln?
			cv_id = arr_convert_ids === true ? i : arr_convert_ids[i];

			str_color_conv = false; // reset
			str_color = arr_c[cv_id];
			check_result = check_colors(str_color);  // return: false | 1 = HEX6 | 2 = HEX6a | 3 = HEX3 | 4 = HEX3a | 5 = rgb | 6 = rgba | 7 = hsl | 8 = hsla | 9 = css color | 10 = gradient

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

				arr_c[cv_id] = str_color_conv;
				$color_inputs_c[cv_id].value = str_color_conv;

				// compactview title aktualisieren?
				if(change_title === true) $color_wrappers[cv_id].title = arr_n[cv_id] === arr_c[cv_id] ? arr_n[cv_id] : arr_n[cv_id]+': '+arr_c[cv_id];

			}

		}


		store_colors(); // Farben für erneutes Öffnen aktualisieren!

	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

	add_colors = (arr_new_n, arr_new_c, insert_pos, select_p_colors) => { // arr_new_n = array oder true (neue Farbe)    insert_pos entspricht entweder c_cid oder c_len (wenn am Ende eingefügt werden soll)

		// benutzt von picker, control-button und contextmenu

		const refresh_filter_visibility_without_dynamic_scroll = () => {
			for (i = filter_insert_pos; i < filtered_ids_len; i++) $color_wrappers[arr_filtered_ids[i]].className = 'color-wrapper';
		},

		compensate_dynamic_scroll_padding = (len) => {
			$main_wrapper.style.padding = (visible_index_start_mem * color_wrapper_height) + 'px 0 ' + ((len - visible_index_end_mem) * color_wrapper_height) + 'px 0';
		},

		// const / start

		scroll_y_before = window.scrollY, // scroll-Position speichern (muss gemacht werden bevor ggf. die nicht mehr aktuellen filter id's ausgeblendet werden und bevor dynamic scroll aktiviert wird)
		len_before = filter_open === false ? c_len : filtered_ids_len,
		arr_new_b = [];

		let filter_insert_pos = 0,
			new_len = 0,
			c_max_dif = 0,
			i = 0;

		// arr_new_n = true? (Neue Farbe)
		if(arr_new_n === true){
			arr_new_n = [n_new];
			arr_new_c = [c_new];
			new_len = 1;
		}
		// Farb-Array übergeben
		else{
			new_len = arr_new_n.length;
		}

		// maximum überschritten?
		c_max_dif = c_len + new_len - c_max;

		if(c_max_dif > 0){

			dialogbox('Limit of '+c_max+' reached!', false, false, false, callback => {});

			// Palette bereits voll?
			if(new_len - c_max_dif < 1){
				return; // ███ exit ███
			}
			else{
				// Farb-Array kürzen und nur die Differenz hinzufügen
				arr_new_n = arr_new_n.slice(0, c_max_dif);
				arr_new_c = arr_new_c.slice(0, c_max_dif);
				new_len = c_max_dif;
			}

		}


		// Filter
		if(filter_open === true){

			// Filter leer (am Anfang einfügen)
			if(filtered_ids_len < 1){
				insert_pos = 0;
				// "filter_insert_pos" bleibt 0 (s.o.)
				i = 0; // reset ???
				arr_filtered_ids = [...Array(new_len)].map((_,i) => i + 0); // 0 fortlaufend hochzählen bis new_nen erreicht:[0, 1, 2, ...]
				filtered_ids_len = new_len;
				filter_empty_info();
			}
			// Filter nicht leer
			else{

				if(insert_pos === -1){ // nichts markiert: c_cid = -1 (am Anfang vom Filter-Array einfügen)
					insert_pos = arr_filtered_ids[0];
					// "filter_insert_pos" bleibt 0 (s.o.)
				}
				// position von insert_pos im Filter-Array ermitteln ...
				else{
					filter_insert_pos = arr_filtered_ids.indexOf(insert_pos);
				}

				// ... und alle Nachfolgenden hochzählen
				for (i = filter_insert_pos; i < filtered_ids_len; i++){
					$color_wrappers[arr_filtered_ids[i]].className = 'hide'; // ausblenden / nicht mehr aktuell da sich id ändert
					arr_filtered_ids[i] += new_len;
				}

				//  neue fortlaufende filter-ids erzeugen und in arr_filtered_ids einfügen
				i = 0; // reset ???
				const arr_temp = [...Array(new_len)].map((_,i) => i + insert_pos); // fortlaufend hochzählen bis new_nen erreicht: [100, 101, 102, ...]
				arr_filtered_ids.splice(filter_insert_pos, 0, ...arr_temp);
				filtered_ids_len += new_len;

			}

		}
		// kein Filter
		else{
			if(insert_pos === -1) insert_pos = 0; // nichts markiert: c_cid = -1 (am Anfang einfügen)
		}


		// Hintergründe erzeugen / arr_b
		for (i = 0; i < new_len; i++) arr_new_b[i] = check_colors(arr_new_c[i]) === false ? color_error_bg : arr_new_c[i];

		// neue Farben in Farb-Arrays einfügen
		arr_n.splice(insert_pos, 0, ...arr_new_n);
		arr_c.splice(insert_pos, 0, ...arr_new_c);
		arr_b.splice(insert_pos, 0, ...arr_new_b);

		c_len += new_len;

		// neue wrapper erzeugen (erstmal am Ende einfügen) und später dann "refresh_color_wrappers()"
		create_color_wrappers(c_len - new_len, c_len, false); // Farben nicht setzen / wird kurz darauf bei "refresh_color_wrappers()" gemacht


		// compactview
		if(mode_current === 'insert-compactview'){
			if(filter_open === true) refresh_filter_visibility_without_dynamic_scroll();
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
					if(filter_open === false){
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

					if(filter_open === true){
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

				const len = filter_open === false ? c_len : filtered_ids_len; // wurden beide oben hochgezählt!

				// dynamic scroll muss jetzt aktiviert werden  -------------------------------------------
				if(len > dynamic_scroll_limit){

					if (color_wrapper_height === 0) dynamic_scroll_get_values();

					recalc_visible_index_mem();

					// ohne filter: wrapper davor|dahinter ausblenden + reorder
					if(filter_open === false){
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
					if(filter_open === true) refresh_filter_visibility_without_dynamic_scroll();
				}

			}

		}

		// float + listview
		refresh_color_wrappers(insert_pos);

		// c_cid setzen

		/*if(c_cid !== -1){ // c_cid vorhanden
			$color_inp_wrappers[c_cid].className = '';
			c_cid = filter_open === false ? insert_pos : arr_filtered_ids[filter_insert_pos];
		}*/

		if(c_cid === -1){
			c_cid = filter_open === false ? 0 : arr_filtered_ids[0];
			store_settings(); // c_cid aktualisieren
		}

		// neu Hinzugefügte markieren?
		if(select_p_colors === true){

			if(sel_len > 0) reset_selection(true);

			const 	loop_start = insert_pos,
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
		scroll_to_active(false); // scroll_even_when_visible = false / beim Hinzufügen kein Scrollen erzwingen wenn sich der aktive wrapper im sichtbaren Bereichs befindet

		// Statusbar aktualisieren
		set_statusbar_counter();
		set_statusbar_active();

		// Farben für erneutes Öffnen aktualisieren!
		store_colors();

	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

	get_selected_ids = () => {

		let arr_return = [];

		if (sel_len === 0) {
			if (c_cid !== -1) arr_return[0] = c_cid;
		}
		else{
			arr_return = arr_sel_ids.slice();
			if (c_cid !== -1) arr_return.push(c_cid);
			arr_return.sort((a, b) => {return a-b;});
		}

		return arr_return;

	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

	delete_colors = () => {

		// benutzt von wrapper-delete-button und contextmenu

		const 	arr_delete_ids = get_selected_ids(), // werden sortiert zurückgegeben!
				delete_len = arr_delete_ids.length,
				len_before = filter_open === false ? c_len : filtered_ids_len,
				arr_temp = [];

		if (delete_len === 0) return; //  ███ exit ███

		let loop_start = 0,
			loop_end = 0,
			i = 0,
			n = 0;

		// arr_filtered_ids aktualisieren ?
		if(filter_open === true){

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

			filter_empty_info();

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
				if(filter_open === false){
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
				if(filter_open === false){
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
		// Listview ohne dynamic scroll oder compactview ________________________________________________________________________________________________________________
		else{

			// Info!!! Trifft auch auf "insert-compactview" zu, da dort dynamic scoll niemals aktiv ist!

			if(filter_open === true){ // Filter: aktualisierte gefilterte wrapper einblenden
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
				if(filter_open === false){
					c_cid = arr_delete_ids[0] > c_len - 1 ? c_len - 1 : arr_delete_ids[0]; // befindet sich gelöschte c_cid hinter aktualisierter Länge?
				}
				// Filter
				else{
					c_cid = filter_delete_start_pos === len_before - 1 ? arr_filtered_ids[filter_delete_start_pos - 1] : arr_filtered_ids[filter_delete_start_pos];  // befindet sich gelöschte c_cid hinter aktualisierter Länge?
				}

				$color_inp_wrappers[c_cid].className = 'active';

			}

		}

		// c_cid aktualisieren
		store_settings();

		// Farben für erneutes Öffnen aktualisieren!
		store_colors();

		// reset selection vars
		if(sel_len > 0){
			arr_sel_ids = [];
			sel_len = 0;
		}

		set_statusbar_counter();
		set_statusbar_active();

	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	swap_colorwrappers = (id_a, id_b) => {

		// Dreiecks-Tausch
		const temp = [];

		temp[0] = arr_n[id_a];
		temp[1] = arr_c[id_a];
		temp[2] = arr_b[id_a];

		arr_n[id_a] = arr_n[id_b];
		arr_c[id_a] = arr_c[id_b];
		arr_b[id_a] = arr_b[id_b];

		arr_n[id_b] = temp[0];
		arr_c[id_b] = temp[1];
		arr_b[id_b] = temp[2];

		$color_inputs_n[id_a].value = arr_n[id_a];
		$color_inputs_c[id_a].value = arr_c[id_a];
		$color_spans[id_a].style.background = arr_b[id_a];

		$color_inputs_n[id_b].value = arr_n[id_b];
		$color_inputs_c[id_b].value = arr_c[id_b];
		$color_spans[id_b].style.background = arr_b[id_b];

		// compactview title tauschen?
		if(sort_mode === true && mode_current === 'insert-compactview'){
			$color_wrappers[id_a].title = arr_n[id_a] === arr_c[id_a] ? arr_n[id_a] : arr_n[id_a]+': '+arr_c[id_a];
			$color_wrappers[id_b].title = arr_n[id_b] === arr_c[id_b] ? arr_n[id_b] : arr_n[id_b]+': '+arr_c[id_b];
		}


	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	toggle_sort_mode = (on) => {

		let i = 0;

		if(on === true){
			sort_mode = true;
			$color_wrapper_main.classList.add('sort-mode');
			for (i = 0; i < c_len; i++) $color_wrappers[i].addEventListener('mousedown', colorwrapper_drag_mousedown, false);
			if(sel_len > 0) reset_selection(true);
		}
		else{
			sort_mode = false;
			$color_wrapper_main.classList.remove('sort-mode');
			for (i = 0; i < c_len; i++) $color_wrappers[i].removeEventListener('mousedown', colorwrapper_drag_mousedown, false);
		}

	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	toggle_mode = (toggle_command) => { // toggle-insert-edit || toggle-insert-view

		/* 'toggle-insert-edit' entspricht Klick auf ersten Button links oben
		'toggle-insert-view' entspricht Klick auf Listview-/compactview-Button */

		// _____________________________________________________________________________________________________________________
		const switch_compactview_to_listview = () => {

			let i = 0;

			// muss dynamisches scrollen aktiviert werden?
			if( (filter_open === false && c_len > dynamic_scroll_limit) || (filter_open === true && filtered_ids_len > dynamic_scroll_limit) ){

				if(color_wrapper_height === 0) dynamic_scroll_get_values();

				// ungefiltert
				if (filter_open === false) {
					for (i = 0; i < c_len; i++){
						$color_wrappers[i].title = ''; // title entfernen
						if(i > visible_index_end_mem) $color_wrappers[i].className = 'hide'; // ab "visible_index_end_mem" ausblenden
					}
				}
				// gefiltert
				else{

					const arr_filtered_ids_copy = arr_filtered_ids.slice();
					let	found_index = -1;

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

				// grundsätzlich zum Anfang scrollen (falls im compactview gescrollt war)
				window.scrollTo(0,0);

				dyn_scroll_y_pos = -1;
				visible_index_start_mem = 0;
				visible_index_end_mem = current_visible_wrappers * 3; // "current_visible_wrappers" kurz zuvor ermittelt -> "dynamic_scroll_get_values()" (s.o.)

				// padding kompensieren
				dynamic_scroll_compensate( filter_open === true && filtered_ids_len > 0 ? true : false );

				// scroll listener
				dynamic_scroll_bind_listener();

			}
			// dynamic scroll nicht nötig / alle wrapper sind auch in der listview sichtbar
			else{
				for (i = 0; i < c_len; i++) $color_wrappers[i].title = ''; // nur title entfernen
			}

		},

		// _____________________________________________________________________________________________________________________
		switch_listview_to_compactview = () => {

			const add_title = (n) => {
				$color_wrappers[n].title = arr_n[n] === arr_c[n] ? arr_n[n] : arr_n[n]+': '+arr_c[n];
			};

			let arr_filtered_ids_copy = [],
				found_index = -1,
				i = 0;

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

					arr_filtered_ids_copy = arr_filtered_ids.slice();

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

		};

		// _____________________________________________________________________________________________________________________
		let set_mode = '';

		// diese Klassennamen werden auf den body gelegt und bestimmen was angezeigt wird, und was nicht (siehe css)

		// btn-toggle-insert-edit --------------------------------------------------------
		if(toggle_command === 'toggle-insert-edit') {

			// Edit-Mode noch aktiv -> Insert Mode öffnen
			if(mode_current === 'edit'){
				// insert-listview öffnen
				set_mode = 'insert-listview';

			}
			// Insert Mode noch aktiv -> Edit Mode öffnen
			else{
				// compactview noch aktiv
				if(mode_current === 'insert-compactview') switch_compactview_to_listview();
				set_mode = 'edit';
			}

		}
		// btn-toggle-insert-edit --------------------------------------------------------
		else if(toggle_command === 'toggle-insert-view') {

			// compactview noch aktiv -> listview öffnen
			if(mode_current === 'insert-compactview'){
				switch_compactview_to_listview();
				set_mode = 'insert-listview';
			}
			// listview noch aktiv -> compactview öffnen
			else{
				switch_listview_to_compactview();
				set_mode = 'insert-compactview';
			}

		}

		// neue Klasse zuweisen
		$main_wrapper.className = set_mode; // siehe css (ändert pointer-events ect.)
		mode_current = set_mode;

		// fixed wrapper höhe bzw. body padding kompensieren
		set_controls_height();

		store_settings();

	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	check_dropdown_width = () => {
		// dropdown-ul anpassen / geht nicht über css, da media-widths irrelevant sind wenn die resize-borders aktiv sind und das ui nicht über die gesamte breite läuft!
		if($controls_wrapper.clientWidth < 360) $dropdown_ul.classList.add('dropdown-ul-full-width');
		else $dropdown_ul.classList.remove('dropdown-ul-full-width');
	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	create_controls = () => {

		// ________________________________________________________________________________________________________________
		const btn_mode_click = (e) => {
			toggle_mode(e.currentTarget.command);
		},

		// ________________________________________________________________________________________________________________
		dropdown_input_click = () => {

			let i = 0;

			// öffnen
			if($dropdown_input.opened === false){
				$dropdown_input.opened = true;

				const dropdown_li_mouseup = (e) => {

					if(e.currentTarget.l_id !== p_cid){
						p_cid = e.currentTarget.l_id;

						toggle_loading(true);

						vscode.postMessage({ // ███ vscode APi ███
							command: 'change_palette',
							p_cid: p_cid,
						});
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

				$dropdown_ul.classList.remove('hide'); // nicht className (siehe "window_resize_end()")
				$dropdown_wrapper.appendChild($dropdown_ul);

			}

		},

		// schließen --------------------------------------------------------
		dropdown_close = () => {
			$dropdown_input.value = arr_p[p_cid];
			$dropdown_input.opened = false;
			$dropdown_li = [];
			$dropdown_ul.innerHTML = '';
			$dropdown_ul.classList.add('hide'); // nicht className (siehe "window_resize_end()")
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

			let i = 0,
				n = 0;

			if( e.keyCode === 27 ) { // esc
				$dropdown_input.value = arr_p[p_cid];
				for (i = 0; i < p_len; i++)  $dropdown_li[i].className = '';
				$dropdown_ul.classList.add('hide'); // nicht className (siehe "window_resize_end()")
				return;
			}

			for (i = 0; i < p_len; i++) {
				if(arr_p[i].toLowerCase().indexOf( $dropdown_input.value.toLowerCase() ) !== -1){
					$dropdown_li[i].className = '';
					n++;
				}
				else{
					$dropdown_li[i].className = 'hide';
				}
			}

			// bei leer 'hide', sonst scrollbar zu sehen
			if(n === 0) $dropdown_ul.classList.add('hide'); // nicht className (siehe "window_resize_end()")
			$dropdown_ul.classList.remove('hide');

		},

		// btn add click ________________________________________________________________________________________________________________
		btn_add_click = () => {
			add_colors(true, true, c_cid, false); // true = new color, true = new color, insert-pos
		},

		// btn add click ________________________________________________________________________________________________________________
		btn_restore_click = () => {

			const restore_palette = () => {
				toggle_loading(true);
				vscode.postMessage({ // ███ vscode APi ███
					command: 'change_palette',
					p_cid: p_cid,
				});
			};

			dialogbox('Restore?', true, false, false, callback => {
				if (callback === true) restore_palette();
			});

		},

		// btn add click ________________________________________________________________________________________________________________
		btn_texteditor_click = () => {
			vscode.postMessage({ // ███ vscode APi ███
				command: 'edit_palette_in_texteditor'
			});
		},



		// def const
		$toggle_wrapper = document.createElement('div'),
		$dropdown_wrapper = document.createElement('div'),
		$edit_wrapper = document.createElement('div'),
		$edit_btn_wrapper = document.createElement('div'),

		$sb_wrapper = document.createElement('div'),
		$sb_active_icon = document.createElement('i');

		// def var
		let $dropdown_li = [],
			$el = null; // dummy (mehrfach verwendet)

		// def globals
		$main_wrapper = document.createElement('div');
		$controls_wrapper = document.createElement('div');
		$dropdown_input = document.createElement('input');
		$dropdown_ul = document.createElement('ul');
		$btn_filter = document.createElement('p');
		$filter_wrapper = document.createElement('div');
		$filter_input = document.createElement('input');

		$sb_counter = document.createElement('span');
		$sb_active_wrapper = document.createElement('span');
		$sb_active = document.createElement('em');

		// btn save click (global für shortcuts) ________________________________________________________________________________________________________________
		window.btn_save_click = () => {

			dialogbox('Save?', true, false, false, callback => {
				if (callback === true){
					vscode.postMessage({ // ███ vscode APi ███
						command: 'save_palette', // -> extension.js -> 'save_palette_success()' (s.u.)
						arr_n: arr_n,
						arr_c: arr_c,
						c_len: c_len
					});
				}
			});

		};


		// start create_controls ___________________________________________________________________________________________________________________

		$controls_wrapper.id = 'controls-wrapper';
		$toggle_wrapper.id = 'toggle-wrapper';

		$edit_wrapper.id = 'edit-wrapper';

		$edit_btn_wrapper.id = 'edit-btn-wrapper';

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
		$btn_filter.addEventListener('click', () => toggle_filter(true) );
		$toggle_wrapper.appendChild($btn_filter);

		// filter wrapper
		$filter_wrapper.id = 'filter-wrapper';
		$filter_wrapper.className = 'hide';

		$filter_input.addEventListener('keyup', filter_colors, false);
		$filter_wrapper.appendChild($filter_input);

		$controls_wrapper.appendChild($toggle_wrapper); // ███ document position 2 ███
		$controls_wrapper.appendChild($filter_wrapper);

		// edit wrapper -------------------------------------------------------------------------------------------------------------

		// btn add
		$el = document.createElement('p');
		$el.id = 'btn-add';
		$el.title = 'add color';
		$el.addEventListener('mousedown', btn_add_click, false);
		$edit_btn_wrapper.appendChild($el);

		// btn palette manager
		$el = document.createElement('p');
		$el.id = 'btn-pm-open';
		$el.title = 'open palette manager';
		$el.addEventListener('mousedown', palette_manager_open, false);
		$edit_btn_wrapper.appendChild($el);

		// btn texteditor
		$el = document.createElement('p');
		$el.id = 'btn-texteditor';
		$el.title = 'edit palette in texteditor';
		$el.addEventListener('mousedown', btn_texteditor_click, false);
		$edit_btn_wrapper.appendChild($el);

		// btn restore
		$el = document.createElement('p');
		$el.id = 'btn-restore';
		$el.title = 'restore palette';
		$el.addEventListener('mousedown', btn_restore_click, false);
		$edit_btn_wrapper.appendChild($el);

		// btn save
		$el = document.createElement('p');
		$el.id = 'btn-save';
		$el.title = 'save palette';
		$el.addEventListener('mousedown', btn_save_click, false);
		$edit_btn_wrapper.appendChild($el);

		// zusammenbauen --------------------------------------------

		$edit_wrapper.appendChild($edit_btn_wrapper);

		// append
		$controls_wrapper.appendChild($edit_wrapper); // ███ document position 3 ███

		$main_wrapper.id = 'main-wrapper';
		$main_wrapper.className = 'hide'; // ███ Performance / wird nach create_color_wrappers() entfernt ███
		$main_wrapper.appendChild($controls_wrapper);

		// statusbar
		$sb_wrapper.id = 'statusbar';

		$sb_active_wrapper.title = 'scroll to active';
		$sb_active_wrapper.addEventListener('click', () => { scroll_to_active(true); }); // scroll_even_when_visible = true

		$sb_active_wrapper.appendChild($sb_active_icon);
		$sb_active_wrapper.appendChild($sb_active);

		$sb_wrapper.appendChild($sb_counter);
		$sb_wrapper.appendChild($sb_active_wrapper);
		$main_wrapper.appendChild($sb_wrapper);

	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	set_dropdown_input = (val) => {
		$dropdown_input.value = val;
	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	toggle_filter = (refresh) => {

		let i = 0;

		// filter input einblenden
		if(filter_open === false){
			filter_open = true;
			$filter_wrapper.className = '';
			$btn_filter.className = 'active';
			was_filtered = false;
			$filter_input.focus();
		}
		// filter input ausblenden / Filterung aufheben
		else{

			const reset_wrappers = () => {
				$color_wrapper_main.classList.add('hide'); // ███ Performance ███
				for (i = 0; i < c_len; i++) $color_wrappers[i].className = 'color-wrapper';
				$color_wrapper_main.classList.remove('hide'); // ███ Performance ███
			};

			if(mode_current === 'insert-compactview'){
				reset_wrappers();
			}
			else{

				if(refresh === true){

					if(filtered_ids_len < c_len) reset_wrappers();

					if(c_len > dynamic_scroll_limit){

						// Dynamic Scroll Abmessungen bereits ermittelt? Dieser Fall tritt ein, wenn die Extension im compactview und im gefilterten Zustand geöffnet
						// wird und dann auf listview gewechselt wurde. In diesem Fall sind die für dynamic scroll erforderlichen Abmessungen noch nicht gemacht.
						if (color_wrapper_height === 0) dynamic_scroll_get_values();

						// zum Anfang scrollen
						window.scrollTo(0,0);
						dyn_scroll_y_pos = 0;
						visible_index_start_mem = 0;
						visible_index_end_mem = current_visible_wrappers * 3;

						for (i = 0; i < c_len; i++) $color_wrappers[i].className = i > visible_index_end_mem ? 'hide' : 'color-wrapper';

						$main_wrapper.style.padding = '0 0 ' + ((c_len - visible_index_end_mem) * color_wrapper_height) + 'px 0';

						if(dynamic_scroll_is_active === false) dynamic_scroll_bind_listener(); // scroll-listener wurde während der Filterung entfernt (neu binden)

					}

				}

			}

			filter_open = false;
			filter_val = '';

			arr_filtered_ids = [];
			filtered_ids_len = 0;

			was_filtered = false;

			$btn_filter.className = '';
			$filter_wrapper.className = 'hide';
			$filter_input.value = '';

			set_statusbar_counter();
			set_statusbar_active();

			// "no results" entfernen
			$color_wrapper_main.classList.remove('filter-no-results');

		}

		set_controls_height();

		store_settings();

	},

	// filter colors _____________________________________________________________________
	filter_colors = () => {

		let i = 0;

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
			dyn_scroll_y_pos = 0;
			visible_index_start_mem = 0;
			visible_index_end_mem = current_visible_wrappers * 3;
		}

		// reset
		arr_filtered_ids = [];
		filtered_ids_len = 0;

		// ohne dynamic scroll (wrapper sofort ein- oder ausblenden) --------------------------------------------------------------------
		if(mode_current === 'insert-compactview' ||  (mode_current !== 'insert-compactview' && c_len < dynamic_scroll_limit)){
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

		filter_empty_info();

		store_settings();

	},

	filter_empty_info = () => {

		// Wenn der Color Manager mit aktiviertem Filter geöffnet wird oder wenn eine Palette mit aktiviertem Filter gewechselt wird und
		// dann keine Ergebnisse zu sehen sind, dann sieht das komisch aus (als würde die Extension nicht funktionieren). Daher eine Info-Klasse anzeigen!

		if(filtered_ids_len === 0) $color_wrapper_main.classList.add('filter-no-results');
		else $color_wrapper_main.classList.remove('filter-no-results');

	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	palette_manager_open = () => {

		if(pm_is_open === true) return; // ███ exit ███

		// add _____________________________________________________________________________________________________
		const pm_add_save_as_input_keydown = (e) => {
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

			dialogbox('Save?', true, false, false, callback => {
				if (callback === true){

					vscode.postMessage({ // ███ vscode APi ███
						command: 'add_palette', // -> extension.js -> 'palette_added_success()' (s.u.)
						add_saveas: add_saveas, // true = add, false = save as
						arr_n: arr_n,
						arr_c: arr_c,
						fname: fname
					});

				}
			});

		},

		// rename _____________________________________________________________________________________________________
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

			dialogbox('Rename?', true, false, false, callback => {
				if (callback === true){
					vscode.postMessage({ // ███ vscode APi ███
						command: 'rename_palette', // -> extension.js -> 'rename_palette_success()' (s.u.)
						p_id: t_id,
						fname: fname
					});
				}
			});

		},

		// _____________________________________________________________________________________________________
		pm_check_filename = (fname) => {

			if(fname === '') return false; // ███ exit ███

			// prüfen ob Dateiname bereits existiert
			if(arr_p.findIndex((el) => el.toLowerCase() === fname.toLowerCase()) !== -1){
				dialogbox('Not possible! Name already exists!', false, false, false, callback => {});
				return false;
			}

			if (fname.match(/[\\\\/:*?\'<>|]/g)) {
				dialogbox('Not possible! These chars are not allowed: \\ / : * ? " < > | ', false, false, false, callback => {});
				return false;
			}

			return true;

		},

		// _____________________________________________________________________________________________________
		pm_delete_click = (e) => {

			const t_id = e.currentTarget.parentNode.t_id;

			dialogbox('Delete?', true, false, false, callback => {
				if (callback === true){
					vscode.postMessage({ // ███ vscode APi ███
						command: 'delete_palette',  // -> extension.js -> "received_palette_deleted_success()" (s.u.)
						p_id: t_id,
					});
				}
			});

		},

		// _____________________________________________________________________________________________________
		pm_btn_mouseenter = (e) => {
			$pm_list_wrapper_main.classList.add('hover-helper');
			$pm_list_wrappers[e.currentTarget.parentNode.t_id].classList.add('hover-helper-highlight');
		},

		pm_btn_mouseleave = (e) => {
			$pm_list_wrapper_main.classList.remove('hover-helper');
			$pm_list_wrappers[e.currentTarget.parentNode.t_id].classList.remove('hover-helper-highlight');
		},

		// _____________________________________________________________________________________________________
		pm_create_listwrappers = () => {

			let i = 0;

			for (i; i < p_len; i++) {

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
				$el.addEventListener('mouseenter', pm_btn_mouseenter, false);
				$el.addEventListener('mouseleave', pm_btn_mouseleave, false);
				$pm_list_wrappers[i].appendChild($el);

				// btn delete
				$el = document.createElement('p');
				$el.addEventListener('mousedown', pm_delete_click, false);
				$el.addEventListener('mouseenter', pm_btn_mouseenter, false);
				$el.addEventListener('mouseleave', pm_btn_mouseleave, false);
				$pm_list_wrappers[i].appendChild($el);

				$pm_list_wrapper_main.appendChild($pm_list_wrappers[i]);

			}

			$pm_list_wrappers[p_cid].classList.add('active');

		},

		// def const _____________________________________________________________________________________________________
		$pm_wrapper_outer = document.createElement('div'),
		$pm_wrapper = document.createElement('div'),
		$pm_list_wrapper_main = document.createElement('div');


		// def global _____________________________________________________________________________________________________

		window.pm_refresh = () => {

			$pm_wrapper_outer.classList.add('hide'); // ███ Performance ███

				const wrappers_len = $pm_list_wrappers.length; // nicht "p_len" verwenden! (wurde vorher aktualisiert und ist nicht mehr aktuell / siehe "create_palette_arrays")
				let i = 0;
				for (i; i < wrappers_len; i++) $pm_list_wrapper_main.removeChild($pm_list_wrappers[i]);
				$pm_list_wrappers = [];
				$pm_list_inputs = [];
				pm_create_listwrappers();

			$pm_wrapper_outer.classList.remove('hide'); // ███ Performance ███

		};

		window.pm_close = () => {
			document.body.removeChild($pm_wrapper_outer);
			document.body.classList.remove('overflow-hidden');
			pm_is_open = false;
		};

		// start palette_manager_open _____________________________________________________________________________________________________

		let $pm_list_wrappers = [],
			$pm_list_inputs = [],
			$el_wrapper = document.createElement('div'), // dummy (mehrfach verwendet)
			$el = null; // dummy (mehrfach verwendet)

		$pm_wrapper_outer.id = 'pm-wrapper-outer';
		$pm_wrapper_outer.className = 'drag-head-wrapper-outer'; // drag head
		$pm_wrapper.id = 'pm-wrapper';
		$pm_wrapper.className = 'drag-head-wrapper'; // drag head

		$pm_list_wrapper_main.id = 'pm-list-wrapper';

		// Titel + close button ---------------------------
		$el = document.createElement('p');
		$el.addEventListener('mousedown', pm_close, false);
		$el_wrapper.id = 'pm-head'; // drag head
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

		// Datei-Liste  ---------------------------

		pm_create_listwrappers();

		$pm_wrapper.appendChild($pm_list_wrapper_main);
		$pm_wrapper_outer.appendChild($pm_wrapper);

		// append
		document.body.classList.add('overflow-hidden');
		document.body.appendChild($pm_wrapper_outer);

		// Picker schließen
		if(picker_open === true) picker_close();

		pm_is_open = true;

	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	dialogbox = (text, show_cancel, arr_options ,input, callback_function) => { // input = false || {input:'placeholdertext'}

		const dib_click_ok = () => {
			if(input !== false){ // mit input
				const inp_val = $dib_input.value.trim();
				if(inp_val !== ''){ // nur Callback und Schließen wenn im Input ein Wert eingegeben wurde
					callback_function(inp_val);
					dib_close();
				}
			}
			else{ // ohne input
				callback_function(true);
				dib_close();
			}
		},

		dib_option_click = (e) => {
			let t_id = e.currentTarget.t_id; // t_id = this id
			if(show_cancel === true){
				if(t_id === arr_options.length - 1) t_id = false; // letzter Button ist Cancel-Button / return false
			}
			callback_function(t_id);
			dib_close();
		},

		dib_keydown = (e) => {
			if( e.keyCode === 9 ) e.preventDefault();// tab
			if(arr_options === false && e.keyCode === 13) dib_click_ok(); // enter
			if(show_cancel === true && e.keyCode === 27 ) dib_cancel();  // esc
		},

		dib_close = () => {
			document.removeEventListener('keydown', dib_keydown, false); // unbind
			$main_wrapper.removeChild($dib_wrapper);
			$el_active.focus(); // Fokus zurücksetzen
			document.addEventListener('keypress', doc_keypress, false); // globale shortcuts wiederherstellen
			dib_open = false;
		},

		$el_active = document.activeElement,

		// outer wrapper
		$dib_wrapper = document.createElement('div'),
		$dib_wrapper_inner = document.createElement('div');

		window.dib_cancel = () => {
			callback_function(false);
			dib_close();
		};

		let $dib_input = null,
			$el = null,
			opt_len = 0,
			tmp = null,
			i = 0;

		// Start -------------------------------------------------------------------

		dib_open = true;

		// globale shortcuts vorrübergehend deaktivieren
		document.removeEventListener('keypress', doc_keypress, false);

		$dib_wrapper.id = 'dib-wrapper';

		// text
		$el = document.createElement('span');
		$el.textContent = text;
		$dib_wrapper_inner.appendChild($el);

		// input?
		if(input !== false){
			$dib_input = document.createElement('input');
			$dib_input.type = 'text';
			$dib_input.value = input.input;
			$dib_wrapper_inner.appendChild($dib_input); // als erstes hintzufügen, noch vor den beiden buttons!
		}

		// arr_options?
		if(arr_options === false) {

			// OK-Button
			$el = document.createElement('p');
			$el.textContent = 'OK';
			$el.addEventListener('click', dib_click_ok, false);
			$dib_wrapper_inner.appendChild($el);

			// cancel
			if(show_cancel === true){
				$el = document.createElement('p');
				$el.textContent = 'Cancel';
				$el.addEventListener('click', dib_cancel, false);
				$dib_wrapper_inner.appendChild($el);
			}

		}
		else{

			// cancel?
			if(show_cancel === true) {
				arr_options.push('Cancel');
				tmp = ' has-cancel';
			}
			else{
				tmp = '';
			}

			$dib_wrapper_inner.className = 'has-options' + tmp;

			opt_len = arr_options.length;

			for (i = 0; i < opt_len; i++) {
				$el = document.createElement('p');
				$el.innerHTML = arr_options[i]; // nicht textContent, sondern innerHtml wegen hyphens:manual / &shy;
				$el.t_id = i; // t_id = this id
				$el.addEventListener('click', dib_option_click, false);
				$dib_wrapper_inner.appendChild($el);
			}

		}

		// append
		$dib_wrapper.appendChild($dib_wrapper_inner);
		$main_wrapper.appendChild($dib_wrapper);

		// Mindestbreite?
		if($dib_wrapper_inner.offsetWidth < dib_min_width ){
			$dib_wrapper_inner.classList.add('dib-stretch');
		}

		$el_active.blur(); // Wichtig! Fokus auf aktivem Element entfernen, sonst werden ggf. Key-Events gefeuert wenn der focus auf einem input verbleibt!

		setTimeout(() => { // trotz blur ist timeout nötig
			document.addEventListener('keydown', dib_keydown, false); // Keydown!!! Sonst Überschneidung mit  Palette Manager Inputs!
		}, 0);

		if(input !== false){
			$dib_input.focus();
			$dib_input.select();
		}

	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

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
		if(context_is_open === true && sel_len > 0) return; // ███ exit ███

		let set_c_cid = -1,
			i = 0;

		// einfacher Klick --------------------------------------------------------------------------------------------------------------
		if(ctrl_key === false && shift_key === false){
			if(c_cid !== -1) $color_inp_wrappers[c_cid].className = ''; // alten Auswahlrahmen entfernen
			set_c_cid = e.currentTarget.wid;
		}
		// ctrl | shift --------------------------------------------------------------------------------------------------------------
		else{

			// keine Mehrfachauswahl im Sortier-Modus
			if(sort_mode === true) return; // ███ exit ███


			const sel_id = e.currentTarget.wid;

			// ctrl ---------------------------------------------------------
			if(ctrl_key === true){

				// ausgewählter wrapper entspricht c_cid -> demarkieren
				if(sel_id === c_cid){
					$color_inp_wrappers[c_cid].className = '';
					c_cid = -1;
					store_settings(); // "c_cid" aktualisieren!
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
						loop_start = filter_open === false ? c_cid + 1 : arr_filtered_ids.indexOf(c_cid) + 1;
						loop_end = filter_open === false ? sel_id : arr_filtered_ids.indexOf(sel_id);
					}
					// sel_id oberhalb von c_cid
					else if(sel_id < c_cid){
						loop_start = filter_open === false ? sel_id : arr_filtered_ids.indexOf(sel_id);
						loop_end = filter_open === false ? c_cid - 1 : arr_filtered_ids.indexOf(c_cid) - 1;
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
						loop_end = filter_open === false ? sel_id - 1 : arr_filtered_ids.indexOf(sel_id) - 1;
						set_c_cid = sel_id; // aktiven wrapper setzen
					}
					// Selection vorhanden
					else{

						// sortieren um höchste und niedrigste id zu ermitteln
						if(sel_len > 1) arr_sel_ids.sort((a, b) => {return a-b;});

						const id_first = filter_open === false ? arr_sel_ids[0] : arr_filtered_ids.indexOf(arr_sel_ids[0]);

						// sel_id unterhalb von erstem selektierten wrapper
						if(sel_id > id_first){
							loop_start = id_first + 1;
							loop_end = filter_open === false ? sel_id : arr_filtered_ids.indexOf(sel_id);
						}
						// sel_id oberhalb von erstem selektierten wrapper
						else if(sel_id < id_first){
							loop_start = filter_open === false ? sel_id : arr_filtered_ids.indexOf(sel_id);
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

					if(filter_open === false){ // ohne Filter
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
			store_settings(); // "c_cid" aktualisieren!
		}

		set_statusbar_active(); // Statusbar aktualisieren (Immer! Auch wenn user per ctrl die active-Klasse aufhebt)

	},

	// colorwrapper mousedown _______________________________________________________________________________________________
	colorwrapper_mousedown = () => {

		// siehe doc_keydown()
		if (ctrl_combo === true) {
			ctrl_combo = false;
			ctrl_key = false;
			shift_key = false;
			$color_wrapper_main.classList.remove('multi-select');
		}

	},

	// focusin beide inputs  ______________________________________________________________________________________________
	colorwrapper_inputs_focusin = (e) => {

		// Contextmenü: Rechtsklick auf einzelnen wrapper erlauben (nur abbrechen wenn mehrere markiert)
		if(context_is_open === true && sel_len > 0) return; // ███ exit ███

		//Info! Dient nur zur Navigation mit tab-Taste! Wenn tab in einen neuen wrapper springt muss dieser als aaktiv markiert werden
		const this_wid = e.currentTarget.wid;
		if(this_wid !== c_cid){
			if(c_cid !== -1) $color_inp_wrappers[c_cid].className = ''; // alten Auswahlrahmen entfernen
			c_cid = this_wid;
			$color_inp_wrappers[c_cid].className = 'active';
			store_settings(); // "c_cid" aktualisieren!
		}

	},

	// colorwrapper_colorspan_click ______________________________________________________________________________________________
	colorwrapper_colorspan_click = () => {
		if(context_is_open === true || prevent_doc_insert === true) return;

		const insert_val = arr_c[c_cid]; // "c_cid" wird kurz zuvor unter "colorwrapper_mouseup()" ermittelt

		vscode.postMessage({ // ███ vscode APi ███
			command: 'insert',
			insert_val: insert_val
		});

		// insert-Animation
		if(current_ani_id !== c_cid){
			current_ani_id = c_cid;
			$color_wrappers[c_cid].className = 'color-wrapper ani-insert';
		}
		// mehrfacher Click auf gleichen wrapper
		else{
			$color_wrappers[c_cid].className = 'color-wrapper'; // Animationsklasse entfernen
			setTimeout(() => $color_wrappers[c_cid].className = 'color-wrapper ani-insert', 0);  // Animationsklasse erneut hinzufügen
		}

	},

	// ______________________________________________________________________________________________

	colorwrapper_switch_click = () => {

		if(context_is_open === true) return; // ███ exit ███


		// Auf Ausgangsfarbe zurücksetzen? -------------------------------------------------------------------------------------------------------------
		// (da HSL zu HEX-Umwandlung zu Ungenauigkeiten führt / vscode-onboard-Picker macht genau das Gleiche)
		let temp = [],
			color_new = '',
			c_sys_new = -1;

		// Bei erstem Klick den Ausgangswert als hsl speichern / gleiches Prinzip wie "open_picker()"
		if(switch_btn_cid !== c_cid){
			switch_btn_cid = c_cid; // wird nicht mehr erreicht bis anderer Button geklickt wird

			c_switch.init_color = arr_c[c_cid];
			temp = get_color_metrics(c_switch.init_color); // [csys, arr_hsla, css_hex_init]   csys = false | 1 = HEX6 | 2 = HEX6a | 3 = HEX3 | 4 = HEX3a | 5 = rgb | 6 = rgba | 7 = hsl | 8 = hsla | 9 = css color | 10 = gradient
			c_switch.csys = temp[0];
			c_switch.csys_init = temp[0];
			c_switch.arr_hsla_init = temp[1];
		}

		// Ausgangswert war hex oder css? -------------------------------------------------------------------------------------------------------------
		if((c_switch.csys_init > 0 && c_switch.csys_init < 5) || c_switch.csys_init === 9) {

			// (noch) aktuelles System ist hsl (also eine Stufe vor Sprung zu CSS oder HEX)
			if(c_switch.csys === 7 || c_switch.csys === 8){

				// stimmt die aktuelle hsl-Farbe mit den hsl-Werten der Ausgangsfarbe überein?
				temp = get_color_metrics(arr_c[c_cid])[1]; // [csys, arr_hsla, css_hex_init]   csys = false | 1 = HEX6 | 2 = HEX6a | 3 = HEX3 | 4 = HEX3a | 5 = rgb | 6 = rgba | 7 = hsl | 8 = hsla | 9 = css color | 10 = gradient

				if( temp[0] === c_switch.arr_hsla_init[0] && temp[1] === c_switch.arr_hsla_init[1] && temp[2] === c_switch.arr_hsla_init[2] && temp[3] === c_switch.arr_hsla_init[3] ){
					color_new = c_switch.init_color;
					c_sys_new = c_switch.csys_init;
				}

			}

		}

		// switch color system -------------------------------------------------------------------------------------------------------------

		// immer noch -1 / nich aktualisiert in vorherigem if-block?
		if(c_sys_new === -1) {
			temp = switch_color_system(arr_c[c_cid]); // [csys_new, str_color_new]
			c_sys_new = temp[0];
			color_new = temp[1];
		}

		// set -------------------------------------------------------------------------------------------------------------
		if(c_sys_new !== false){
			arr_c[c_cid] = color_new;
			$color_inputs_c[c_cid].value = color_new;
			c_switch.csys = c_sys_new; // csys aktualisieren
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
		val = val.indexOf(':') !== -1 ? val.replace(/\:/g, '.') : val; // Doppelpunkt nicht erlaubt (siehe settings-Datei)
		arr_n[id] = val; // array aktualisieren
		store_colors(); // Farben für erneutes Öffnen aktualisieren!
	},

	// color-input ______________________________________________________________________________________________
	colorwrapper_input_c_focusout = () => {
		if(context_is_open === true) return;
		if(c_cid !== -1) cw_input_c_check(c_cid); // hier kann nicht mit 'c_cid' gearbeitet werden, da focusin eher gefeuert wird und die 'c_cid' aktualisiert (s.o.)
		//if(c_cid !== -1) cw_input_c_check(e.currentTarget.parentNode.parentNode.wid); // hier kann nicht mit 'c_cid' gearbeitet werden, da focusin eher gefeuert wird und die 'c_cid' aktualisiert (s.o.)
	},

	colorwrapper_input_c_keyup = (e) => {
		if(e.keyCode === 13) cw_input_c_check(c_cid);
	},

	cw_input_c_check = (id) => {
		const val = $color_inputs_c[id].value.trim();
		arr_b[id] = check_colors(val) === false ? color_error_bg : val;
		arr_c[id] = val;
		$color_spans[id].style.background = arr_b[id];
		store_colors(); // Farben für erneutes Öffnen aktualisieren!
	},

	// create_color_wrappers ________________________________________________________________________________________________________________________

	create_color_wrappers = (loop_start, loop_stop, set_background) => {

		let class_name = '',
			set_title = false,
			$el = null,
			i = 0;

		// list-view
		if(mode_current !== 'insert-compactview'){
			// bei Init dynamic scroll ? Wenn Anzahl der color-wrapper 'dynamic_scroll_limit' übersteigt, dann allen wrappern erstmal 'hide'-Klasse zuweisen (danach weiter bei message/init s.u.)
			// mit dynamischem scrollen || ohne dynamisches scrollen (sofort sichtbar)
			class_name = (c_len > dynamic_scroll_limit || filter_open === true) ? 'hide' : 'color-wrapper';
			set_title = false;
		}
		// float-view
		else{
			class_name = filter_open === true ? 'hide' : 'color-wrapper';
			set_title = true;
		}

		// ███ Init ███ create main-wrapper (append s.u.)
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
			$main_wrapper.className = mode_current+' hide'; // ███ Performance s.u. ███
		}

		for (i = loop_start; i < loop_stop; i++) {

			$color_wrappers[i] = document.createElement('div');
			$color_wrappers[i].wid = i; // wid = wrapper-id
			$color_wrappers[i].className = class_name;
			$color_wrappers[i].addEventListener('mousedown', colorwrapper_mousedown, false);
			$color_wrappers[i].addEventListener('mouseup', colorwrapper_mouseup, false);

			// compactview title-tooltip?
			if (set_title === true) $color_wrappers[i].title = arr_n[i] === arr_c[i] ? arr_n[i] : arr_n[i]+': '+arr_c[i];

			$color_spans[i] = document.createElement('span');
			$color_spans[i].addEventListener('click', colorwrapper_colorspan_click, false);

			// Beim Init und bei Refreshes werden die Hintergründe sofort gesetzt. Nur bei "add_colors()" werden die Hintergründe hier erstmal nicht gesetzt,
			// weil die wrapper hinten angehangen werden (das macht unter "add_colors()" dann "refresh_color_wrappers()")
			if(set_background === true) {
				arr_b[i] = check_colors(arr_c[i]) === false ? color_error_bg : arr_c[i];
				$color_spans[i].style.background = arr_b[i];
			}

			$color_inp_wrappers[i] = document.createElement('div');

			$color_inputs_n[i] = document.createElement('input');
			$color_inputs_n[i].wid = i; // wid = wrapper-id
			$color_inputs_n[i].addEventListener('focusin', colorwrapper_inputs_focusin, false);
			$color_inputs_n[i].addEventListener('focusout', colorwrapper_input_n_focusout, false);
			$color_inputs_n[i].addEventListener('keyup', colorwrapper_input_n_keyup, false);
			$color_inputs_n[i].value = arr_n[i];

			$color_inputs_c[i] = document.createElement('input');
			$color_inputs_c[i].wid = i; // wid = wrapper-id
			$color_inputs_c[i].addEventListener('focusin', colorwrapper_inputs_focusin, false);
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

		// ███ Init ███ append main-wrapper
		if(init === true){
			if(c_cid !== -1 && c_cid < c_len) $color_inp_wrappers[c_cid].className = 'active'; // < c_len, falls User im Texteditor zwischenzeitlich Farben entfernt hat
			set_statusbar_active();
			$main_wrapper.appendChild($color_wrapper_main); // ███ document position 4 ███
		}
		else{
			$main_wrapper.className = mode_current; // ███ hide aufheben / Performance s.o. ███
		}

		if(filter_open === false) set_statusbar_counter(); // wird anderenfalls später durch die Filter-Funktion gemacht

	},

	// drag drop ________________________________________________________________________________________________________________________

	colorwrapper_drag_mousedown = (e) => {

		let i = 0;

		$el_drag = e.currentTarget;
		$el_hover = $el_drag;
		drag_id = $el_drag.wid;

		for (i; i < c_len; i++) $color_wrappers[i].addEventListener('mouseenter', colorwrapper_drag_mouseenter, false);
		document.addEventListener('mouseup', colorwrapper_drag_doc_mouseup, false);

		if(c_cid !== -1) $color_inp_wrappers[c_cid].className = ''; // 'active' entfernen init oder re-init

		$el_drag.className = 'color-wrapper drag-element';
		$color_inp_wrappers[drag_id].className = 'active';
		c_cid = drag_id;

	},

	colorwrapper_drag_mouseenter = (e) => {

		hover_id = e.currentTarget.wid;

		swap_colorwrappers(hover_id, drag_id);

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
		let i = 0;
		for (i; i < c_len; i++) { $color_wrappers[i].removeEventListener('mouseenter', colorwrapper_drag_mouseenter, false); }
		document.removeEventListener('mouseup', colorwrapper_drag_doc_mouseup, false);
		$el_drag.className = 'color-wrapper'; // drag-Klasse entfernen
		store_colors(); // Farben für erneutes Öffnen aktualisieren!
	},

	// context menu █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	set_context_click_area = () => {
		$color_wrapper_main.style.minHeight = (window_height - controls_height - statusbar_height - 4)+'px'; // -4 = Toleranz (2 würde eigentlich reichen)     Statusbar-Höhe entspricht padding-bottom des Body (siehe css)
	},

	open_context = (e) => {

		e.preventDefault();

		// _________________________________________________________________________________________________________________
		const context_open_picker = () => {
			if(c_cid !== -1){
				prepare_open_picker(arr_c[c_cid]);
			}
			else{ // user hat c_cid mit ctrl deaktiviert
				if(sel_len > 0) prepare_open_picker(arr_c[arr_sel_ids[0]]);
			}
		},

		// _________________________________________________________________________________________________________________
		context_create_alpha_steps = () => {

			const create_alpha_steps = (steps) => {

				const 	arr_new_n = [],
						arr_new_c = [];

				let str_color = arr_c[a_id],
					is_hex = false,
					arr_hsla = [],
					hsla_len = 0,
					step_size = 0,
					step_current = 0,
					temp = null,
					i = 0,
					n = 0;

				// rgb | hsl --------------------------------------------------------------------
				if(check_result >= 5 && check_result <= 8){

					// rgb -> hsl
					if(check_result === 5 || check_result === 6){
						arr_hsla = rgba_to_hsla( str_rgba_hsla_to_arr(str_color) );
					}
					// hsl-string -> hsl
					else if(check_result === 7 || check_result === 8){
						arr_hsla = str_rgba_hsla_to_arr(str_color);
					}

					hsla_len = arr_hsla.length;

					if(hsla_len === 3) step_size = 1 / steps; // hsl
					else step_size = arr_hsla[3] / steps; // hsla

				}
				// hex | css --------------------------------------------------------------------
				else {

					is_hex = true;

					// HEX6a | HEX3a
					if(check_result === 2 || check_result === 4) {
						// HEX3a: da alpha bei shorthex aus nur einem Zeichen besteht sind keine 2-stelligen alpha-Transparenzen möglich (daher Umwandung in normalen Hex)
						if(check_result === 4) str_color = convert_short_hex(str_color, 48);
						str_color = str_color.slice(0,-2);
						step_size = hex_get_alpha(str_color) / steps;
					}
					// HEX6 | HEX3 | CSS
					else{
						// HEX3: da alpha bei shorthex aus nur einem Zeichen besteht sind keine 2-stelligen alpha-Transparenzen möglich (daher Umwandung in normalen Hex)
						if(check_result === 3) str_color = convert_short_hex(str_color, 36);
						// CSS
						else if(check_result === 9) str_color = css_to_hex(str_color);
						step_size = 1 / steps;
					}

				}


				for (i = steps; i >= 0; i--) {

					step_current = parseFloat((step_size * i).toFixed(2));

					if(step_current !== 0 && step_current !== 1) {

						// hex ----------------------------------
						if(is_hex === true) {
							arr_new_c[n] = hex_add_alpha(str_color, step_current);
						}
						// hsl | rgb ----------------------------------
						else{

							temp = [arr_hsla[0], arr_hsla[1], arr_hsla[2], step_current];

							// hsla -> rgba
							if(check_result === 5 || check_result === 6){
								arr_new_c[n] = arr_rgba_hsla_to_str( hsla_to_rgba( temp ), 'rgb');
							}
							// hsla -> hsla-string
							else if(check_result === 7 || check_result === 8){
								arr_new_c[n] = arr_rgba_hsla_to_str( temp, 'hsl');
							}

						}

						// opacity-step zum Namen hinzufügen
						arr_new_n[n] = arr_n[a_id] + ' ' + step_current.toString();

						n++;

					}

				}

				// ungefiltert
				if(filtered_ids_len === 0){
					add_colors(arr_new_n, arr_new_c, c_cid + 1, false); // insert_pos = c_cid + 1 (direkt hinter aktuellem wrapper einfügen)
				}
				// gefiltert
				else{

					/* Achtung! Im gefilterten Zustand funktioniert "c_cid + 1" als insert_pos nicht! Hier müsste die Position von c_cid in arr_filtered_ids ermittelt
					werden und dessen Nachfolger als insert_pos festgelegt werden. Wenn man den Filter deaktiviert führt das aber dazu dass die Originalfarbe und die
					erzeugten Abstufungen auseiandergerissen werden, da sich die ermittelte insert_pos auch viel weiter hinten befinden kann (im ungefilterten Zustand).
					Daher erstmal "c_cid" als insert_pos festlegen und abschließend die color-wrapper-Werte tauschen */

					add_colors(arr_new_n, arr_new_c, c_cid, false); // insert_pos = c_cid
					for (i = 0; i < n; i++) swap_colorwrappers(c_cid + i, c_cid + n);
					store_colors();

				}

			},

			// const / start --------------------------------------------------------------------------------------------------------------

			a_id = c_cid !== -1 ? c_cid : arr_sel_ids[0], // : user hat c_cid mit ctrl deaktiviert
			check_result = check_colors(arr_c[a_id]);  // return: false | 1 = HEX6 | 2 = HEX6a | 3 = HEX3 | 4 = HEX3a | 5 = rgb | 6 = rgba | 7 = hsl | 8 = hsla | 9 = css color | 10 = gradient

			if(check_result === false || check_result === 10){ // 10 = gradient
				dialogbox('Not possible! Invalid color value!', false, false, false, callback => {});
				return; // ███ exit ███
			}

			dialogbox('Number of steps (2-100)?', true, false, {input:10}, callback => {
				callback = parseInt(callback);
				if (callback > 0 && callback < 101) {
					create_alpha_steps(callback);
				}
			});

		},

		// _________________________________________________________________________________________________________________
		context_create_complementary = () => {

			const 	cp_id = c_cid !== -1 ? c_cid : arr_sel_ids[0], // : user hat c_cid mit ctrl deaktiviert
					check_result = check_colors(arr_c[cp_id]),  // return: false | 1 = HEX6 | 2 = HEX6a | 3 = HEX3 | 4 = HEX3a | 5 = rgb | 6 = rgba | 7 = hsl | 8 = hsla | 9 = css color | 10 = gradient
					str_name = arr_n[cp_id] + ' complementary';

			let arr_hsla = [],
				str_color = '';


			if(check_result === false || check_result === 10){ // 10 = gradient
				dialogbox('Not possible! Invalid color value!', false, false, false, callback => {});
				return; // ███ exit ███
			}


			// hex --------------------------------------------------------------------
			if(check_result >= 1 && check_result <= 4) arr_hsla = rgba_to_hsla( hex_to_rgba(arr_c[cp_id], false) ); // hex_to_rgba: true = return string, false = return array
			// css --------------------------------------------------------------------
			else if(check_result === 9) arr_hsla = rgba_to_hsla( hex_to_rgba(css_to_hex(arr_c[cp_id]), false) ); // hex_to_rgba: true = return string, false = return array
			// rgb --------------------------------------------------------------------
			else if(check_result === 5  || check_result === 6) arr_hsla = rgba_to_hsla( str_rgba_hsla_to_arr(arr_c[cp_id]) );
			// hsl --------------------------------------------------------------------
			else arr_hsla = str_rgba_hsla_to_arr(arr_c[cp_id]);


			arr_hsla[0] = arr_hsla[0] > 180 ? arr_hsla[0] - 180 : arr_hsla[0] + 180;


			// hex || css --------------------------------------------------------------------
			if(check_result >= 1 && check_result <= 4 || check_result === 9) str_color = str_rgba_to_hex( arr_rgba_hsla_to_str( hsla_to_rgba(arr_hsla), 'rgb') );
			// rgb --------------------------------------------------------------------
			else if(check_result === 5  || check_result === 6) str_color = arr_rgba_hsla_to_str( hsla_to_rgba(arr_hsla), 'rgb');
			// hsl --------------------------------------------------------------------
			else str_color = arr_rgba_hsla_to_str(arr_hsla, 'hsl');


			// ungefiltert
			if(filtered_ids_len === 0){
				add_colors([str_name], [str_color], c_cid + 1, false); // insert_pos = c_cid + 1 (direkt hinter aktuellem wrapper einfügen)
			}
			// gefiltert
			else{

				/* Achtung! Im gefilterten Zustand funktioniert "c_cid + 1" als insert_pos nicht! Hier müsste die Position von c_cid in arr_filtered_ids ermittelt
				werden und dessen Nachfolger als insert_pos festgelegt werden. Wenn man den Filter deaktiviert führt das aber dazu dass die Originalfarbe und die
				erzeugten Abstufungen auseiandergerissen werden, da sich die ermittelte insert_pos auch viel weiter hinten befinden kann (im ungefilterten Zustand).
				Daher erstmal "c_cid" als insert_pos festlegen und abschließend die color-wrapper-Werte tauschen */

				add_colors([str_name], [str_color], c_cid, false);
				swap_colorwrappers(c_cid, c_cid + 1);
				store_colors();

			}

		},

		// _________________________________________________________________________________________________________________
		context_randomize_colors = () => {

			const 	arr_random_ids = get_selected_ids(),
					random_ids_len = arr_random_ids.length;

			let i = 0;

			for (i = 0; i < random_ids_len; i++) {
				arr_n[arr_random_ids[i]] = 'Color '+(i+1);
				arr_c[arr_random_ids[i]] = arr_rgba_hsla_to_str([Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256)], 'rgb');
				arr_b[arr_random_ids[i]] = arr_c[arr_random_ids[i]];
			}

			store_colors(); // Farben für erneutes Öffnen aktualisieren!
			refresh_color_wrappers(0);

		},

		// _________________________________________________________________________________________________________________
		context_sort = () => {

			const start_sorting = (sort_type) => { // 0 = by name, 1 = by value, 2 = hue, 3 = reverse

				const arr_hsl = [];

				let arr_tmp = [],
					sort_colors = true,
					check_result = false,
					i = 0;

				// Name | Wert | reverse ------------------------------------------------------
				if(sort_type === 0 || sort_type === 1 || sort_type === 3 ){

					for (i = 0; i < sort_ids_len; i++){
						arr_tmp[i] = [ arr_n[arr_sort_ids[i]], arr_c[arr_sort_ids[i]], arr_b[arr_sort_ids[i]] ];
					}


					// Name | Wert
					if(sort_type === 0 || sort_type === 1) {
						arr_tmp.sort((a,b) => {
							if (a[sort_type] === b[sort_type]) return 0;
							else return (a[sort_type] < b[sort_type]) ? -1 : 1;
						});
					}
					// reverse
					else{
						arr_tmp.reverse();
					}


					for (i = 0; i < sort_ids_len; i++){
						arr_n[arr_sort_ids[i]] = arr_tmp[i][0];
						arr_c[arr_sort_ids[i]] = arr_tmp[i][1];
						arr_b[arr_sort_ids[i]] = arr_tmp[i][2];
					}

				}
				// hue ------------------------------------------------------
				else if(sort_type === 2){

					// alle vorhandenen Farben in HSL umwandeln und anhand hue sortieren

					for (i = 0; i < sort_ids_len; i++) {

						check_result = check_colors(arr_c[arr_sort_ids[i]]); // return: false | 1 = HEX6 | 2 = HEX6a | 3 = HEX3 | 4 = HEX3a | 5 = rgb | 6 = rgba | 7 = hsl | 8 = hsla | 9 = css color | 10 = gradient

						// hex(a)
						if(check_result >= 1 && check_result <= 4){
							arr_hsl[i] = rgba_to_hsla( hex_to_rgba(arr_c[arr_sort_ids[i]], false) ); // hex_to_rgba: true = return string, false = return array
						}
						// rgb(a)
						else if(check_result === 5 || check_result === 6){
							arr_hsl[i] = rgba_to_hsla( str_rgba_hsla_to_arr(arr_c[arr_sort_ids[i]]) );
						}
						// hsl(a)
						else if(check_result === 7 || check_result === 8){
							arr_hsl[i] = str_rgba_hsla_to_arr(arr_c[arr_sort_ids[i]]);
						}
						// css color
						else if(check_result === 9){
							arr_hsl[i] = rgba_to_hsla(hex_to_rgba( css_to_hex(arr_c[arr_sort_ids[i]]), false ));  // hex_to_rgba: true = return string, false = return array
						}
						// false oder gradient
						else{
							arr_hsl[i] = [-1]; // -1, da hue zwischen 0 und 360 liegt (s.u.)
						}

					}

					if(arr_hsl.length === 0){
						sort_colors = false;
					}
					else{

						// hue sortieren
						arr_tmp = arr_hsl.map((c, i) => {
							return {color: c, index: i};
						}).sort((a, b) => {
							return a.color[0] - b.color[0]; // hue
						}).map((obj) => {
							return [ arr_n[arr_sort_ids[obj.index]], arr_c[arr_sort_ids[obj.index]], arr_b[arr_sort_ids[obj.index]] ];
						});

						for (i = 0; i < sort_ids_len; i++){
							arr_n[arr_sort_ids[i]] = arr_tmp[i][0];
							arr_c[arr_sort_ids[i]] = arr_tmp[i][1];
							arr_b[arr_sort_ids[i]] = arr_tmp[i][2];
						}

					}

				}

				// aktualisieren
				if(sort_colors === true){
					refresh_color_wrappers(0); // inputs und spans aktualisieren
					store_colors(); // Farben für erneutes Öffnen aktualisieren!
					if (filter_open === true) filter_colors(); // hide-Klassen neu setzen
				}

			},

			// Start ------------------------------------------------------------------------------------------------------------------------------------

			arr_sort_ids = get_selected_ids(),
			sort_ids_len = arr_sort_ids.length;

			if(sort_ids_len < 2){
				dialogbox('Not possible! Select two colors at least!', false, false, false, callback => {});
				return; // ████ exit ████
			}

			dialogbox(
				'Sort selected ...',
				true,
				['by Name', 'by Value', 'by HUE', 'Reverse'],
				false,
				callback => {
					if(callback !== false) start_sorting(callback);
				}
			);

		},

		// _________________________________________________________________________________________________________________
		context_add_click = () => {
			add_colors(true, true, c_cid, false);
		},

		// verwendet von copy, cut, duplicate _________________________________________________________________________________________________________________
		context_copy_cut_colors = () => {

			const arr_copy_ids = get_selected_ids(); // werden sortiert zurückgegeben!

			let i = 0;

			// reset
			arr_copy_n = [];
			arr_copy_c = [];

			copy_len = arr_copy_ids.length;

			for (i; i < copy_len; i++){
				arr_copy_n[i] = arr_n[arr_copy_ids[i]];
				arr_copy_c[i] = arr_c[arr_copy_ids[i]];
			}

		},

		// _________________________________________________________________________________________________________________
		context_copy_click = () => {
			context_copy_cut_colors();
		},

		// _________________________________________________________________________________________________________________
		context_cut_click = () => {
			context_copy_cut_colors();
			delete_colors();
		},

		// _________________________________________________________________________________________________________________
		context_duplicate_click = () => {
			context_copy_cut_colors();
			context_paste_click();
		},

		// _________________________________________________________________________________________________________________
		context_paste_click = () => {

			let paste_pos = -1;

			// active-Markierung vorhanden
			if (c_cid !== -1) {
				paste_pos = c_cid;
			}
			// keine active-Markierung
			else{

				// c_cid vom user per ctrl deaktiviert (hinter höchster ausgewählter id einfügen)
				if(sel_len > 0) {
					const arr_sorted_sel_ids = get_selected_ids(); // werden sortiert zurückgegeben!
					paste_pos = arr_sorted_sel_ids[sel_len - 1];
				}
				else{
					paste_pos = 0;
				}

			}

			add_colors(arr_copy_n, arr_copy_c, paste_pos, true);

		},

		// _________________________________________________________________________________________________________________
		context_select_all = () => {

			let i = 0;

			if(sel_len > 0) reset_selection(false); // false: nur arrays zurücksetzen, Klassen können erhalten bleiben da sowieso alle markiert werden

			if(filter_open === false){
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

		// _________________________________________________________________________________________________________________
		context_toggle_sort_mode = () => {
			if(sel_len > 0) reset_selection(true);
			toggle_sort_mode(sort_mode === false ? true : false);
		},

		//  _________________________________________________________________________________________________________________
		context_convert_colors = () => {

			dialogbox('Convert to ...', true, ['HEX', 'RGB', 'HSL'], false, callback => {
				if(callback !== false){
					const arr_selected_ids = get_selected_ids();
					convert_colors(callback, arr_selected_ids); // callback -> 0 = hex, 1 = rgb, 2 = hsl
				}
			});
		},

		//  _________________________________________________________________________________________________________________
		context_special_operations = () => {
			dialogbox(
				'Special functions:',
				true,
				['Sort by ...', 'Create Alpha-Steps', 'Create comple&shy;mentary Color', 'Randomize Selected'],
				false,
				callback => {
					if(callback === 0) context_sort();
					else if(callback === 1) context_create_alpha_steps();
					else if(callback === 2) context_create_complementary();
					else if(callback === 3) context_randomize_colors();
				}
			);
		},

		// mouseup / close _________________________________________________________________________________________________________________
		context_doc_mouseup_keyup = () => {
			document.removeEventListener('keyup', context_doc_mouseup_keyup, false); // unbind self
			document.removeEventListener('mouseup', context_doc_mouseup_keyup, false);
			document.body.removeChild($context_ul);
		},

		// Position? _________________________________________________________________________________________________________________
		context_set_position = () => {
			// y: -4 = Toleranz (sonst scrollbar im body / 2 würde eigentlich reichen)
			$context_ul.style.top = e.clientY + context_height <= window_height ? e.clientY +'px' : window_height - context_height - 4 +'px';
			$context_ul.style.left = e.clientX + context_width >= window_width ? window_width - context_width+'px' :  e.clientX+'px';
		},

		// const / start _________________________________________________________________________________________________________________

		// leerer Bereich innerhalb von $color_wrapper_main angeklickt: nur cut/paste erlauben
		empty_area_clicked = e.target === $color_wrapper_main ? true : false;

		window.$context_ul = document.createElement('ul');

		let $el = null;

		$context_ul.id = 'context-ul';

		// picker
		$el = document.createElement('li');
		$el.id = 'context-li-picker';
		if(empty_area_clicked === false && sort_mode === false ) $el.addEventListener('mouseup', context_open_picker, false);
		else $el.className = 'context-li-disabled';
		$context_ul.appendChild($el);

		// add
		$el = document.createElement('li');
		$el.id = 'context-li-add';
		if(sort_mode === false) $el.addEventListener('mouseup', context_add_click, false);
		else $el.className = 'context-li-disabled';
		$context_ul.appendChild($el);

		// duplicate
		$el = document.createElement('li');
		$el.id = 'context-li-duplicate';
		if(empty_area_clicked === false && sort_mode === false) $el.addEventListener('mouseup', context_duplicate_click, false);
		else $el.className = 'context-li-disabled';
		$context_ul.appendChild($el);

		// delete
		$el = document.createElement('li');
		$el.id = 'context-li-delete';
		if(empty_area_clicked === false && sort_mode === false) $el.addEventListener('mouseup', delete_colors, false);
		else $el.className = 'context-li-disabled';
		$context_ul.appendChild($el);

		// select all
		$el = document.createElement('li');
		$el.id = 'context-li-select';
		if((filter_open === true && filtered_ids_len > 0 && sort_mode === false) || (filter_open === false && c_len > 0 && sort_mode === false)) $el.addEventListener('mouseup', context_select_all, false);
		else $el.className = 'context-li-disabled';
		$context_ul.appendChild($el);

		// copy
		$el = document.createElement('li');
		$el.id = 'context-li-copy';
		if(empty_area_clicked === false && sort_mode === false) $el.addEventListener('mouseup', context_copy_click, false);
		else $el.className = 'context-li-disabled';
		$context_ul.appendChild($el);

		// cut
		$el = document.createElement('li');
		$el.id = 'context-li-cut';
		if(empty_area_clicked === false && sort_mode === false) $el.addEventListener('mouseup', context_cut_click, false);
		else $el.className = 'context-li-disabled';
		$context_ul.appendChild($el);

		// paste
		$el = document.createElement('li');
		$el.id = 'context-li-paste';
		if(copy_len > 0 && sort_mode === false) $el.addEventListener('mouseup', context_paste_click, false);
		else $el.className = 'context-li-disabled';
		$context_ul.appendChild($el);

		// sort
		$el = document.createElement('li');
		$el.id = 'context-li-sort';
		$el.className = sort_mode === true ? 'context-li-sort-off' : 'context-li-sort-on';
		$el.addEventListener('mouseup', context_toggle_sort_mode, false);
		$context_ul.appendChild($el);

		// convert
		$el = document.createElement('li');
		$el.id = 'context-li-convert';
		if(empty_area_clicked === false && sort_mode === false) $el.addEventListener('mouseup', context_convert_colors, false);
		else $el.className = 'context-li-disabled';
		$context_ul.appendChild($el);

		// special
		$el = document.createElement('li');
		$el.id = 'context-li-special';
		if(empty_area_clicked === false && sort_mode === false) $el.addEventListener('mouseup', context_special_operations, false);
		else $el.className = 'context-li-disabled';
		$context_ul.appendChild($el);


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

	// dynamic scroll █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

	dynamic_scroll_to_window_pos = (direction) =>{

		/* wird ausgeführt wenn home- oder end-Taste gedrückt wird / siehe "doc_keydown()"

		Bei Home und End-Taste wird es bei großen Paletten mit dynamic scroll sehr stockend, und es gibt Probleme beim
		Ausblenden nicht sichtbarer wrapper (Bild hoch/runter macht aber keine Probleme). Daher das Verhalten simulieren: */

		const 	n_visible_wrappers = current_visible_wrappers * 3,
				len = filter_open === false ? c_len : filtered_ids_len;

		let visible_index_start_mem_new = 0,
			visible_index_end_mem_new = 0,
			p_top = 0,
			p_bottom = 0,
			scroll_to_y = 0,
			i = 0;

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
		if(filter_open === false){
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

	},

	// ________________________________________________________________________________________________________________________
	dynamic_scroll_get_values = () => {

		// wrapper-Höhe messen
		if(color_wrapper_height === 0){

			// listview aktiv
			if(mode_current !== 'insert-compactview'){
				// Listview! Ersten wrapper sichtbar machen, um Höhe zu ermitteln (wrapper haben kurz zuvor alle 'hide' erhalten / siehe 'create_color_wrappers')
				// Update: entweder ersten wrapper sichtbar machen, oder wenn im compactview im gefilterten Zustand geöffnet wurde, dann den wrapper mit
				// der ersten Filter-ID sichtbat machen
				const wrapper_id = filtered_ids_len === 0 ? 0 : arr_filtered_ids[0];
				$color_wrappers[wrapper_id].className = 'color-wrapper';
				color_wrapper_height = $color_wrappers[wrapper_id].offsetHeight;
			}
			// compactview aktiv
			else{
				// Wenn die Extension im compactview geöffnet wird, und dann zum listview mit dynamic scroll gewechselt wird, dann wird dem ersten wrapper kurzzeitig
				// eine Klasse zugewiesen, die die scss-Variable "$wrapper_height" enthält und somit genau der Höhe der Listview-Wrapper entspricht!
				$color_wrappers[0].classList.add('meassure-list-wrapper-height');
				color_wrapper_height = $color_wrappers[0].offsetHeight; // Höhe messen
				$color_wrappers[0].classList.remove('meassure-list-wrapper-height');
			}

		}

		current_visible_wrappers = Math.ceil((window_height - controls_height) / color_wrapper_height);
		visible_index_end_mem = current_visible_wrappers * 3; // * 3: dreifache Höhe der aktuell sichbaren color-wrapper (siehe dynamic_scroll)

	},

	check_dynamic_scroll = () => {
		if(mode_current !== 'insert-compactview' && c_len > dynamic_scroll_limit) init_dynamic_scroll();
	},

	init_dynamic_scroll = () => {
		let i = 0;
		dynamic_scroll_get_values(); // aktualisiert 'visible_index_end_mem'
		for (i = 0; i < visible_index_end_mem; i++) $color_wrappers[i].className = 'color-wrapper';
		dynamic_scroll();
		dynamic_scroll_bind_listener();
	},

	dynamic_scroll_bind_listener = () => {
		window.addEventListener('scroll', window_dynamic_scroll, false);
		dynamic_scroll_is_active = true;
	},


	window_dynamic_scroll = () => {
		dynamic_scroll();
	},

	// ________________________________________________________________________________________________________________________
	dynamic_scroll = () => {

		// Info! Es ist immer die dreifache Höhe der aktuell sichtbaren color-wrapper zu sehen, sonst würde man beim Scrollen das Einblenden sehen!
		// alle anderen wrapper davor oder danach erhalten die hide-Klasse

		const 	scroll_y = window.scrollY,
				is_filtered = filter_open === true && filtered_ids_len > 0 ? true : false;

		let visible_index_start = Math.floor(scroll_y / color_wrapper_height),
			visible_index_end = 0,
			i = 0;


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
		if(scroll_y <= dyn_scroll_y_pos){

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
		dyn_scroll_y_pos = scroll_y;
		visible_index_start_mem = visible_index_start;
		visible_index_end_mem = visible_index_end;

		// ausgeblendete wrapper mittels padding kompensieren
		dynamic_scroll_compensate(is_filtered);

	},

	// ________________________________________________________________________________________________________________________
	dynamic_scroll_compensate = (is_filtered) => {
		if(is_filtered === false) $main_wrapper.style.padding = (visible_index_start_mem * color_wrapper_height) + 'px 0 ' + ((c_len - visible_index_end_mem) * color_wrapper_height) + 'px 0';
		else $main_wrapper.style.padding = (visible_index_start_mem * color_wrapper_height) + 'px 0 ' + ((filtered_ids_len - visible_index_end_mem) * color_wrapper_height) + 'px 0';
	},

	// ________________________________________________________________________________________________________________________
	dynamic_scroll_remove = () => {
		window.removeEventListener('scroll', window_dynamic_scroll, false);
		dynamic_scroll_is_active = false;
		$main_wrapper.style.padding = '';
	},

	// ________________________________________________________________________________________________________________________
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

		const len = filter_open === false ? c_len : filtered_ids_len;

		// drei Fenster-Höhen beginnend ab Ende
		if(visible_index_end_mem >= len){
			visible_index_end_mem = len;
			visible_index_start_mem = len - (current_visible_wrappers * 3);
		}

	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	set_statusbar_counter = () => {
		$sb_counter.textContent = filter_open === false ? c_len+' entries' : filtered_ids_len+' / '+c_len+' entries';
	},

	set_statusbar_active = () => {

		const c = filter_open === false ? c_cid + 1 : arr_filtered_ids.indexOf(c_cid) + 1;

		if(c !== 0){
			$sb_active.textContent = c;
			$sb_active_wrapper.className = '';
		}
		else{
			$sb_active_wrapper.className = 'hide';
		}

	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	scroll_to_active = (scroll_even_when_visible) => {

		let scroll_pos_active = 0;

		// c_cid = -1 -> ganz nach oben scrollen
		if(c_cid === -1){
			scroll_pos_active = 0;
		}
		// c_cid vorhanden
		else{

			// dynamic scroll ist aktiv ---------------------------------------------------------------------------------------
			if(dynamic_scroll_is_active === true){

				// berücksichtigen dass im gefilterten Modus viele wrapper ausgeblendet sind!
				const scroll_id = filtered_ids_len === 0 ? c_cid : arr_filtered_ids.indexOf(c_cid);

				// Nicht scrollen wenn sich der wrapper im sichtbaren Bereich befindet (z.B. bei "add_colors()" nur dann scrollen wenn die
				// neue Farbe außerhalb des Sichtbereichs hinzugefügt wurde, ansonsten nichts machen)
				if(scroll_even_when_visible === false) {

					// wrapper befindet sich im sichtbaren Bereich
					if(
						// wrapper befindet sich ganz oben (sichtbarer Bereich / ungescrollt)
						scroll_id < current_visible_wrappers ||
						// wrapper befindet sich irgendwo in der Mitte
						scroll_id >= visible_index_start_mem + current_visible_wrappers && scroll_id <= visible_index_end_mem - current_visible_wrappers
						// unten muss nicht berücksichtigt werden!
					){
						return; // ████ exit ████
					}
				}

				scroll_pos_active = color_wrapper_height * scroll_id;


			}
			// dynamic scroll ist nicht aktiv ---------------------------------------------------------------------------------------
			else{

				// Info!!! Filter spielt hier keine Rolle da grundsätzlich offsetTop gemessen wird!

				const 	scroll_y = window.scrollY,
						wrapper_top = $color_wrappers[c_cid].offsetTop;

				// Nicht scrollen wenn sich der wrapper im sichtbaren Bereich befindet (z.B. bei "add_colors()" nur dann scrollen wenn die
				// neue Farbe außerhalb des Sichtbereichs hinzugefügt wurde, ansonsten nichts machen)
				if(scroll_even_when_visible === false) {
					// wrapper befindet sich im sichtbaren Bereich
					if(wrapper_top >= scroll_y && wrapper_top <= scroll_y + window_height){
						if(scroll_even_when_visible === false) return; // ████ exit ████
					}
				}

				scroll_pos_active = wrapper_top;

			}

		}

		window.scrollTo(0, scroll_pos_active);

	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	set_controls_height = () => {
		controls_height = $controls_wrapper.offsetHeight;
		document.body.style.paddingTop = controls_height+'px';
		set_context_click_area();
	},

	// drag head █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	drag_head_push = ($el_head, $el_drag, $el_drag_wrapper, custom_func_when_moved) => {

		// Info! Muss beim Öffnen eines widgets ausgeführt werden !

		// custom_func_when_moved = false || function   (wird ausgeführt sobald sich die Position geändert hat)

		// def globals
		if(typeof arr_dh === 'undefined'){
			window.arr_dh = []; // dh = drag head
			window.dh_len = 0;
			window.dh_id = 0;
		}

		// resize listener binden wenn erster wrapper hinzugefügt wird
		if(dh_len === 0) window.addEventListener('resize', drag_head_window_resize, false);


		// drag head vorbereiten
		$el_head.d_id = dh_len; // d_id = dh_id (siehe "drag_head_mousedown()")
		$el_head.addEventListener('mousedown', drag_head_mousedown, false);
		$el_head.className = 'drag-head'; // drag head

		arr_dh[dh_len] = [];
		arr_dh[dh_len].$el_head = $el_head;
		arr_dh[dh_len].$el_drag = $el_drag;
		arr_dh[dh_len].$el_drag_wrapper = $el_drag_wrapper;
		arr_dh[dh_len].custom_func_when_moved = custom_func_when_moved;
		arr_dh[dh_len].start_top = 0;
		arr_dh[dh_len].start_left = 0;
		arr_dh[dh_len].start_x = 0;
		arr_dh[dh_len].start_y = 0;
		arr_dh[dh_len].dragged = false;
		arr_dh[dh_len].is_flex_centred = false;

		dh_len++;

	},

	// _______________________________________________________________________________________________________________
	drag_head_splice = ($el_head) => {
		// muss beim Schließen eines widgets ausgeführt werden !
		arr_dh.splice(arr_dh.indexOf($el_head.d_id), 1);
		dh_len--;
		if(dh_len === 0) window.removeEventListener('resize', drag_head_window_resize, false); // resize listener entfernen
	},

	// _______________________________________________________________________________________________________________

	drag_head_mousedown = (e) => { // $el_head mousedown

		// set global für doc mousemove und doc mouseup
		dh_id = e.currentTarget.d_id;

		const 	dhc = arr_dh[dh_id], // dhc = drag head current
				bcr = dhc.$el_drag.getBoundingClientRect();

		// Startposition ermitteln
		dhc.start_top = parseInt(bcr.top);
		dhc.start_left = parseInt(bcr.left);
		dhc.start_x = e.pageX;
		dhc.start_y = e.pageY;
		dhc.dragged = true;

		// wurde das Element vertikal mittels "flex-direction: column" zentriert?
		if(window.getComputedStyle(dhc.$el_drag_wrapper).flexDirection === 'column'){
			dhc.$el_drag_wrapper.style.display = 'block'; // auf block setzen, sonst Verschiebung bei trnalateY
			dhc.is_flex_centred = true; // siehe "drag_head_dblclick()"
		}

		dhc.$el_drag.style.margin = 0; // override css '0 auto'
		dhc.$el_drag.classList.add('drag');

		dhc.$el_drag_wrapper.classList.add('mousehold'); // pointer events all / darunterliegende Elemente "überdecken"

		// binds
		document.addEventListener('mousemove', drag_head_doc_mousemove, false);
		document.addEventListener('mouseup', drag_head_doc_mouseup, false);
		e.currentTarget.addEventListener('dblclick', drag_head_dblclick, false);

		// mousemove
		drag_head_doc_mousemove(e);

	},

	// _______________________________________________________________________________________________________________
	drag_head_doc_mousemove = (e) => {
		const dhc = arr_dh[dh_id]; // dhc = arr drag current
		dhc.$el_drag.style.transform = 'translate('+(dhc.start_left + e.pageX - dhc.start_x)+'px ,'+(dhc.start_top + e.pageY - dhc.start_y)+'px)';
	},

	// _______________________________________________________________________________________________________________
	drag_head_doc_mouseup = (e) => {

		const dhc = arr_dh[dh_id]; // dhc = arr drag current

		// überprüfen ob widget aus sichtbarem Bereich verschwunden ist
		let current_x = (dhc.start_left + e.pageX - dhc.start_x),
			current_y = (dhc.start_top + e.pageY - dhc.start_y),
			set_pos = false;

		if(current_x >= window_width - 100){
			current_x = window_width - 100;
			set_pos = true;
		}
		else if(current_x + dhc.$el_drag.offsetWidth <= 100){
			current_x = -dhc.$el_drag.offsetWidth + 100;
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

		if(set_pos === true) dhc.$el_drag.style.transform = 'translate('+current_x+'px ,'+current_y+'px)';

		document.removeEventListener('mousemove', drag_head_doc_mousemove, false);
		document.removeEventListener('mouseup', drag_head_doc_mouseup, false);

		dhc.$el_drag_wrapper.classList.remove('mousehold');

		// externe Funktion bei Positionsänderung ausführen?
		if(dhc.custom_func_when_moved !== false) dhc.custom_func_when_moved();

	},

	// _______________________________________________________________________________________________________________
	drag_head_reset_position = (d_id) => {

		const dhc = arr_dh[d_id]; // dhc = arr drag current

		// reset transform
		dhc.$el_drag.classList.remove('drag');
		dhc.$el_drag.style.transform = null;
		dhc.$el_drag.style.margin = null; // horizontal zentrieren ("margin: 0 auto" aus css übernimmt wieder)
		dhc.$el_drag.dragged = false;

		// auf display flex zurücksetzen?
		if(dhc.is_flex_centred === true) dhc.$el_drag_wrapper.style.display = 'flex';

		// externe Funktion bei Positionsänderung ausführen?
		if(dhc.custom_func_when_moved !== false) dhc.custom_func_when_moved();

	},

	// _______________________________________________________________________________________________________________
	drag_head_dblclick = (e) => {
		drag_head_reset_position(e.currentTarget.d_id);
		e.currentTarget.removeEventListener('dblclick', drag_head_dblclick, false);
	},

	// _______________________________________________________________________________________________________________
	drag_head_window_resize = () => {

		let bcr = null,
			i = 0;

		for (i = 0; i < dh_len; i++) {

			// wenn widget verschoben wurde, dann widget wieder "responsive machen"
			if(arr_dh[i].dragged === true) drag_head_reset_position(i);

			// überprüfen ob widget aus sichtbarem Bereich verschwunden ist
			bcr = arr_dh[i].$el_drag.getBoundingClientRect();

			if(bcr.top > window.innerHeight - 100){
				arr_dh[i].$el_drag.style.transform = 'translateY('+(window.innerHeight - 100)+'px)';
			}
			else if(bcr.top < 0){
				current_y = 0;
				arr_dh[i].$el_drag.style.transform = 'translateY(0px)';
			}

		}

	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	window_scroll_end = () => {
		// aktuelle scroll-Position an extension.js übermitteln
		if(window.scroll_end_timeout) clearTimeout(window.scroll_end_timeout);
		window.scroll_end_timeout = setTimeout(() => {
			store_scroll_pos = window.scrollY;
			if(init === false) { // "init_cm()" scrollt zur zuletzt gespeicherten Position und triggert damit diese Funktion. In dem Fall ist "store_settings()" aber unnötig, da sich die gespeicherte Scroll-Position nicht ändert!
				store_settings();
				if(picker_open === true) get_picker_dimensions(); // Positionen / Abmessungen für Picker-Controls aktualisieren
			}
		}, 200);
	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	window_resize_end = () => {

		const resize_end_calculations = () => {

			// globals aktualisieren
			window_width = window.innerWidth;

			const 	window_height_new = window.innerHeight,
					controls_height_after = $controls_wrapper.clientHeight; // ggf. hat sich durch Button-Verschiebungen die Höhe geändert

			let i = 0;

			// current_visible_wrappers ermitteln, falls noch nicht ermittelt (compactview aktiv), ansonsten Error Division durch 0
			if(color_wrapper_height !== 0) current_visible_wrappers = Math.ceil((window_height_new - controls_height) / color_wrapper_height);

			if(controls_height_after !== controls_height){
				controls_height = controls_height_after;
				document.body.style.paddingTop = controls_height+'px';
			}

			// compactview aktiv
			if (mode_current === 'insert-compactview'){
				// durch Änderung der Fenstergröße verschieben sich die Farbfelder und ggf. der Scrollbar! (im listview-modus nicht nötig!)
				store_scroll_pos = window.scrollY;
				store_settings();
			}
			// listview aktiv
			else{

				// dynamic scroll anpassen ?
				if(c_len > dynamic_scroll_limit) {
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

			}

			check_dropdown_width();

			window_height = window_height_new;

			set_context_click_area();

		};

		// start _______________________________________________________________________________________________________________

		if(window.resize_timeout) clearTimeout(window.resize_timeout);

		window.resize_timeout = setTimeout(() => resize_end_calculations(), 20);

	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	refresh_color_wrappers = (loop_start_pos) => {

		// siehe: btn_add_click + btn_sort_click

		let i = 0;

		// list-view
		if(mode_current !== 'insert-compactview'){
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

	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	toggle_loading = (on) => {
		if(on === true){
			document.body.classList.add('loading');
		}
		else{
			// settimeout damit die Lade-Animation wenigstens kurz zu sehen ist (ansonsten bei schnell ladenden Paletten nur kurzes Flackern des spinners
			// zu sehen (sieht komisch aus). Solange das loading overlay sichtabr ist sind aucch keine Clicks möglich (z-index)
			setTimeout(() => document.body.classList.remove('loading'), 150);
		}
	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	store_settings = () => {

		vscode.postMessage({ // ███ vscode APi ███
			command: 'store_settings',
			// geänderte settings an extension.js zurückgeben
			settings: {
				mode_current: mode_current,
				c_cid: c_cid,
				filter_open: filter_open, // bool
				filter_val: filter_val, // leer | string
				picker_open: picker_open, // bool
				picker_color: picker_color, // false || string
				picker_color_init: picker_color_init, // false || string
				scroll_pos: store_scroll_pos, // int
				cm_width: cm_width // int
			}
		});
	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	store_colors = () => {

		/* Aktuelle Farben speichern falls das webview ausgeblendet wird! Falls der user das webview wieder einblendet, sind somit auch die ungepeicherten
		Farben noch sichtbar! Dazu wird in der extension.js unter "webview_init()" (ganz unten) nicht die aktuelle Palette erneut geladen, sondern es
		werden die von hier aus übertragenen Farben erneut geladen (falls "p_path" noch existiert und nicht manuell vom user gelöscht wurde) */

		vscode.postMessage({ // ███ vscode APi ███
			command: 'store_colors',
			arr_n: arr_n,
			arr_c: arr_c,
			c_len: c_len
		});

	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	reset_selection = (reset_selected_class) => {

		let i = 0;

		if(reset_selected_class === true){
			for (i = 0; i < sel_len; i++) $color_inp_wrappers[arr_sel_ids[i]].className = '';
		}

		arr_sel_ids = [];
		sel_len = 0;

	},

	// doc keys █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

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
				});
			}

		}

	},

	// _______________________________________________________________________________________________________________
	doc_keydown = (e) => {

		// alt
		if (e.keyCode === 18) {
			toggle_sort_mode(true);
			return; // ███ exit ███
		}

		// Mehrfachauswahl -----------------------------------------------------------------------------------------------------------

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

		/* Achtung! Wenn man aus dem Webview heraus die Command Palette mit "ctrl + shift + p" aufruft, dann verliert das Webview augenblicklich
		den Focus und "doc_keyup" wird nicht mehr ausgeführt. Wenn man dann in das Webview zurückkehrt sind die beiden Variablen ctrl_key
		oder shift_key immer noch true (auch wenn die Tasten dann gar nicht mehr gedrückt werden) und plötzlich wird mit einfachen Mausklicks
		eine Mehrfachauswahl gemacht. Daher hier zuerst prüfen ob eine Tastenkombination gedrückt wurde! */

		// combo: ctrl + beliebige taste
		if(ctrl_key === true && e.key.toLowerCase() !== 'control') ctrl_combo = true; // siehe: colorwrapper_mousedown()


		// home / end -----------------------------------------------------------------------------------------------------------

		/* Wenn sich der Fokus in einem input befindet dann funktionieren die Home- und die End-Taste nicht zum Scrollen und der Cursor
		springt im input vor und zurück (was sich genau so gut mit den Cursor-Tasten machen lässt). Daher das Standardverhalten unterdrücken
		und dafür das Scrollverhalten simulieren.

		"dynamic_scroll_to_window_pos()" sorgt außerdem noch dafür das bei großen Palette ruckefrei gescrollt wird! */


		if(e.keyCode === 36){ // home
			e.preventDefault();
			if(dynamic_scroll_is_active === true) dynamic_scroll_to_window_pos(false);
			else window.scrollTo(0, 0);

		}
		else if(e.keyCode === 35){ // end
			e.preventDefault();
			if(dynamic_scroll_is_active === true) dynamic_scroll_to_window_pos(true);
			else window.scrollTo(0, document.body.scrollHeight);
		}

	},

	// _______________________________________________________________________________________________________________
	doc_keyup = (e) => {

		// alt
		if (e.keyCode === 18) {
			toggle_sort_mode(false);
			return; // ███ exit ███
		}

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

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	reset_current_palette = () => {

		// grundsätzlich zum Anfang scrollen
		window.scrollTo(0,0);

		// dynamic scroll entfernen?
		if(dynamic_scroll_is_active === true){
			dynamic_scroll_remove();
			dyn_scroll_y_pos = 0;
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

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	create_color_arrays = (msg_arr_n, msg_arr_c) => {

		// globals aktualisieren
		arr_n = msg_arr_n;
		arr_c = msg_arr_c;
		c_len = arr_n.length;

		if(c_cid > c_len - 1) c_cid = -1; // Benutzer hat Farben in der scss von Hand gelöscht

	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	create_palette_arrays = (msg_arr_p, msg_p_len, msg_p_cid) => {
		// globals aktualisieren
		arr_p = msg_arr_p;
		p_len = msg_p_len;
		p_cid = msg_p_cid;
	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	create_resize_borders = (fullWidth, settings_width) => {

		// full width? / "color-manager.fullWidth": true | false | undefined
		if(fullWidth === true) return; // ███ exit ███

		// ______________________________________________________________________________________________________________
		const set_cm_width = (set_with) => {
			// root-Property neu setzen (siehe main.scss)
			document.documentElement.style.setProperty('--cm-max-width', set_with+'px');
		},

		// ______________________________________________________________________________________________________________
		resize_border_mousedown = (e) =>{
			rzb.start_x = e.pageX;
			rzb.direction = e.currentTarget === $resize_border_l ? 1 : -1; // 1 = links, -1 = rechts
			rzb.distance = 0;
			document.addEventListener('mousemove', resize_border_doc_mousemove, false);
			document.addEventListener('mouseup', resize_border_doc_mousup, false);
			document.body.classList.add('resizing');


			// Performance: Wrapper beim resizing ausblenden
			if(mode_current === 'insert-compactview'){

				const visible_len = filtered_ids_len > 0 ? filtered_ids_len : c_len;

				if(visible_len > 300){ // Anzahl mit main.scss abstimmen
					// Reihenfolge beachten!
					if(window_width > document.documentElement.scrollWidth) document.body.classList.add('has-scrollbar'); // document.documentElement = <html>-Tag
					document.body.classList.add('resizing-hide-colors');
				}

			}

		},

		// ______________________________________________________________________________________________________________
		resize_border_doc_mousemove = (e) => {
			const distance = (rzb.start_x - e.pageX) * rzb.direction;
			// nur aktualisieren wenn kleiner als Fenster! (user zieht Maus über das Webview hinaus)
			if(cm_width + distance <= window_width){
				// nur aktualisieren wenn größer als Sidebar-Minimum
				if(cm_width + distance > cm_width_min) {
					set_cm_width(cm_width + distance);
					rzb.distance = distance;
				}
			}

			// gleiches Verhalten als wenn die Fenstergröße verändert wird, daher muss controlwrapper angepasst werden usw.
			window_resize_end();

		},

		// ______________________________________________________________________________________________________________
		resize_border_doc_mousup = () => {
			cm_width += rzb.distance; // cm_width aktualisieren!
			document.removeEventListener('mousemove', resize_border_doc_mousemove, false);
			document.removeEventListener('mouseup', resize_border_doc_mousup, false);
			document.body.classList.remove('resizing');
			if(mode_current === 'insert-compactview'){
				document.body.classList.remove('resizing-hide-colors');
				document.body.classList.remove('has-scrollbar');
			}
			store_settings();
		},

		// const / start ______________________________________________________________________________________________________________

		rzb = {},

		$resize_wrapper = document.createElement('div'),
		$resize_border_l = document.createElement('div'),
		$resize_border_r = document.createElement('div');

		$resize_wrapper.id = 'resize-wrapper';
		$resize_border_l.className = 'resize-border left';
		$resize_border_r.className = 'resize-border right';
		$resize_border_l.addEventListener('mousedown', resize_border_mousedown, false);
		$resize_border_r.addEventListener('mousedown', resize_border_mousedown, false);

		$resize_wrapper.appendChild($resize_border_l);
		$resize_wrapper.appendChild($resize_border_r);
		document.body.appendChild($resize_wrapper);

		// set global
		cm_width = settings_width < cm_width_min ? cm_width_min : settings_width;

		// siehe main.scss
		document.body.classList.add('set-max-width');

		set_cm_width(cm_width);


	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	set_custom_styles = (config_styles) => {

		/* Info! Im Gegensatz zu Panel-Webviews müssen die style-Änderungen bei Sidebar-Webviews dynamisch gemacht werden, denn wenn
		man die Styles einfach als <style>-Tag in den head des webviews schreiben würde, dann können diese bei Änderungen in den
		vscode-settings nicht mehr refreshed werden und vscode müsste komplett neu gestartet werden damit die Änderungen sichtbar werden!
		Denn das html eines Sidebar-Webviews wird nur einmalig erzeugt, die main.js wird aber bei jedem Ansichts-Toggle neu ausgeführt


		/*	custom styles? _________________________________________________________________________________________________

			vscode-Setup:
			-------------

			"color-manager.styles": {
				"background": "LightGrey",
				"foreground": "green", // labels and lines
				"buttonBackground": "DarkGray",
				"buttonForeground": "tomato", // button-icons and button-text
				"selectionBorder": "blue",
				"popupBorder": "Fuchsia", // border for colorpicker, palette-manager and dialogbox
				"inputForeground": "#000", // input-text
				"inputBackground": "white", // dropdown input on top and inputs in Palette Manager
				"inputBorder": "tomato",
				"buttonBorder": "tomato",
				"buttonHoverBackground": "hsla(0, 61%, 50%, 0.51)",
				"dropdownForeground": "tomato",
				"dropdownBackground": "white",
				"dropdownHoverBackground": "hsla(0, 61%, 50%, 0.51)",
				"overlayBackground": "hsla(0, 61%, 50%, 0.51)" // overlay for dialogbox
			}

		*/

		// root-Variablen überschreiben!
		if(Object.entries(config_styles).length > 0){ // Info! Kein default-Wert in "package.json" festgelegt!

			const root_vars = {

				// Info! Namen der keys stimmen genau mit dem Namen der keys in "config_styles" überein!

				// root-Variablen von vscode überschrieben!
				background: '--vscode-sideBar-background',
				foreground: '--vscode-editor-foreground',
				buttonBackground: '--vscode-button-background',
				buttonForeground: '--vscode-button-foreground',
				buttonHoverBackground: '--vscode-button-hoverBackground',
				buttonBorder: '--vscode-input-border',
				inputBackground: '--vscode-input-background',
				inputForeground: '--vscode-input-foreground',
				inputBorder: '--vscode-dropdown-border',
				dropdownForeground: '--vscode-dropdown-foreground',
				dropdownBackground: '--vscode-dropdown-background',
				dropdownHoverBackground: '--vscode-list-hoverBackground',

				// eigene root-Variablen überschreiben (siehe main.scss)
				selectionBorder: '--cm-selection-border',
				popupBorder: '--cm-popup-border',
				overlayBackground: '--cm-overlay-background'

			};

			// Info! Wenn der user in den settings nicht alle keys definiert, dann werden die standardmäßigen root-Variablen
			// für alle undefinierten Keys in unveränderter Form angezeigt!
			for (const key in config_styles) document.documentElement.style.setProperty(root_vars[key], config_styles[key]);

		}


	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	received_find_colors_in_selection = (msg) => {

		/*
			web_view.postMessage({
				command: 'find_colors_in_selection',
				arr_add: arr_add
			});
		*/

		const add_len = msg.arr_add.length;

		if(p_len === 0){
			dialogbox('Not possible! Create a palette!', false, false, false, callback => {});
			return; // ███ exit ███
		}

		// Picker schließen
		if(picker_open === true) picker_close();

		// Sort-Modus beenden?
		if(sort_mode === true) toggle_sort_mode(false);

		dialogbox('Add '+add_len+' colors to current palette?', true, false, false, callback => {
			if (callback === true) add_colors(msg.arr_add, msg.arr_add, c_cid, true);
		});

	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	received_palette_deleted_success = (msg) => {

		/*
			web_view.postMessage({
				command: 'palette_deleted_success',
				palette_changed: palette_changed,

				arr_n: arr_n,
				arr_c: arr_c,

				arr_p: arr_p,
				p_len: p_len,
				p_cid: p_cid
			});
		*/

		create_palette_arrays(msg.arr_p, msg.p_len, msg.p_cid);

		pm_refresh(); // Paletten Manager aktualisieren

		// aktuelle palette wurde gelöscht
		if(msg.palette_changed !== false){

			// aktuell noch gefiltert? (dynamic scroll wird unter "reset_current_palette()" deaktiviert)
			if(filter_open === true) toggle_filter(false); // refresh_color_wrappers = false (werden unter 'reset_current_palette()' sowieso gelöscht)

			reset_current_palette();

			// keine Palette übrig / Verzeichnis leer -----------------------------------------
			if(msg.palette_changed === 'no-palettes-left'){ // siehe extension.js
				set_dropdown_input('');
				mode_current = 'no-palettes';
				document.body.className = mode_current;
			}
			// erste Palette wurde geladen (p_cid = 0)--------------------------------------------
			else if(msg.palette_changed === true){ // siehe extension.js
				set_dropdown_input(arr_p[0]); // p_cid = 0

				// erste Palette leer oder befüllt?
				if(msg.arr_n !== 'is-empty'){ // siehe extension.js
					create_color_arrays(msg.arr_n, msg.arr_c);
					create_color_wrappers(0, c_len, true);
					check_dynamic_scroll();
				}

			}

		}

	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	received_palette_renamed_success = (msg) => {

		/*
			web_view.postMessage({
				command: 'palette_renamed_success',
				arr_p: arr_p,
				p_len: p_len,
				p_cid: p_cid
			});

		*/

		create_palette_arrays(msg.arr_p, msg.p_len, msg.p_cid); // sortierte Paletten und ggf. aktualisierte p_cid reinitialisieren (siehe extension.js)
		set_dropdown_input(arr_p[p_cid]);

	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	received_palette_added_success = (msg) => {

		/*
			web_view.postMessage({
				command: 'palette_added_success',
				add_saveas: msg.add_saveas,
				arr_p: arr_p,
				p_len: p_len,
				p_cid: p_cid
			});
		*/

		create_palette_arrays(msg.arr_p, msg.p_len, msg.p_cid); // sortierte Paletten aktualisierte p_cid reinitialisieren (siehe extension.js)

		// Paletten Manager aktualisieren
		pm_refresh();

		set_dropdown_input(arr_p[p_cid]);

		// add: neu erstellte Palette laden
		if(msg.add_saveas === true){  // true = add, false = save as

			if(mode_current === 'no-palettes'){
				mode_current = 'edit';
				document.body.className = mode_current;
			}

			// aktuell noch gefiltert? (dynamic scroll wird unter "reset_current_palette()" deaktiviert)
			if(filter_open === true) toggle_filter(false); // refresh_color_wrappers = false (werden unter 'reset_current_palette()' sowieso gelöscht)

			reset_current_palette();
			create_color_arrays([n_new], [c_new]);  // New Color, #000
			create_color_wrappers(0, c_len, true);

			check_dynamic_scroll();
		}

	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	received_refresh = (msg) => {

		/*
			web_view.postMessage({
				command: 'refresh',

				arr_n: arr_n,
				arr_c: arr_c,

				arr_p: arr_p,
				p_len: p_len,
				p_cid: p_cid

			});
		*/

		create_palette_arrays(msg.arr_p, msg.p_len, msg.p_cid); // sortierte Paletten aktualisierte p_cid reinitialisieren (siehe extension.js)

		// Dropdown aktualisieren
		set_dropdown_input(arr_p[p_cid]);

		// Palette Manager aktualisieren?
		if(msg.refresh_pm === true && pm_is_open === true) pm_refresh();

		// Sort-Mode noch aktiv?
		if(sort_mode === true){
			sort_mode = false;
			$color_wrapper_main.classList.remove('sort-mode');
			// Listener entfernen unnötig, da wrapper sowieso gelöscht werden!
		}

		reset_current_palette();
		create_color_arrays(msg.arr_n, msg.arr_c);

		if(c_len > 0){

			create_color_wrappers(0, c_len, true);

			// gefiltert
			if(filter_open === true){
				filter_colors(); // aktiviert selbstständig dynamic scroll wenn nötig!
			}
			// nicht gefiltert
			else{
				check_dynamic_scroll(); // list-view dynamic scroll aktivieren?
			}

		}

		toggle_loading(false);

	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	received_init = (msg) => {

		/*
			web_view.postMessage({

				command: 'init_cm',

				config: vscode.workspace.getConfiguration('color-manager'),

				settings: settings, // mode_current, c_cid, filter_open, filter_val, picker_open, picker_color, picker_color_init, scroll_pos, cm_width

				arr_n: arr_n_c[0],
				arr_c: arr_n_c[1],
				c_max: c_max,

				n_new: n_new,
				c_new: c_new,

				arr_p: arr_p,
				p_len: p_len,
				p_cid: p_cid

			});
		*/

		// ________________________________________________________________________________________________________________________________
		const init_cm = () => {

			// globals aktualisieren
			mode_current = 	msg.settings.mode_current; // insert-listview | insert-compactview | edit | edit-sort | edit-convert | no-palettes
			c_cid =			msg.settings.c_cid;  // -1 | id
			filter_open = 	msg.settings.filter_open; // 0 = geschlossen | 1 = geöffnet
			filter_val = 	msg.settings.filter_val; // leer | string

			picker_open = msg.settings.picker_open;

			c_max = msg.c_max;

			n_new = msg.n_new;
			c_new = msg.c_new;

			// create arrays  -----------------------------------------

			create_palette_arrays(msg.arr_p, msg.p_len, msg.p_cid);
			create_color_arrays(msg.arr_n, msg.arr_c);

			// custom Styles -----------------------------------------
			set_custom_styles(msg.config.styles);

			// html erzeugen -----------------------------------------

			// resize borders erzeugen
			create_resize_borders(msg.config.fullWidth, msg.settings.cm_width); // msg.settings.cm_width = zuletzt gespeicherte Breite

			// main-wrapper, controls-wrapper, statusbar, main-color-wrapper
			create_controls();

			// color wrapper erzeugen
			create_color_wrappers(0, c_len, true);

			$main_wrapper.className = mode_current; // wurde unter 'create_controls()' erstellt
			document.body.appendChild($main_wrapper);

			// sichtbar -----------------------------------------

			statusbar_height = $sb_counter.clientHeight; // globals aktualisieren / siehe set_context_click_area();

			check_dropdown_width();

			// gefiltert oder dynamic scroll nötig ? Unter "create_controls()" haben bei Filterung oder entsprechender c_len erstmal
			// alle wrapper die hide-Klasse erhalten / hätte man dort schon berücksichtigen können aber das würde die Funktion zu
			// unübersichtlich machen

			if(c_len !== 0){ // c_len = 0: Palette leer

				// filter
				if(filter_open === true){
					filter_open = false; // kurzzeitig auf 0 setzen -> wird unter toggle_filter() getoggelt (also wieder auf 1 gesetzt)
					if(filter_val !== '') $filter_input.value = filter_val;
					toggle_filter(false); // -> █ set_controls_height() █    refresh_color_wrappers = false (beim Öffnen des Filter sowieso egal / wird nur beim Schließen berücksichtigt)
					if (mode_current !== 'insert-compactview' && c_len > dynamic_scroll_limit) dynamic_scroll_get_values();
					filter_colors(); // entfernt hide-Klassen aus "create_controls()" (siehe Erklärung oben)
				}
				// kein filter
				else{
					set_controls_height(); // █ set_controls_height() █
					// dynamic scroll aktivieren?
					if (mode_current !== 'insert-compactview' && c_len > dynamic_scroll_limit) init_dynamic_scroll(); // entfernt hide-Klassen aus "create_controls()" (siehe Erklärung oben)
				}

			}
			else{
				set_controls_height(); // █ set_controls_height() █
			}

			set_context_click_area();

			window.addEventListener('resize', window_resize_end, false);

			document.addEventListener('keydown', doc_keydown, false);
			document.addEventListener('keyup', doc_keyup, false);
			document.addEventListener('keypress', doc_keypress, false);

			// scrollen?
			if(msg.settings.scroll_pos !== -1) window.scrollTo(0, msg.settings.scroll_pos);

			window.addEventListener('scroll', window_scroll_end, false); // erst nach dem Scrollen binden, sonst wird gleich wieder store_settings() aufgerufen

			// Picker öffnen ?
			if(picker_open === true) open_picker(msg.settings.picker_color, msg.settings.picker_color_init);

			// post ready
			vscode.postMessage({
				command: 'color_manager_is_ready'
			});

			toggle_loading(false);

			init = false; // ███ Init ███

		},

		// ________________________________________________________________________________________________________________________________
		get_window_dimensions = () => {

			// Achtung!!! Hin- und wieder kommt es vor dass beim Öffnen die Fensterhöhe nicht korrekt abgemessen wird (bzw. 0 ist), daher selbstauafrufende Funktion
			// die sich maximal 1 Sekunde lang selbst aufruft um die Fensterhöhe zu ermitteln

			// globals aktualisieren
			window_height = window.innerHeight;
			window_width = window.innerWidth;

			if(window_height < 1 && get_dim_attempts < 100){
				setTimeout(() => {
					get_dim_attempts++;
					get_window_dimensions();
				}, 10);
			}
			else{
				init_cm();
			}

		};

		// start ________________________________________________________________________________________________________________________________

		let get_dim_attempts = 0;

		get_window_dimensions();

	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	extension_js_receiver = (msg) => {


		// Bei allen Befehlen die von der extension.js kommen, die Dialogbox schließen!
		// Beispiel: "find_colors_in_selection" wird mehrfach ausgeführt ohne den Dialog zu bestätigen!
		if(dib_open === true) dib_cancel();


		switch (msg.command) {

			case 'init': {
				received_init(msg);
				break;
			}

			case 'refresh': {
				received_refresh(msg);
				break;
			}

			case 'palette_added_success': {
				received_palette_added_success(msg);
				break;
			}

			case 'palette_renamed_success': {
				received_palette_renamed_success(msg);
				break;
			}

			case 'palette_deleted_success': {
				received_palette_deleted_success(msg);
				break;
			}

			case 'find_colors_in_selection': {
				if(pm_is_open === true) pm_close(); // Palette Manager schließen!
				received_find_colors_in_selection(msg);
				break;
			}

			case 'open_picker': {
				if(pm_is_open === true) pm_close(); // Palette Manager schließen!
				prepare_open_picker(msg.picker_color); // "prepare_open_picker" wird auch von internen Funktionen verwendet, daher kein "received_" im Namen
				break;
			}

		}

	},

	// █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
	create_loading_overlay = () => {
		$loading_overlay = document.createElement('div');
		$loading_overlay.id = 'loading-overlay';
		document.body.appendChild($loading_overlay);
	},

	// globals █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

	// vscode API
	vscode = acquireVsCodeApi(),

	// ab der wrapper-Anzahl wird dynamic_scroll aktiviert
	dynamic_scroll_limit = 200, // sollte okay sein für drehbare Monitore im Hochformat und verkleinerter Ansicht in vscode !

	// 200 ist etwas größer als das Sidebar-Minimum, kurz darauf schließt vscode das Sidebar
	cm_width_min = 200,

	color_error_bg = 'linear-gradient(135deg, transparent 0%, transparent 47%, red 50%, transparent 53%, transparent 100%)',

	c_switch = {},

	// dialogbox
	dib_min_width = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--dib-min-width').slice(0,-2) );


	let arr_n = [],
		arr_c = [],
		arr_b = [],
		c_len = -1, // -1 = Palette leer (siehe extension.js / load_colors())

		// const aus extension.js
		c_max = 0,
		n_new = '',
		c_new = '',

		arr_p = [],
		p_len = 0,
		p_cid = -1,

		window_height = 0,
		window_width = 0,
		statusbar_height = 0,

		mode_current = '', // insert-listview | insert-compactview | edit | no-palettes
		c_cid = -1,// -1 | id
		filter_open = false,
		filter_val = '', // leer | string

		sort_mode = false,

		// Picker Status
		picker_open = false,
		picker_color = '', // muss string sein (nicht 0 oder false) sonst später Fehler bei substr ("substr is not a function ...")
		picker_color_init = '', // muss string sein (nicht 0 oder false) sonst später Fehler bei substr ("substr is not a function ...")

		// resize bars
		cm_width = 0,

		store_scroll_pos = 0,

		dynamic_scroll_is_active = false,
		color_wrapper_height = 0,
		current_visible_wrappers = 0,
		visible_index_start_mem = 0,
		visible_index_end_mem = 0,
		dyn_scroll_y_pos = -1, // init: nicht 0 / siehe dynamic_scroll()

		controls_height = 0,

		arr_filtered_ids = [],
		filtered_ids_len = 0,
		was_filtered = false,
		pm_is_open = false, // status palette manager

		ctrl_key = false,
		shift_key = false,
		ctrl_combo = false,

		arr_sel_ids = [],
		sel_len = 0,

		// color wrapper clicks
		current_ani_id = -1,

		prevent_doc_insert = false,

		$loading_overlay = null,

		// check_colors()
		$check_gradient_dummy = null,
		check_gradient_created = false,

		// create_controls()
		$main_wrapper = null,
		$controls_wrapper = null,
		$dropdown_input = null,
		$dropdown_ul = null,
		$btn_filter = null,
		$filter_wrapper = null,
		$filter_input = null,
		$sb_counter = null, // sb = statusbar
		$sb_active_wrapper = null,
		$sb_active = null,

		switch_btn_cid = -1,

		// contextmenu
		context_is_open = false,
		context_height = 0,
		context_width = 0,
		arr_copy_n = [],
		arr_copy_c = [],
		copy_len = 0,

		// drag
		$el_drag = null,
		$el_hover = null,
		drag_id = 0,
		hover_id = 0,

		// dialogbox
		dib_open = false,

		init = true; // ███ Init ███


	// doc ready █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

	// extension.js listener
	window.addEventListener('message', e => extension_js_receiver(e.data) );

	// extension.js mitteilen dass bereit
	vscode.postMessage({ command: 'webview_is_loaded' }); // ███ vscode APi ███

	create_loading_overlay();
	toggle_loading(true);

})();