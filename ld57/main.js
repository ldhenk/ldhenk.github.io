(async () => {

const sounds = create_sound_manager([
	'res/bends.mp3',
	'res/hiss.wav',
	'res/alarm.wav',
	'res/die.wav'
]);

let img;
{
	try{
		await new Promise((res, rej) => {
			img = document.createElement('img');
			img.onload = res;
			img.onerror = rej;
			img.src = '/res/texture.png';
		});
	}catch(e){
		document.querySelector('.fadein').innerText = 'Error loading textures';
		return;
	}
}


let song = null;
function start_song(){
	if(song) return;
	song = sounds.play_sound('res/bends.mp3', 2, {
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

document.body.onmousedown = () => {
	sounds.ping();
};

const bodyHeight = 12288;
const canvasHeight = 512;

const can = document.getElementById('canvas');
can.height = canvasHeight;
can.width = canvasHeight;

const painElm = document.querySelector('#pain .fill');
const airElm = document.querySelector('#air .fill');

const gc = new GameController();
const gl = can.getContext('webgl', { antialias: false, alpha: false });
const glc = new GLController(gl, can.width, can.height);

document.body.style.height = bodyHeight + 'px';

let running = true;
let canvasPos = 0;
let prevCanvasPos = 0;
let playerX = 0;
let prevPlayerX = 0;
let playerY = 0;
let prevPlayerY = 0;
let playerRoll = 0;
let prevPlayerRoll = 0;

let pain = 0;
let prevPain = -1;
let air = 1;
let prevAir = -1;

const camPos = {
	x: 0, y: 0, z: 0, pi: 0, ya: 0
};

const keys = [];

const waveDiv = [
	47, 73, 51, 63, 33, 57, 47, 71
];
const waves = [];
const prevWaves = [];

document.body.onkeydown = (e) => {
	const c = e.keyCode;
	keys[c] = true;
};

document.body.onkeyup = (e) => {
	const c = e.keyCode;
	keys[c] = false;
	if(c === 80){ //P
/*
		if(running){
			gc.pause();
		}else{
			gc.unPause();
		}
		running = !running;
*/
	}else{
		console.log(e.keyCode);
	}
};



let colliding = false;
let prevColliding = false;
//window.godMode = true;

const wm = new WeakMap();


let cubes = [
	[10, 6.25, -22 - 10, 20],    // tut cubes
	[-10, 7.5, -22 - 10, 20],
	[10, 8.75, -22 - 10, 20],

	[-10, 10, -22 - 2.5, 5],     // tricky debris
	[-15, 10.25, -22 - 2.5, 5],
	[5, 10.5, -22 - 2.5, 5],
	[0, 10.8, -22 - 2.5, 5],
	[20, 10.7, -22 - 2.5, 5],
	[10, 11, -22 - 2.5, 5],
	[7, 11.5, -22 - 2.5, 5],
	[-10, 11.5, -22 - 2.5, 5],

	[0, 12.3, -22 - 2.5, 5],    // Branching path debris
	[-1, 12.7, -22 - 2.5, 5],
	[2, 13, -22 - 2.5, 5],
	[-2, 13.3, -22 - 2.5, 5],
	[-10, 13.5, -22 - 10, 20], // Large dead-end

	// Little break

	[0, 17, -22 - 10, 20], // Tight squeeze

	[0, 17.5, -22 - 5, 10, {
		upd: function(self, t){
			self[0] = Math.sin(t / 200) * 20;
		}
	}],

	[0, 18, -22 - 5, 10, {
		upd: function(self, t){
			self[0] = Math.sin(t / 200) * -20;
		}
	}],


	[0, 20, -22 - 5, 10, {
		upd: function(self, t){
			if(!this.initY) this.initY = self[1];
			self[0] = Math.sin(t/250) * 40;
			self[1] = Math.sin(t/125) * -.25 + this.initY;
		}
	}],

	[0, 20, -22 - 5, 10, {
		upd: function(self, t){
			if(!this.initY) this.initY = self[1];
			self[0] = Math.sin(t/250) * -40;
			self[1] = Math.sin(t/125) * -.25 + this.initY;
		}
	}]
];

const prevCubes = new Array(cubes.length);
for(let i = 0; i < prevCubes.length; i++){
	prevCubes[i] = [0,0,0,0,0];
}

const almostDead = .8;
let won = false;

let currHiss = null;
let currAlarm = null;

function stop_hiss(){
	if(currHiss){
		let oldCurrHiss = currHiss;
		currHiss = null;
		oldCurrHiss.then((nodes) => {
			nodes.source.stop();
		});
	}
}

function stop_alarm(){
	if(currAlarm){
		let tmp = currAlarm;
		currAlarm = null;
		tmp.then((nodes) => {
			nodes.source.stop();
		});
	}
}


gc.setGameStep((t) => {
	start_song();

	prevCanvasPos = canvasPos;
	prevPlayerX = playerX;
	prevPlayerY = playerY;
	prevPlayerRoll = playerRoll;
	for(let i = 0; i < waveDiv.length; i++){
		prevWaves[i] = waves[i];
	}
	for(let i = 0; i < cubes.length; i++){
		const srcEntry = cubes[i];
		for(let j = 0; j < srcEntry.length; j++){
			prevCubes[i][j] = srcEntry[j];
		}
	}

	function getCollision(){
		const origin = -canvasPos / canvasHeight;

		const player_width = 5;
		const player_left = playerX - player_width / 2;
		const player_right = playerX + player_width / 2;
		const player_top = 3;
		const player_bottom = -16;
		for(let i = 0; i < cubes.length; i++){
			const cube = cubes[i];
			const [x, y, z, s] = cube;

			const l = x - s/2;
			const r = x + s/2;
			const yadj = (y + origin) * 44;
			const t = yadj + s/2;
			const b = yadj - s/2;

			const top_within = player_top < t && player_top > b;
			const bottom_within = player_bottom < t && player_bottom > b;
			const top_without = t < player_top && t > player_bottom;
			const bottom_without = b < player_top && b > player_bottom;
			const vert_intersect = top_within || bottom_within || top_without || bottom_without;

			const left_within = player_left > l && player_left < r;
			const right_within = player_right > l && player_right < r;
			const left_without = l > player_left && l < player_right;
			const right_without = r > player_left && r < player_right;
			const horiz_intersect = left_within || right_within || left_without || right_without;


			if(vert_intersect && horiz_intersect){
				return true;
			}
		}
		return false;
	}

/*
	const v = .1;

	const up = 38;
	const down = 40;
	const left = 37;
	const right = 39;

	if(keys['W'.charCodeAt(0)]){
		camPos.y += v;
	}
	if(keys['S'.charCodeAt(0)]){
		camPos.y -= v;
	}
	if(keys['A'.charCodeAt(0)]){
		camPos.x -= v;
	}
	if(keys['D'.charCodeAt(0)]){
		camPos.x += v;
	}

	const rv = .1;
	if(keys[up]){
		camPos.pi += rv;
	}
	if(keys[down]){
		camPos.pi -= rv;
	}
	if(keys[left]){
		camPos.ya += v;
	}
	if(keys[right]){
		camPos.ya -= v;
	}
*/



	const realCanvasHeight = can.getBoundingClientRect().height;

	ignoreCollision = getCollision();

	const distToBottom = bodyHeight - window.scrollY - window.innerHeight;
	const distCenterToBottom = distToBottom + window.innerHeight / 2;
	const targetCanvasPos = distCenterToBottom - realCanvasHeight / 2;

	const rate = window.godMode ? .1 : .01;
	const canvasVel = rate * (targetCanvasPos - canvasPos);

	canvasPos += canvasVel;

	if(!won && (window.scrollY < 200 && canvasVel < 5 || window.instawin)){
		won = true;
		// WIN!
		const winOverlay = document.querySelector('.winfadein');
		const winOverlayContent = document.querySelector('.winfadein .content');
		winOverlay.style.display = 'flex';
		setTimeout(() => {
			winOverlay.style.opacity = '1';
			setTimeout(() => {
				gc.pause();
				//stop_song();
				stop_hiss();
				stop_alarm();
				document.body.style.height = '100%';
				document.body.style.overflow = 'hidden';
				winOverlayContent.style.opacity = '1';
			}, 5000);
		}, 10);
	}


	colliding = ignoreCollision;

	if(!ignoreCollision && getCollision()){
		canvasPos = prevCanvasPos;
		colliding = true;
	}

	const targetPlayerX = xinput * 15;
	const xv = .03 * (targetPlayerX - playerX);
	playerX += xv;

	if(!ignoreCollision && getCollision()){
		while(getCollision()){
			playerX -= Math.sign(xv) * .01;
		}
		//playerX = prevPlayerX;
		colliding = true;
	}

	playerY = Math.sin(t / 60);
	playerRoll = Math.sin(t / 53);

	for(let i = 0; i < cubes.length; i++){
		const [x, y, z, s, cube] = cubes[i];
		if(cube){
			cube.upd(cubes[i], t);
		}
	}

	// Not confident in this but seems to work ok
	let distTest = 1;
	while(!ignoreCollision && getCollision()){
		canvasPos += distTest;
		if(getCollision()){
			canvasPos -= 2 * distTest;
		}

		if(getCollision()){
			canvasPos = prevCanvasPos;
		}

		distTest += 1;
		colliding = true;
	}


	for(let i = 0; i < waveDiv.length; i++){
		waves[i] = Math.sin(t / waveDiv[i]);
	}

	if(!window.godMode) pain += Math.max(0, pain > almostDead ? canvasVel / 1000 : canvasVel / 500);
	if(pain >  1)
		init(false);
	else if(pain > almostDead)
		pain -= .0001;
	else if(pain > .25)
		pain -= .001;
	else
		pain *= .999;

	if(air > 0){
		air -= .00002;
		if(colliding){
			air -= .001;
		}
	}else{
		init(false);
	}

	if(colliding && !currHiss){
		currHiss = sounds.play_sound('res/hiss.wav', .125, {
			loop: true
		});
	}
	if(!colliding) stop_hiss();

	if(pain > almostDead && !currAlarm){
		currAlarm = sounds.play_sound('res/alarm.wav', .125, {
			loop: true
		});
	}
	if(pain <= almostDead) stop_alarm();

	prevColliding = colliding;
});

function interp(a, b, alpha){
	return (b * alpha) + a * (1 - alpha);
}

const vert = `
	precision mediump float;
	uniform mat4 proj;
	uniform mat4 view;
	uniform mat4 modl;
	uniform mat4 subModl;
	uniform mat4 subModlPermute;
	uniform vec3 color;

	attribute vec3 pos;
	attribute vec2 tex;

	varying vec2 vtex;
	varying vec3 vpos;
	varying vec3 vcolor;
	void main(){
		vcolor = color;
		vtex = tex;
		vec4 worldPos = modl * subModlPermute * subModl * vec4(pos, 1);
		vpos = vec3(worldPos);
		gl_Position =  proj * view * worldPos;
	}
`;

const halfPix = .5 / 32;


const frag = `
	precision mediump float;

	uniform sampler2D samp;
	uniform vec2 tOff;
	uniform int glow;

	varying vec2 vtex;
	varying vec3 vcolor;
	varying vec3 vpos;
	void main(){
		vec3 ligPos = vec3(0, 0, 0);
		vec3 rgbInputColor = pow(vcolor, vec3(2.2));

		vec3 samp = vec3(texture2D(samp, (vtex * (1.0 - 2.0 * ${halfPix}) + ${halfPix} + tOff) / 4.0));
		vec3 rgbSamp = pow(samp, vec3(2.2));

		vec3 rgbColor = tOff.x > -0.9 ? rgbSamp * rgbInputColor : rgbInputColor;

		float dist = distance(ligPos, vpos);
		float distsq = dist*dist;
		float intensity = 100.0 / distsq;
		if(glow != 0) intensity = 1.0;
		vec2 viewportCenter = vec2(${canvasHeight / 2}, ${canvasHeight / 2});
		float screenCenterDist = distance(gl_FragCoord.xy, viewportCenter) / ${canvasHeight / 2}.0;

		// Light needs to fall off to 0 at the end of the viewport to avoid a hard edge
		float intensityCheat = (1.0 - smoothstep(.5, 1.0, screenCenterDist)) * intensity;
		vec3 filtColor = vec3(.6, .9, 1);
		vec3 litColor = rgbColor * filtColor * intensityCheat;
		vec3 srgbColor = pow(litColor, vec3(1.0/2.2));
		gl_FragColor = vec4(srgbColor, 1);
	}
`;

const prog = glc.compileShaders(vert, frag);
glc.useProgram(prog);


gl.activeTexture(gl.TEXTURE0);
const tex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, tex);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
gl.uniform1i(glc.uni('samp'), 0);


const backdropSize = 20.1;
const vertDat = new Float32Array([
	-backdropSize, -backdropSize, 0,
	backdropSize, -backdropSize, 0,
	backdropSize, backdropSize, 0,
	backdropSize, backdropSize, 0,
	-backdropSize, backdropSize, 0,
	-backdropSize, -backdropSize, 0
]);

const texes = glc.newBuffer(new Float32Array([
	0, 1,
	1, 1,
	1, 0,
	1, 0,
	0, 0,
	0, 1
]), 2);

const verts = glc.newBuffer(vertDat, 3);

let tetraDat;
let tetra;
let tetraTexDat;
let tetraTex;
{
	const alt = Math.sqrt(3) / 2;
	const alt3 = 1 / Math.sqrt(2);

	const v1 = [0, 0, 0];
	const v2 = [1, 0, 0];
	const v3 = [.5, 0, -alt];
	const v4 = [.5, alt3, -alt/2];


	tetraDat = new Float32Array([
		v1, v3, v2,
		v1, v2, v4,
		v3, v1, v4,
		v2, v3, v4
	].flat());

	// Mostly random texture positions
	tetraTexDat = new Float32Array([
		0, 0, 0, 1, 1, 1,
		//0, 1, 1, 1, 1, 0,
		0, 0, 0, 1, 1, 1,
		0, 0, 0, 1, 1, 1,
		0, 0, 0, 1, 1, 1,
	]);

	tetra = glc.newBuffer(tetraDat, 3);
	tetraTex = glc.newBuffer(tetraTexDat, 2);
}

const cubeSrc = new CubeFast(1,1,1,0,0,0);
const cubeDat = new Float32Array(cubeSrc.getVertices());
const cubeTexDat = new Float32Array(cubeSrc.getTexes());
const cube = glc.newBuffer(cubeDat, 3);
const cubeTex = glc.newBuffer(cubeTexDat, 2);

let xinput = 0;

window.onmousemove = (e) => {
	const r = can.getBoundingClientRect();
	const center = (r.left + r.right) / 2;
	const mousePush = (e.clientX - center) / (r.width / 2);
	xinput = Math.max(Math.min(mousePush, 1), -1);
};

gl.uniformMatrix4fv(glc.uni('proj'), false, glc.projMat(glc.toRads(90), 1));

gl.enable(gl.DEPTH_TEST);

const ident = [
	1,0,0,0,
	0,1,0,0,
	0,0,1,0,
	0,0,0,1
];

const playerParts = [{
	x: 0, y: -.7, z: 0, // head
	ya: 0, pi: 0, ro: 0,
	sx: 1, sy: 1, sz: 1,
	w: -1
},{
	x: .5, y: -.6, z: .35, // window
	ya: 0, pi: Math.PI / 3, ro: Math.PI,
	sx: .5, sy: .5, sz: .5,
	w: -1, glow: true
},{
	x: 0, y: -.5, z: 0, // neck
	ya: 0, pi: 0, ro: 0,
	sx: .5, sy: -2, sz: .5,
	w: -1
},{
	x: 0, y: -.75, z: 0, // torso
	ya: 0, pi: 0, ro: 0,
	sx: 1, sy: -2, sz: 1,
	w: -1
},{
	x: 0, y: -2, z: 0, // pelvis
	ya: 0, pi: 0, ro: 0,
	sx: .75, sy: .75, sz: .75,
	w: -1
},{
	x: -.4, y: -.75, z: .3, // uarm 1
	ya: 0, pi: 0, ro: 0,
	sx: .4, sy: -1, sz: .4,
	w: 0
},{
	x: -.4, y: -1.75, z: .3, // farm 1
	ya: 0, pi: 0, ro: 0,
	sx: .25, sy: 1.2, sz: .25,
	w: 0
},{
	x: .4, y: -.75, z: .3, // uarm 2
	ya: 0, pi: 0, ro: 0,
	sx: .4, sy: -1, sz: .4,
	w: 1
},{
	x: .4, y: -1.75, z: .3, // farm 2
	ya: 0, pi: 0, ro: 0,
	sx: .25, sy: 1.2, sz: .25,
	w: 1
},{
	x: .2, y: -2.75, z: .1, // leg 1
	ya: 0, pi: 0, ro: 0,
	sx: .25, sy: 1, sz: .25,
	w: 2
},{
	x: -.2, y: -2.75, z: .1, // leg 2
	ya: 0, pi: 0, ro: 0,
	sx: .25, sy: 1, sz: .25,
	w: 3
}];


function clamp(val, min, max){
	return Math.max(Math.min(val, max), min);
}

function init(first){
	window.scrollTo(0, 1000000000);
	canvasPos = 0;
	pain = 0;
	air = 1;

	let fadein = document.querySelector('.fadein');
	const winfadein = document.querySelector('.winfadein');
	if(!first){
		fadein.parentElement.removeChild(fadein);
		fadein = document.createElement('div');
		sounds.play_sound('res/die.wav', .25);
	}

	fadein.className = 'fadein';
	document.body.insertBefore(fadein, winfadein);
	setTimeout(() => fadein.style.opacity = '0');
}

function canvasYFromWorldY(yin, canvasPos, realCanvasHeight){
	return yin - canvasPos / realCanvasHeight;
}

gc.setDraw((paused, alpha, t) => {
	const interpCanvasPos = interp(prevCanvasPos, canvasPos, alpha);
	const interpPlayerX = interp(prevPlayerX, playerX, alpha);
	const interpPlayerY = interp(prevPlayerY, playerY, alpha);
	const interpPlayerRoll = interp(prevPlayerRoll, playerRoll, alpha);

	const xv = playerX - prevPlayerX;

	const interpWaves = waves.map((item, index) => {
		return interp(prevWaves[index], item, alpha);
	});

	const realCanvasHeight = can.getBoundingClientRect().height;
	const origin = -canvasPos / canvasHeight;

	can.style.transform = 'translate(0, ' + (bodyHeight - realCanvasHeight - interpCanvasPos) + 'px)';

	if(pain !== prevPain || air !== prevAir){
		prevPain = pain;
		prevAir = air;
		painElm.style.height = 100 * clamp(pain, 0, 1) + '%';
		airElm.style.height = 100 * clamp(air, 0, 1) + '%';
	}

	if(pain > almostDead !== painElm.classList.contains('danger')){
		if(pain > almostDead){
			painElm.classList.add('danger');
		}else{
			painElm.classList.remove('danger');
		}
	}

	const almostChoked = .25;
	if(air < almostChoked !== airElm.classList.contains('danger')){
		if(air < almostChoked){
			airElm.classList.add('danger');
		}else{
			airElm.classList.remove('danger');
		}
	}

	gl.clearColor(0, 0, 0, 1);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	gl.uniform2f(glc.uni('tOff'), -1, -1);

	gl.uniformMatrix4fv(glc.uni('subModl'), false, ident);
	gl.uniformMatrix4fv(glc.uni('subModlPermute'), false, ident);


	gl.uniformMatrix4fv(glc.uni('view'), false, glc.viewMat(camPos.x, camPos.y, camPos.z, camPos.ya, camPos.pi));

	gl.uniform3f(glc.uni('color'), 0, .1, .5);
	glc.useBuffer(glc.att('pos'), verts);
	glc.useBuffer(glc.att('tex'), texes);
	gl.uniformMatrix4fv(glc.uni('modl'), false, glc.modelMatNoRotate(0, 0, -40, 10));
	gl.drawArrays(gl.TRIANGLES, 0, vertDat.length / 3);

	glc.safe();

	const interpCubes = cubes.map((cube, cubeindex) => {
		return cube.map((coord, coordindex) => {
			return interp(prevCubes[cubeindex][coordindex], coord, alpha);
		});
	});

	gl.uniform3f(glc.uni('color'), 1, 1, 1);
	glc.useBuffer(glc.att('pos'), cube);
	glc.useBuffer(glc.att('tex'), cubeTex);
	gl.uniform2f(glc.uni('tOff'), 2, 0);
	for(let i = 0; i < interpCubes.length; i++){
		const c = interpCubes[i];
		//TODO cull off-screen cubes
		gl.uniformMatrix4fv(glc.uni('modl'), false,
			glc.modelMatNoRotate(c[0], (origin + c[1])* 44, c[2], c[3]));
		gl.drawArrays(gl.TRIANGLES, 0, cubeDat.length / 3);
	}
	glc.safe();

	gl.uniform2f(glc.uni('tOff'), 0, 0);

	gl.uniform3f(glc.uni('color'), 1, colliding ? 0 : 1, 1);
	glc.useBuffer(glc.att('pos'), tetra);
	glc.useBuffer(glc.att('tex'), tetraTex);
	const baseModel = glc.modelMat(
		interpPlayerX, interpPlayerY + 5, -20,
		0, 0, interpPlayerRoll / 20 - xv / 10,
		8);
	gl.uniformMatrix4fv(glc.uni('modl'), false, baseModel);
	for(let i = 0; i < playerParts.length; i++){
		const part = playerParts[i];

		let ro = 0;
		let pi = 0;
		if(part.w !== -1){
			ro = interpWaves[part.w * 2];
			pi = interpWaves[part.w * 2 + 1];
		}

		if(part.glow){
			gl.uniform1i(glc.uni('glow'), 1);
			gl.uniform2f(glc.uni('tOff'), 1, 0);
		}else{
			gl.uniform1i(glc.uni('glow'), 0);
			gl.uniform2f(glc.uni('tOff'), 0, 0);
		}

		const submat = glc.modelMatNonUniformScaling(
			part.x - part.sx / 2, part.y, part.z + part.sz / 2 - .5,
			part.ya, part.pi, part.ro,
			part.sx, part.sy, part.sz);

		gl.uniformMatrix4fv(glc.uni('subModl'), false, submat);

		const submatp = glc.modelMat(
			0, 0, 0,
			0, pi / 200, ro / 200,
			1);

		gl.uniformMatrix4fv(glc.uni('subModlPermute'), false, submatp);

		gl.drawArrays(gl.TRIANGLES, 0, tetraDat.length / 3);
	}

	glc.safe();
});


const fadein = document.querySelector('.fadein');
fadein.onclick = () => {
	fadein.onclick = null;
	init(true);
	gc.unPause();
};
fadein.querySelector('.inner').innerText = 'Click to Begin';


})();
