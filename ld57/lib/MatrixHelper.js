function MatrixHelper(){


	this.axes = {x:0,y:1,z:2};
	const axes = this.axes;

	this.modelMatNoRotate = function(x,y,z,scaleFactor){
		const tran = translate(x,y,z);
		const scal = scale(scaleFactor);

		return matMult4(tran, scal);

	};

	this.modelMat = function (x,y,z,yaw,pitch,roll,scaleFactor){
		const tran = translate(x,y,z);
		const roty = rotate(axes.y,yaw);
		const rotp = rotate(axes.x,pitch);
		const rotr = rotate(axes.z,roll);
		const scal = scale(scaleFactor);

		return matMult4(tran, matMult4(roty, matMult4(rotp, matMult4(rotr,scal))));
	};

	// WARNING this screws up normals
	this.modelMatNonUniformScaling = function(x,y,z,yaw,pitch,roll,sx,sy,sz){
		const tran = translate(x,y,z);
		const roty = rotate(axes.y,yaw);
		const rotp = rotate(axes.x,pitch);
		const rotr = rotate(axes.z,roll);
		const scal = scale3(sx, sy, sz);

		return matMult4(tran, matMult4(roty, matMult4(rotp, matMult4(rotr,scal))));
	};

	this.viewMat = function (x,y,z,yaw,pitch){
		const tran = translate(-x,-y,-z);
		const roty = rotate(axes.y,-yaw);
		const rotp = rotate(axes.x,-pitch);

		return matMult4(rotp,matMult4(roty,tran));
	};

	this.applyTransform = function (mat,vec){
		/*
			[0 4 8  12]
			[1 5 9  13]
			[2 6 10 14]
			[3 7 11 15]
		*/

		const outVec = {x:0,y:0,z:0,w:0};

		outVec.x = mat[0]*vec.x + mat[4]*vec.y + mat[8]*vec.z + mat[12]*vec.w;
		outVec.y = mat[1]*vec.x + mat[5]*vec.y + mat[9]*vec.z + mat[13]*vec.w;
		outVec.z = mat[2]*vec.x + mat[6]*vec.y + mat[10]*vec.z + mat[14]*vec.w;
		outVec.w = mat[3]*vec.x + mat[7]*vec.y + mat[11]*vec.z + mat[15]*vec.w;

		return outVec;

	};


	this.toRads = function(degs){
		return degs*3.141593/180;
	};


	function scale3(x, y, z){
		return [
			x,0,0,0,
			0,y,0,0,
			0,0,z,0,
			0,0,0,1
		];
	}


	function scale(factor){
		/*
			sc,0,0,0,
			0,sc,0,0,
			0,0,sc,0,
			0,0,0,1,

		*/

		return [
			factor,0,0,0,
			0,factor,0,0,
			0,0,factor,0,
			0,0,0,1
		];
	}

	function rotate(axis,theta){
		const sint = Math.sin(theta);
		const cost = Math.cos(theta);

		if(axis === axes.x){
			/*
				1,0,0,0,
				0,cost,-sint,0,
				0,sint,cost,0,
				0,0,0,1
			*/

			return [
				1,0,0,0,
				0,cost,sint,0,
				0,-sint,cost,0,
				0,0,0,1
			];
		}else if(axis === axes.y){
			/*
				cost,0,sint,0,
				0,1,0,0,
				-sint,0,cost,0,
				0,0,0,1
			*/

			return [
				cost,0,-sint,0,
				0,1,0,0,
				sint,0,cost,0,
				0,0,0,1
			];
		}else{
			/*
				cost,-sint,0,0,
				sint,cost,0,0,
				0,0,1,0,
				0,0,0,1
			*/

			return [
				cost,sint,0,0,
				-sint,cost,0,0,
				0,0,1,0,
				0,0,0,1
			];
		}
	}


	


	function translate(dx, dy, dz){
		/*
			[1,0,0,dx
			0,1,0,dy,
			0,0,1,dz,
			0,0,0,1]
		*/
		const tranMat = [
			1,0,0,0,
			0,1,0,0,
			0,0,1,0,
			dx,dy,dz,1
		];
		return tranMat;
	}




	function matMult4(A,B){
		/*
			Matrix structure:	

			[0 4 8  12]
			|1 5 9  13]
			|2 6 10 14]
			[3 7 11 15]
		*/

		let retVal = [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];

		for(let rowA = 0;rowA<4;rowA++){
			for(let colB = 0;colB<4;colB++){
				let accum = 0;
				for(let elmA = 0;elmA<4;elmA++){
					accum += A[elmA*4 + rowA] * B[colB*4 + elmA];
				}
				retVal[colB*4 + rowA] = accum;
			}
		}
		//retVal = new Float32Array(retVal);
		return retVal;
	}
}
