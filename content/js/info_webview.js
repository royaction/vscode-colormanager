(() => {

	'use strict';

	const div_toggle_click = (e) => {
		if(e.target.tagName === 'CODE') return;
		const 	$this = e.target,
				toggle_status = $this.toggle_status;
		$this.className = toggle_status === false ? 'div-toggle show' : 'div-toggle';
		$this.toggle_status = toggle_status === true ? false : true;
	},

	// const / start

	$div_toggle = document.getElementsByClassName('div-toggle'),
	toggle_len = $div_toggle.length;

	let i = 0;

	for (i; i < toggle_len; i++) {
		$div_toggle[i].toggle_status = false;
		$div_toggle[i].addEventListener('click', div_toggle_click, false);
	}

})();