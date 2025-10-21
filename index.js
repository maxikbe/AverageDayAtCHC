import * as THREE from 'https://esm.sh/three@0.161.0';
import { GLTFLoader } from 'https://esm.sh/three@0.161.0/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from 'https://esm.sh/three@0.161.0/examples/jsm/controls/PointerLockControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// LOCATION ON MAP
let locationNP = false;
let locationCHC = true;

// LOCATION CREATING
let createdCHC = false;
let createdNP = false;

// OBJs
let myCarRed = null;
let myBus = null;

// COLs
let myBusFloor = null;

//Doors
let inMainCHCDoor = false;

// LIGHTS
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(5, 10, 5);
scene.add(sun);

// FOG
scene.fog = new THREE.Fog("rgb(97, 97, 97)", 20, 300); 

// SKY
const day = 'rgba(116, 170, 232, 1)';
const night = 'rgba(1, 10, 20, 1)';
scene.background = new THREE.Color(night);

// FALLING SNOW FUNCTION
let snowing = true;

const snowField = new THREE.Group();
scene.add(snowField);

function createSnow(){
    for (let i = 0; i < 1000; i++) {
        const snow = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 8, 8),
            new THREE.MeshBasicMaterial({ color: 'white'})
        );
        snow.position.set(
            (Math.random() - 0.5) * 250,
            (Math.random()) *50,
            (Math.random() - 0.5) * 250
        );
        snowField.add(snow);
    }
}

//CLEAN MODELS
function cleanModels(){
    console.log("Cleaning...");
    Object.values(models).forEach(model => {
        scene.remove(model);
                    
        model.traverse(object => {
            if (object.isMesh) {
                if (object.geometry) {
                object.geometry.dispose();
                }
                // material dispose
                if (object.material) {
                    if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            }
        });
    });
                
    for (const key in models) {
        delete models[key];
    }
}

// Raycast - What is camera looking at
let lookedCollider = null;

function detectLookedCollider() {
    const raycaster = new THREE.Raycaster();
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction); // Dir
    raycaster.set(camera.position, direction);

    const colliderMeshes = colliderVisuals.children;

    const intersects = raycaster.intersectObjects(colliderMeshes, true);

    if (intersects.length > 0 && intersects[0].distance <= 10) {
        lookedCollider = intersects[0].object.name;
    } else {
        lookedCollider = null;
    }
}

// LOAD MODEL - gltf / .glb
const loader = new GLTFLoader();
const models = {};

function loadModel(name, path, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0]) {
    loader.load(
        path,
        (gltf) => {
            const model = gltf.scene;
            model.position.set(...position);
            model.scale.set(...scale);
            model.rotation.set(...rotation);
            scene.add(model);
            models[name] = model;
            console.log(`${name} loaded!`);

            //OBJ DEFINICIONS
            if (name === "car") myCarRed = model;
            if (name === "bus") myBus = model;
        },
        undefined,
        (error) => console.error(`Error loading ${name}:`, error)
    );
}

// COLIDERS CREATOR
//Colidable models
const colliders = [];
const colliderVisuals = new THREE.Group();
scene.add(colliderVisuals);

function addCollider(name, x, y, z, sizeX, sizeY, sizeZ) {
    const box = new THREE.Box3(
        new THREE.Vector3(x - sizeX / 2, y - sizeY / 2, z - sizeZ / 2),
        new THREE.Vector3(x + sizeX / 2, y + sizeY / 2, z + sizeZ / 2)
    );

    // Not the best way to do it, but it works, so I will leave it be...
    box.name = name;
    colliders.push(box);
    colliders[name] = box;

    //DEBUG ONLY ----------------------------------------------------------------------- DELETE
    const geometry = new THREE.BoxGeometry(sizeX, sizeY, sizeZ);
    const material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        wireframe: true,
        transparent: true,
        opacity: 0.3
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.name = `collider_vis_${name}`;
    colliderVisuals.add(mesh);
    //DEBUG ONLY ----------------------------------------------------------------------- DELETE

    //COL DEFINICIONS
    if (name === "busFloor") myBusFloor = box;
}

