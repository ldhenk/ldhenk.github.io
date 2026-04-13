function create_sound_manager(initial_sounds){
	let ac = null;
	if('AudioContext' in window){
		ac = new AudioContext();
		console.log('^^ if you see a warning about the AudioContext being blocked ' +
			'but sound still works, you can ignore the warning');
	}

	const playback_buffers = Object.create(null);
	function prepare_sounds(files){
		if(ac === null) return;

		let proms = [];
		for(const file of files){
			let existing_buffer = playback_buffers[file];
			if(!existing_buffer){
				existing_buffer = (async () => {
					const result = await fetch(file);
					if(!result.ok) throw new Error('Audio file download failure');
					const dat = await result.arrayBuffer();
					const buffer = await ac.decodeAudioData(dat);

					playback_buffers[file] = buffer;
					return buffer;
				})();
				playback_buffers[file] = existing_buffer;
			}
			proms.push(existing_buffer);
		}

		return Promise.all(proms);
	}

	function sound_ready(file){
		if(playback_buffers[file] instanceof AudioBuffer){
			return playback_buffers[file];
		}
		return false;
	}

	prepare_sounds(initial_sounds);

	async function play_sound(file, gain, opts){
		if(ac === null) return;
		if(gain === undefined) gain = 1;
		if(opts === undefined) opts = {};

		if(ac.state === 'suspended'){
			ac.resume();
		}

		let buffer;
		if(!(buffer = sound_ready(file))){
			buffer = await prepare_sounds([file]);
		}

		const nodes = {
			source: new AudioBufferSourceNode(ac, { buffer }),
			gain: new GainNode(ac, { gain }),
		};

		if(opts.loop){
			nodes.source.loop = true;
		}
		nodes.source.connect(nodes.gain);
		nodes.gain.connect(ac.destination);
		if(opts.offset){
			nodes.source.start(0, opts.offset);
		}else{
			nodes.source.start();
		}
		return nodes;
	}


	function play_artificial_sound(type, frequency, opts){
		if(ac === null) return null;
		if(!opts) opts = {};

		if(ac.state === 'suspended'){
			ac.resume();
		}

		const nodes = {
			source: new OscillatorNode(ac, {
				type, frequency
			}),
			gain: new GainNode(ac, {gain: typeof opts.gain === 'number' ?  opts.gain : 1}),
		};

		nodes.source.connect(nodes.gain);
		nodes.gain.connect(ac.destination);
		nodes.source.start();
		return nodes;
	}

	function ping(){
		if(ac === null) return;
		if(ac.state === 'suspended'){
			ac.resume();
		}
	}

	return {
		sound_ready,
		play_sound,
		prepare_sounds,
		play_artificial_sound,
		ping,
		ac
	};
}
