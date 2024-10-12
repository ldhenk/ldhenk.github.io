(async () => {
const winw = 8;

const can = document.getElementById('canvas');
const gc = new GameController();
const gl = can.getContext('webgl', { antialias: false });
const glc = new GLController(gl, can.width, can.height);

const sounds = create_sound_manager([
	'res/die.wav',
	'res/place.wav',
	'res/break.wav',
	'res/rock_land.wav',
	'res/ant_kill.wav',
	'res/jump.wav',
	'res/howard.mp3'
]);

const lw = 256;
let level;
const p3 = (async () => {
	const res = await fetch('./res/map.bmp');
	const bytes = new Uint8Array(await res.arrayBuffer());
	level = new Uint8Array(lw * lw);
	for(let i = 0; i < level.length; i++){
		const r = bytes[i * 3 + 0];
		const g = bytes[i * 3 + 1];
		const b = bytes[i * 3 + 2];
		if(r === 0 && g === 0 && b === 0){
			level[i] = 1;
		}else if(r === 255 && g === 0 && b === 0){
			level[i] = 3;
		}else if(r === 0 && g === 255 && b === 0){
			level[i] = 2;
		}else if(r === 255 && g === 255 && b === 0){
			level[i] = 5;
		}else if(r === 0 && g === 0 && b === 255){
			level[i] = 7;
		}else{
			level[i] = 0;
		}
	}
})();

function adj(x, y, corners, cb){
	cb(x - 1, y);
	cb(x + 1, y);
	cb(x, y - 1);
	cb(x, y + 1);
	if(corners){
		cb(x + 1, y + 1);
		cb(x - 1, y + 1);
		cb(x + 1, y - 1);
		cb(x - 1, y - 1);
	}
}

const discovery = new Uint8Array(lw * lw);
const light = new Uint8Array(lw * lw);

const vert = `
	precision highp float;
	attribute vec2 pos;
	attribute float lig;
	uniform vec2 off;
	uniform float scale;
	varying vec2 vpos;
	varying float vlig;
	varying vec2 vscreenPos;
	void main(){
		vlig = lig;
		vpos = vec2(pos.x * .99999, pos.y == 1.0 ? 0.0 : .99999); // TODO: WHYYYY
		vec2 screenPos = (pos + off) * scale;
		vscreenPos = screenPos;
		gl_Position = vec4(screenPos, 0, 1);
	}
`;

const frag = `
	#ifdef GL_FRAGMENT_PRECISION_HIGH
		precision highp float; // desparate attempt to avoid texture bleed
	#else
		precision mediump float;
	#endif
	varying vec2 vpos;
	uniform vec2 toff;
	uniform sampler2D tex;
	varying float vlig;
	uniform float glig;
	varying vec2 vscreenPos;
	void main(){
		vec2 tpos = vpos / 16.0;
		vec4 samp = texture2D(tex, toff + tpos);
		if(vec3(samp) == vec3(0)) discard;
		vec3 true_samp = pow(vec3(samp), vec3(2.2));
		float halo = 0.75 * (1.0 - smoothstep(.1, .25, length(vscreenPos)));
		float glig_final = smoothstep(-10.0, 10.0, glig + vscreenPos.y * ${winw/2}.0);
		float lig_final = max(halo, max(vlig, glig_final));
		vec3 final_color = lig_final * true_samp;
		gl_FragColor = vec4(pow(final_color, vec3(1.0/2.2)), 1);
	}
`;


const bvert = `
	precision highp float;
	attribute vec2 pos;
	varying vec2 tpos;
	uniform vec2 scale;
	uniform vec2 off;
	void main(){
		tpos = pos;
		gl_Position = vec4(pos * scale + off, 0, 1);
	}
`;

const bfrag = `
	#ifdef GL_FRAGMENT_PRECISION_HIGH
		precision highp float;
	#else
		precision mediump float;
	#endif
	uniform sampler2D back;
	varying vec2 tpos;
	void main(){
		gl_FragColor = texture2D(back, tpos);
	}
`;

const quadDat = new Float32Array([
	0, 0,
	1, 0,
	1, 1,
	1, 1,
	0, 1,
	0, 0
]);

const prog = glc.compileShaders(vert, frag);
const bprog = glc.compileShaders(bvert, bfrag);
glc.useProgram(prog);

function interp(a, b, alpha){ return (1 - alpha) * a + alpha * b; }


const inf = [
	{ tx: 0, ty: 0, r: 255,    g: 255,    b: 255, air: true },
	{ tx: 1, ty: 0, r: 0x93, g: 0x4a, b: 0x08 },
	{ tx: 5, ty: 0, r: 0xdd, g: 0xdd, b: 0xdd, air: true },
	{ tx: 0, ty: 1, r: 0x55, g: 0x55, b: 0x55 },
	{ tx: 6, ty: 1, r: 0xdd, g: 0xdd, b: 0xdd, air: true },
	{ tx: 2, ty: 1, r: 0xdf, g: 0xc1, b: 0x25, air: true },
	{ tx: 3, ty: 1, r: 0xdf, g: 0xc1, b: 0x25 },
	{ tx: 4, ty: 1, r: 0, g: 0, b: 0, air: true }
];


const quad = glc.newBuffer(quadDat, 2);
glc.useBuffer(glc.att('pos'), quad);

const p1 = (async () => {
	const imgElm = document.createElement('img');
	imgElm.style.display = 'none';
	imgElm.src = './res/level.png';
	document.body.appendChild(imgElm);
	await new Promise((res, rej) => {
		imgElm.onload = res;
		imgElm.onerror = rej;
	});

	gl.activeTexture(gl.TEXTURE0);
	const tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgElm);
	gl.uniform1i(glc.uni('tex'), 0);
})();

const p2 = (async () => {
	const imgElm = document.createElement('img');
	imgElm.style.display = 'none';
	imgElm.src = './res/backdrop.png';
	document.body.appendChild(imgElm);
	await new Promise((res, rej) => {
		imgElm.onload = res;
		imgElm.onerror = rej;
	});

	gl.activeTexture(gl.TEXTURE1);
	const tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgElm);

	glc.useProgram(bprog);
	glc.useBuffer(glc.att('pos'), quad);
	glc.useProgram(prog);
})();

