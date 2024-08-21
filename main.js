import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import skyShader from './shaders/sky.js';
import skyShader2 from './shaders/sky2.js';
import grassShader from './shaders/grass.js';



let WINDOW_W, WINDOW_H;
let WINDOW_W_2, WINDOW_H_2, ASPECT_RATIO;

let bee = null;
let mouseX = 0, mouseY = 0;
let cameraControls;
let loader, scene, camera, renderer;
let hemiLight;

//Sun
//Height over horizon in range [0, PI/2.0]
let elevation = 0.2;
//Rotation around Y axis in range [0, 2*PI]
let azimuth = 0.4;

let fogFade = 0.009;

const FOV = 45;


const mobile = ( navigator.userAgent.match(/Android/i)
      || navigator.userAgent.match(/webOS/i)
      || navigator.userAgent.match(/iPhone/i)
      || navigator.userAgent.match(/BlackBerry/i)
      || navigator.userAgent.match(/Windows Phone/i)
      );


init();

loadModels();


/*const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshLambertMaterial({ color: 0xe56956 });
const cube = new THREE.Mesh(geometry, material);
cube.position.y = 2;
cube.scale.set(1, 1, 1);
cube.castShadow = true;
cube.receiveShadow = true;
scene.add(cube);*/


createLight2();

//createGrid();

cameraControls = new OrbitControls( camera, renderer.domElement );
cameraControls.target.set( 0, 0, 0 );
cameraControls.update();


//const light = new THREE.PointLight(0xffffff);
//light.position.set(-10, 15, 50);
//scene.add(light);

//camera.position.z = 15;
//camera.position.y = 5;

//camera.position.z = 100;
//camera.position.y = 30;

camera.position.z = 260;
camera.position.y = 80;

cameraControls.update();

createSky2();

createGround();

createGrass();

renderer.shadowMap.enabled = true;
renderer.setAnimationLoop(animate);


function loadModel(file_name)
{
    return new Promise(resolve => {
        loader.load(file_name, gltf => {
        
            gltf.scene.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                }
            });

            resolve(gltf.scene);
            
        }, undefined, error => {
            console.error(error);
        });
    });
}

async function loadModels()
{
    bee = await loadModel('models/bees/bee.glb');

    bee.scale.set(1, 1, 1);
    bee.position.y = 2;

    scene.add(bee);

    let rock = await loadModel('models/rocks/rock1.glb');

    rock.scale.set(0.1, 0.1, 0.1);
    rock.position.y = -2;
    rock.position.x = 5;

    scene.add(rock);
}


