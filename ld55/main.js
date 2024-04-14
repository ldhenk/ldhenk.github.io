const gc = new GameController();

const sounds = create_sound_manager([
	'res/pht.wav',
	'res/pht2.wav',
	'res/pht3.wav',
	'res/phm.wav',
	'res/rumble.wav'
]);

let drone1 = null;
let drone2 = null;

function start_drones(){
	if(!drone1){
		drone1 = sounds.play_artificial_sound('sawtooth', 0, { gain: 0 });
		drone2 = sounds.play_artificial_sound('sawtooth', 0, { gain: 0 });
	}
}

function stop_drones(){
	if(drone1){
		drone1.source.stop();
		drone2.source.stop();
		drone1 = null;
		drone2 = null;
	}
}

const keys = [];
function key(code){
	if(typeof code === 'string'){
		code = code.charCodeAt(0);
	}
	return keys[code] || false;
}

const can = document.querySelector('canvas');
const gl = can.getContext('webgl', {
	antialias: false //TODO enable?
});
const glc = new GLController(gl, can.width, can.height);

let x = 0;
let y = 0;
let z = 0;

let xp = 0;
let yp = 0;
let zp = 0;

let xv = 0;
let yv = 0;
let zv = 0;

let pi = 0.001;
let ya = 0.001;

let pip = pi;
let yap = ya;

let shake_amplitude = 0;
let shake_frequency = 20;
let shake_decay = .9;

function interp(a, b, alpha){
	return a * (1 - alpha) + b * alpha;
}

const frag = `
	precision mediump float;
	uniform sampler2D sampler;
	varying vec2 vTex;

	varying vec3 relcPos;
	varying vec3 relc1;
	varying vec3 relc2;
	varying vec3 relc3;
	varying vec3 relstar;

	uniform vec3 chain_color;
	uniform int bb;
	void main(){
		vec4 sample = texture2D(sampler, vTex);
		vec3 uncompressed = pow(vec3(sample), vec3(2.2));
		vec3 mult = vec3(1,1,1);
		if(vTex.x > .76){
			mult = chain_color;
		}
		if(bb == 1 && vec3(sample) == vec3(0)){
			discard;
		}
		float cDist    = 1.0 + length(vec2(relcPos.x, relcPos.z));
		float c1Dist   = 1.0 + length(vec2(relc1.x,   relc1.z));
		float c2Dist   = 1.0 + length(vec2(relc2.x,   relc2.z));
		float c3Dist   = 1.0 + length(vec2(relc3.x,   relc3.z));
		float starDist = 1.0 + length(vec2(relstar.x, relstar.z));
		float star_lig = 1.0 / (starDist * starDist);
		vec3 lig = vec3(
			  0.5 / (cDist * cDist)
			+ 0.5 / (c1Dist * c1Dist)
			+ 0.125 / (c2Dist * c2Dist)
			+ 0.5 / (c3Dist * c3Dist))
			+ vec3(star_lig, star_lig / 2.0, star_lig / 2.0);

		vec3 computed = uncompressed * mult * lig;
		gl_FragColor = vec4(pow(computed, vec3(1.0/2.2)), 1);
	}
`;

const vert = `
	precision mediump float;

	uniform mat4 uModl;
	uniform mat4 uView;
	uniform mat4 uProj;
	uniform vec3 cPos;

	uniform vec3 c1;
	uniform vec3 c2;
	uniform vec3 c3;
	uniform vec3 star;

	attribute vec2 tex;
	attribute vec3 pos;

	varying vec3 relcPos;
	varying vec2 vTex;
	varying vec3 relc1;
	varying vec3 relc2;
	varying vec3 relc3;
	varying vec3 relstar;
	void main(){
		vTex = tex;
		vec3 modlPos = vec3(uModl * vec4(pos, 1));
		relcPos = cPos - modlPos;
		relc1 = c1 - modlPos;
		relc2 = c2 - modlPos;
		relc3 = c3 - modlPos;
		relstar = star - modlPos;
		gl_Position = uProj * uView * vec4(modlPos, 1);
	}
`;


const overlay_frag = `
	precision mediump float;
	varying vec2 vTex;
	uniform sampler2D sampler;
	void main(){
		vec4 sample = texture2D(sampler, vTex);
		if(vec3(sample) == vec3(0)) discard;
		gl_FragColor = sample;
	}
`;