await Promise.all([p1, p2, p3]);

const keys = new Array(256);
for(let i = 0; i < keys.length; i++){
	keys[i] = false;
}

const LEFT = 37;
const RIGHT = 39;
const UP = 38;
const DOWN = 40;

const A = 65;
const D = 68;
const W = 87;
const S = 83;
const SPACE = 32;
const M = 77;
const ENTER = 13;
const H = 72;

const DIGIT = [
	48, 49, 50, 51, 52, 53, 54, 55, 56, 57
];


let haveLock = false;

can.onkeydown = (e) => {
	keys[e.keyCode] = true;
	start_song();
	if(sounds.ac && sounds.ac.state === 'suspended'){
		sounds.ac.resume();
	}
	if(e.keyCode === SPACE || e.keyCode === UP || e.keyCode === DOWN){
		e.preventDefault();
	}
};

can.onkeyup = (e) => {
	keys[e.keyCode] = false;
};

can.onclick = () => {
	can.requestPointerLock();
};

let mbuttons = [false, false, false, false];
can.onmousedown = (e) => {
	if(haveLock) mbuttons[e.which] = true;
};

can.onmouseup = (e) => {
	if(haveLock) mbuttons[e.which] = false;
};

let mx = 1;
let my = 0;
document.onpointerlockchange = () => {
	haveLock = !!document.pointerLockElement;
	if(!haveLock){
		can.blur();
		stop_song();
	}
};

let last_movement_x = 0;
let last_movement_y = 0;
can.onmousemove = (e) => {
	if(haveLock){
        let dx = e.movementX;
        let dy = e.movementY;
        if(Math.abs(dx) > 300) dx = last_movement_x;
        if(Math.abs(dy) > 300) dy = last_movement_y;
        last_movement_x = dx;
        last_movement_y = dy;
        mx += dx / 200;
        my -= dy / 200;
		const mag = Math.sqrt(mx * mx + my * my);
		mx /= mag;
		my /= mag;
	}
};

const spawnx = 137;
let winx = spawnx;
let winy = 0;

let pwinx = 0;
let pwiny = 0;

let winxv = 0;
let winyv = 0;

let fist_rad_offset = 0;

const pw = .5;

while(!levelCollide()){
	winy++;
}
winy--;


function ind(x, y){
	x += .5;
	y += .5;
	if(x < 0 || x >= lw || y < 0 || y >= lw) return null;
	const cx = Math.floor(x);
	const cy = Math.floor(y);
	return cx + cy * lw;
}