function createGrass()
{
  //return;

    let joints = 4;
    let bladeWidth = 0.12;
    let bladeHeight = 0.5;//1;

    let instances = 200000;//40000;

    let pos = new THREE.Vector2(0.01, 0.01);

    let radius = 500000;//240;

    let elevation = 0.1;//0.2;

//Rotation around Y axis in range [0, 2*PI]
let azimuth = 0.4;

//Lighting variables for grass
let ambientStrength = 0.7;
let translucencyStrength = 1.5;
let specularStrength = 0.5;
let diffuseStrength = 1.5;
let shininess = 256;
let sunColour = new THREE.Vector3(1.0, 1.0, 1.0);
let specularColour = new THREE.Vector3(1.0, 1.0, 1.0);



    //Patch side length
let width = 100; // 100
//Number of vertices on ground plane side
let resolution = 64; // 64
//Distance between two ground plane vertices
let delta = width/resolution;

let loader = new THREE.TextureLoader();
loader.crossOrigin = '';
let grassTexture = loader.load( './images/blade_diffuse.jpg' );
let alphaMap = loader.load( './images/blade_alpha.jpg' );
let noiseTexture = loader.load( './images/perlinFbm.jpg' );
noiseTexture.wrapS = THREE.RepeatWrapping;
noiseTexture.wrapT = THREE.RepeatWrapping;

//Define base geometry that will be instanced. We use a plane for an individual blade of grass
var grassBaseGeometry = new THREE.PlaneGeometry(bladeWidth, bladeHeight, 1, joints);
grassBaseGeometry.translate(0, bladeHeight/2, 0);

//Define the bend of the grass blade as the combination of three quaternion rotations
let vertex = new THREE.Vector3();
let quaternion0 = new THREE.Quaternion();
let quaternion1 = new THREE.Quaternion();
let x, y, z, w, angle, sinAngle, rotationAxis;

//Rotate around Y
angle = 0.05;
sinAngle = Math.sin(angle / 2.0);
rotationAxis = new THREE.Vector3(0, 1, 0);
x = rotationAxis.x * sinAngle;
y = rotationAxis.y * sinAngle;
z = rotationAxis.z * sinAngle;
w = Math.cos(angle / 2.0);
quaternion0.set(x, y, z, w);

//Rotate around X
angle = 0.3;
sinAngle = Math.sin(angle / 2.0);
rotationAxis.set(1, 0, 0);
x = rotationAxis.x * sinAngle;
y = rotationAxis.y * sinAngle;
z = rotationAxis.z * sinAngle;
w = Math.cos(angle / 2.0);
quaternion1.set(x, y, z, w);

//Combine rotations to a single quaternion
quaternion0.multiply(quaternion1);

//Rotate around Z
angle = 0.1;
sinAngle = Math.sin(angle / 2.0);
rotationAxis.set(0, 0, 1);
x = rotationAxis.x * sinAngle;
y = rotationAxis.y * sinAngle;
z = rotationAxis.z * sinAngle;
w = Math.cos(angle / 2.0);
quaternion1.set(x, y, z, w);

//Combine rotations to a single quaternion
quaternion0.multiply(quaternion1);

let quaternion2 = new THREE.Quaternion();

//Bend grass base geometry for more organic look
for(let v = 0; v < grassBaseGeometry.attributes.position.array.length; v += 3){
	quaternion2.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
	vertex.x = grassBaseGeometry.attributes.position.array[v];
	vertex.y = grassBaseGeometry.attributes.position.array[v+1];
	vertex.z = grassBaseGeometry.attributes.position.array[v+2];
	let frac = vertex.y/bladeHeight;
	quaternion2.slerp(quaternion0, frac);
	vertex.applyQuaternion(quaternion2);
	grassBaseGeometry.attributes.position.array[v] = vertex.x;
	grassBaseGeometry.attributes.position.array[v+1] = vertex.y;
	grassBaseGeometry.attributes.position.array[v+2] = vertex.z;
}

grassBaseGeometry.computeVertexNormals();
//var baseMaterial = new THREE.MeshNormalMaterial({side: THREE.DoubleSide});
//var baseBlade = new THREE.Mesh(grassBaseGeometry, baseMaterial);
//Show grass base geometry
//scene.add(baseBlade);

var instancedGeometry = new THREE.InstancedBufferGeometry();

instancedGeometry.index = grassBaseGeometry.index;
instancedGeometry.attributes.position = grassBaseGeometry.attributes.position;
instancedGeometry.attributes.uv = grassBaseGeometry.attributes.uv;
instancedGeometry.attributes.normal = grassBaseGeometry.attributes.normal;

// Each instance has its own data for position, orientation and scale
var indices = [];
var offsets = [];
var scales = [];
var halfRootAngles = [];

//For each instance of the grass blade
for (let i = 0; i < instances; i++){
	
	indices.push(i/instances);
	
  //Offset of the roots
  x = Math.random() * width - width/2;
  z = Math.random() * width - width/2;
  y = 0; 
  offsets.push(x, y, z);

	//Random orientation
  let angle = Math.PI - Math.random() * (2 * Math.PI);
  halfRootAngles.push(Math.sin(0.5*angle), Math.cos(0.5*angle));

  //Define variety in height
  if(i % 3 != 0){
  	scales.push(2.0+Math.random() * 1.25);
  }else{
    scales.push(2.0+Math.random()); 
  }
}

var offsetAttribute = new THREE.InstancedBufferAttribute(new Float32Array(offsets), 3);
var scaleAttribute = new THREE.InstancedBufferAttribute(new Float32Array(scales), 1);
var halfRootAngleAttribute = new THREE.InstancedBufferAttribute(new Float32Array(halfRootAngles), 2);
var indexAttribute = new THREE.InstancedBufferAttribute(new Float32Array(indices), 1);

instancedGeometry.setAttribute( 'offset', offsetAttribute);
instancedGeometry.setAttribute( 'scale', scaleAttribute);
instancedGeometry.setAttribute( 'halfRootAngle', halfRootAngleAttribute);
instancedGeometry.setAttribute( 'index', indexAttribute);

//Define the material, specifying attributes, uniforms, shaders etc.
var grassMaterial = new THREE.RawShaderMaterial( {
  uniforms: {
    time: {type: 'float', value: 0},
		delta: {type: 'float', value: delta },
  	posX: {type: 'float', value: pos.x },
  	posZ: {type: 'float', value: pos.y },
  	radius: {type: 'float', value: radius },
  	width: {type: 'float', value: width },
    map: { value: grassTexture},
    alphaMap: { value: alphaMap},
    noiseTexture: { value: noiseTexture},
		sunDirection: {type: 'vec3', value: new THREE.Vector3(Math.sin(azimuth), Math.sin(elevation), -Math.cos(azimuth))},
		cameraPosition: {type: 'vec3', value: camera.position},
		ambientStrength: {type: 'float', value: ambientStrength},
    translucencyStrength: {type: 'float', value: translucencyStrength},
    diffuseStrength: {type: 'float', value: diffuseStrength},
    specularStrength: {type: 'float', value: specularStrength},
    shininess: {type: 'float', value: shininess},
    lightColour: {type: 'vec3', value: sunColour},
    specularColour: {type: 'vec3', value: specularColour},
  },
  vertexShader: grassShader.vert(bladeHeight),//grassVertexSource,
  fragmentShader: grassShader.frag(),//grassFragmentSource,
  side: THREE.DoubleSide
} );

var grass = new THREE.Mesh(instancedGeometry, grassMaterial);
scene.add(grass);

/*for(let i = 0; i < 10; i++) {
    let grass2 = grass.clone();
    grass2.position.x += (50 * (i + 1));
    scene.add(grass2);
}*/

}


