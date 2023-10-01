'use strict';

const can = document.querySelector('canvas');
const ctx = can.getContext('2d');
const gc = new GameController();


const playback_pools = Object.create(null);
function prepare_sounds(files){
	for(const file of files){
		let pool = playback_pools[file];
		if(!pool){
			pool = [];
			for(let i = 0; i < 5; i++){
				pool.push(new Audio(file));
			}
			playback_pools[file] = pool;
		}
	}
}

prepare_sounds([
	'res/bm.wav',
	'res/bf.wav',
	'res/bf2.wav'
]);

function play_sound(file){
	prepare_sounds([file]);
	const pool = playback_pools[file];
	const curr = pool.shift();
	curr.currentTime = 0;
	curr.play();
	pool.push(curr);
}

const keep_alive = (() => {
	let cto = 0;
	return () => {
		gc.unPause();
		if(cto){
			clearTimeout(cto);
		}
		cto = setTimeout(() => {
			cto = 0;
			gc.pause();
		}, 100);
	};
})();

function line(ctx, x1, y1, x2, y2, opts){
	ctx.beginPath();
	ctx.strokeStyle = opts?.color || '#000000FF';
	ctx.lineWidth = opts?.width || 2;
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();
}

const margin = 20;
const boardx = margin;
const boardy = can.width / 2;
const boardw = can.width - 2 * margin;
const blocks_per_row = 10;
const block_size = boardw / blocks_per_row;
const num_rows = 5;
if(Math.floor(block_size) !== block_size){
	alert('block_size: ' + block_size);
}

const cell_inf = [{
	color: 'yellow'
},{
	color: 'limegreen'
},{
	color: 'cyan'
},{
	color: 'magenta'
},{
	color: 'orange'
}];

const cells = [];
let op_q = [];
for(let i = 0; i < blocks_per_row * num_rows; i++){
	cells.push({
		dat: -1
	});
}

function enough_room(counts, amount){
	const limit_fudge_factor = 3; // 5 is slightly too easy.
	let total = 0;
	for(const count of counts) total += count;
	total += amount; // include the amount we want to add/remove
	total += counts.length - 1; // include room for the necessary gaps
	const ret = total <= cells.length - limit_fudge_factor;
	return ret;
}

function random_op(op_q, cells){
	const counts = [];
	for(const inf of cell_inf) counts.push(0);
	for(const cell of cells){
		if(cell.dat !== -1){
			counts[cell.dat] += 1;
		}
	}
	for(const item of op_q){
		counts[item.type] += item.amount;
	}
	let type;
	let amount;
	do {
		const del = Math.random() < 0.2;
		type = Math.floor(Math.random() * cell_inf.length);
		amount = Math.floor(Math.random() * 4) + 1;
		amount *= del ? -1 : 1;
	}while(counts[type] + amount < 0 || !enough_room(counts, amount));

	return { type, amount, x: 0, xv: 0, y: 0, yv: 0 };
}


function new_game(){
	selecting = -1;
	selected = -1;
	selected_length = -1;
	if(score > high) high = score;
	score = 0;
	loss = false;

	//XXX: would fix if working on this for longer
	remove_button(clear_selection_button);

	for(let i = 0; i < cells.length; i++){
		cells[i] = { dat: -1 };
	}

	let last_type = -1;
	for(let i = 0, c = 0; i < 5; i++){
		let type = last_type;
		while(type === last_type) type = Math.floor(Math.random() * cell_inf.length);
		last_type = type;
		const length = Math.floor(Math.random() * 9) + 1;
		for(let j = 0; j < length && c < cells.length; j++, c++){
			cells[c].dat = type;
		}
		c++;
	}

	op_q = [];
	for(let i = 0; i < 5; i++){
		op_q.push(random_op(op_q, cells));
	}
}


function cell_from_coords(canx, cany){
	const mousexb = canx - boardx;
	const mouseyb = cany - boardy;
	const mouse_in =
		   mousexb > 0
		&& mousexb < boardw
		&& mouseyb > 0
		&& mouseyb < block_size * num_rows;
	if(!mouse_in){
		return -1;
	}else{
		const mouserow = Math.floor(mouseyb / block_size);
		const mousecol = Math.floor(mousexb / block_size);
		return mouserow * blocks_per_row + (mouserow % 2 === 0
			? mousecol
			: blocks_per_row - mousecol - 1
		);
	}
}

