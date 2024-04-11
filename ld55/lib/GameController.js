function GameController(){
	'use strict';

	let fps = 60;

	window.physicsRate = function(newVal){
		fps = newVal;
	};


	const maxTolerableLies = 200;


	let gameStep; //(tStep)
	let draw; //(isPaused)
	let go = 0;
	let wasPaused = 1;
	let prevTime = 0;

	// if monitor refresh rate is _exactly_ 60, we don't want to sit at accumTime === mspf,
	// since small amounts of error will result in taking one-too-many game-steps, followed immediately
	// by one-too-few, which virtually halves the physrate (this effect can be masked by frame-interpolation)
	// Note that this can _still_ happen if the refresh rate is close-to-but-not-exactly 60, since our
	// game-step-frames will "drift" relative to the render frames.  
	// My monitor is ~60.02 Hz, for example, and will dwell in the "stuttery" region for a few seconds at a time.
	let accumTime = 1000/(fps * 2);
	let tStep = 0;
	let probablyLies = 0;
	let interp = 0;

	this.setGameStep = function(callBack){
		gameStep = callBack;
	};

	this.setDraw = function (callBack){
		draw = callBack;
	};

	let currentlyScheduled = -1;

	this.unPause = function (){
		go = 1;
		if(currentlyScheduled === -1){
			currentlyScheduled = requestAnimationFrame(mainLoop);
		}
	};
	
	this.pause = function (){
		go = 0;
		if(wasPaused === 0){
			draw(true, interp, prevTime); //call with most recent interp to prevent hitching
		}
		wasPaused = 1;
		if(currentlyScheduled !== -1){
			cancelAnimationFrame(currentlyScheduled);
			currentlyScheduled = -1;
		}
	};

	let itersAtZero = 0;
	let frameTime = 0;
	let totalFrameTime = 0;
	let lastStartTime = performance.now();

	this.getLastFrameTime = function(){
		return frameTime;
	};

	this.getLastTotalFrameTime = function(){
		return totalFrameTime;
	};

	function mainLoop(tStamp){
		if(go){
			currentlyScheduled = requestAnimationFrame(mainLoop);
		}else{
			return;
		}
		const startTime = performance.now(); //for measurement purposes, only.  Not for timing


		const mspf = 1000/fps;
		if(wasPaused === 0){
			const elapsed = tStamp - prevTime;
			prevTime = tStamp;


			if(probablyLies < maxTolerableLies){

				accumTime += elapsed;
				if(prevTime % 100 === 0){
					probablyLies++;
				}else{
					probablyLies--;
					if(probablyLies < 0) probablyLies = 0;
				}

				while(accumTime > 1000){
					accumTime -= 1000/fps;
				}

				while(accumTime > mspf){
					gameStepLoop();
					accumTime -= mspf;
				}

			}else{
				if(probablyLies === maxTolerableLies){
					//TODO: test to make sure this still works correctly
					console.log('The browser seems to be lying about frame timings.  locking physics to framerate...');
					probablyLies++;
				}
				gameStepLoop();

			}

		}else{
			//resuming from pause, don't try to make up lost time
			prevTime = tStamp;
		}

		const frameDriftTol = .1;
		const maxItersAtZero = 20;
		if(Math.abs(accumTime) < frameDriftTol*mspf || Math.abs(accumTime) > mspf*(1 - frameDriftTol)){
			itersAtZero++;
			if(itersAtZero >= maxItersAtZero){
				//a sneaky solution to refresh-rates which dwell in the "stuttery region,"
				//with the unfortunate side-effect of a visible "hitch" when accumTime is reset
				//console.log('Correcting frame drift...');
				//accumTime= mspf/2;
			}
		}else{
			itersAtZero = 0;
		}

		try{
			interp = accumTime / mspf;
			draw(false, interp, tStamp);
		}catch (e){
			go = 0;
			throw e;
		}

		wasPaused = 0;

		const endTime = performance.now();
		frameTime = endTime - startTime;
		totalFrameTime = startTime - lastStartTime;
		lastStartTime = startTime;
	}

	function gameStepLoop(){
		gameStep(tStep);
		tStep++;
	}

}
