function CubeFast(lx, ly, lz, ox, oy, oz){
	const dx = lx / 2;
	const dy = ly / 2;
	const dz = lz / 2;

	this.faceOrder = ['pz','nz','px','nx','py','ny'];

	const verts = [ //automatically generated
		ox-dx,oy-dy,oz+dz,
		ox+dx,oy-dy,oz+dz,
		ox+dx,oy+dy,oz+dz,
		ox+dx,oy+dy,oz+dz,
		ox-dx,oy+dy,oz+dz,
		ox-dx,oy-dy,oz+dz,
		ox-dx,oy-dy,oz-dz,
		ox-dx,oy+dy,oz-dz,
		ox+dx,oy+dy,oz-dz,
		ox+dx,oy+dy,oz-dz,
		ox+dx,oy-dy,oz-dz,
		ox-dx,oy-dy,oz-dz,
		ox+dx,oy-dy,oz-dz,
		ox+dx,oy+dy,oz-dz,
		ox+dx,oy+dy,oz+dz,
		ox+dx,oy+dy,oz+dz,
		ox+dx,oy-dy,oz+dz,
		ox+dx,oy-dy,oz-dz,
		ox-dx,oy-dy,oz-dz,
		ox-dx,oy-dy,oz+dz,
		ox-dx,oy+dy,oz+dz,
		ox-dx,oy+dy,oz+dz,
		ox-dx,oy+dy,oz-dz,
		ox-dx,oy-dy,oz-dz,
		ox-dx,oy+dy,oz-dz,
		ox-dx,oy+dy,oz+dz,
		ox+dx,oy+dy,oz+dz,
		ox+dx,oy+dy,oz+dz,
		ox+dx,oy+dy,oz-dz,
		ox-dx,oy+dy,oz-dz,
		ox-dx,oy-dy,oz-dz,
		ox+dx,oy-dy,oz-dz,
		ox+dx,oy-dy,oz+dz,
		ox+dx,oy-dy,oz+dz,
		ox-dx,oy-dy,oz+dz,
		ox-dx,oy-dy,oz-dz,
	];
	this.getVertices = function(){return verts;};


	const wfVerts = [ //automatically generated
		ox-dx,oy-dy,oz+dz,
		ox+dx,oy-dy,oz+dz,
		ox+dx,oy-dy,oz+dz,
		ox+dx,oy+dy,oz+dz,
		ox+dx,oy+dy,oz+dz,
		ox-dx,oy+dy,oz+dz,
		ox-dx,oy-dy,oz-dz,
		ox-dx,oy+dy,oz-dz,
		ox-dx,oy+dy,oz-dz,
		ox+dx,oy+dy,oz-dz,
		ox+dx,oy+dy,oz-dz,
		ox+dx,oy-dy,oz-dz,
		ox+dx,oy-dy,oz-dz,
		ox+dx,oy+dy,oz-dz,
		ox+dx,oy+dy,oz-dz,
		ox+dx,oy+dy,oz+dz,
		ox+dx,oy+dy,oz+dz,
		ox+dx,oy-dy,oz+dz,
		ox-dx,oy-dy,oz-dz,
		ox-dx,oy-dy,oz+dz,
		ox-dx,oy-dy,oz+dz,
		ox-dx,oy+dy,oz+dz,
		ox-dx,oy+dy,oz+dz,
		ox-dx,oy+dy,oz-dz,
		ox-dx,oy+dy,oz-dz,
		ox-dx,oy+dy,oz+dz,
		ox-dx,oy+dy,oz+dz,
		ox+dx,oy+dy,oz+dz,
		ox+dx,oy+dy,oz+dz,
		ox+dx,oy+dy,oz-dz,
		ox-dx,oy-dy,oz-dz,
		ox+dx,oy-dy,oz-dz,
		ox+dx,oy-dy,oz-dz,
		ox+dx,oy-dy,oz+dz,
		ox+dx,oy-dy,oz+dz,
		ox-dx,oy-dy,oz+dz,
	];
	this.getWireframeVertices = function(){return wfVerts;};




	const norms = [
		0,0,1, //+z
		0,0,1,
		0,0,1,
		0,0,1,
		0,0,1,
		0,0,1,
		0,0,-1, //-z
		0,0,-1,
		0,0,-1,
		0,0,-1,
		0,0,-1,
		0,0,-1,
		1,0,0, //+x
		1,0,0,
		1,0,0,
		1,0,0,
		1,0,0,
		1,0,0,
		-1,0,0, //-x
		-1,0,0,
		-1,0,0,
		-1,0,0,
		-1,0,0,
		-1,0,0,
		0,1,0, //+y
		0,1,0,
		0,1,0,
		0,1,0,
		0,1,0,
		0,1,0,
		0,-1,0, //-y
		0,-1,0,
		0,-1,0,
		0,-1,0,
		0,-1,0,
		0,-1,0,
	];

	this.getNorms = function(){return norms;};

	const umax_x = lx; //TODO make configurable
	const vmax_x = lx;
	const umax_y = ly;
	const vmax_y = ly;
	const umax_z = lz;
	const vmax_z = lz;



	const texes = [
		//+z
		0,vmax_y, umax_x,vmax_y, umax_x,0, umax_x,0, 0,0, 0,vmax_y,
		//-z
		umax_x,vmax_y, umax_x,0, 0,0, 0,0, 0,vmax_y, umax_x,vmax_y,
		//+x
		umax_z,vmax_y, umax_z,0, 0,0, 0,0, 0,vmax_y, umax_z,vmax_y,
		//-x
		0,vmax_y, umax_z,vmax_y, umax_z,0, umax_z,0, 0,0, 0,vmax_y,
		//+y
		0,0, 0,vmax_z, umax_x,vmax_z, umax_x,vmax_z, umax_x,0, 0,0,
		//-y
		umax_x,0, 0,0, 0,vmax_z, 0,vmax_z, umax_x,vmax_z, umax_x,0,
	];

	this.getTexes = function(){return texes;};
}