function levelcoord(xory){
	xory += .5;
	if(xory < 0 || xory >= lw) return null;
	return Math.floor(xory);
}


function levelCollide(){
	const lox = Math.floor(winx) - 1;
	const hix = Math.floor(winx) + 1;
	const loy = Math.floor(winy) - 1;
	const hiy = Math.floor(winy) + 1;
	for(let x = Math.max(lox, 0); x <= Math.min(hix, lw); x++)
	for(let y = Math.max(loy, 0); y <= Math.min(hiy, lw); y++){
		const id = level[x + y * lw];
		if(Math.abs(winx - x) < (1 + pw)/2 && Math.abs(winy - y) < (1 + pw)/2 && !inf[id].air){
			return true;
		}
	}

	return false;
}

const ants = [];
const items = [];

let selected = 'stone';
const inv = {
	stone: 0,
	dirt: 0,
	worm: 0,
	gold: 0
};

function invRender(){
	for(let k in inv){
		const elm = document.getElementById('inv-' + k);
		elm.innerText = 'x' + inv[k];
		if(selected === k){
			elm.classList.add('selected');
		}else{
			elm.classList.remove('selected');
		}
	}
}

invRender();
function invAdd(name, amount){
	inv[name] += amount;
	invRender();
}

function invTryRemove(name, amount){
	if(inv[name] < amount) return false;
	inv[name] -= amount;
	invRender();
	return true;
}

function invSelect(name){
	selected = name;
	invRender();
}

let mode = 'game';


let mapData = new Uint8Array(level.length * 4);
const mapTex = gl.createTexture();

function openPopup(title, text){
	mode = 'popup';
	const p = document.getElementById('popup');
	p.style.display = 'block';

	const etitle = p.querySelector('#popup-title');
	const econtent = p.querySelector('#popup-content');
	etitle.innerText = title;
	econtent.innerText = text;
}

function closePopup(){
	mode = 'game';
	const p = document.getElementById('popup');
	p.style.display = null;
}

document.getElementById('popup').onclick = () => {
	can.focus();
	can.requestPointerLock();
	start_song();
};

const pause_overlay = document.getElementById('pause-indicator');
pause_overlay.onclick = () => {
	can.focus();
	can.requestPointerLock();
	start_song();
};
pause_overlay.innerText = 'Paused:\nClick to focus';

let saw_intro = false;
let saw_win = false;



let song = null;
function start_song(){
	if(song) return;
	song = sounds.play_sound('res/howard.mp3', .125, {
		loop: true
	}).then((nodes) => {
		song = nodes;
	}).catch((e) => {
		console.log(e);
		song = null;
	});
}

async function stop_song(){
	if(!song) return;

	let s = song;
	if(s instanceof Promise){
		s = await s;
	}

	s.source.stop();
	song = null;
}

