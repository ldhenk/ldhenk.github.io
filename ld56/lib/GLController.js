function GLController(gl, cwidth, cheight){

	const mh = new MatrixHelper();


	let width = cwidth;
	let height = cheight;


	this.axes = {x:0,y:1,z:2};
	const axes = this.axes;

	let cProg;
	let cfbo = [];
	let fbBound = null;

	this.getWidth = () => width;
	this.getHeight = () => height;

	this.setDims = function(cwidth,cheight){
		width = cwidth;
		height = cheight;
		gl.viewport(0,0,cwidth,cheight);
	}


	this.compileShaders = function (vSrc,fSrc){
		let v = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(v,vSrc);
		gl.compileShader(v);

		let f = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(f,fSrc);
		gl.compileShader(f);

		let prog = gl.createProgram();

		gl.attachShader(prog,v);
		gl.attachShader(prog,f);

		gl.linkProgram(prog);

		let sil = gl.getShaderInfoLog(v);
		let fsil = gl.getShaderInfoLog(f);
		let pil = gl.getProgramInfoLog(prog);

		if(!(sil === '' && fsil === '' && pil === '')){
			console.log(sil);
			console.log(fsil);
			console.log(pil);
		}

		gl.deleteShader(v);
		gl.deleteShader(f);

		return prog;
	};


	let attC = {};
	let uniC = {};
	let warned = {};

	this.useProgram = function(prog){
		attC = {};
		uniC = {};
		//warned = {};//if the smae uni/att is missing in 2 different shaders you'll only see the first
		cProg = prog;
		gl.useProgram(prog);
	};



	this.att = function(name){
		if(attC[name] !== undefined && Object.prototype[name] === undefined){
			return attC[name];
		}else{
			if(cProg === undefined){
				throw new Error('Attempted to retrieve attribute ' + name + ', but program is not set');
			}
			let loc = gl.getAttribLocation(cProg,name);
			/*if(loc === -1 || loc === null){
				throw new Error('Attribute ' + name + ' not found.');
			}*/
			if(!warned[name] && (loc === -1 || loc === null)){
				console.warn('Attribute ' + name + ' not found.');
				warned[name] = true;
			}
			attC[name] = loc;
			return loc;
		}
	};

	this.uni = function(name){
		if(uniC[name] !== undefined && Object.prototype[name] === undefined){
			return uniC[name];
		}else{
			if(cProg === undefined){
				throw new Error('Attempted to retrieve uniform' + name + ', but program is not set');
			}
			let loc = gl.getUniformLocation(cProg,name);
			/*if(loc === -1 || loc === null){
				throw new Error('Uniform ' + name + ' not found.');
			}*/
			if(!warned[name] && (loc === -1 || loc === null)){
				console.warn('Uniform ' + name + ' not found.');
				warned[name] = true;
			}
			uniC[name] = loc;
			return loc;
		}
	};

	function projMat(pov,zNear,flipHoriz,flipVert){
		let rwidth = width;
		let rheight = height;
		if(fbBound !== null){
			rwidth = cfbo[fbBound].getWidth();
			rheight = cfbo[fbBound].getHeight();
		}

		/*
			[k1,0,0,0,
			0,k2,0,0,
			0,0,k3,k4,
			0,0,k5,0]
		*/
		let k5 = -1;
		let k2 = 1/(Math.tan(pov/2));
		let k1 = rheight/rwidth * k2;
		//let k1 = 1/(Math.tan(pov/2));
		//let k2 = rwidth/rheight * k1;
		let k3 = -1;//far clipping plane is -infinity
		let k4 = -2*(zNear * k1);//k1 is near clipping plane when zNear == 1

		if(flipHoriz)
			k1 = -k1;
		if(flipVert)
			k2 = -k2;

		return [
			k1,0,0,0,
			0,k2,0,0,
			0,0,k3,k5,
			0,0,k4,0
		];
	}

	this.getHorizFOVFromProjMat = function(proj){
		const k1 = proj[0];
		const fov = 2*Math.atan(1/k1);
		return fov;
	};

	this.projMat = function (pov,zNear){
		return projMat(pov,zNear,false,false);
	};

	this.mirrorProjMat = function (pov,zNear){
		return projMat(pov,zNear,true,false);

	};

	this.vertMirrorProjMat = function (pov,zNear){
		return projMat(pov,zNear,false,true);

	};

	this.doubMirrorProjMat = function (pov,zNear){
		return projMat(pov,zNear,true,true);

	};

	this.newBuffer = function(dat, size){
		return newBufferGen(dat, size, gl.FLOAT, gl.STATIC_DRAW);
	};

	this.newByteBuffer = function(dat, size){
		return newBufferGen(dat, size, gl.UNSIGNED_BYTE, gl.STATIC_DRAW);
	};


	this.newDynamicBuffer = function(dat, size){
		return newBufferGen(dat, size, gl.FLOAT, gl.DYNAMIC_DRAW);
	};

	/* reuse a buffer with new data (must be same "size" and "type") */
	this.bufferReplaceDat = function(dat, bu){
		gl.bindBuffer(gl.ARRAY_BUFFER, bu.buff);
		gl.bufferData(gl.ARRAY_BUFFER, dat, bu.hint);
	}

	function newBufferGen(dat,size,type,hint){
		const buff = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER,buff);
		gl.bufferData(gl.ARRAY_BUFFER,dat,hint);
		return {buff:buff,size:size,type:type,hint:hint};
	};

	this.useBuffer = function (att,bu){
		gl.enableVertexAttribArray(att);
		gl.bindBuffer(gl.ARRAY_BUFFER,bu.buff);
		gl.vertexAttribPointer(att,bu.size,bu.type,false,0,0);
	};

	this.deleteBuffer = function(bu){
		gl.deleteBuffer(bu.buff);
		delete bu.buff;
		delete bu.size;
	};	


	/*TODO something similar for 2D textures?*/
	this.prepareCubemap  = function(gl_active_texture,gl_min_filter,gl_mag_filter,size,dat){
		const ret = gl.createTexture();
		gl.activeTexture(gl_active_texture);
		gl.bindTexture(gl.TEXTURE_CUBE_MAP,ret);
		
		gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MIN_FILTER,gl_min_filter);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MAG_FILTER,gl_mag_filter);

		gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X,0,gl.RGBA,size,size,0,gl.RGBA,gl.UNSIGNED_BYTE,dat.px);
		gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y,0,gl.RGBA,size,size,0,gl.RGBA,gl.UNSIGNED_BYTE,dat.py);
		gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z,0,gl.RGBA,size,size,0,gl.RGBA,gl.UNSIGNED_BYTE,dat.pz);
		gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X,0,gl.RGBA,size,size,0,gl.RGBA,gl.UNSIGNED_BYTE,dat.nx);
		gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,0,gl.RGBA,size,size,0,gl.RGBA,gl.UNSIGNED_BYTE,dat.ny);
		gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,0,gl.RGBA,size,size,0,gl.RGBA,gl.UNSIGNED_BYTE,dat.nz);

		if(dat.px && dat.py && dat.pz && dat.nx && dat.ny && dat.nz){
			gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
		}

		return ret;

	};

	/*Prepare empty cubemap for something to draw to it
		TODO: return textures with corresponding size data?
	*/
	this.prepareOutputCubemap = function(gl_active_texture, gl_min_filter, gl_mag_filter, size){
		return this.prepareCubemap(
			gl_active_texture, gl_min_filter, gl_mag_filter, size,//TODO is nearest okay for spec maps?
			{
				px:null, py:null, pz:null,
				nx:null, ny:null, nz:null,
			}
		);
	};

	this.importCubemap = function(gl_active_texture, dest, bin, cmapSize){
		this.importCubemapMip(gl_active_texture, dest, bin, cmapSize, 0);
		gl.activeTexture(gl_active_texture);
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, dest);
		gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
	};


	this.importCubemapMip = function(gl_active_texture, dest, bin, mipLevelSize, mipLevel){
		const faceNames = ['px','nx','py','ny','pz','nz'];
		gl.activeTexture(gl_active_texture);
		gl.bindTexture(gl.TEXTURE_CUBE_MAP,dest);
		for(let i =0;i<6;i++){
			const target = gl.TEXTURE_CUBE_MAP_POSITIVE_X + i;
			const sz = mipLevelSize;
			gl.texImage2D(target,mipLevel,gl.RGBA,sz,sz,0,gl.RGBA,gl.UNSIGNED_BYTE,bin[faceNames[i]]);
		}
	};


	this.exportCubemap = function(cmap, cmapSize){
		const tmpfbo = new GLCFramebuffer(cmapSize,cmapSize);

		const names = ['px','nx','py','ny','pz','nz'];
		let res = {};
		for(let i = 0;i<6;i++){
			let dat = new Uint8Array(cmapSize*cmapSize*4);
			tmpfbo.renderToTex(cmap,gl.TEXTURE_CUBE_MAP_POSITIVE_X + i,function(){
				gl.readPixels(0,0,cmapSize,cmapSize,gl.RGBA,gl.UNSIGNED_BYTE,dat);
				res[names[i]] = dat;
			});
		}
		return res;


	};

	this.getFramebufferWidth = function(index){return cfbo[index] && cfbo[index].getWidth();};
	this.getFramebufferHeight = function(index){return cfbo[index] && cfbo[index].getHeight();};

	this.assignFramebuffer = function(width,height,index){
		cfbo[index] = new GLCFramebuffer(width,height);
	};

	this.renderToTex = function(tex, target, index, renderFun){
		if(cfbo[index] === undefined){
			throw 'no framebuffer';
		}
		fbBound = index;
		cfbo[index].renderToTex(tex,target,renderFun);
		fbBound = null;
	};

	this.unassignFramebuffer = function(index){
		cfbo[index].clean;
		delete cfbo[index];
	}


	/*
		helper object for manipulating framebuffers
	*/
	function GLCFramebuffer(fbWidth, fbHeight){
		this.getWidth = function(){return fbWidth;};
		this.getHeight = function(){return fbHeight;};

		let dead = false;

		const fbo = gl.createFramebuffer();
		const depthRB = gl.createRenderbuffer();
		gl.bindRenderbuffer(gl.RENDERBUFFER,depthRB);
		gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,fbWidth,fbHeight);

		gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depthRB);
		gl.bindFramebuffer(gl.FRAMEBUFFER,null);

		
		this.renderToTex = function(tex,target,renderFun){
			if(dead){
				throw 'GLCFramebuffer is cleaned';
			}
			gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
			gl.viewport(0,0,fbWidth,fbHeight);
			gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,target,tex,0);
			try{
				renderFun();
			}finally{
				gl.bindFramebuffer(gl.FRAMEBUFFER,null);
				gl.viewport(0,0,width,height);
			}
		};

		this.clean = function(){
			dead = true;
			gl.deleteFramebuffer(fbo);
			gl.deleteRenderbuffer(depthRB);
		}
	}

	this.lookupError = _lookupError;
	this.safe = _safe;

	function _safe(){
		const err = gl.getError();
		if(err !== 0){
			throw new Error(_lookupError(err));
		}
	}


	function _lookupError(err){
		for(let ind in gl){
			if(gl[ind] === err){
				return ind;
			}
		}
		return "Error not found.";
	}

	this.modelMatNoRotate = function(x,y,z,scaleFactor){
		return mh.modelMatNoRotate(x,y,z,scaleFactor);
	};

	this.modelMat = function(x,y,z,yaw,pitch,roll,scaleFactor){
		return mh.modelMat(x,y,z,yaw,pitch,roll,scaleFactor);
	};

	this.viewMat = function(x,y,z,yaw,pitch){
		return mh.viewMat(x,y,z,yaw,pitch);
	};

	this.applyTransform = function(mat,vec){
		return mh.applyTransform(mat,vec);
	};
	
	this.toRads = function(degs){ return mh.toRads(degs); }
















}