function createNP(){
    //Namesti Prace Colliders
    addCollider("floorNp", 30, -18, 0, 75, 1, 120); // Side Walk Floor // z = from middle pillar to left // x = From edge to edge
    addCollider("trashCanNP", 43.1, 0, -27.5, 8, 20, 8); //Trash Can
    addCollider("pillarMNP", 40, 0, -27.5, 8, 20, 8); // Pillar Middle
    addCollider("pillarRNP", 40, 0, 30, 8, 20, 8); // Pillar Right
    addCollider("ticketMatNP", 40, 0, 25, 10, 20, 8); // Ticket Mat
    addCollider("busFloor",0, -68, 0, 50, 1, 135); // Bus
    //Namesti Prace Models
    loadModel("car", "./models/car_1.glb", [140, -15, -200], [10, 10, 10], [0, Math.PI / 1, 0]);
    loadModel("bus", "./models/bus.glb", [94, -15, -500], [5, 5, 5]);
    loadModel("busStopNP", "./models/ZastavkaNPrace.glb", [40, 0, -10], [3, 3, 3]);
    loadModel("busStopBR1", "./models/RoadBus.glb", [20, -20, -15], [7, 7, 7]);
    loadModel("busStopBR2", "./models/RoadBus.glb", [20, -20, -162.5], [7, 7, 7]);
    loadModel("busStopROOB", "./models/RoadOutOfBus.glb", [100, -25.05, 233.2], [7, 7, 7], [0, Math.PI / 1, 0]);
    loadModel("busStopR1", "./models/Road.glb", [160, -25, 0], [10, 10, 15]);
    loadModel("busStopR2", "./models/Road.glb", [160, -25, 181.5], [10, 10, 15]);
    loadModel("busStopR3", "./models/Road.glb", [160, -25, -181.5], [10, 10, 15]);
    loadModel("highGreenTree1", "./models/treeHighGreen.glb", [220, -20, -180], [5, 5, 5]);
    loadModel("highGreenTree2", "./models/treeHighGreen.glb", [260, -20, -10], [5, 5, 5]);
    loadModel("highGreenTree3", "./models/treeHighGreen.glb", [210, -30, 130], [5, 5, 5]);
    loadModel("highOrangeTree1", "./models/treeHighOrange.glb", [260, -40, -120], [5, 5, 5]);
    loadModel("highOrangeTree2", "./models/treeHighOrange.glb", [200, -30, -30], [5, 5, 5]);
    loadModel("highSnowyTree", "./models/treeHighSnowy.glb", [230, -20, 60], [5, 5, 5]);
    loadModel("Grass+Bushes", "./models/GrassWithBushes.glb", [190, -25, 95.2], [5, 5, 5], [0, Math.PI / 1, 0]);
    loadModel("Grass+Bushes2", "./models/GrassWithBushes.glb", [190, -25, -150], [5, 5, 5], [0, Math.PI / 1, 0]);
    loadModel("TrashCan1", "./models/OutSideTrashCan.glb", [43.1, -8, -27.5], [1.8, 2.2, 2.2], [0, Math.PI / 2, 0]); // Trash Middle
    loadModel("TrashCan2", "./models/OutSideTrashCan.glb", [42.5, -8, 50], [1.8, 2.2, 2.2], [0, Math.PI / 2, 0]); // Trash Left
    loadModel("TrashCan3", "./models/OutSideTrashCan.glb", [40, -8, -88], [1.8, 2.2, 2.2], [0, Math.PI / 1, 0]); // Trash Right
    loadModel("BlueBusSign", "./models/BlueBusSign.glb", [45, -11, 50], [2, 2, 2], [0, Math.PI / 2, 0]);
    loadModel("TicketMat", "./models/TicketMat.glb", [40, -11, 26], [2.2, 2.2, 2.2], [0, Math.PI / 2, 0]);
}

function createCHC(){
    //Namesti Prace Colliders
    addCollider("MainCHCDoor", 65, 0, 0, 1, 30, 30);
    addCollider("WallNextToDoorRight", 65, 0, 31, 2, 30, 35);
    addCollider("GreyBrickWall", 56, 0, 18, 20, 30, 5);
    addCollider("OutOfSchoolFloor", 50, -18 , -20, 140, 1, 140);
    addCollider("smallEnteranceStairs",110, -14, 0, 5, 1, 25,)
    //Namesti Prace Models
    loadModel("schoolCHC", "./models/schoolCHC.glb", [100, -20, 0], [3, 3, 3]);
}