let canjump = false;
let pcool = 0;
let tcool = 0;
gc.setGameStep((t) => {
	pwinx = winx;
	pwiny = winy;

	if(mode === 'map'){
		if(keys[M]){
			keys[M] = false;
			mode = 'game';
			document.getElementById('inv').style.display = null;
		}

		return;
	}else if(mode === 'popup'){
		if(keys[ENTER]){
			keys[ENTER] = false;
			closePopup();
		}

		return;
	}

	if(!saw_intro && t > 30){
		saw_intro = true;
		openPopup('Welcome, Howard',
			'As we discussed, your goal is to descend as far as possible into the ant colony' +
			' to search for the secret material we believe they are hiding.\n\n' +
			'WASD to move\n' +
			'Left Mouse to punch\n' +
			'Right Mouse to use item\n' +
			'1-4 to select item\n' +
			'M to toggle the map\n\n' +
			'H to re-open this message');
	}

	winx += winxv;
	if(levelCollide()){
		winx = pwinx;
		let delta = winxv;
		winxv = 0;
		for(let i = 0; i < 10; i++){
			const p = winx;
			winx += delta;
			if(levelCollide()){
				winx = p;
			}
			delta /= 2;
		}
	}

	winy += winyv;
	if(levelCollide()){
		if(winyv > 0) canjump = true;
		winy = pwiny;
		let delta = winyv;
		winyv = 0;
		for(let i = 0; i < 10; i++){
			const p = winy;
			winy += delta;
			if(levelCollide()){
				winy = p;
			}
			delta /= 2;
		}
	}

	const cdist = (1 + pw) / 2;
	if(winy < cdist-1)       { winyv = 0; winy = cdist-1; }
	if(winy > lw - 1 - cdist){ winyv = 0; winy = lw - 1 - cdist; }
	if(winx < cdist-1)       { winxv = 0; winx = cdist-1; }
	if(winx > lw - 1 - cdist){ winxv = 0; winx = lw - 1 - cdist; }


	const a = .05;
	const dx = .7;
	const dy = .98;
	const g = .007;
	const jv = .25;
	if(keys[LEFT] || keys[A]){
		winxv -= a;
	}
	if(keys[RIGHT] || keys[D]){
		winxv += a;
	}
	if(canjump && (keys[UP] || keys[W] || keys[SPACE])){
		winyv = -jv;
		canjump = false;
		sounds.play_sound('res/jump.wav', .125);
	}
	if(keys[DIGIT[1]]){
		invSelect('stone');
	}
	if(keys[DIGIT[2]]){
		invSelect('dirt');
	}
	if(keys[DIGIT[3]]){
		invSelect('worm');
	}
	if(keys[DIGIT[4]]){
		invSelect('gold');
	}

	if(keys[H]){
		keys[H] = false;
		saw_intro = false;
	}

	if(keys[M]){
		keys[M] = false;
		mode = 'map';

		document.getElementById('inv').style.display = 'none';

		//TODO generate map

		for(let i = 0; i < level.length; i++){
			const id = level[i];
			const r = i*4 + 0;
			const g = i*4 + 1;
			const b = i*4 + 2;
			mapData[i*4 + 3] = 255;
			const x = i % lw;
			const y = Math.floor(i / lw);
			const pdx = x - Math.floor(winx);
			const pdy = y - Math.floor(winy);
			const pr = Math.abs(pdx) + Math.abs(pdy);
			if(pr < 2){
				mapData[r] = 0xff;
				mapData[g] = 0x00;
				mapData[b] = 0x00;
			}else if(discovery[i]){
				if(level[i] === 0 || level[i] === 5 || level[i] === 7){
					if(dirtback(x, y)){
						mapData[r] = 0x59;
						mapData[g] = 0x2b;
						mapData[b] = 0x02;
					}else{
						mapData[r] = 0x5b;
						mapData[g] = 0x00;
						mapData[b] = 0x9a;
					}
				}else{
					mapData[r] = inf[id].r;
					mapData[g] = inf[id].g;
					mapData[b] = inf[id].b;
				}
			}else{
				mapData[r] = 0;
				mapData[g] = 0;
				mapData[b] = 0;
			}
		}

		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, mapTex);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, lw, lw, 0, gl.RGBA, gl.UNSIGNED_BYTE, mapData);
	}

	for(let i = 0; i < ants.length; i++){
		const ant = ants[i];
		ant.energy += .01;
		const pdx = ant.x - winx;
		const pdy = ant.y - winy;
		const pdist = pdx * pdx + pdy + pdy;
		if(pdist < 25){
			ant.energy += .05;
		}

		if(pdist > 800){
			ants.splice(i, 1);
			i--;
			continue;
		}

		if(ant.energy > 1){
			ant.energy -= 1;
			const options = [];
			adj(ant.x, ant.y, true, (x, y) => {
				let solidAdj = false;
				const solid = !inf[level[x + y * lw]].air;
				if(!solid){
					adj(x, y, false, (x, y) => {
						if(x < 0 || x >= lw || y < 0 || y >= lw) return;
						const id = level[x + y *lw];
						const solid = !inf[id].air && id !== 6;
						if(solid) solidAdj = true;
					});
					if(solidAdj){
						options.push({x, y});
					}
				}
			});

			// Drift towards the player without running them down
			if(pdist < 25 && Math.random() < .1){
				let closedist = Infinity;
				let closest = options[0];
				for(let i = 0; i < options.length; i++){
					const pdx = options[i].x - winx;
					const pdy = options[i].y - winy;
					const pdist = pdx * pdx + pdy * pdy;
					if(pdist < closedist){
						closedist = pdist;
						closest = options[i];
					}
				}
				ant.x = closest.x;
				ant.y = closest.y;
			}else{
				const choice = Math.floor(Math.random() * options.length);
				ant.x = options[choice].x;
				ant.y = options[choice].y;
			}
		}

		if(Math.abs(winx - ant.x) < .5 && Math.abs(winy - ant.y) < .5 && !inv.gold){
			//TODO animation or something to indicate what happened
			winx = spawnx;
			winy = 0;
			while(!levelCollide()){
				winy++;
			}
			winy--;
			pwiny = winy;
			pwinx = winx;
			ants.splice(i, 1);
			i--;
			sounds.play_sound('res/die.wav', .25);
			const haveRocks = !!inv.stone;
			const msgs = [
				'A temporary setback...',
				haveRocks ? 'Should have used my weapon...' : 'Should have brought a weapon...',
				'And yet we persist...',
				'I will not be stopped.',
				'What are they hiding!?'
			];
			openPopup(msgs[Math.floor(Math.random() * msgs.length)],
				'The ant grabs you in its mandibles and drags you back to the surface.\n\nDon\'t give up!');
		}
	}


	if(ants.length < 3){
		const rx = (Math.random() * 2 - 1) * 20;
		const ry = (Math.random() * 2 - 1) * 20;
		if(rx * rx + ry * ry > 10){
			const nx = Math.floor(winx + rx);
			const ny = Math.floor(winy + ry);
			if(nx >= 0 && nx < lw && ny >= 0 && ny < lw && ny > 52){
				const solid = !inf[level[ind(nx, ny)]].air;
				if(!solid){
					let good = false;
					adj(nx, ny, true, (x, y) => {
						if(x < 0 || x >= lw || y < 0 || y >= lw) return;
						if(!inf[level[ind(x, y)]].air) good = true;
					});
					if(good){
						const lights = getLights();
						for(let i = 0; i < lights.length; i++){
							const light = lights[i];
							const ldx = nx - light.x;
							const ldy = ny - light.y;
							const lr = ldx * ldx + ldy * ldy;
							if(lr < 25) good = false;
						}
					}
					if(good) ants.push({x: Math.floor(nx + .5), y: Math.floor(ny + .5), energy: 0});
				}
			}
		}
	}

	fist_rad_offset *= .9;
	winxv *= dx;
	winyv *= dy;

	winyv += g;

	const launchv = .2;

	let px = winx + .5 * mx;
	let py = winy - .5 * my;
	let i = ind(px, py);

	if(mbuttons[1] && pcool === 0){
		pcool = 60;
		fist_rad_offset = 1;

		let success = true;
		if(level[i] === 1){
			invAdd('dirt', 1);
			level[i] = 0;
		}else if(level[i] === 2){
			invAdd('worm', 2);
			level[i] = 0;
		}else if(level[i] === 5 || level[i] === 6){
			invAdd('gold', 4);
			level[i] = 0;
			if(!saw_win){
				saw_win = true;
				openPopup('Congratulations',
					'You have found the ants\' secret cache.  Ants will not attack you ' +
					' while you carry their treasure in your inventory.  Feel free to ' +
					' explore some more, or build something fun and post a screenshot for others to see!');

			}
		}else if(level[i] === 3){
			invAdd('stone', 4);
			//items.push({x: px, y: py, xv: launchv * (winx - px), yv: launchv * (winy - py), dead: false});
		}else success = false;

		if(success){
			sounds.play_sound('res/break.wav', .25);
		}
	}
	if(pcool > 0) pcool--;

	if(mbuttons[3] && tcool === 0){
		tcool = 20;
		fist_rad_offset = 1;

		// Adjust place location for collisions
		const prev = level[i];
		level[i] = 1;
		if(levelCollide()){
			if(Math.abs(mx) > Math.abs(my)){
				px += Math.sign(mx);
			}else{
				py -= Math.sign(my);
			}
		}
		level[i] = prev;
		i = ind(px, py);

		let success = false;
		if(selected === 'stone' && invTryRemove('stone', 1)){
			items.push({
				x: winx, y: winy,
				xv: launchv * mx,
				yv: launchv * -my
			});
		}else if(selected === 'worm' && level[i] === 0 && dirtback(levelcoord(px), levelcoord(py))){ //TODO use same logic as for background dirt
			if(invTryRemove('worm', 1)){
				success = true;
				level[i] = 4;
			}
		}else if(selected === 'dirt' && level[i] === 0 && invTryRemove('dirt', 1)){
			success = true;
			level[i] = 1;
		}else if(selected === 'gold' && level[i] === 0 && invTryRemove('gold', 4)){
			success = true;
			level[i] = 6;
		}

		if(success){
			sounds.play_sound('res/place.wav', .25);
		}
	}
	if(tcool > 0) tcool--;

	for(let i = 0; i < items.length; i++){
		const item = items[i];
		if(item.dead){
			item.dead++;
			if(item.dead > 60){
				items.splice(i, 1);
				i--;
			}
			continue;
		}

		item.x += item.xv;
		item.y += item.yv;

		const b = ind(item.x, item.y);
		if(typeof b !== 'number' || !inf[level[b]].air){
			item.dead = 1;
			sounds.play_sound('res/rock_land.wav', .0625);
		}else if(typeof b === 'number'){
			for(let i = 0; i < ants.length; i++){
				const ant = ants[i];
				if(ind(ant.x, ant.y) === b){
					ants.splice(i, 1);
					i--;
					sounds.play_sound('res/ant_kill.wav', .25);
				}
			}
		}

		item.xv *= dy;
		item.yv *= dy;
		item.yv += g;
	}

	for(let x = Math.max(0, Math.floor(winx - winw/2)); x < Math.min(lw - 1, Math.floor(winx + winw/2 + 2)); x++)
	for(let y = Math.max(0, Math.floor(winy - winw/2)); y < Math.min(lw - 1, Math.floor(winy + winw/2 + 2)); y++){
		const i = x + y * lw;
		if(level[i] === 0) discovery[i] = 1;
		adj(x, y, false, (x, y) => {
			const ai = x + y * lw;
			if(level[ai] !== undefined && inf[level[ai]].air) discovery[i] = 1;
		});
	}

	for(let i = 0; i < 40; i++){
		const i = Math.floor(Math.random() * level.length);
		if(level[i] === 4) level[i] = 2; // growing glow worm
	}
});