const overlay_vert = `
	precision mediump float;
	attribute vec2 pos;
	attribute vec2 tex;
	varying vec2 vTex;
	void main(){
		vTex = tex;
		gl_Position = vec4(pos.x, pos.y, 0, 1);
	}
`;

const overlay_compiled = glc.compileShaders(overlay_vert, overlay_frag);
const compiled = glc.compileShaders(vert, frag);
glc.useProgram(compiled);

const width_unit = .7;
const eye_level = 1;
const height_unit = 1.3;

function pillar(arr, x, z){
	const lx = (0 + x) * width_unit;
	const lz = (0 + z) * width_unit;
	const hx = (1 + x) * width_unit;
	const hz = (1 + z) * width_unit;
	const hy = height_unit - eye_level;
	const ly = -eye_level;

	arr.push(
		// Front
		lx, ly, hz,
		hx, ly, hz,
		hx, hy, hz,
		hx, hy, hz,
		lx, hy, hz,
		lx, ly, hz,

		// Left
		lx, ly, lz,
		lx, ly, hz,
		lx, hy, hz,
		lx, hy, hz,
		lx, hy, lz,
		lx, ly, lz,

		// Back
		hx, ly, lz,
		lx, ly, lz,
		lx, hy, lz,
		lx, hy, lz,
		hx, hy, lz,
		hx, ly, lz,

		// Right
		hx, ly, hz,
		hx, ly, lz,
		hx, hy, lz,
		hx, hy, lz,
		hx, hy, hz,
		hx, ly, hz
	);
}

function floor(arr, x, z){
	const lx = (0 + x) * width_unit;
	const lz = (0 + z) * width_unit;
	const hx = (1 + x) * width_unit;
	const hz = (1 + z) * width_unit;
	const y = -eye_level;

	arr.push(
		lx, y, hz,
		hx, y, hz,
		hx, y, lz,
		hx, y, lz,
		lx, y, lz,
		lx, y, hz
	);
}

function ceiling(arr, x, z){
	const lx = (0 + x) * width_unit;
	const lz = (0 + z) * width_unit;
	const hx = (1 + x) * width_unit;
	const hz = (1 + z) * width_unit;
	const y = height_unit-eye_level;

	arr.push(
		lx, y, hz,
		hx, y, hz,
		hx, y, lz,
		hx, y, lz,
		lx, y, lz,
		lx, y, hz
	);
}

const floorTex = [
	0, 1,
	1, 1,
	1, 0,
	1, 0,
	0, 0,
	0, 1
];

const pillarTex = [
	0, 1,
	1, 1,
	1, 0,
	1, 0,
	0, 0,
	0, 1
];

for(let i = 1; i < 4; i++){
	for(let vert = 0; vert < 12; vert++){
		pillarTex[i * 12 + vert] = pillarTex[vert];
	}
}

function texStretch(arr, tex, xm, zm, xo, zo){
	for(let vert = 0; vert < tex.length / 2; vert++){
		const x = tex[vert * 2 + 0];
		const z = tex[vert * 2 + 1];
		arr.push(x * xm + xo);
		arr.push(z * zm + zo);
	}
	return arr;
}

function get_floor_tex(arr, x, nz){
	// .005 fudge factor because we're not doing power-of-two scaling (mistake! Lesson learned!)
	return texStretch(arr, floorTex, .25, 7/52 * .98, x * .25, 1.001 - (nz + 1) * 7/52);
}

function get_pillar_tex(arr, x, z){
	return texStretch(arr, pillarTex, .25, .25, x * .25, z * .25);
}

function billboard(arr, w, h){
	const xl = -w/2;
	const xh = w/2;
	const z = 0;
	const yl = -eye_level;
	const yh = h - eye_level;

	arr.push(
		xl, yl, z,
		xh, yl, z,
		xh, yh, z,
		xh, yh, z,
		xl, yh, z,
		xl, yl, z
	);
	return arr;
}

const candleDat = billboard([], width_unit * .75, width_unit * .75);
const candleTex = get_floor_tex([], 0, 1);

const candleBuf = glc.newBuffer(new Float32Array(candleDat), 3);
const candleTexBuf = glc.newBuffer(new Float32Array(candleTex), 2);