// GROUND type CHECK
const raycaster = new THREE.Raycaster();
const down = new THREE.Vector3(0, -1, 0);

function getObjectBelowPlayer() {
    const playerCurrentPos = controls.getObject().position.clone();
    const playerBottomBox = new THREE.Box3(
        new THREE.Vector3(playerCurrentPos.x - playerHalfWidth, playerCurrentPos.y - playerHeight*10 - 0.5, playerCurrentPos.z - playerHalfWidth),
        new THREE.Vector3(playerCurrentPos.x + playerHalfWidth, playerCurrentPos.y + 0.5, playerCurrentPos.z + playerHalfWidth)
    );

    const hitCollider = colliders.find(box => box.intersectsBox(playerBottomBox));
    return hitCollider ? hitCollider.name : null;
}

// RESIZE HANDELER
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// USER KEY IMPUTS
const move = { forward: false, backward: false, left: false, right: false };
//Start
let KeyPressed;
document.addEventListener('keydown', (e) => {
    KeyPressed = e.code;
    switch (e.code) {
        case 'KeyW': move.forward = true; break;
        case 'KeyS': move.backward = true; break;
        case 'KeyA': move.left = true; break;
        case 'KeyD': move.right = true; break;
    }
});
//Stop
document.addEventListener('keyup', (e) => {
    KeyPressed = null;
    switch (e.code) {
        case 'KeyW': move.forward = false; break;
        case 'KeyS': move.backward = false; break;
        case 'KeyA': move.left = false; break;
        case 'KeyD': move.right = false; break;
    }
});

//Camera Movement 
const controls = new PointerLockControls(camera, renderer.domElement);

scene.add(controls.getObject());

//controls unlock
let canMove = false;

document.addEventListener('click', () => {
  controls.lock();
});

controls.addEventListener('lock', () => { /* pointer locked */ });
controls.addEventListener('unlock', () => { /* pointer unlocked */ });

//Player Settings

const playerPos = controls.getObject()
const playerHeight = 2.1;
const playerHalfWidth = 0.5;

const velocity = new THREE.Vector3();

const speed = 0.3;
const gravity = 0.05;

//Player Start Position and Camera
camera.position.set(0,2,15);
playerPos.rotation.y = Math.PI / -2;

//Time
const clock = new THREE.Clock();
let busDelayTimer = 0;
let timerTransition = 0;
let busDelay;

//Vehicle Info
let busWaiting = false;
let busRidingToSchool = false
var carSpeed = 150;
var busSpeed = 120;
let transitionBus;
let didRodeToSchool = false;

//Story
let cutScene1Finnished = false;
let onBus = false;

//Interaction global
const interactionE = document.getElementById("interaction");
//Transition global
const transBG = document.getElementById("Transition");