function x_from_mouse_event(e){
	return lerp(0, 500, (e.clientX - can.offsetLeft) / can.offsetWidth);
}
function y_from_mouse_event(e){
	return lerp(0, 500, (e.clientY - can.offsetTop) / can.offsetHeight);
}

function cell_from_mouse_event(e){
	const mousex = x_from_mouse_event(e);
	const mousey = y_from_mouse_event(e);
	return cell_from_coords(mousex, mousey);
}

const buttons = [];
function add_button(button){
	let i = 0;
	while(buttons[i]) i++;
	buttons[i] = button;
}
function remove_button(button){
	for(let i = 0; i < buttons.length; i++){
		if(buttons[i] === button){
			delete buttons[i];
		}
	}
}

let selecting = -1;
let selected = -1;
let selected_length = -1;

function l_from_se(start, end){
	const real_start = Math.min(start, end);
	const real_end = Math.max(start, end);
	return real_end - real_start + 1;
}

function s_from_se(start, end){
	return Math.min(start, end);
}

let menu = true;
let menu_num = 0;

let loss = false;
let high = 0;
let score = 0;


const menu_button_h = 30;
const menu_button_w = 120;

function vertically_center_buttons(buttons, w, h){
	const bmargin = 20;
	const buttons_height = buttons.length * (h + bmargin) - bmargin;
	const start_y = (can.height - buttons_height) / 2;

	for(let i = 0; i < buttons.length; i++){
		buttons[i].y = start_y + i * (h + bmargin);
	}

	return buttons_height;
}

const menu_buttons = (() => {
	const h = menu_button_h;
	const w = menu_button_w;
	const x = (can.width - w) / 2;
	const ret = [
		[
			{
				x, y: 0, w, h,
				text: 'New Game',
				cb: () => {
					menu = false;
					new_game();
				}
			},
			{
				x, y: 0, w, h,
				text: 'How to Play',
				cb: () => {
					menu_num = 1;
				}
			}
		],
		[{
			x, y: can.height - margin - h, w, h,
			text: 'Back to Menu',
			cb: () => {
				menu_num = 0;
			}
		}]
	];
	vertically_center_buttons(ret[0], w, h);
	for(const button of ret[0]){
		button.y += 124;
	}
	return ret;
})();

let loss_buttons_height = 0;
let loss_buttons_width = 0;
const loss_buttons = (() => {
	const w = menu_button_w;
	const h = menu_button_h;
	loss_buttons_width = w;
	const x = (can.width - w) / 2;
	const ret = [
		{
			x, y: 0, w, h, text: 'Try Again',
			cb: () => {
				new_game();
			}
		},
		{
			x, y: 0, w, h, text: 'Return to Menu',
			cb: () => {
				menu = true;
			}
		}
	];
	loss_buttons_height = vertically_center_buttons(ret, w, h);
	return ret;
})();

function active_buttons(){
	return menu ? menu_buttons[menu_num]
		: loss ? loss_buttons
		: buttons;
}

function coord_in_rect(x, y, rx, ry, rw, rh){
	return x >= rx && y >= ry && x <= rx + rw && y <= ry + rh;
}

const oph = 46;
function computer_move(){
	if(op_q.length){
		op_q.push(random_op(op_q, cells));
		const op = op_q.shift();

		{ // Set up the animation
			astate.qy -= oph;
			astate.qyp = astate.qy;
			let li = 0;
			while(astate.loose_items[li]) li++;
			const minv = -1;
			const maxv = .5;
			const y = astate.qy + op_q.length * oph;
			astate.loose_items[li] = {
				op: { type: op.type, amount: op.amount }, x: 0, yv: 0,
				y,
				xv: lerp(minv, maxv, Math.random()),
				xp: 0, yp: y
			};
		}

		if(op.amount < 0){
			op.amount *= -1;
			let total = 0;
			for(let i = 0; i < cells.length; i++){
				if(cells[i].dat === op.type) total += 1;
			}
			const options = total - op.amount + 1;
			if(options < 1) throw new Error(
				'not enough options deleting ' + op.amount + ' ' + cell_inf[op.type].color);
			let choice = Math.floor(Math.random() * options);
			for(let i = 0; i < cells.length && op.amount > 0; i++){
				if(cells[i].dat === op.type){
					if(choice <= 0){
						cells[i] = { dat: -1 };
						op.amount -= 1;
					}
					choice -= 1;
				}
			}
		}else{
			for(let i = 0; i < cells.length && op.amount > 0; i++){
				if(
					cells[i].dat === -1
					&& (!cells[i-1] || cells[i-1].dat === op.type || cells[i-1].dat === -1)
					&& (!cells[i+1] || cells[i+1].dat === op.type || cells[i+1].dat === -1)
				){
					cells[i] = { dat: op.type };
					op.amount -= 1;
				}
			}
			if(op.amount > 0){
				loss = true;
				clear_selection_button.cb();
			}
		}
		if(!loss){
			score += 1;
		}
	}
}