const demonDat = billboard([], width_unit, height_unit);
const demonTex = get_pillar_tex([], 2, 1);

const demonBuf = glc.newBuffer(new Float32Array(demonDat), 3);
const demonTexBuf = glc.newBuffer(new Float32Array(demonTex), 2);

let tpx = 0;
let tpz = 0;

let tp1x = 0;
let tp1z = 0;
let tp2x = 0;
let tp2z = 0;

let candle_one_x = 0;
let candle_one_z = 0;
let candle_two_x = 0;
let candle_two_z = 0;
let candle_three_x = 0;
let candle_three_z = 0;

let candle_one_state = 0;
let candle_two_state = 0;
let candle_three_state = 0;
let finale_triggered = false;
let finale_done = false;

function door_one_closed(){ return candle_one_state === 0; }
function door_two_closed(){ return candle_two_state === 0; }
function candle_one_visible(){ return candle_one_state === 0; }
function candle_two_visible(){ return candle_two_state === 0; }
function candle_three_visible(){ return candle_three_state === 0; }
function candle_one_star(){ return candle_one_state === 2; }
function candle_two_star(){ return candle_two_state === 2; }
function candle_three_star(){ return candle_three_state === 2; }
function candle_one_held(){ return candle_one_state === 1; }
function candle_two_held(){ return candle_two_state === 1; }
function candle_three_held(){ return candle_three_state === 1; }
function demon_two_visible(){ return candle_two_held(); }

function take_candle_one(){
	if(candle_one_visible()){
		candle_one_state += 1;
		build_level();
		shake_amplitude = .15;
		shake_frequency = 10;
		shake_decay = .8;
		sounds.play_sound('res/phm.wav', .25);
	}
}
function take_candle_two(){
	if(candle_two_visible()){
		candle_two_state += 1;
		build_level();
		shake_amplitude = .05;
		shake_frequency = 10;
		shake_decay = .8;
		sounds.play_sound('res/phm.wav', .25);
	}
}
function take_candle_three(){
	if(candle_three_visible()){
		candle_three_state += 1;
		build_level();
	}
}

let finale_sounds = null;

function trigger_finale(){
	// Trigger finale...
	shake_amplitude = .0001;
	shake_frequency = 5;
	shake_decay = 1.01;
	finale_triggered = true;
	sounds.play_sound('res/rumble.wav', 0, {
		loop: true,
		ramp: 10
	}).then((nodes) => {
		if(finale_done){
			nodes.source.stop();
		}else{
			finale_sounds = nodes;
		}
	});
}

function place_candle(){
	let should_build = false;
	if(candle_one_state === 1){
		candle_one_state++;
		should_build = true;
	}
	if(candle_two_state === 1){
		candle_two_state++;
		should_build = true;
	}
	if(candle_three_state === 1){
		candle_three_state++;
		should_build = true;
	}

	if(should_build){
		build_level();

		if(
			   candle_three_state === 2
			&& candle_two_state === 2
			&& candle_one_state === 2
		){
			trigger_finale();
		}
	}
}


// last entry must be one or we won't tp
const combination = [0, 1, 1, 0, 1];
let combination_pos = 0;
let last_combo_success = null;
function try_combination(val){
	if(combination_pos === combination.length){
		// stay solved
		return val === 1;
	}

	if(combination[combination_pos] === val){
		combination_pos++;
		last_combo_success = true;
	}else{
		combination_pos = 0;
		last_combo_success = false;
	}

	if(combination_pos === combination.length){
		last_combo_success = null;
		return true;
	}else{
		return false;
	}
}

let levelBuffer = null;
let levelTexBuffer = null;
let num_verts = 0;
const rows = level.split('\n');

let star_x = 0;
let star_z = 0;

let demon_x = 0;
let demon_z = 0;

let demon_two_x = 0;
let demon_two_z = 0;