function init()
{
    updateWindowInfo()

    loader = new GLTFLoader();
    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer({ antialias: true });
    //camera = new THREE.PerspectiveCamera(75, ASPECT_RATIO, 0.1, 1000);
    camera = new THREE.PerspectiveCamera( FOV/*45*/, window.innerWidth / window.innerHeight, 1, 4000 );

    //camera.position.set(4, 4, -4);
    //camera.lookAt(0, 0, 2);
    
    //camera.position.set(0, 10, 0);
    //camera.lookAt(0, 0, 0);

    //camera.position.set( 0, 150, 1300 );
    window.cam = camera;

    renderer.setSize(WINDOW_W, WINDOW_H);
    renderer.setClearColor(0xdddddd, 1);

    document.body.appendChild(renderer.domElement);
    //document.addEventListener('mousemove', onDocumentMouseMove);
    
    window.addEventListener('resize', onWindowResize);

    scene.background = new THREE.Color().setHSL( 0.6, 0, 1 );
    scene.fog = new THREE.Fog( scene.background, 1, 5000 );

    showCamera();
}


function showCamera()
{
    $('#camera_pos_x').text(camera.position.x.toFixed(2));
    $('#camera_pos_y').text(camera.position.y.toFixed(2));
    $('#camera_pos_z').text(camera.position.z.toFixed(2));
    $('#camera_rot_x').text(camera.rotation.x.toFixed(2));
    $('#camera_rot_y').text(camera.rotation.y.toFixed(2));
    $('#camera_rot_z').text(camera.rotation.z.toFixed(2));
    $('#camera_up_x').text(camera.up.x.toFixed(2));
    $('#camera_up_y').text(camera.up.y.toFixed(2));
    $('#camera_up_z').text(camera.up.z.toFixed(2));
    
    setTimeout(showCamera, 100);
}

function createSky2()
{
  const backgroundMaterial = new THREE.ShaderMaterial({
    uniforms: {
      sunDirection: {type: 'vec3', value: new THREE.Vector3(Math.sin(azimuth), Math.sin(elevation), -Math.cos(azimuth))},
      //resolution: {type: 'vec2', value: new THREE.Vector2(canvas.width, canvas.height)},
      resolution: {type: 'vec2', value: new THREE.Vector2(WINDOW_W, WINDOW_H)},
      fogFade: {type: 'float', value: fogFade},
      fov: {type: 'float', value: FOV}
    },
    vertexShader: skyShader2.vert(),
    fragmentShader: skyShader2.frag()
  });
  
  backgroundMaterial.depthWrite = false;
  var backgroundGeometry = new THREE.PlaneGeometry(2, 2, 1, 1);
  var background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
  
  scene.add(background);
  //backgroundScene.add(background);
  //renderer.autoClear = false;
}

