import * as THREE from 'three';

//scene
let canvas, camera, scene, light, renderer, needle;
//popup

let popupPlaneMesh,
	popupBtn = document.getElementById('popupBtn'),
	popupTexts = JSON.parse(popupData);
//params
let params = {
	sceneWidth: 850,
	sceneHeight: 450,
	bgSrc: './assets/interaction_locate_midline_bg.jpg',
	popupSrc: './assets/popup.png',
	isSimulationActive: false
};
let movingPathParams = {
	yPosition: -7,
	xMinPosition: -10.0,
	xMaxPosition: 8.0,
}
let needleParams = {
	needleSrc: './assets/interaction_locate_midline_needle.png',
	scale: new THREE.Vector3(0.1, 0.1, 0.1),	
	startPosition: new THREE.Vector3(movingPathParams.xMinPosition,
		movingPathParams.yPosition, 0.0),
	positionStep: 0.1,
	isLocked: false
};
let findMiddleParams = {
	center: new THREE.Vector3(-1.5, movingPathParams.yPosition, 0.0),
	offset: 1.0,
	isSetNeedleCorrect: undefined
}
let touchParams = {
	objectLeftTopCorner: { x: 360, y: 210 },
	objectRightBottomCorner: { x: 380, y: 350 },
	mouseDown: { x: 0 },
	limits: {min: 370, max: 490}
}

class App {
	init() {
		canvas = document.getElementById('canvas');
		canvas.setAttribute('width', 	params.sceneWidth);
		canvas.setAttribute('height', 	params.sceneHeight);
		
		//scene and camera
		scene = new THREE.Scene();
		camera = new THREE.PerspectiveCamera(40.0, params.sceneWidth / params.sceneHeight, 0.1, 5000);
		camera.position.set(0, 0, 100);
		//light
		light = new THREE.AmbientLight(0xffffff);
		scene.add(light);
		
		//renderer
		renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
		renderer.setClearColor(0xffffff);

		//Load background texture
		let loader = new THREE.TextureLoader();
		loader.load(params.bgSrc, function (texture) {
			texture.minFilter = THREE.LinearFilter;
			scene.background = texture;
		});

		//load needle
		const needlePlane = new THREE.PlaneGeometry(params.sceneWidth, params.sceneHeight, 10.0);
		loader = new THREE.TextureLoader();
		const needleMaterial = new THREE.MeshBasicMaterial({
			map: loader.load(needleParams.needleSrc, function (texture) {
				texture.minFilter = THREE.LinearFilter; }),
			transparent: true
		});    
		needle = new THREE.Mesh(needlePlane, needleMaterial);
		needle.scale.copy(needleParams.scale);
		needle.position.copy(needleParams.startPosition);
		scene.add(needle);
	
		//popup
		createPopupPlane();
		addPopup();

		renderer.render(scene, camera);
		canvas.addEventListener('mousemove', onMouseMove, false);
		canvas.addEventListener('mousedown', onMouseDown, false);
		popupBtn.addEventListener('click', removePopup, false);
		canvas.addEventListener("touchstart",   touch_start_handler);
    	canvas.addEventListener("touchmove",    touch_move_handler);    
    	canvas.addEventListener("touchend",     touch_up_handler);

		animate();
	}
}

function onMouseMove(e) {
	if (needleParams.isLocked) {
		let movementX = e.movementX ||
			e.mozMovementX ||
			e.webkitMovementX ||
			0;
		let newXPosition = needle.position.x + movementX * needleParams.positionStep;
		if (newXPosition < movingPathParams.xMaxPosition &&
			newXPosition > movingPathParams.xMinPosition) {
			needle.position.x = newXPosition;
		}
	}
}

function onMouseDown() {
	if (params.isSimulationActive == false)
		return;
	if (needleParams.isLocked) {
		//unlock
		document.exitPointerLock = document.exitPointerLock ||
			document.mozExitPointerLock ||
			document.webkitExitPointerLock;
		document.exitPointerLock();
		needleParams.isLocked = false;
		//check right placement
		chechRightPlacement();
		
	}
	else {
		//lock
		canvas.requestPointerLock = canvas.requestPointerLock ||
			canvas.mozRequestPointerLock ||
			canvas.webkitRequestPointerLock;
		canvas.requestPointerLock();
		needleParams.isLocked = true;
	}	
}

function animate() {
	requestAnimationFrame(animate);
	renderer.render(scene, camera);
}

