function CubeFast(lx, ly, lz, ox, oy, oz){
	const dx = lx / 2;
	const dy = ly / 2;
	const dz = lz / 2;

	this.faceOrder = ['pz','nz','px','nx','py','ny'];

	const verts = [//automatically generated
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


	const wfVerts = [//automatically generated
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
		0,0,1,//+z
		0,0,1,
		0,0,1,
		0,0,1,
		0,0,1,
		0,0,1,
		0,0,-1,//-z
		0,0,-1,
		0,0,-1,
		0,0,-1,
		0,0,-1,
		0,0,-1,
		1,0,0,//+x
		1,0,0,
		1,0,0,
		1,0,0,
		1,0,0,
		1,0,0,
		-1,0,0,//-x
		-1,0,0,
		-1,0,0,
		-1,0,0,
		-1,0,0,
		-1,0,0,
		0,1,0,//+y
		0,1,0,
		0,1,0,
		0,1,0,
		0,1,0,
		0,1,0,
		0,-1,0,//-y
		0,-1,0,
		0,-1,0,
		0,-1,0,
		0,-1,0,
		0,-1,0,
	];

	this.getNorms = function(){return norms;};

	const umax_x = lx;//TODO make configurable
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


(function(run){//used to generate the above
	if(!run) return;

	const vertices = [
		'ox-dx','oy-dy','oz-dz',//0
		'ox+dx','oy-dy','oz-dz',
		'ox+dx','oy+dy','oz-dz',//2
		'ox-dx','oy+dy','oz-dz',

		'ox-dx','oy-dy','oz+dz',//4
		'ox+dx','oy-dy','oz+dz',
		'ox+dx','oy+dy','oz+dz',//6
		'ox-dx','oy+dy','oz+dz',
	];

	const faces = [
		4,5,6,//+z
		6,7,4,
		0,3,2,//-z
		2,1,0,
		1,2,6,//+x
		6,5,1,
		0,4,7,//-x
		7,3,0,
		3,7,6,//+y
		6,2,3,
		0,1,5,//-y
		5,4,0,
	];

	const edges = [
		4,5,5,6,6,7,
		0,3,3,2,2,1,
		1,2,2,6,6,5,
		0,4,4,7,7,3,
		3,7,7,6,6,2,
		0,1,1,5,5,4,
	];

	let vertBuff = 'const verts = [\n';
	for(let i = 0; i < faces.length; i++){
		vertBuff += '\t';
		for(let c = 0;c<3;c++){
			vertBuff += vertices[faces[i] * 3 + c];
			vertBuff += ',';
		}
		vertBuff += '\n';
	}
	vertBuff += '];';

	let wireVertBuff = 'const wfVerts = [\n';
	for(let i = 0; i < edges.length; i++){
		wireVertBuff += '\t';
		for(let c = 0;c<3;c++){
			wireVertBuff += vertices[edges[i]*3+c];
			wireVertBuff += ',';
		}
		wireVertBuff += '\n';
	}
	wireVertBuff += '];';


	console.log(vertBuff);
	console.log(wireVertBuff);

})(false);