const ligDat = new Float32Array([
	0,0,0,0,0,0
]);
const ligBuf = glc.newDynamicBuffer(ligDat, 1);


function getLights(){
	const lights = [];
	for(let x = 0; x < lw; x++)
	for(let y = 0; y < lw; y++){
		if(level[x + y * lw] === 2){
			lights.push({x, y});
		}
	}
	return lights;
}

function dirtback(x, y){
	const hillx = x > 122 && x < 173;
	return y > (hillx ? 25 : 52) + Math.sin(x);
}




gc.setDraw((paused, alpha, t) => {
	gl.clearColor(0, 0, 0, 1);
	gl.clear(gl.COLOR_BUFFER_BIT);

	if(paused){
		pause_overlay.style.display = 'flex';
	}else{
		pause_overlay.style.display = 'none';
	}

	if(mode === 'map'){
		glc.useProgram(bprog);
		gl.uniform2f(glc.uni('scale'), 2, -2);
		gl.uniform2f(glc.uni('off'), -1, 1);
		gl.uniform1i(glc.uni('back'), 2);
		gl.drawArrays(gl.TRIANGLES, 0, 6);

		return;
	}


	const rwinx = interp(pwinx, winx, alpha);
	const rwiny = interp(pwiny, winy, alpha);

	glc.useProgram(bprog);

	gl.uniform1i(glc.uni('back'), 1);
	gl.uniform2f(glc.uni('scale'), 8, 8);
	gl.uniform2f(glc.uni('off'), -rwinx / 128 - 1, (rwiny - 256) / 128 - 1);
	gl.drawArrays(gl.TRIANGLES, 0, 6);


	glc.useProgram(prog);


	gl.uniform1f(glc.uni('scale'), 2/winw);

	gl.uniform1f(glc.uni('glig'), 52 - rwiny);
	glc.useBuffer(glc.att('lig'), ligBuf);

	const lights = getLights();

	for(let x = Math.max(0, Math.floor(rwinx - winw/2)); x < Math.min(lw - 1, Math.floor(rwinx + winw/2 + 2)); x++)
	for(let y = Math.max(0, Math.floor(rwiny - winw/2)); y < Math.min(lw - 1, Math.floor(rwiny + winw/2 + 2)); y++){
		const ox = -.5 -rwinx +x;
		const oy = -.5 +rwiny -y;

		const id = level[x + y*lw];
		const disc = discovery[x + y * lw];

		ligDat.fill(0);

		for(let i = 0; i < lights.length; i++){
			const light = lights[i];
			const dx = x - light.x
			const dy = y - light.y;
			const dist = dx*dx + dy*dy;
			if(dist > 100) continue;

			for(let i = 0; i < ligDat.length; i++){
				const dx = x - .5 + quadDat[i*2] - light.x
				const dy = y - .5 + 1 - quadDat[i*2+1] - light.y;
				const rsq = dx * dx + dy * dy;

				// put a hard cutoff before the real hard cutoff so it gets interpolated
				const contrib = rsq > 81 ? 0 : 1/(1 + rsq);
				ligDat[i] = Math.max(ligDat[i], contrib);
				if(ligDat[i] > .75) ligDat[i] = .75;
			}
		}


		glc.bufferReplaceDat(ligDat, ligBuf);

		gl.uniform2f(glc.uni('off'), ox, oy);
		if(id === 0 && dirtback(x, y)){
			gl.uniform2f(glc.uni('toff'), 6/16, 0 / 16);
		}else if(disc){
			gl.uniform2f(glc.uni('toff'), inf[id].tx / 16, inf[id].ty / 16);
		}else{
			gl.uniform2f(glc.uni('toff'), 4 / 16, 0);
		}
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

	for(let i = 0; i < ants.length; i++){
		const ant = ants[i];
		const ox = -.5 -rwinx +ant.x;
		const oy = -.5 +rwiny -ant.y;

		gl.uniform2f(glc.uni('off'), ox, oy);
		gl.uniform2f(glc.uni('toff'), 7 / 16, 0);
		gl.uniform1f(glc.uni('scale'), 2/winw);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

	for(let i = 0; i < items.length; i++){
		const item = items[i];

		const sc = .25;

		const ox = -.5 + (-rwinx +item.x)/sc;
		const oy = -.5 + (+rwiny -item.y)/sc;

		gl.uniform2f(glc.uni('off'), ox, oy);
		gl.uniform2f(glc.uni('toff'), 1/16, 1/16);
		gl.uniform1f(glc.uni('scale'), sc * 2/winw);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

	gl.uniform1f(glc.uni('glig'), 100);


//INVENTORY
	gl.uniform2f(glc.uni('off'), winw - 3, winw - 1.5);
	gl.uniform2f(glc.uni('toff'), 1 / 16, 1 / 16);
	gl.uniform1f(glc.uni('scale'), 1 / winw);
	gl.drawArrays(gl.TRIANGLES, 0, 6);

	gl.uniform2f(glc.uni('off'), winw - 3, winw - 3);
	gl.uniform2f(glc.uni('toff'), 1 / 16, 0 / 16);
	gl.uniform1f(glc.uni('scale'), 1 / winw);
	gl.drawArrays(gl.TRIANGLES, 0, 6);

	gl.uniform2f(glc.uni('off'), winw - 3, winw - 4.5);
	gl.uniform2f(glc.uni('toff'), 5 / 16, 2 / 16);
	gl.uniform1f(glc.uni('scale'), 1 / winw);
	gl.drawArrays(gl.TRIANGLES, 0, 6);

	gl.uniform2f(glc.uni('off'), winw - 3, winw - 6);
	gl.uniform2f(glc.uni('toff'), 2 / 16, 2 / 16);
	gl.uniform1f(glc.uni('scale'), 1 / winw);
	gl.drawArrays(gl.TRIANGLES, 0, 6);


//PLAYER
	gl.uniform2f(glc.uni('off'), -pw, -pw);
	gl.uniform2f(glc.uni('toff'), 2 / 16, 0);
	gl.uniform1f(glc.uni('scale'), 1/ winw);
	gl.drawArrays(gl.TRIANGLES, 0, 6);

//FIST
	gl.uniform2f(glc.uni('off'), mx*(.5 + fist_rad_offset) -pw, my*(.5 + fist_rad_offset)-pw);
	gl.uniform2f(glc.uni('toff'), 3/16, 0);
	gl.uniform1f(glc.uni('scale'), 1/winw);
	gl.drawArrays(gl.TRIANGLES, 0, 6);

	glc.safe();
});

can.onblur = () => gc.pause();
can.onfocus = () => gc.unPause();

can.blur();

})();