function createPopupPlane() {
	const popupPlane = new THREE.PlaneGeometry(params.sceneWidth, params.sceneHeight, 10.0);
	const loader = new THREE.TextureLoader();
	const popupMaterial = new THREE.MeshBasicMaterial({
		map: loader.load(params.popupSrc, function (texture) {
			texture.minFilter = THREE.LinearFilter; }),
		transparent: true
	});    
	popupPlaneMesh = new THREE.Mesh(popupPlane, popupMaterial);
	popupPlaneMesh.scale.set(0.105, 0.105, 0.105)
	popupPlaneMesh.position.z = 10;
}

function addPopup() {
	scene.add(popupPlaneMesh);
	params.isSimulationActive = false;
	//interface
	document.getElementById('popupTitle').style.display = 'block';
	document.getElementById('popupText').style.display = 'block';
	popupBtn.style.display = 'block';
	if (findMiddleParams.isSetNeedleCorrect === undefined) {
		document.getElementById('popupTitle').value = popupTexts.introTitle;
		document.getElementById('popupText').value = popupTexts.introText;
		return;
	}
	if (findMiddleParams.isSetNeedleCorrect) {
		document.getElementById('popupTitle').value = popupTexts.correctPlacementTitle;
		document.getElementById('popupText').value = popupTexts.correctPlacementText;
		return;
	}
	if (!findMiddleParams.isSetNeedleCorrect) {
		document.getElementById('popupTitle').value = popupTexts.uncorrectPlacementTitle;
		document.getElementById('popupText').value = popupTexts.uncorrectPlacementText;
		return;
	}
}

function removePopup() {
	scene.remove(popupPlaneMesh);
	params.isSimulationActive = true;
	//interface
	document.getElementById('popupTitle').style.display = 'none';
	document.getElementById('popupText').style.display = 'none';
	popupBtn.style.display = 'none';
	if(!findMiddleParams.isSetNeedleCorrect) {
		onMouseDown();
	}
}

function touch_start_handler(e) {
	let evt = (typeof e.originalEvent === 'undefined') ? e : e.originalEvent;
    let touch = evt.touches[0] || evt.changedTouches[0];
	if (parseInt(touch.pageX) > touchParams.objectLeftTopCorner.x &&
		parseInt(touch.pageY) > touchParams.objectLeftTopCorner.y &&
		parseInt(touch.pageX) < touchParams.objectRightBottomCorner.x &&
		parseInt(touch.pageY) < touchParams.objectRightBottomCorner.y
	) {
		needleParams.isLocked = true;
		touchParams.mouseDown.x = parseInt(touch.pageX);
	}
}

function touch_move_handler(e) {
	let evt = (typeof e.originalEvent === 'undefined') ? e : e.originalEvent;
	let touch = evt.touches[0] || evt.changedTouches[0];
	if (needleParams.isLocked) {
		let newMouseX = parseInt(touch.pageX);
		if (newMouseX < touchParams.limits.max && newMouseX > touchParams.limits.min) {
			let newXPosition = (newMouseX - touchParams.limits.min) *
				(movingPathParams.xMaxPosition - movingPathParams.xMinPosition) /
				(touchParams.limits.max - touchParams.limits.min) + movingPathParams.xMinPosition;
			needle.position.x = newXPosition;
			touchParams.objectLeftTopCorner.x = newMouseX - 10;
			touchParams.objectRightBottomCorner.x = newMouseX + 10;
		}
	}
}

function touch_up_handler(e) {
	needleParams.isLocked = false;
	if (touchParams.mouseDown.x != 0) {
		touchParams.mouseDown.x = 0;
		chechRightPlacement();	
	}
}

function chechRightPlacement() {
	let dist = Math.sqrt(
		(needle.position.x - findMiddleParams.center.x) * (needle.position.x - findMiddleParams.center.x) +
		(needle.position.y - findMiddleParams.center.y) * (needle.position.y - findMiddleParams.center.y)
	);
	if (dist < findMiddleParams.offset) {
		findMiddleParams.isSetNeedleCorrect = true;
		needle.position.copy(findMiddleParams.center);
		setTimeout(() => {
			addPopup();
		}, 1000);
	}
	else
	{
		findMiddleParams.isSetNeedleCorrect = false;
		setTimeout(() => {
			addPopup();
		}, 1000);
	}
}

export default App;