function build_level(){
	let left_door_1 = false;
	let left_door_2 = true;
	let levelDat = [];
	let levelTex = [];
	for(let rowz = 0; rowz < rows.length; rowz++){
		const row = rows[rowz]
		for(let rowx = 0; rowx < row.length; rowx++){
			const ch = row[rowx];
			let do_ceiling = false;
			if(
				ch === '.' || ch === 'o' || ch === 'd' || ch === 'p'
				|| ch === 'D' || ch === 'P'
				|| ch === 'k' || ch === 'j'
				|| (ch === '1' && !door_one_closed())
				|| (ch === '2' && !door_two_closed())
				|| ch === '~' || ch === '-' || ch === '!'
			){
				floor(levelDat, rowx, rowz);
				get_floor_tex(levelTex, 0, 0);
				do_ceiling = true;
			}

			if(ch === '>'){
				floor(levelDat, rowx, rowz);
				get_floor_tex(levelTex, 1, 2);
				do_ceiling = true;
				star_x = rowx;
				star_z = rowz;
			}
			if(ch === 'V'){
				floor(levelDat, rowx, rowz);
				get_floor_tex(levelTex, 2, 2);
				do_ceiling = true;
			}
			if(ch === '<'){
				floor(levelDat, rowx, rowz);
				get_floor_tex(levelTex, 2, 1);
				do_ceiling = true;
			}
			if(ch === '^'){
				floor(levelDat, rowx, rowz);
				get_floor_tex(levelTex, 1, 1);
				do_ceiling = true;
			}

			if(ch === 'x'){
				pillar(levelDat, rowx, rowz);
				get_pillar_tex(levelTex, 0, 0);
			}
			if(ch === 'c'){
				pillar(levelDat, rowx, rowz);
				get_pillar_tex(levelTex, 3, 0);
			}
			if(ch === 'l'){
				pillar(levelDat, rowx, rowz);
				get_pillar_tex(levelTex, 2, 0);
			}
			if(ch === 'L'){
				pillar(levelDat, rowx, rowz);
				get_pillar_tex(levelTex, 1, 0);
			}
			if(ch === ',' || ch === 'i'){
				floor(levelDat, rowx, rowz);
				get_floor_tex(levelTex, 1, 0);
				do_ceiling = true;
			}

			if(do_ceiling){
				ceiling(levelDat, rowx, rowz);
				get_floor_tex(levelTex, 0, 0);
			}

			if(ch === 'o' && x === 0 && z === 0){
				x = (rowx + .5) * width_unit;
				z = (rowz + .5) * width_unit;
				xp = x;
				zp = z;
			}
			if(ch === '-'){
				tpx = rowx;
				tpz = rowz;
			}
			if(ch === '~' && !tp1x){
				tp1x = rowx;
				tp1z = rowz;
			}
			if(ch === '!' && !tp2x){
				tp2x = rowx;
				tp2z = rowz;
			}

			if(ch === '1' && door_one_closed()){
				pillar(levelDat, rowx, rowz);
				get_pillar_tex(levelTex, left_door_1 ? 0 : 1, 1);
				left_door_1 = !left_door_1;
			}

			if(ch === '2' && door_two_closed()){
				pillar(levelDat, rowx, rowz);
				get_pillar_tex(levelTex, left_door_2 ? 0 : 1, 1);
				left_door_2 = !left_door_2;
			}

			if(ch === 'i'){
				candle_one_x = rowx;
				candle_one_z = rowz;
			}
			if(ch === 'j'){
				candle_two_x = rowx;
				candle_two_z = rowz;
			}
			if(ch === 'k'){
				candle_three_x = rowx;
				candle_three_z = rowz;
			}
			if(ch === 'd' && !demon_x){
				demon_x = rowx;
				demon_z = rowz;
			}
			if(ch === 'D' && !demon_two_x){
				demon_two_x = rowx;
				demon_two_z = rowz;
			}
		}
	}

	if(levelBuffer === null){
		levelBuffer = glc.newBuffer(new Float32Array(levelDat), 3);
		levelTexBuffer = glc.newBuffer(new Float32Array(levelTex), 2);
	}else{
		glc.bufferReplaceDat(new Float32Array(levelDat), levelBuffer);
		glc.bufferReplaceDat(new Float32Array(levelTex), levelTexBuffer);
	}

	num_verts = levelDat.length / 3;
}
build_level();


function map_char(x, z){
	return rows[z]?.[x];
}

function map_intersect_point(x, z){
	const mapx = Math.floor(x / width_unit);
	const mapz = Math.floor(z / width_unit);
	return map_char(mapx, mapz);
}

let demon_seen = false;
let demon_two_seen = false;

