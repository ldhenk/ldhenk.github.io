async function waitForImage(id){
	const elm = document.getElementById(id);
	if(elm.complete) return elm;

	return await new Promise(res => {
		elm.onload = () => {
			res(elm);
		};
	});
}

let playing = null;

const can = document.getElementById('canvas');
const gc = new GameController();
const gl = can.getContext('webgl', { antialias: false, stencil: true });
const glc = new GLController(gl, can.width, can.height);

const sounds = [
	'res/bip.wav',
	'res/vmm.wav',
	'res/outpost.mp3'
];

const sm = create_sound_manager(sounds);

const left = 37;
const right = 39;
const up = 38;
const down = 40;

can.addEventListener('keydown', (e) => {
	if(
		   e.keyCode === up
		|| e.keyCode === left
		|| e.keyCode === right
		|| e.keyCode === down
		|| e.keyCode === ' '.charCodeAt(0)
	){
		e.preventDefault();
	}
	if(!keys[e.keyCode]) keys[e.keyCode] = 1;
});

window.addEventListener('keyup', (e) => {
	keys[e.keyCode] = 0;
});

const keys = [];
function key(code, consume){
	if(typeof code === 'string'){
		code = code.charCodeAt(0);
	}
	const ret = keys[code] === 1;
	if(ret && consume){
		keys[code] = 2;
	}
	return ret;
}