const clear_selection_button = (() => {
	const h = 30
	return {
		w: 120, h,
		x: boardx + 40 + margin/2, y: boardy - margin/2 - h,
		text: 'Clear Selection',
		cb: () => {
			selected = -1;
			selecting = -1;
			remove_button(clear_selection_button);
		}
	};
})();

const pass_button = (() => {
	const h = 30;
	return {
		w: 40, h, x: boardx,
		y: boardy - margin/2 - h, text: 'Pass',
		cb: () => {
			computer_move();
		}
	};
})();
add_button(pass_button);

let mousecell = -1;
const mouse_pos = { x: -1, y: -1 };
const last_mouse_down = { x: -1, y: -1 };
let mouse_down = false;
can.onmousemove = (e) => {
	mouse_pos.x = x_from_mouse_event(e);
	mouse_pos.y = y_from_mouse_event(e);
	mousecell = cell_from_mouse_event(e);
	keep_alive();
};

function can_move(cells, src, src_len, dst){
	const src_end = src + src_len - 1;
	const dst_end = dst + src_len - 1;

	if(
		   (src >= dst && src <= dst_end)
		|| (src_end >= dst && src_end <= dst_end)
		|| (dst >= src && dst <= src_end)
		|| (dst_end >= src && dst_end <= src_end)
	) return false;
	for(let i = src, dst_pos = dst; i < src + src_len; i++, dst_pos++){
		if(dst_pos >= cells.length) return false;
		if(cells[dst_pos].dat !== -1) return false;
	}

	const first_type = cells[src].dat;
	const dst_first_type = dst > 0 && dst !== src_end + 1 ? cells[dst - 1].dat : -1;
	if(first_type !== -1 && dst_first_type !== -1 && first_type !== dst_first_type) return false;

	const last_type = cells[src_end].dat;
	const dst_last_type = dst_end < cells.length - 1 && dst_end !== src - 1 ? cells[dst_end + 1].dat : -1;
	if(last_type !== -1 && dst_last_type !== -1 && dst_last_type !== last_type) return false;

	return true;
}

function get_paste_dst(cells, src, src_len, dst){
	for(
		let real_dst = dst;
		real_dst >= 0 && real_dst > dst - selected_length;
		real_dst--
	){
		if(can_move(cells, selected, selected_length, real_dst)){
			return real_dst;
		}
	}

	return null;
}


let mouse_down_count = 0;
can.onmousedown = (e) => {
	if(e.button === 0){
		let block_mouse_up = false;
		mouse_down = true;
		if(!menu && !loss){
			mousecell = cell_from_mouse_event(e);
			if(mousecell !== -1 && selecting === -1 && selected === -1){
				play_sound('res/bf.wav');
				selecting = mousecell;
				mouse_down_count = 1;
			}else if(selecting !== -1){
				mouse_down_count = 2;
			}
			if(mousecell !== -1 && selected !== -1){
				let final_dst = get_paste_dst(cells, selected, selected_length, mousecell);
				if(final_dst !== null){
					play_sound('res/bf2.wav');
					const tmp = [];
					for(let i = 0; i < selected_length; i++){
						tmp.push(cells[i + selected]);
					}
					for(let i = 0; i < selected_length; i++){
						cells[i + selected] = { dat: -1 };
					}
					for(let i = 0; i < selected_length; i++){
						cells[i + final_dst] = tmp[i];
					}
					clear_selection_button.cb();

					computer_move();
					block_mouse_up = true;
				}
			}
		}
		if(block_mouse_up){
			// stupid way of preventing the next mouse up from
			// triggering a newly-appeared button
			last_mouse_down.x = -1;
			last_mouse_down.y = -1;
		}else{
			last_mouse_down.x = x_from_mouse_event(e);
			last_mouse_down.y = y_from_mouse_event(e);
		}
	}
	keep_alive();
};

can.oncontextmenu = (e) => {
	if(!menu && !loss){
		if(selecting !== -1 || selected !== -1){
			e.preventDefault();
			play_sound('res/bm.wav');
			clear_selection_button.cb();
		}
	}
	keep_alive();
};