const solid = 'xLlc';
function map_collide_small_square(xl, zl, xh, zh){
	const points = [
		{ x: xl, z: zl },
		{ x: xl, z: zh },
		{ x: xh, z: zl },
		{ x: xh, z: zh },
	];
	for(let i = 0; i < points.length; i++){
		const point = points[i];
		const ch = map_intersect_point(point.x, point.z);
		if(solid.includes(ch) || (door_one_closed() && ch === '1') || (door_two_closed() && ch === '2')){
			return true;
		}

		if(ch === 'i'){
			take_candle_one();
		}

		if(ch === 'j'){
			take_candle_two();
		}

		if(ch === 'k'){
			take_candle_three();
		}

		if(ch === '<' || ch === '>' || ch === '^' || ch === 'V'){
			place_candle();
		}

		if(ch === 'p'){
			demon_seen = true;
		}
		if(ch === 'P' && demon_two_visible()){
			demon_two_seen = true;
		}
	}
	return false;
}

function map_collide_player(x, z){
	const r = .25 * width_unit;
	return map_collide_small_square(
		x - r,
		z - r,
		x + r,
		z + r
	);
}

gl.uniformMatrix4fv(glc.uni('uProj'), false, glc.projMat(glc.toRads(90), .1, false, false));
gl.uniform1i(glc.uni('sampler'), 0);