function createSky3()
{
    let sky = new Sky();
    sky.scale.setScalar( 450000 );
    scene.add( sky );
    
    let sun = new THREE.Vector3();
    
    const effectController = {
        turbidity: 1, //1
        rayleigh: 1, //1
        mieCoefficient: 0.005,
        mieDirectionalG: 0.7, //0.7
        elevation: 2, //2
        azimuth: 0, //180
        exposure: renderer.toneMappingExposure
    };
    
    const uniforms = sky.material.uniforms;
    uniforms[ 'turbidity' ].value = effectController.turbidity;
    uniforms[ 'rayleigh' ].value = effectController.rayleigh;
    uniforms[ 'mieCoefficient' ].value = effectController.mieCoefficient;
    uniforms[ 'mieDirectionalG' ].value = effectController.mieDirectionalG;
    
    const phi = THREE.MathUtils.degToRad( 90 - effectController.elevation );
    const theta = THREE.MathUtils.degToRad( effectController.azimuth );
    
    sun.setFromSphericalCoords( 1, phi, theta );
    
    uniforms[ 'sunPosition' ].value.copy( sun );
    
    renderer.toneMappingExposure = effectController.exposure;
}

function createGrid()
{
    const gridHelper = new THREE.GridHelper(200, 200);
    scene.add(gridHelper);
}

function createLight()
{
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(10, 20, 0);
    scene.add(ambientLight, directionalLight);
}

function createLight2()
{
    hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 2 );
    hemiLight.color.setHSL( 0.6, 1, 0.6 );
    hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
    hemiLight.position.set( 0, 50, 0 );
    scene.add( hemiLight );

    /*const hemiLightHelper = new THREE.HemisphereLightHelper( hemiLight, 10 );
    scene.add( hemiLightHelper );*/

    //

    const dirLight = new THREE.DirectionalLight( 0xffffff, 3 );
    dirLight.color.setHSL( 0.1, 1, 0.95 );
    dirLight.position.set( - 1, 1.75, 1 );
    dirLight.position.multiplyScalar( 30 );
    scene.add( dirLight );

    dirLight.castShadow = true;

    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;

    const d = 50;

    dirLight.shadow.camera.left = - d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = - d;

    dirLight.shadow.camera.far = 3500;
    dirLight.shadow.bias = - 0.0001;

    /*const dirLightHelper = new THREE.DirectionalLightHelper( dirLight, 10 );
    scene.add( dirLightHelper );*/
}

function createSky()
{
    const uniforms = {
      topColor: { value: new THREE.Color(0x0077ff) },
      bottomColor: { value: new THREE.Color(0xffffff) },
      offset: { value: 33 },
      exponent: { value: 0.6 },
    };

    uniforms["topColor"].value.copy(hemiLight.color);

    scene.fog.color.copy(uniforms["bottomColor"].value);

    const skyGeo = new THREE.SphereGeometry(4000, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: skyShader.vert(),
      fragmentShader: skyShader.frag(),
      side: THREE.BackSide,
    });

    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);
}

function createGround()
{
    const groundGeo = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    groundMat.color.setHSL(0.095, 1, 0.75);

    const ground = new THREE.Mesh(groundGeo, groundMat);
    //ground.position.y = - 33;
    ground.position.y = -1;
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
}

function updateWindowInfo()
{
    WINDOW_W = window.innerWidth;
    WINDOW_H = window.innerHeight;
    WINDOW_W_2 = window.innerWidth / 2;
    WINDOW_H_2 = window.innerHeight / 2;
    ASPECT_RATIO = window.innerWidth / window.innerHeight;
}


function onDocumentMouseMove(event) 
{
    mouseX = (event.clientX - WINDOW_W_2) / 100;
    mouseY = (event.clientY - WINDOW_H_2) / 100;
}


function onWindowResize() 
{
  updateWindowInfo();

  camera.aspect = ASPECT_RATIO;
  camera.updateProjectionMatrix();

  renderer.setSize(WINDOW_W, WINDOW_H);

  //effect.setSize( window.innerWidth, window.innerHeight );
}


function animate() 
{
    if(bee) {
      //bee.rotation.x += 0.01;
      bee.rotation.y += 0.01;
    }

    /*{
        camera.position.x += ( mouseX - camera.position.x ) * .05;
        camera.position.y += ( - mouseY - camera.position.y ) * .05;

        camera.lookAt( scene.position );
    }*/

	renderer.render(scene, camera);
}