(async () => {
const winw = 8;

const images = {};

const to_load = [
	['frame', gl.TEXTURE0],
	['atlas', gl.TEXTURE1],
	['starfield', gl.TEXTURE2],
	['hatch', gl.TEXTURE3],
	['overlay', gl.TEXTURE4],
	['overlay2', gl.TEXTURE5]
];

for(let i = 0; i < to_load.length; i++){
	const [name, slot] = to_load[i];
	const elm = await waitForImage(name + 'i');
	gl.activeTexture(slot);
	const tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, elm);

	images[name] = {
		slot: slot - gl.TEXTURE0,
		tex: tex
	};
}

await sm.prepare_sounds(sounds);

const fShared = `
	precision mediump float;

	float sublig(float len, float falloff){
		return 1.0 / pow(1.0 + len, falloff);
	}

	float lig(vec3 pos){
		float ox = -.5;
		float oy = .15;
		float oz = -.15;

		return
			  max(sublig(length(pos.xy), 3.0)
			, sublig(length(vec3(ox, oy, oz) - pos), 6.0));
	}
`;

const vRoom = `
	precision mediump float;
	uniform mat4 uProj, uView;

	attribute vec3 aPos;
	attribute vec2 aTexPos;
	varying vec2 vTexPos;
	varying vec3 vPos;
	void main(){
		vTexPos = aTexPos;
		vPos = aPos;
		gl_Position = uProj * uView * vec4(aPos, 1);
	}
`;

const fRoom = fShared + `
	varying vec2 vTexPos;
	varying vec3 vPos;

	uniform sampler2D uFrame;
	void main(){
		vec4 samp = texture2D(uFrame, vTexPos, 0.0);
		gl_FragColor = vec4(vec3(samp) * lig(vPos), 1);
	}
`;

const roomProg = glc.compileShaders(vRoom, fRoom);

const vPanel = `
	precision mediump float;
	uniform mat4 uProj, uView, uModl;
	attribute vec2 aPos;

	uniform vec2 louv, hiuv;

	varying vec2 vPos;
	varying vec3 vWPos;
	void main(){
		vec3 aPosTrans = vec3(aPos.x, -aPos.y, 0);

		vPos = louv + aPos * (hiuv - louv);
		vec4 wPos = uModl * vec4(aPosTrans, 1);
		vWPos = vec3(wPos);

		gl_Position = uProj * uView * wPos;
	}
`;

const fPanel = fShared + `
	varying vec2 vPos;
	varying vec3 vWPos;
	uniform int uHigh;

	uniform sampler2D uAtlas;
	uniform int attenuate;
	void main(){
		vec4 samp = texture2D(uAtlas, vPos, 0.0);
		if(samp.a < .2) discard;
		float mul = uHigh == 1 ? 1.2 : 1.0;
		float ligmul = attenuate == 1 ? lig(vWPos) : 1.0;
		gl_FragColor = vec4(vec3(samp) * mul * ligmul, 1);
	}
`;

const panelProg = glc.compileShaders(vPanel, fPanel);

const vOverlay = `
	attribute vec2 aPos;
	uniform vec2 louv, hiuv;
	uniform vec2 loxy, hixy;

	varying vec2 vPos;
	void main(){
		vPos = louv + aPos * (hiuv - louv);
		vec2 transPos = loxy + aPos * (hixy - loxy);
		gl_Position = vec4(transPos, 0, 1);
	}
`;

const fOverlay = fShared + `
	varying vec2 vPos;
	uniform sampler2D uOverlay;
	uniform vec3 uTint;
	void main(){
		vec4 samp = texture2D(uOverlay, vPos, 0.0);
		if(samp.a < .2) discard;
		gl_FragColor = vec4(vec3(samp) * uTint, 1);
	}
`;

// xxx

const overlayProg = glc.compileShaders(vOverlay, fOverlay);


const roomCube = new CubeFast(1,1,1,0,0,0);
const roomDat = {
	vr: glc.newBuffer(new Float32Array(roomCube.getVertices()), 3),
	tx: glc.newBuffer(new Float32Array(roomCube.getTexes()), 2)
};

const panelVerts = [
	0,0,
	0,1,
	1,1,

	1,1,
	1,0,
	0,0,
];

const panelDat = glc.newBuffer(new Float32Array(panelVerts), 2);



let yav = 0;
let piv = 0;

let pi = 0;
let ya = 0;

let ppi = pi;
let pya = ya;

let xv = 0;
let yv = 0;
let zv = 0;

let x = 0;
let y = 0;
let z = .1;

let px = x;
let py = y;
let pz = z;


function interp(a, b, alpha){
	return alpha * (b - a) + a;
}



function linePlaneIntersect(p_0, l_0, n_v, l_v){
    const LoN = l_v.x * n_v.x + l_v.y * n_v.y + l_v.z * n_v.z;
    if(Math.abs(LoN) <= 0.000001){
        return null;
    }

    const PminL = {
        x:p_0.x - l_0.x,
        y:p_0.y - l_0.y,
        z:p_0.z - l_0.z,
    };

    const PminLoN = PminL.x * n_v.x + PminL.y * n_v.y + PminL.z * n_v.z;

    return PminLoN / LoN;
}


function hullIntersect(){
	const r = .5;
	const min = { x: -r, y: -r, z: -r };
	const max = { x: r, y: r, z: r };
	const vmat = glc.modelMat(x, y, z, ya, pi, 0, 1);
	const vvec = glc.applyTransform(vmat, { x: 0, y: 0, z: -1, w: 1 });

	const c  = {x, y, z};
	const ps = [
		linePlaneIntersect(min, c, {x: 1, y: 0, z: 0}, vvec),
		linePlaneIntersect(min, c, {x: 0, y: 1, z: 0}, vvec),
		linePlaneIntersect(min, c, {x: 0, y: 0, z: 1}, vvec),
		linePlaneIntersect(max, c, {x: -1, y: 0, z: 0}, vvec),
		linePlaneIntersect(max, c, {x: 0, y: -1, z: 0}, vvec),
		linePlaneIntersect(max, c, {x: 0, y: 0, z: -1}, vvec)
	];
	let winner = Infinity;
	for(const p of ps){
		if(p && p > 0 && p < winner){
			winner = p;
		}
	}

	return {
		x: winner * vvec.x + x,
		y: winner * vvec.y + y,
		z: winner * vvec.z + z,
		l: winner
	};
}

function interaction_target(){
	const p = hullIntersect();

	let winner = null;
	let pdist = Infinity;
	for(let i = 0; i < items.length; i++){
		const item = items[i];
		if(typeof item.ox !== 'number') continue;
		let rdist = .49;
		if(typeof item.or === 'number') rdist = item.or;
		let hbsize = .07;
		if(typeof item.hbsize === 'number') hbsize = item.hbsize;
		if(p.l > rdist) continue;

		const dx = item.ox - p.x;
		const dy = item.oy - p.y;
		const dz = item.oz - p.z;
		const d = dx*dx + dy*dy + dz*dz;
		if(d < pdist && d < hbsize){
			pdist = d;
			winner = item;
		}
	}

	return winner;
}

let current_target = null;
let active_item = null;
const popup_stack = [];
function have_popup(){
	return popup_stack[popup_stack.length - 1];
}

function push_gameover(name){
	popup_stack.push({
		text: name
			? 'Game Over (' + name + ').  Press space to try again.'
			: 'Game Over.  Press space to try again.',
		fade: true,
		ty: 'locked'
	});
}

function push_win(){
	popup_stack.push({
		text: 'This is the good ending.  There are 5 normal endings (including this one) and 1 secret ending.  Press space to play again.',
		ty: 'locked',
		fade: true
	});

	popup_stack.push({
		text: 'I arrive to find Arvan badly injured but manage to provide some medical attention.  Hopefully we both last long enough for help to arrive from dispatch.',
		fade: true,
		ty: 'normal'
	});
}

function push_popup(text, fn, fade){
	popup_stack.push({text, fade, ty: fn ? 'yesno' : 'normal', on_dismiss: fn});
}

function pop_popup(arg){
	const old = popup_stack.pop();
	if(old.on_dismiss){
		old.on_dismiss(arg);
	}
}

function should_block_movement(){
	return have_popup() || active_item;
}

let reading = false;

let tcurs = 0;
const main_menu = [
	['Status', () => {
		push_popup('The station is fine.');
	}],
	['Messages', () => {
		if(!messages.length){
			push_popup('No messages');
		}else{
			reading = true;
		}
	}],
	['Science', () => {
		if(locked){
			push_popup('I should check my messages first.');
		}else if(science_today){
			push_popup('I\'ve already filled my quota for the day.');
		}else{
			push_popup('Do Research?', (resp) => {
				if(resp){
					science_today++;
					science++;
					advance_time();
					power -= 1;
					if(power < 0) power = 0;
					const messages = [
						'Sensor readings are nominal.',
						'There are some new patterns in the readings.  I\'ll add a note in my report',
						'Sensor 5 is giving bogus readings.  I\'ll send out a request for a replacement.',
						'I can barely keep my eyes open sifting through all this data.',
						'The samples are behaving just as predicted.',
						'The replacement for sensor 4 seems to be working ok.'
					];
					const message = messages[Math.floor(Math.random() * messages.length)];
					push_popup(message, null, true);
					play_vmm();
				}
			});
		}
	}],
	['Exit', () => { active_item = null; }],
];

let titems = main_menu;

let messages = [];
let o2 = 5;
let power = 5;

let science = 0;
let science_today = 0;
let science_yesterday = 1;
let fitness = 0;
let fitness_today = 0;
let sanity = 1;
let sanity_today = 0;

let time = 0;
let lastTStep = 0;

let endgame = false;

const dispatch_prefix = 'Message received from Dispatch\n\n';
const arvan_prefix = 'Message received from Epsilon-5 via subspace transfer\n\n';

let time_messages = [];

const science_late_message = dispatch_prefix + 'Your daily quota of scientific measurements for yesterday was not met.  Further failure could trigger automated sanctions.';

const science_fail_message = dispatch_prefix + 'You have failed to meet your daily quota both yesterday and today.  The station has been locked.  A supervisor has been sent to your location to issue an official reprimand and will unlock the station when they arrive.';

let locked = false;

function advance_time(){
	if(time_messages.length){
		messages.push(time_messages.shift());
	}
	time += 1;
	sanity_today = 0; // globally disallow sleep twice in a row
	fitness_today = 0;

	if(time % 2 === 0){
		if(!science_today && !science_yesterday){
			locked = true;
			messages.push(science_fail_message);
		}else if(!science_today){
			messages.push(science_late_message);
		}

		//next day
		science_yesterday = science_today;
		science_today = 0;
	}
}

function delay(ms){
	return new Promise((res) => {
		setTimeout(() => {
			res();
		}, ms);
	});
}

async function play_vmm(){
	function s(){
		return sm.play_sound(sounds[1], .25);
	}
	const d = 500;
	await s();
	await delay(d);
	s();
	await delay(d);
	s();
}

function reset_game(){
	// Jam games amirite?
	console.log('game state reset');
	yav = 0;
	piv = 0;
	pi = 0;
	ya = 0;
	ppi = pi;
	pya =ya;
	xv = 0;
	yv = 0;
	zv = 0;
	x = 0;
	y = 0;
	z = .1;
	px = x;
	py = y;
	pz = z;
	active_item = null;
	popup_stack.length = 0;
	reading = false;
	tcurs = 0;
	titems = main_menu;
	messages.length = 0;
	o2 = 5;
	power = 5;
	science = 0;
	science_today = 0;
	science_yesterday = 1;
	fitness = 0;
	fitness_today = 0;
	sanity = 1;
	sanity_today = 0;
	time = 0;
	time_messages = [
		dispatch_prefix + 'This is a reminder not to tamper with the yellow oxygen tanks attached to the interior wall of your station.  They are highly pressurized and if ruptured could cause major damage to equipment.',
		arvan_prefix + 'This is Arvan from Eps-5.  There\'s been an incident.  One of the O2 tanks exploded causing severe damage to the hull and myself.  I\'m ok for now but will need medical attention and an evac.',
		dispatch_prefix + 'We are aware of the situation currently developing at Epsilon-5 and have begun working to resolve the issue.  For now, please ignore all subspace messages from Epsilon-5 and continue performing assigned tasks.',
		arvan_prefix + 'Fuck.  Fuckfuckfuckfuckfuck.  You work for a company for 15 years and when shit hits the fan it\'s all "CLEAN UP TEAM SENT.  ETA 5W."  5 Weeks?!  I\'ll be dead by then you incompetent fucks!',
		arvan_prefix + 'This is Arvan from Eps-5.  If anybody\'s out there, I need help.  You should have my coordinates.  It\'s only be a couple day\'s journey from one of the other epsilons.',
		arvan_prefix + 'Hi.  Arvan again.  Quick reminder that I\'m slowly bleeding out in Eps-5 and my o2 is at, like, 10%.  Eps-4, I think you\'re the only one actually getting these messages.  Nobody else is responding.',
		arvan_prefix + 'Please?  I don\'t want to die.  I... I have kids.  Two little girls.  I just want to see their faces again.  Their names are Anna and um... Elsie.  I don\'t know how much longer I can hold out.',
		arvan_prefix + 'OK fine I lied about the girls.  Spending years living in a tin can isn\'t exactly great for building a family.  Please send help.',
		arvan_prefix + 'I just did the math.  By the time you read this, it will be too late for you to reach me even if you leave immediately.  If you\'re already on your way, godspeed.  If not, I hope you burn in Hell.'
	];
	locked = false;
	messages.push(time_messages.shift());
	endgame = false;
	if(playing){
		playing.source.stop();
		playing = null;
	}
}


function stepFun(t){
	lastTStep = t;
	px = x;
	py = y;
	pz = z;
	ppi = pi;
	pya = ya;

	let ix = 0;
	let iz = 0;

	if(!should_block_movement()){
		if(key('W')){
			iz -= 1;
		}
		if(key('S')){
			iz += 1;
		}
		if(key('A')){
			ix -= 1;
		}
		if(key('D')){
			ix += 1;
		}
	}

	current_target = interaction_target();

	let did_something = false;
	const pop = have_popup();
	if(pop && pop.ty === 'locked'){
		endgame = false;
	}
	if(key(' ', true)){
		did_something = true;
		if(pop){
			did_something = false;
			if(pop.ty === 'normal'){
				pop_popup();
			}else if(pop.ty === 'locked'){
				reset_game();
			}
		}else if(active_item){
			if(active_item.name === 'term'){
				if(reading){
					did_something = false;
					messages.shift();
					if(!messages.length){
						reading = false;
						if(locked){
							push_gameover();
						}
					}
				}else{
					titems[tcurs][1]();
				}
			}else{
				// Never added UIs for the other items
				did_something = false;
			}
		}else if(current_target){
			did_something = false;
			if(current_target.interact){
				current_target.interact();
			}
			if(!current_target.saw_desc){
				if(!current_target.always_desc){
					current_target.saw_desc = true;
				}
				push_popup(current_target.desc || 'Missing Description');
			}
		}else did_something = false;
	}

	if(pop && pop.ty === 'yesno'){
		if(key('Y', true)){
			pop_popup(true);
		}

		if(key('N', true)){
			pop_popup(false);
		}
	}

	if(ix && iz){
		const mult = 1 / Math.sqrt(2);
		ix *= mult;
		iz *= mult;
	}

	const rotacc = .02;
	if(!should_block_movement()){
		if(key(left)){
			yav += rotacc;
		}
		if(key(right)){
			yav -= rotacc;
		}
		if(key(up)){
			piv += rotacc;
		}
		if(key(down)){
			piv -= rotacc;
		}
	}

	if(active_item && active_item.name === 'term' && !pop && !reading){
		if(key(up, true)){
			tcurs -= 1;
			did_something = true;
		}
		if(key(down, true)){
			tcurs += 1;
			did_something = true;
		}

		if(tcurs < 0){
			tcurs = titems.length - 1;
			did_something = true;
		}

		if(tcurs >= titems.length){
			tcurs = 0;
			did_something = true;
		}
	}

	if(did_something){
		sm.play_sound(sounds[0], .5);
	}

	const rotdrag = .7;
	piv *= rotdrag;
	yav *= rotdrag;

	pi += piv;
	ya += yav;

	if(pi > Math.PI / 2){
		pi = Math.PI / 2;
		piv = 0;
	}

	if(pi < -Math.PI / 2){
		pi = -Math.PI / 2;
		piv = 0;
	}

	const vmat = glc.modelMat(0,0,0, ya, pi, 0, 1);
	const rxyz = glc.applyTransform(vmat, {x: ix, y: 0, z: iz, w: 1});

	const rx = rxyz.x;
	const ry = rxyz.y;
	const rz = rxyz.z;

	const acc = .001;
	const drag = .99;
	const ax = acc * rx;
	const ay = acc * ry;
	const az = acc * rz;
	xv += ax;
	yv += ay;
	zv += az;

	xv *= drag;
	yv *= drag;
	zv *= drag;

	const boundary = .32;
	const bzone = .15;
	const bzonedrag = .8;

	x += xv;
	if(
		   (x > boundary - bzone && xv > 0)
		|| (x < bzone - boundary && xv < 0)
	){
		xv *= bzonedrag;
	}

	if(x < -boundary){
		x = -boundary;
		xv = 0;
	}

	if(x > boundary){
		x = boundary;
		xv = 0;
	}

	y += yv;
	const lowyboundary = -.1;
	if(
		   (y > boundary - bzone && yv > 0)
		|| (y < bzone + lowyboundary && yv < 0)
	){
		yv *= bzonedrag;
	}

	if(y < lowyboundary){
		y = lowyboundary;
		yv = 0;
	}

	if(y > boundary){
		y = boundary;
		yv = 0;
	}

	z += zv;
	if(
		   (z > boundary - bzone && zv > 0)
		|| (z < bzone - boundary && zv < 0)
	){
		zv *= bzonedrag;
	}

	if(z < -boundary){
		z = -boundary;
		zv = 0;
	}

	if(z > boundary){
		z = boundary;
		zv = 0;
	}

}
gc.setGameStep(stepFun);


const porthole_stencil = {
	tx: 1, ty: 1,
	tw: 17, th: 17,
	dx: -8/64, dy: 10/64, dz: -.45
};

const porthole = {
	...porthole_stencil,
	tx: 20, dz: porthole_stencil.dz + .001,
	ox: 0, oy: 0, oz: -.5,
	desc: 'There\'s never anything to see.',
	always_desc: true
};

const porthole2 = {...porthole, dz: -porthole.dz, oz: -porthole.oz };

const stencil_s = .9;
porthole_stencil.s = stencil_s;
porthole_stencil.dx += porthole_stencil.tw / 64 * (1 - stencil_s) / 2;
porthole_stencil.dy -= porthole_stencil.th / 64 * (1 - stencil_s) / 2;

const porthole_stencil_2 = { ...porthole_stencil, dz: -porthole_stencil.dz };

const items = [
	porthole,
	porthole2,
	{ // Bed
		tx: 39, ty: 1,
		tw: 19, th: 43,
		dx: .15, dy: -.43, dz: .4,
		pitch: Math.PI / 2,
		ox: .25, oy: -.5, oz: 0, or: .7, hbsize: .25,
		desc: 'A place to sleep.  I guess you could say I work from home.',
		interact(){
			if(locked){
				push_popup('I should check my messages first.');
			}else if(!sanity_today){
				push_popup('Go to sleep?', (resp) => {
					if(resp){
						play_vmm();
						advance_time();
						sanity_today++;
						sanity++;
						push_popup('zzzz', null, true);
					}
				});
			}else{
				push_popup('I\'m not tired');
			}
		}
	},
	{ // Terminal
		tx: 1, ty: 19,
		tw: 20, th: 22,
		dx: -.47, dy: .3, dz: 0,
		yaw: Math.PI / 2,
		ox: -.5, oy: .15, oz: -.15,
		desc: 'The station computer, where I do most of my work.',
		interact(){
			active_item = this;
		},
		name: 'term'
	},
	{ // Door
		tx: 0, ty: 0,
		tw: 64, th: 64,
		dx: -0.5, dy: .42, dz: 0.5,
		pitch: Math.PI / 2,
		img: images.hatch,
		ox: 0, oy: .5, oz: 0,
		desc: 'The exit, meant only for emergencies.  On the other side is an escape pod with some fuel and oxygen. It\'s even more cramped out there than in here.',
		interact(){
			if(locked){
				push_popup('It won\'t budge.  I should check my messages');
			}else if(time < 1){
				push_popup('I don\'t see a need to leave right now.');
			}else{
				push_popup('Leave in escape pod?', (resp) => {
					if(resp){
						endgame = true;
						sm.play_sound(sounds[2], 1, {loop: true}).then((nodes) => {
							playing = nodes;
						});
						const messages = [];
						messages.push('I transfer power and oxygen from the station to the escape pod and climb in.');
						let i = 0;
						let already_know_dead = false;
						for(; i < 3; i++,time++,o2--,power--,sanity--){
							console.log({time, fitness, sanity, o2, power});

							messages.push('It is day ' + (i + 1) + ' in the escape pod.');
							let happened = false;
							if(o2 <= 0){
								messages.push('Oxygen runs out, and I suffocate before reaching Epsilon-5.');
								break;
							}
							if(power <= 0){
								messages.push('Power in the escape pod runs out.  Without navigation, the pod is set adrift.');
								break;
							}
							if(sanity <= 0){
								messages.push('My friend mr. Quimbleton takes the wheel while I eat cheese, but he steers the pod into an asteroid, killing us both.');
								break;
							}
							if(time > 8 && !already_know_dead){
								messages.push('Arvan is probably dead by now.');
								happened = true;
								already_know_dead = true;
							}
							if(i === 1){
								happened = true;
								if(fitness >= 2){
									messages.push('One of the oxygen valves in the pod burst, releasing gas.  It took all of my strength to re-close the valve, but I did it.');
								}else{
									messages.push('One of the oxygen valves in the pod burst, releasing gas.  I tried to re-close the valve but my ' + (fitness === 0 ? 'arms' : 'legs') + ' gave out.');
									o2 -= 3;
								}
							}

							if(o2 <= 1){
								happened = true;
								messages.push('The air is getting thin.');
							}
							if(power <= 1){
								happened = true;
								messages.push('Power is running low.');
							}
							if(sanity <= 1){
								happened = true;
								messages.push('Going so long without sleep is torture.  I\'m starting to see things.');
							}
							if(!happened){
								messages.push('The day passes without anything important happening.');
							}
						}

						if(i === 3){
							if(time > 9){
								messages.push('I arrived at Epsilon-5, but Arvan died before I could make it.  His corpse will feed me while I wait for rescue.');
								push_gameover('Secret Ending');
							}else{
								push_win();
							}
						}else{
							push_gameover();
						}

						for(let i = messages.length - 1; i>= 0; i--){
							push_popup(messages[i], null, true);
						}
					}
				});
			}
		}
	},
	{ // tanks
		tx: 22, ty: 20,
		tw: 16, th: 31,
		yaw: Math.PI / 2,
		dx: -.45, dy: 0, dz: .3,
		ox: -.5, oy: -.15, oz: .15,
		desc: 'It\'s probably best not to touch these.',
		always_desc: true
	},
	{ // Gym 1
		tx: 3, ty: 42,
		tw: 18, th: 19,
		dx: .2, dy: .25, dz: 0,
	},
	{ // Gym 2
		tx: 39, ty: 45,
		tw: 11, th: 16,
		dx: .47, dy: .25, dz: -.09,
		yaw: -Math.PI / 2,
		ox: .5, oy: .25, oz: 0,
		desc: 'Exercise Equipment.  It helps me keep my muscles healthy in zero-G.',
		interact(){
			if(locked){
				push_popup('I should check my messages first.');
			}else if(fitness_today){
				push_popup('I\'m still worn out.  Maybe later.');
			}else{
				push_popup('Exercise a bit?', (resp) => {
					if(resp){
						play_vmm();
						const region = fitness % 3;
						const regs = region === 0 ? 'arm' : region === 1 ? 'leg' : 'core';
						push_popup('I\'ll work on my ' + regs + ' strength a bit...', null, true);
						advance_time();
						fitness++;
						fitness_today++;
						o2 -= 1;
						if(o2 < 0) o2 = 0;
					}
				});
			}
		}
	}
];

function draw_panel(view, proj, item){
	let {tx, ty, tw, th, dx, dy, dz, s, img, yaw, pitch, roll} = item;
	const pix = 1/64;
	const us = tw * pix;
	const vs = th * pix;
	if(typeof s !== 'number') s = 1;
	if(!img) img = images.atlas;

	const modl = glc.modelMatNonUniformScaling(dx, dy, dz, yaw || 0, pitch || 0, roll || 0, us*s, vs*s, 1);

	glc.useProgram(panelProg);
	gl.uniform1i(glc.uni('attenuate'), Number(!item.glow));
	gl.uniformMatrix4fv(glc.uni('uView'), false, view);
	gl.uniformMatrix4fv(glc.uni('uProj'), false, proj);
	gl.uniformMatrix4fv(glc.uni('uModl'), false, modl);
	gl.uniform1i(glc.uni('uAtlas'), img.slot);
	glc.useBuffer(glc.att('aPos'), panelDat);

	gl.uniform2f(glc.uni('louv'), tx * pix, ty * pix);
	gl.uniform2f(glc.uni('hiuv'), (tx + tw) * pix, (ty + th) * pix);

	gl.uniform1i(glc.uni('uHigh'), item === current_target ? 1 : 0);

	gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function draw_text(text, left, right, top, tint, col_hint){
	text = text.toUpperCase();
	left -= 128;
	top -= 128;
	right -= 128;

	if(col_hint){
		let fixed_text = '';
		let curr_word = '';
		let col = 0;
		let last_sp = 0;
		for(let i = 0; i < text.length; i++,col++){
			const c = text[i];
			curr_word += c;
			if(c === ' ' || c === '\n' || i === text.length - 1){
				if(col > col_hint){
					fixed_text += '\n';
					col = curr_word.length;
				}
				fixed_text += curr_word;
				curr_word = '';
				if(c === '\n'){
					col = 0;
				}
			}
		}
		text = fixed_text;
	}

	const vert_advance = 8;
	let cursor_left = left;
	let cursor_top = top;

	for(let i = 0; i < text.length; i++){
		const l = text[i];
		if(l === '\n'){
			cursor_left = left;
			cursor_top += vert_advance;
			continue;
		}

		if(l !== ' '){
			draw_letter(l, cursor_left / 128, -cursor_top / 128, tint);
		}
		let advance = 5;
		if(l === 'I' || l === 'T' || l === '"' || l === '-'){
			advance = 4;
		}else if(l === '.' || l === '!' || l === ':'){
			advance = 2;
		}else if(l === '\'' || l === ',' || l === '(' || l === ')'){
			advance = 3;
		}else if(l === ' '){
			advance = 3;
		}

		if(l !== ' ' || cursor_left !== left){
			cursor_left += advance;
			if(cursor_left > right - 4){
				cursor_left = left;
				cursor_top += vert_advance;
			}
		}
	}
}

function draw_letter(l, x, y, tint){ /// xxx
	const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.!?,\'%:"-()';
	const spl = letters.indexOf('Z');
	const off = 1 / 128;
	const w = 4 / 128;
	const h = 6 / 128;
	const lind = letters.indexOf(l);
	if(lind === -1) throw new Error('unsupporeed letter: ' + l);
	const xind = lind % spl;
	const yind = Math.floor(lind / spl);
	const xpos = xind * (w + off) + off;
	const ypos = yind * (h + off) + off;

	draw_overlay({
		lou: xpos, lov: ypos,
		hiu: xpos + w, hiv: ypos + h,
		lox: x, loy: y,
		hix: x+w, hiy: y-h,
		t: tint
	});
}

function draw_overlay({lou, lov, hiu, hiv, lox, loy, s, t, img}){
	if(typeof s !== 'number') s = 1;
	if(!img) img = images.overlay;
	if(!t) t = { r: 1, g: 1, b: 1 };
	glc.useProgram(overlayProg);
	gl.uniform2f(glc.uni('louv'), lou, lov);
	gl.uniform2f(glc.uni('hiuv'), hiu, hiv);

	gl.uniform2f(glc.uni('loxy'), lox, loy);
	gl.uniform2f(glc.uni('hixy'), lox + (hiu - lou) * s, loy + (lov - hiv) * s);
	gl.uniform3f(glc.uni('uTint'), t.r, t.g, t.b);

	gl.uniform1i(glc.uni('uOverlay'), img.slot);

	glc.useBuffer(glc.att('aPos'), panelDat);

	gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function draw_popup_text({text: t, ty, fade}, flash){
	if(fade){
		draw_overlay({
			lou: 14 / 128, lov: 28 / 128,
			hiu: 15 / 128, hiv: 29 / 128,
			lox: -1, loy: 1, s: 256
		});

		if(endgame){
			const yoff = flash ? 0 : 1/32;
			draw_overlay({
				lou: 1/128, lov: 15/128,
				hiu: 23/128, hiv: 26/128,
				lox: -.25, loy: .25 + yoff, s: 3, img: images.overlay2
			});
		}
	}

	draw_overlay({
		lou: 3 / 128, lov: 96 / 128,
		hiu: 125 / 128, hiv: 125 / 128,
		lox: 6 / 128 - 1, loy: -.5,
		s: 2
	});

	const textpad = 12;
	draw_text(t, textpad, 256 - textpad, 128 * 1.5 + textpad / 2, null, 45);

	if(ty !== 'locked'){
		let lou, lov, hiu, hiv, lox;
		if(ty === 'normal'){
			lou = 1 / 128; lov = 1 / 128;
			hiu = 24 / 128; hiv = 14 / 128;
			lox = .722;
		}else if(ty === 'yesno'){
			lou = 25 / 128; lov = 1 / 128;
			hiu = 59 / 128; hiv = 14 / 128;
			lox = .64;
		}

		draw_overlay({
			lou, lov, hiu, hiv,
			lox, loy: -.8 + (flash ? 1/128:0), img: images.overlay2
		});
	}
}

function drawFun(paused, alpha, t){
	gl.enable(gl.STENCIL_TEST);
	gl.enable(gl.DEPTH_TEST);

	const rx = interp(px, x, alpha);
	const ry = interp(py, y, alpha);
	const rz = interp(pz, z, alpha);
	const rya = interp(pya, ya, alpha);
	const rpi = interp(ppi, pi, alpha);

	gl.clearColor(0, 0, 0, 1);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

	const view = glc.viewMat(rx,ry,rz, rya,rpi);
	const proj = glc.projMat(Math.PI / 2, .0625);

	gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
	gl.stencilFunc(gl.ALWAYS, 1, 0xff);

	glc.useProgram(roomProg);
	gl.uniformMatrix4fv(glc.uni('uView'), false, view);
	gl.uniformMatrix4fv(glc.uni('uProj'), false, proj);
	gl.uniform1i(glc.uni('uFrame'), images.frame.slot);
	glc.useBuffer(glc.att('aPos'), roomDat.vr);
	glc.useBuffer(glc.att('aTexPos'), roomDat.tx);
	gl.drawArrays(gl.TRIANGLES, 0, roomCube.getVertices().length / 3);

	for(const item of items){
		draw_panel(view, proj, item);
	}

	gl.stencilFunc(gl.ALWAYS, 1, 0xff);
	gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);

	draw_panel(view, proj, porthole_stencil);
	draw_panel(view, proj, porthole_stencil_2);

	gl.stencilFunc(gl.EQUAL, 1, 0xff);
	gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);

	gl.clear(gl.DEPTH_BUFFER_BIT);
	draw_panel(view, proj, {
		tx: 0, ty: 0,
		tw: 64 * 20, th: 64 * 20,
		dx: -10, dy: 10, dz: -3, img: images.starfield, glow: true
	});

	draw_panel(view, proj, {
		tx: 0, ty: 0,
		tw: 64 * 20, th: 64 * 20,
		dx: -10, dy: 10, dz: 3, img: images.starfield, glow: true
	});

	gl.disable(gl.DEPTH_TEST);
	gl.disable(gl.STENCIL_TEST);

	const flash = Math.floor(lastTStep / 60) % 2 === 0;

	if(active_item){
		if(active_item.name === 'term'){
			draw_overlay({ // backg
				lou: 3 / 128, lov: 17 / 128,
				hiu: 125 / 128, hiv: 93/ 128,
				lox: 6 / 128 - 1, loy: .75, s: 2
			});

			draw_overlay({ // black
				lou: 21 / 128, lov: 26 / 128,
				hiu: 23 / 128, hiv: 27 / 128,
				lox: 24 / 128 - 1, loy: .5, s: 75
			});

			const tcurs_advance = 9 / 64;
			const ypos = .5 - tcurs * tcurs_advance;

			const amber = {
				r: 0xb3 / 255, g: 0x8b / 255, b: 0
			};

			const amber_dim = {
				r: 0x83 / 255, g: 0x5b / 255, b: 0
			};

			if(reading){
				draw_text(messages[0], 30, 190, 65, amber, 33);
			}else{
				draw_overlay({ // cursor
					lou: 18 / 128, lov: 37 / 128,
					hiu: 84 / 128, hiv: 45 / 128,
					lox: 24 / 128 - 1, loy: ypos, s: 2
				});

				// Menu items
				for(let i = 0; i < titems.length; i++){
					const [text] = titems[i];
					const tint = i === tcurs ? amber : amber_dim;
					draw_text(text, 24 + 6, 1000, 3 + .5 * 128 + tcurs_advance * i * 128, tint);
				}
			}
			// Status indicators
			const day = Math.floor(time / 2) + 133;
			const hour = time % 2 === 0 ? '06:00' : '18:00';

			const timestr = hour + '    Day ' + day;
			draw_text(timestr, 30, 1000, 50, amber);

			draw_text(String(messages.length), 202, 1000, 55, (messages.length && flash) || reading ? amber : amber_dim);

			const o2str = String(o2 * 10 + 10) + '%';
			draw_text(o2str, 202, 1000, 55 + 18, amber_dim);

			const powstr = String(power * 11 + 12) + '%';
			draw_text(powstr, 202, 1000, 55 + 38, amber_dim);
			draw_text(science_today ? 'Done' : 'Due', 202, 1000, 55 + 57, (!science_today && flash) ? amber : amber_dim);
		}
	}

	const pop = have_popup();
	if(pop){
		draw_popup_text(pop, flash);
	}
}
gc.setDraw(drawFun);

reset_game();
drawFun(false, 1, 0);

const loading_overlay = document.getElementById('loading-overlay');
loading_overlay.style.display = 'none';

can.onblur = () => gc.pause();
can.onfocus = () => gc.unPause();

can.blur();
can.focus();

})();