function draw_candle(x, z){
	gl.uniformMatrix4fv(glc.uni('uModl'), false, glc.modelMat(
		(x + .5) * width_unit,
		0,
		(z + .5) * width_unit,
		ya, 0, 0, 1
	));

	glc.useBuffer(glc.att('pos'), candleBuf);
	glc.useBuffer(glc.att('tex'), candleTexBuf);
	gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function candle_light(x, z, uni){
	gl.uniform3f(uni, (x + .5) * width_unit, 0, (z + .5) * width_unit);
}

glc.useProgram(overlay_compiled);
const overlay_candles = [];
for(let i = 0; i < 3; i++){
	const sz = 56/250;
	let xl = 1 - sz - i * sz;
	let xh = 1 - i * sz;
	let yl = -1;
	let yh = -1 + sz;

	const verts = new Float32Array([
		xl, yl,
		xh, yl,
		xh, yh,
		xh, yh,
		xl, yh,
		xl, yl
	]);
	const texes = new Float32Array(get_floor_tex([], 0, 1));

	overlay_candles.push({
		vr: glc.newBuffer(verts, 2),
		tx: glc.newBuffer(texes, 2)
	});
}

gl.uniform1i(glc.uni('sampler'), 0);

let demon_offset = 0;
let demon_two_offset = 0;

let drone_fade_in = 0;

gc.setDraw((isPaused, alpha, tStamp) => {
	gl.enable(gl.DEPTH_TEST);
	glc.useProgram(compiled);
	gl.uniform1i(glc.uni('bb'), 0);
	if(pi > Math.PI / 2) pi = Math.PI / 2;
	if(pi < -Math.PI / 2) pi = -Math.PI / 2;

	if(candle_one_visible()){
		candle_light(candle_one_x, candle_one_z, glc.uni('c1'));
	}else{
		candle_light(-10000, -10000, glc.uni('c1'));
	}
	if(candle_two_visible()){
		candle_light(candle_two_x, candle_two_z, glc.uni('c2'));
	}else{
		candle_light(-10000, -10000, glc.uni('c2'));
	}
	if(candle_three_visible()){
		candle_light(candle_three_x, candle_three_z, glc.uni('c3'));
	}else{
		candle_light(-10000, -10000, glc.uni('c3'));
	}

	gl.uniform3f(glc.uni('star'), (star_x + 1) * width_unit , 0, (star_z + 1) * width_unit);

	if(finale_triggered){
		gl.uniform3f(glc.uni('cPos'), -10000, -10000, -10000);
	}else{
		gl.uniform3f(glc.uni('cPos'), x, y, z);
	}
	gl.uniformMatrix4fv(glc.uni('uModl'), false, glc.modelMatNoRotate(0, 0, 0, 1));
	glc.useBuffer(glc.att('pos'), levelBuffer);
	glc.useBuffer(glc.att('tex'), levelTexBuffer);

	gl.clearColor(0,0,0,1);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

	const xi = interp(xp, x, alpha);
	const yi = interp(yp, y, alpha);
	const zi = interp(zp, z, alpha);
	const yai = interp(yap, ya, alpha);
	const pii = interp(pip, pi, alpha);


	if(last_combo_success === null){
		gl.uniform3f(glc.uni('chain_color'), 1,1,1);
	}else if(last_combo_success){
		gl.uniform3f(glc.uni('chain_color'), 0,1,0);
	}else{
		gl.uniform3f(glc.uni('chain_color'), 1,0,0);
	}

	const tStampSecs = tStamp / 1000;
	const xshake = Math.sin(tStampSecs * (shake_frequency * 2 * Math.PI * 1.1)) * shake_amplitude;
	const zshake = Math.sin(tStampSecs * (shake_frequency * 2 * Math.PI * 1.3)) * shake_amplitude;
	const yshake = Math.sin(tStampSecs * (shake_frequency * 2 * Math.PI * 1.5)) * shake_amplitude / 2;
	gl.uniformMatrix4fv(glc.uni('uView'), false, glc.viewMat(xi + xshake, yi + yshake, zi + zshake, yai, pii));

	if(finale_triggered && finale_sounds){
		finale_sounds.gain.gain.value = Math.max(.01, shake_amplitude * 10);
		if(finale_done){
			finale_sounds.source.stop();
		}
	}

	gl.drawArrays(gl.TRIANGLES, 0, num_verts);

	gl.uniform1i(glc.uni('bb'), 1);
	if(candle_one_visible()){
		draw_candle(candle_one_x, candle_one_z);
	}
	if(candle_two_visible()){
		draw_candle(candle_two_x, candle_two_z);
	}
	if(candle_three_visible()){
		draw_candle(candle_three_x, candle_three_z);
	}
	if(candle_one_star()){
		draw_candle(star_x + 1.125, star_z + 1.125);
	}
	if(candle_two_star()){
		draw_candle(star_x + .5, star_z - .5);
	}
	if(candle_three_star()){
		draw_candle(star_x + 1.375, star_z + .125);
	}

	draw_candle(star_x + -.375, star_z + .125);
	draw_candle(star_x + -.125, star_z + 1.125);

	// Spoopy demon
	if(demon_offset < 1){
		gl.uniformMatrix4fv(glc.uni('uModl'), false, glc.modelMat(
			(demon_x + .5) * width_unit,
			0,
			(demon_z + .5 + demon_offset * 1.5) * width_unit,
			ya, 0, 0, 1
		));
		glc.useBuffer(glc.att('pos'), demonBuf);
		glc.useBuffer(glc.att('tex'), demonTexBuf);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

	// Spoopier demon
	if(demon_two_offset < 1 && demon_two_visible()){
		gl.uniformMatrix4fv(glc.uni('uModl'), false, glc.modelMat(
			(demon_two_x + .5) * width_unit,
			0,
			(demon_two_z + .5 + demon_two_offset * 1.5) * width_unit,
			ya, 0, 0, 1
		));
		glc.useBuffer(glc.att('pos'), demonBuf);
		glc.useBuffer(glc.att('tex'), demonTexBuf);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

	// "Inventory"
	gl.disable(gl.DEPTH_TEST);

	glc.useProgram(overlay_compiled);

	let num_candles =
		  !!candle_one_held()
		+ !!candle_two_held()
		+ !!candle_three_held();

	for(let i = 0; i < num_candles; i++){
		glc.useBuffer(glc.att('pos'), overlay_candles[i].vr);
		glc.useBuffer(glc.att('tex'), overlay_candles[i].tx);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

});

const up = 38;
const down = 40;
const left = 37;
const right = 39;
let step_buildup = 0;
let drone_buildup = 1;

gc.setGameStep((step) => {
	xp = x; yp = y; zp = z;
	pip = pi;
	yap = ya;
	const newx = x + xv;
	if(map_collide_player(newx, z)){
		xv = 0;
	}else{
		x = newx;
	}

	const newz = z + zv;
	if(map_collide_player(x, newz)){
		zv = 0;
	}else{
		z = newz;
	}

	y += yv;

	const speed = Math.sqrt(xv * xv + zv * zv);
	const step_thresh = 1;
	step_buildup += speed;
	if(step_buildup > step_thresh){
		step_buildup -= step_thresh;
		const which = Math.floor(Math.random() * 3);
		sounds.play_sound([
			'res/pht.wav',
			'res/pht2.wav',
			'res/pht3.wav'
		][which], .125);
	}

	if(candle_three_held() && drone_buildup < 2){
		drone_buildup += .0001;
	}

	if(drone1){
		const pulse = Math.sin(step / 50);
		const pulse2 = Math.cos(step / 50);
		if(!door_one_closed() && !finale_triggered){
			if(drone_fade_in < 1){
				drone_fade_in += .01
			}
			drone1.gain.gain.value = (pulse + 1) / 50 * drone_fade_in;
			drone1.source.frequency.value = (-pulse / 1 + 100) * drone_buildup;
		}else{
			drone1.gain.gain.value = 0;
		}

		if(!door_two_closed() && !finale_triggered){
			drone2.gain.gain.value = .02;
			drone2.source.frequency.value = 80 * drone_buildup;
		}else{
			drone2.gain.gain.value = 0;
		}
	}

	if(demon_seen && demon_offset < 1){
		demon_offset += .04;
	}

	if(demon_two_seen && demon_two_offset < 1){
		demon_two_offset += .1;
	}

	shake_amplitude *= shake_decay;
	if(shake_decay > 1 && shake_amplitude > .1){
		shake_decay = .8;
		setTimeout(() => {
			finale_done = true;
			const joke_text = '"There!  These damn kids never put the candles back when they\'re done with them."';
			const go_overlay = document.getElementById('game-over-overlay');
			go_overlay.innerText = joke_text;
			go_overlay.className = 'visible';
			can.blur();
			document.exitPointerLock();
			setTimeout(() => {
				go_overlay.innerText = '(thanks for playing)';
			}, 10000);
		}, 2000);
	}

	{
		let dx = 0;
		let dz = 0;
		if('~' === map_intersect_point(x, z) && !try_combination(0)){
			dx = (tpx - tp1x) * width_unit;
			dz = (tpz - tp1z) * width_unit;
		}
		if('!' === map_intersect_point(x, z) && !try_combination(1)){
			dx = (tpx - tp2x) * width_unit;
			dz = (tpz - tp2z) * width_unit;
		}
		x += dx;
		xp += dx;
		z += dz;
		zp += dz;
	}

	const a = .01;
	let xin = 0;
	let zin = 0;

	if(key('W')){
		zin += a;
	}
	if(key('S')){
		zin -= a;
	}
	if(key('A')){
		xin -= a;
	}
	if(key('D')){
		xin += a;
	}

	if(xin !== 0 && zin !== 0){
		const sqrt2 = Math.sqrt(2);
		xin /= sqrt2;
		zin /= sqrt2;
	}

	const cos = Math.cos(ya);
	const sin = Math.sin(ya);
	const xa = xin * cos - zin * sin;
	const za = -xin * sin - zin * cos;

	xv += xa;
	zv += za;

	xv *= .8;
	yv *= .8;
	zv *= .8;

	const rota = .04;

	if(key(up)){
		pi += rota;
	}
	if(key(down)){
		pi -= rota;
	}
	if(key(left)){
		ya += rota;
	}
	if(key(right)){
		ya -= rota;
	}

});

const tex_element = new Image();
tex_element.src = 'res/wall.png';
tex_element.onload = () => {
	gl.activeTexture(gl.TEXTURE0);
	const tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex_element);

	let locked = false;
	document.onpointerlockchange = () => {
		locked = !!document.pointerLockElement;
		if(!locked){
			can.blur();
		}
	};

	can.onkeydown = (e) => {
		if(sounds.ac && sounds.ac.state === 'suspended'){
			sounds.ac.resume();
		}

		start_drones();
		keys[e.keyCode] = true;
		//console.log('key', e.keyCode);
	};

	can.onkeyup = (e) => {
		keys[e.keyCode] = false;
	};

	can.onclick = () => {
		can.requestPointerLock();
		probably_have_lock = true;
	};

	can.onmousemove = (e) => {
		if(locked){
			pi -= e.movementY / 800;
			ya -= e.movementX / 800;
			pip = pi;
			yap = ya;
		}
	};

	can.onfocus = () => {
		start_drones();
		gc.unPause();
	};
	can.onblur = () => {
		stop_drones();
		gc.pause();
	}

	can.blur();
	can.focus();
};