can.onmouseup = (e) => {
	if(e.button === 0){
		mouse_down = false;
		if(!menu && !loss){
			mousecell = cell_from_mouse_event(e);
			if(mousecell !== -1 && selecting !== -1 && (mousecell !== selecting || mouse_down_count > 1)){
				play_sound('res/bf.wav');
				selected = s_from_se(selecting, mousecell);
				selected_length = l_from_se(selecting, mousecell);
				selecting = -1;
				add_button(clear_selection_button);
			}
		}

		for(const button of active_buttons().filter(b => !!b)){
			const mousex = x_from_mouse_event(e);
			const mousey = y_from_mouse_event(e);
			if(
				   coord_in_rect(mousex, mousey, button.x, button.y, button.w, button.h)
				&& coord_in_rect(
					last_mouse_down.x, last_mouse_down.y,
					button.x, button.y, button.w, button.h)
			){
				play_sound('res/bm.wav');
				button.cb();
			}
		}
	}
	keep_alive();
};

function row_from_cell(cell){
	return Math.floor(cell / blocks_per_row);
}

function col_from_cell(cell){
	const row = row_from_cell(cell);
	const rem = cell - row * blocks_per_row;
	return row % 2 === 0
		? rem
		: blocks_per_row - rem - 1;
}

function highlight_group(start, length, opts){
	if(cells.length < start + length){
		length = cells.length - start;
	}
	if(start < 0) start = 0;
	for(let c = start; c < length + start; c++){
		const row = row_from_cell(c);
		const col = col_from_cell(c);
		const is_start = c === start;
		const is_end = c === length + start - 1;

		const left =
			   (row % 2 === 0 && is_start)
			|| (row % 2 !== 0 && is_end)
			|| (col === 0);

		const right =
			   (row % 2 === 0 && is_end)
			|| (row % 2 !== 0 && is_start)
			|| (col === blocks_per_row - 1);

		const top =
			   (row === 0)
			|| (row % 2 === 0 && (col !== 0 || is_start))
			|| (row % 2 !== 0 && (col !== blocks_per_row - 1 || is_start));

		const bottom =
			   (row === num_rows - 1)
			|| (row % 2 === 0 && (col !== blocks_per_row - 1 || is_end))
			|| (row % 2 !== 0 && (col !== 0 || is_end));

		const l = boardx + col * block_size;
		const r = l + block_size;
		const t = boardy + row * block_size;
		const b = t + block_size;
		if(left) line(ctx, l, t, l, b, opts);
		if(right) line(ctx, r, t, r, b, opts);
		if(top) line(ctx, l, t, r, t, opts);
		if(bottom) line(ctx, l, b, r, b, opts);
	}
}


let astate = {
	qy: 0,
	qyp: 0,
	qyv: 0,
	loose_items: []
};

function lerp(start, end, alpha){
	return alpha * (end - start) + start;
}

gc.setGameStep((step) => {
	const qya = .7;
	let touch = false;
	if(astate.qy !== 0 || astate.qyv !== 0){
		astate.qyp = astate.qy;
		astate.qyv += qya;
		astate.qy += astate.qyv;

		if(astate.qy > 0){
			astate.qy = 0;
			astate.qyv *= -0.5;
			if(Math.abs(astate.qyv) < Math.abs(qya)){
				// halt animation
				astate.qyv = 0;
				astate.qy = 0;
			}
		}

		touch = true;
	}

	for(let i = 0; i < astate.loose_items.length; i++){
		const item = astate.loose_items[i];
		if(item){
			item.xp = item.x;
			item.yp = item.y;
			item.x += item.xv;
			item.yv += qya;
			item.y += item.yv;
			if(item.y >= 1000){
				delete astate.loose_items[i];
			}
			touch = true;
		}
	}

	if(touch){
		keep_alive();
	}
});