// RENDER LOOP
function animate() {
    //DEBUG ONLY ----------------------------------------------------------------------- DELETE
    colliderVisuals.children.forEach(mesh => {
        const name = mesh.name.replace('collider_vis_', '');
        const box = colliders[name];
        if (box) {
            const center = new THREE.Vector3();
            const size = new THREE.Vector3();
            box.getCenter(center);
            box.getSize(size);
            mesh.position.copy(center);
            mesh.scale.set(
                size.x / mesh.geometry.parameters.width,
                size.y / mesh.geometry.parameters.height,
                size.z / mesh.geometry.parameters.depth
            );
        }
    });
    //DEBUG ONLY ----------------------------------------------------------------------- DELETE

    detectLookedCollider();
    requestAnimationFrame(animate);

    const delta = clock.getDelta(); // Time since last frame

    const moveSpeed = speed * (delta * 60);
    const gravityForce = gravity * (delta * 60);

    //Player Standing on
    const groundHit = getObjectBelowPlayer();

    // --- Namesti Prace START ---
    if (locationNP){
        if(!createdNP){
            controls.lock();
            createSnow();
            createNP();
            createdNP = true; 
        }
        // Snowing
        if (snowing){
            snowField.children.forEach((snow) => {
                snow.position.y -= 0.1; // snow falling
                if (snow.position.y < camera.position.y - 10) { 
                    snow.position.y = camera.position.y + 50;
                    snow.position.x = camera.position.x + (Math.random() - 0.5) * 250;
                    snow.position.z = camera.position.z + (Math.random() - 0.5) * 250;
                }
            });
        }

        // Update Bus Coliders
        if (myBus && myBusFloor) {
        const busPos = myBus.position.clone();
        
        //Bus floor
        const myBusFloorsizeX = 55, myBusFloorsizeY = 1, myBusFloorsizeZ = 135;
        myBusFloor.min.set(busPos.x - myBusFloorsizeX / 2, busPos.y + 15 - myBusFloorsizeY, -10+ busPos.z - myBusFloorsizeZ / 2);
        myBusFloor.max.set(busPos.x + myBusFloorsizeX / 2, busPos.y + 15, -10+ busPos.z + myBusFloorsizeZ / 2);
        }

        // Vehicle movement

        if (myBus) {
            if (!busWaiting){
                busDelay = 5;
                
                busDelayTimer += delta;

                if (busDelayTimer > busDelay) {
                    
                    myBus.position.z += busSpeed * delta;

                    //bus stopping
                    if (myBus.position.z >= -110) {
                        busSpeed -= 80 * delta;
                        if (myBus.position.z >= -25){
                            busWaiting = true;
                            busDelayTimer = 0;
                        }
                    }
                }
            }
            //bus seting off
            if (busRidingToSchool){
                busDelay = 2;
                busDelayTimer += delta;
                if (busDelayTimer > busDelay){
                    myBus.position.z += busSpeed * delta
                    if(busSpeed < 100){
                        busSpeed += 40 * delta;
                    }
                    if (busSpeed >= 100){
                        transitionBus = true;
                    }
                }
            }
        }

        // Car movement
        if (myCarRed) {
            myCarRed.position.z += carSpeed * delta;
            if (myCarRed.position.z > 300) {
                myCarRed.position.z -= 600;
                let carPos = [140, 175];
                const index = Math.floor(Math.random() *2);
                myCarRed.position.x = carPos[index];
            }
        }

        // MOVE WITH THE BUS
        if (groundHit === "busFloor" && myBus && myBus.previousPosition) {
            if (!didRodeToSchool){didRodeToSchool = true; busRidingToSchool = true;}
            const busDelta = myBus.position.clone().sub(myBus.previousPosition);
            controls.getObject().position.add(busDelta);
        }

        if (myBus) {
            myBus.previousPosition = myBus.position.clone();
        }
        //INTERACTION
        interactionE.style.zIndex = -10;

        // TRANSITION
        transBG.style.width = '100%';
        transBG.style.height = '100%';
        transBG.style.position = "absolute";
        transBG.style.zIndex = 999;
        if (transitionBus){
            // Transition1
            if(timerTransition < 3){
                timerTransition += delta;
                transBG.style.background = 'rgba(0,0,0,'+timerTransition /3+')';
            } else{
                // NP Scene cleaning
                cleanModels();

                scene.remove(snowField);
                snowField.traverse(object => {
                    if (object.isMesh) {
                        object.geometry.dispose();
                        object.material.dispose();
                    }
                });

                snowField.clear();
                
                colliders.length = 0;

                // nulling variables
                myCarRed = null;
                myBus = null;
                myBusFloor = null;

                locationNP = false;
                busRidingToSchool = false;

                transitionBus = false;

                locationCHC = true;
            }
        }
    }
// --- Namesti Prace END ---
// --- CHC Start ---
    if(locationCHC){
        if(!createdCHC){
            createCHC();
            timerTransition = 3;
            // player tp pos
            controls.getObject().position.set(0, 2, 10);
            controls.getObject().rotation.y = Math.PI / -2;
            controls.getObject().rotation.z = 0;
            controls.getObject().rotation.x = 0;
            canMove = true;
            createdCHC = true;
        }
        // Transition2
        if(!transitionBus){
            if(timerTransition > 0){
                timerTransition -= delta;
                transBG.style.background = 'rgba(0,0,0,'+timerTransition /3+')';
            } else{
                transitionBus = true;
                transBG.style.background = 'rgba(0,0,0,0)';
            }
        }
        // DOORS CONTROLERS
        switch (lookedCollider){
            case "collider_vis_MainCHCDoor":
                interactionE.style.zIndex = 99;
                if(KeyPressed == "KeyE"){
                    if(!inMainCHCDoor){
                        inMainCHCDoor = true;
                        interactionE.style.zIndex = -99;
                        controls.getObject().position.x += 20;
                    } else{
                        inMainCHCDoor = false;
                        interactionE.style.zIndex = -99;
                        controls.getObject().position.x -= 20;
                    }
                }
                break;
            default:
                interactionE.style.zIndex = -99;
                break;
        }
    }
// --- CHC End ---

    // MOVEMENT 
    if(canMove){
        velocity.x = 0;
        velocity.z = 0;
        if (move.forward) velocity.z += moveSpeed;
        if (move.backward) velocity.z -= moveSpeed;
        if (move.left) velocity.x -= moveSpeed;
        if (move.right) velocity.x += moveSpeed;
    }

    // COLISION CHECK xz
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0; forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const playerCurrentPos = controls.getObject().position.clone();
    const newPos = playerCurrentPos.clone();
    newPos.add(forward.clone().multiplyScalar(velocity.z));
    newPos.add(right.clone().multiplyScalar(velocity.x));

    // Horizontal collision check
    const hit = colliders.some(box => box.containsPoint(newPos));

    //MOVE
    if (!hit) {
        controls.moveForward(velocity.z);
        controls.moveRight(velocity.x);
    }

    // Player Colide Box
    const playerBox = new THREE.Box3(
        new THREE.Vector3(playerCurrentPos.x - playerHalfWidth, playerCurrentPos.y - playerHeight*10, playerCurrentPos.z - playerHalfWidth),
        new THREE.Vector3(playerCurrentPos.x + playerHalfWidth, playerCurrentPos.y, playerCurrentPos.z + playerHalfWidth)
    );
    
    // Ground Check y
    const onGround = colliders.some(box => box.intersectsBox(playerBox));

    // GRAVITY
    if (!onGround) {
        velocity.y -= gravityForce;

        const nextPos = playerCurrentPos.clone();
        nextPos.y += velocity.y;

        const fallBox = new THREE.Box3(
            new THREE.Vector3(nextPos.x - playerHalfWidth, nextPos.y - playerHeight, nextPos.z - playerHalfWidth),
            new THREE.Vector3(nextPos.x + playerHalfWidth, nextPos.y, nextPos.z + playerHalfWidth)
        );

        // Ground Check y 2
        const hitGround = colliders.find(box => box.intersectsBox(fallBox));

        if (hitGround) {
            controls.getObject().position.y = hitGround.max.y + playerHeight; 
            velocity.y = 0;
        } else {
            controls.getObject().position.y += velocity.y;
        }
    } else {
        velocity.y = 0; // VELOCITY.y RESET
    }

    //STORY
    //np
    if(locationNP){
        if(onBus){
            controls.lock();
        }
        // Cut Scene 1
        else if(busWaiting){
            // Walking to bus
            if(controls.getObject().position.x < 55){
                controls.getObject().position.x += delta *15;
            } else{
                // Waiting for bus door interaction
                interactionE.style.zIndex = 99;
                if(KeyPressed == "KeyE"){
                    interactionE.style.zIndex = -99;
                    controls.getObject().position.x += 20;
                    onBus = true;
                }
            }
        } else{
            // Looking for a bus
            if(myBus.position.z >= -400 && myBus.position.z <= 0){
                if(myBus.position.z <= -200){
                    controls.getObject().rotation.y += delta /4;
                } else{
                    controls.getObject().rotation.y -= delta /4;
                }
            }
        }    
    }

    renderer.render(scene, camera);
}
animate();

//Random word game 
//const parWords = ['jakoby', 'vlastně', 'prostě', 'jako', 'prostě', 'právě', 'uhm'];
//var index = Math.floor(Math.random() *7);
//console.log(parWords[index]);