const splash_image = document.getElementById('splash_image');
splash_image.onload = () => keep_alive();
gc.setDraw((paused, interp) => {
	if(paused){
	}else{
		ctx.fillStyle = 'white';
		ctx.fillRect(0, 0, 500, 500);
		if(menu){
			if(menu_num === 0){
				ctx.drawImage(splash_image, 0, 0, can.width, can.height);

			}else if(menu_num === 1){
				const help_text =
`Click to begin selecting a region, then
click again to complete the selection.  Click
somewhere empty to move the selected
blocks to that location.  Click "pass" to skip
your move for this turn.

After you make a move, some number of
blocks will be added or removed.  The game
ends when there isn't enough space for new
blocks to be added.

Two blocks of different colors can't be
directly adjacent.  Try grouping similar
colors to save space.

Made in 48 hours for
Ludum Dare 54: "Limited Space"
October 1, 2023`
				const lines = help_text.split('\n');
				const lineHeight = 20;
				const topMargin = 40;
				for(let i = 0; i < lines.length; i++){
					ctx.fillStyle = 'black';
					ctx.font = '20px sans-serif';
					ctx.textAlign = 'center';
					ctx.fillText(lines[i],
						can.width / 2,
						topMargin + lineHeight * i,
						can.width
					);

				}
				ctx.textAlign = 'left';
			}
		}else{

			const mini_block_margin = 5;
			const mini_block_size = oph - 2 * mini_block_margin;
			const opw = (mini_block_margin + mini_block_size) * 5 + mini_block_margin;
			const qx = can.width - margin;
			const qy = 0;

			function op_item(item, xpos, ypos, active){
				const action = item.amount;
				const color = cell_inf[item.type].color;
				if(active){
					ctx.fillStyle = '#DDDDDD';
					ctx.fillRect(xpos - opw, ypos, opw, oph);
				}

				const cross_over = 2;

				for(let i = 0; i < Math.abs(action); i++){
					ctx.fillStyle = color;
					const x = xpos - ((mini_block_margin + mini_block_size) * (i + 1));
					const y = ypos + mini_block_margin;

					ctx.fillRect(
						x, y,
						mini_block_size, mini_block_size
					);
					ctx.strokeStyle = 'black';
					ctx.lineWidth = 2;
					ctx.strokeRect(x, y, mini_block_size, mini_block_size);

					if(action < 0){
						line(ctx,
							x - cross_over,
							y - cross_over,
							x + cross_over + mini_block_size,
							y + cross_over + mini_block_size,
							{ color: 'red', width: 4 }
						);
						line(ctx,
							x - cross_over,
							y + mini_block_size + cross_over,
							x + mini_block_size + cross_over,
							y - cross_over,
							{ color: 'red', width: 4 }
						);
					}
				}
			}

			for(let i = 0; i < op_q.length; i++){
				const ypos = qy + oph * (op_q.length - i - 1) + lerp(astate.qyp, astate.qy, interp);
				op_item(op_q[i], qx, ypos, i === 0);
			}

			for(let i = 0; i < astate.loose_items.length; i++){
				const item = astate.loose_items[i];
				if(item){
					const ypos = qy + lerp(item.yp, item.y, interp);
					const xpos = qx + lerp(item.xp, item.x, interp);
					op_item(item.op, xpos, ypos, false);
				}
			}

			ctx.fillStyle = 'white';
			ctx.fillRect(boardx, boardy, boardw, num_rows * block_size);

			const grid_color = '#CCCCCC';
			for(let i = 1; i < blocks_per_row; i++){
				line(ctx,
					boardx + block_size * i,
					boardy,
					boardx + block_size * i,
					boardy + num_rows * block_size,
					{ color: grid_color }
				);
			}

			for(let i = 1; i < num_rows; i++){
				line(ctx,
					boardx,
					boardy + i * block_size,
					boardx + boardw,
					boardy + i * block_size,
					{ color: grid_color }
				);
			}

			for(let c = 0; c < cells.length; c++){
				const type = cells[c].dat;
				const row = row_from_cell(c);
				const col = col_from_cell(c);
				if(type !== -1){
					ctx.fillStyle = cell_inf[type].color;
					ctx.fillRect(
						boardx + col * block_size,
						boardy + row * block_size,
						block_size,
						block_size
					);
				}else{
					const midx = col * block_size + boardx + block_size/2;
					const midy = row * block_size + boardy + block_size/2;
					function tri(left){
						ctx.beginPath();
						ctx.moveTo(
							col * block_size + boardx + (left ? 0 : block_size),
							row * block_size + boardy
						);
						ctx.lineTo(midx, midy);
						ctx.lineTo(
							col * block_size + boardx + (left ? 0 : block_size),
							row * block_size + boardy + block_size
						);
						ctx.closePath();
						ctx.fill();
					}

					function vtri(top){
						ctx.beginPath();
						ctx.moveTo(
							col * block_size + boardx,
							row * block_size + boardy + (top ? 0 : block_size)
						);
						ctx.lineTo(midx, midy);
						ctx.lineTo(
							col * block_size + boardx + block_size,
							row * block_size + boardy + (top ? 0 : block_size)
						);
						ctx.closePath();
						ctx.fill();
					}

					//XXX maybe use a different color
					if(c !== 0 && cells[c - 1].dat !== -1){
						const color = cell_inf[cells[c - 1].dat].color;
						ctx.fillStyle = color;
						if((row % 2 === 0 && col === 0) || (row % 2 !== 0 && col === blocks_per_row - 1)){
							vtri(true);
						}else{
							tri(row % 2 === 0);
						}
					}

					if(c !== cells.length - 1 && cells[c + 1].dat !== -1){
						const color = cell_inf[cells[c + 1].dat].color;
						ctx.fillStyle = color;
						if((row % 2 === 0 && col === blocks_per_row - 1) || (row % 2 !== 0 && col === 0)){
							vtri(false);
						}else{
							tri(row % 2 !== 0);
						}
					}
				}
			}

			line(ctx, boardx, boardy, boardx + boardw, boardy);
			line(ctx, boardx, boardy, boardx, boardy + block_size * num_rows);
			line(ctx, boardx + boardw, boardy, boardx + boardw, boardy + block_size * num_rows);
			line(ctx, boardx, boardy + block_size * num_rows, boardx + boardw, boardy + block_size * num_rows);

			for(let i = 1; i < num_rows; i++){
				const left = i % 2 !== 0;
				line(ctx,
					left ? boardx : boardx + block_size,
					boardy + i * block_size,
					boardx + boardw - (left ? block_size : 0),
					boardy + i * block_size
				);
			}

			if(!loss){
				if(selected === -1 && selecting === -1 && mousecell !== -1){
					highlight_group(mousecell, 1, {
						color: '#FF7777',
						width: 4
					});
				}

				if(selected !== -1){
					highlight_group(selected, selected_length, {
						color: '#FF0000',
						width: 4
					});
				}

				if(selecting !== -1 && mousecell !== -1){
					highlight_group(s_from_se(mousecell, selecting), l_from_se(mousecell, selecting), {
						color: '#FF5555',
						width: 4
					});
				}

				if(mousecell !== -1 && selected !== -1){
					const final_dst = get_paste_dst(cells, selected, selected_length, mousecell);
					if(final_dst !== null){
						highlight_group(final_dst, selected_length, {
							color: '#0000FF',
							width: 4
						});
					}
				}
			}


			ctx.textAlign = 'left';

			if(loss){
				ctx.fillStyle = '#ffffff88';
				ctx.fillRect(0, 0, can.width, can.height);

				ctx.fillStyle = '#ffffff';
				const padded_height = loss_buttons_height + 40;
				const padded_width = loss_buttons_width + 40;
				ctx.fillRect(
					(can.width - padded_width) / 2,
					(can.height - padded_height) / 2,
					padded_width, padded_height
				);
				ctx.strokeStyle = '#000000';
				ctx.lineWidth = 2;
				ctx.strokeRect(
					(can.width - padded_width) / 2,
					(can.height - padded_height) / 2,
					padded_width, padded_height
				);
			}

			ctx.font = '20px sans-serif';
			ctx.fillStyle = score >= Math.max(high + 1, 54) ? 'limegreen' : 'black';
			ctx.fillText('Score: ' + score + '/54', boardx, margin + 50, 250);
			ctx.fillStyle = 'black';
			ctx.fillText('High: ' + high, boardx, margin + 50 + 30, 250);
		}

		const bmargin = 5;
		for(const button of active_buttons().filter(b => !!b)){
			const over_button = coord_in_rect(
				mouse_pos.x, mouse_pos.y, button.x, button.y, button.w, button.h);
			const last_down_over_button = coord_in_rect(
				last_mouse_down.x, last_mouse_down.y,
				button.x, button.y, button.w, button.h);
			const pressing = last_down_over_button && over_button && mouse_down;

			ctx.fillStyle =
				pressing ? '#555555'
				: over_button ? '#CCCCCC'
				: '#AAAAAA';
			ctx.fillRect(button.x, button.y, button.w, button.h);

			ctx.strokeStyle = over_button && !pressing ? '#555555' : '#000000';
			ctx.lineWidth = 2;
			ctx.strokeRect(button.x, button.y, button.w, button.h);

			ctx.fillStyle = '#000000';
			ctx.font = '15px sans-serif';
			ctx.textAlign = button.textAlign || 'center';
			ctx.fillText(button.text,
				button.x + button.w / 2, button.y + 15 + bmargin + (pressing ? 3 : 0),
				button.w - 2*bmargin);
		}
		ctx.textAlign = 'left';
	}
});

keep_alive();

//XXX center selection around the cursor



