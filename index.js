import * as THREE from 'https://esm.sh/three@0.161.0';
import { GLTFLoader } from 'https://esm.sh/three@0.161.0/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from 'https://esm.sh/three@0.161.0/examples/jsm/controls/PointerLockControls.js';

// DEBUG MODE (console) --> ctrl + h ---> Find: "//DEBUG//" ---> Replace: " " ---> Replace All

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// LOCATION ON MAP
let locationNP = false;
let locationCHC = true;

// Settings
let barriersOn = true; //true //DEBUG false

//Story Parts
let CHCpart1 = false;
let CHCpart2 = false;
let CHCpart3 = false;
let CHCpart4 = false;
let CHCpart5 = true;
let CHCpartEND = false;

// newQuest
let newQuest = false

// LOCATION CREATING
let createdCHC = false;
let createdNP = false;

// OBJs
let myCarRed = null;
let myBus = null;

// COLs
let myBusFloor = null;
let MainCHCDoor = null;
let GamaDoor = null;
let LockerInteract = null;
let BarrierPart1 = null;
let ChairColliderPlayer = null;
let DeltaDoor = null;
let VendingMachineGame = null;
let EpsilonDoor = null;

//Doors
let inMainCHCDoor = false;
let inGamaDoor = false;
let inDeltaDoor = false;
let inEpsilonDoor = false;

//interactables
let onChairGama = false;

//People
let addedTeacherGama = false

//GUI
let LockerOpened = false;

// LIGHTS
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(0, 50, 0);
scene.add(sun);

// HTML imports
const lockerUI = document.querySelector('.locker');
const container = document.querySelector('.locker-container');
const slot = document.getElementById('slot');
const bootsImg = document.getElementById('boots');

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

// TEXT TO HTML
// quests_text creator
function quests_text(text){
    const el = document.getElementById("quests_text");
    if (!el) return;
    if (el && el.textContent !== "To do: "+text) el.textContent = "To do: "+text;
}

// alert_text creator
let alertCooldown = false;
function alert_text(text, timeLenght = 2000) {
    if (alertCooldown) return; /// cooldown
    alertCooldown = true;

    const el = document.getElementById("alert");
    if (!el) return;

    // Show text
    el.textContent = text;
    el.style.opacity = "1";

    setTimeout(() => {
        el.style.opacity = "0";
    }, timeLenght -250);

    setTimeout(() => {
        alertCooldown = false;
    }, timeLenght);
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

//Create people
const people = [];
function addImage(name, texturePath, x, y, z, width = 10, height = 20) {
    const map = new THREE.TextureLoader().load(texturePath);
    
    const material = new THREE.MeshBasicMaterial({ 
        map: map,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: true
    });
    
    const geometry = new THREE.PlaneGeometry(width, height);
    const mesh = new THREE.Mesh(geometry, material);

    mesh.renderOrder = 2;
    mesh.position.set(x, y + height / 2, z);
    mesh.name = `person_${name}`; 
    
    scene.add(mesh);
    people.push(mesh); 
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
            //DEBUG//console.log(`Model: ${name} loaded!`); 

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
const stairs = [];
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
    //DEBUG//console.log(`Collider: ${name} loaded!`); 

    const geometry = new THREE.BoxGeometry(sizeX, sizeY, sizeZ);
    const material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        wireframe: false, // false   // DEBUG true
        transparent: true,
        opacity: 0, // 0    // DEBUG 0.5
        depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.renderOrder = 1;
    mesh.name = `collider_${name}`;
    //DEBUG//console.log(`Mesh: ${name} loaded!`); 
    colliderVisuals.add(mesh);

    //COL DEFINICIONS
    if (name === "busFloor") myBusFloor = box;
    if (name === "MainCHCDoor") MainCHCDoor = box;
    if (name === "GamaDoor") GamaDoor = box;
    if (name === "LockerInteract") LockerInteract = box;
    if (name === "BarrierPart1") BarrierPart1 = box;
    if (name === "ChairColliderPlayer") ChairColliderPlayer = box;
    if (name === "DeltaDoor") DeltaDoor = box;
    if (name === "VendingMachineGame") VendingMachineGame = box;
    if (name === "EpsilonDoor") EpsilonDoor = box;
}

// NEW: Function specifically for stairs
function addStairs(name, x, y, z, sizeX, sizeY, sizeZ, heightGain, axis = "x+") {
    const stairData = {
        name: name,
        box: new THREE.Box3(
            new THREE.Vector3(x - sizeX / 2, y - sizeY / 2, z - sizeZ / 2),
            new THREE.Vector3(x + sizeX / 2, y + sizeY / 2, z + sizeZ / 2)
        ),
        heightGain: heightGain,
        startY: y - sizeY / 2,
        endY: y + sizeY / 2,
        axis: axis
    };
    
    stairs.push(stairData);

    const geometry = new THREE.BoxGeometry(sizeX, sizeY, sizeZ);
    const material = new THREE.MeshBasicMaterial({
        color: 0xff00ff,
        wireframe: false, // false  // DEBUG true
        transparent: true,   
        opacity: 0, // 0    // DEBUG 0.3
        depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.renderOrder = 1;
    mesh.name = `stair_${name}`;
    colliderVisuals.add(mesh);
    
}

// change the collider color
function changeColliderColor(colliderName, newOpacity) {
    const visualMeshName = `collider_${colliderName}`;

    const mesh = colliderVisuals.getObjectByName(visualMeshName);
    
    if (mesh && mesh.material) {
        mesh.material.color.setHex(0x00FFD3)
        mesh.material.opacity = newOpacity
    }
}

function createNP(){
    // FOG
    scene.fog = new THREE.Fog("rgb(97, 97, 97)", 20, 300); 

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
    // FOG
    scene.fog = null; 

    //CHC Progress Barriers
    if(barriersOn){
        addCollider("BarrierPart1", 100, 0, 0, 2, 30, 60);
    }
    
    //CHC Colliders

    addCollider("BigSchoolWall", 65, 60, 70, 2, 80, 240);

    //BOTTOM Floor
        //outside
    addCollider("OutOfSchoolFloor", 50, -18 , -20, 160, 1, 140);
    addCollider("GreyBrickWall", 56, 0, 18, 20, 30, 5);
    addCollider("GreyBrickWallSmall", 63, 0, 17, 5, 30, 5);
    addCollider("SmallPillar", 63, 0, 22, 2, 30, 5);
    addCollider("Pillar1", 62, 0, -18.5, 5, 30, 6);
    addCollider("KitchenWallPillar", 17.4, 0, 38, 8.8, 30, 3);
        //doors
    addCollider("MainCHCDoor", 65, 0, -0.5, 2, 30, 30.5);
        //walls
    addCollider("KitchenWall", 10, 0, 39.5, 110, 30, 2);
    addCollider("UnderStairs", 92, 0, -18, 58, 30, 5);
    addCollider("StairsWall", 96, 65, -18, 36, 150, 5);
    addCollider("WallNextToDoorRight", 65, 0, 31, 2, 30, 35);
    addCollider("WallNextToDoorLeft", 65, 0, -31, 2, 30, 30);
    addCollider("DownStairsWall", 123, -13, 28, 55, 50, 25);
    addCollider("DownStairsPillarM", 81.8, -13, 40, 2.4, 50, 2);
    addCollider("DownStairsPillarL", 96, -13, 40, 2.4, 50, 2);
    addCollider("DownStairsPillarR", 67, -13, 40, 3, 50, 2);
    addCollider("WallLockers1", 65, -13, 117, 3, 50, 105.5);
    addCollider("WallLockers2", 100, -13, 170, 100, 50, 3);
        //floors
    addCollider("smallStairFloor1", 135, -12, 0, 28, 1, 32);
    addCollider("smallStairFloor2", 135, -10, -30, 28, 1, 32);
    addCollider("smallStairFloor3", 80, -13, 30, 32, 1, 20);
    addCollider("FloorLockers", 105, -13, 105, 85, 1, 135);
    addCollider("midFloor1", 70, 20, -20, 28, 1, 50);
        //furniture
    addCollider("ColidersLockers", 145, -13, 105, 15, 50, 135);
        //interactables
    addCollider("LockerInteract", 144.5 , 5, 86, 15, 15, 5);
    addCollider("VendingMachineGame", 120 , 5, 45, 15, 15, 5);
        //stairColliders
    addStairs("smallEntranceStairs1", 120, 2, 0, 8, 6, 32, 8, "x+");
    addStairs("smallEntranceStairs2", 135, 6, -15, 25, 6, 4, 4, "z-");
    addStairs("smallEntranceStairs3", 82, 2, 20, 35, 5, 4, 4, "z+");
    addStairs("EntranceStairs1", 100, 21, -30, 50, 30, 20, 33, "x-");
    addStairs("EntranceStairs2", 100, 45, -7, 50, 22, 20, 33, "x+");

    //SECOND Floor
        //floors
    addCollider("midFloor2", 126, 40, -5, 40, 1, 20);
    addCollider("midFloor3", 130, 40, -30, 35, 1, 32);
    addCollider("midFloor4", 67, 60, -20, 28, 1, 50);
    addCollider("hallfloor", 165, 40, 180, 200, 1, 350);
        //walls
    addCollider("wallLongHallRight", 125, 40, 179, 1, 60, 350);
    addCollider("wallLongHallLeft", 146, 40, 203, 1, 60, 350);
    addCollider("wallLongHallEnd", 105, 40, 339, 100, 60, 1);
    addCollider("wallStairs", 146, 40, -20, 1, 60, 50);
    addCollider("gamaWall1", 102.5, 40, 272, 45, 65, 1);
    addCollider("gamaWall2", 81.5, 40, 280, 1, 60, 100);
        //doors
    addCollider("GamaDoor", 125, 50, 279, 2, 20, 9)
    addCollider("DeltaDoor", 125, 50, 166, 2, 20, 10.5)
    addCollider("EpsilonDoor", 125, 50, 47.5, 2, 20, 11)
        //door tags
    addImage("DeltaDoorTag", './imgs/DeltaSign.png', 126, 50, 166, 3, 3, 3)
    addImage("GamaDoorTag", './imgs/GamaSign.png', 126, 50, 279, 3, 3, 3)
    addImage("EpsilonDoorTag", './imgs/GamaSign.png', 125, 50, 47.5, 3, 3, 3)
        //furniture
    addCollider("TableCollider",115.8, 50, 291.5, 17.5,15,7);
    addCollider("TableWithChairCollider",89.8, 50, 295, 17.5,15,14);
    addCollider("TableWithChairCollider2",115.8, 50, 308, 17.5,15,14);
    addCollider("TableWithChairCollider3",89.8, 50, 308, 17.5,15,14);
    addCollider("TableWithChairCollider4",115.8, 50, 321, 17.5,15,14);
    addCollider("TableWithChairCollider5",89.8, 50, 321, 17.5,15,14);
    addCollider("TableWithChairCollider6",115.8, 50, 334, 17.5,15,14);
    addCollider("TableWithChairCollider7",89.8, 50, 334, 17.5,15,14);
        //people STILL
    addImage("gamePerson1", "./imgs/Person.png", 85.8, 40, 297, 10,15,10)
    addImage("gamePerson1", "./imgs/Person.png", 93.8, 40, 297, 10,15,10)
    addImage("gamePerson1", "./imgs/Person.png", 85.8, 40, 310, 10,15,10)
    addImage("gamePerson1", "./imgs/Person.png", 93.8, 40, 310, 10,15,10)
    addImage("gamePerson1", "./imgs/Person.png", 85.8, 40, 323, 10,15,10)
    addImage("gamePerson1", "./imgs/Person.png", 85.8, 40, 336, 10,15,10)
    addImage("gamePerson1", "./imgs/Person.png", 93.8, 40, 336, 10,15,10)
    addImage("gamePerson1", "./imgs/Person.png", 111.8, 40, 310, 10,15,10)
    addImage("gamePerson1", "./imgs/Person.png", 119.8, 40, 310, 10,15,10)
    addImage("gamePerson1", "./imgs/Person.png", 111.8, 40, 323, 10,15,10)
    addImage("gamePerson1", "./imgs/Person.png", 119.8, 40, 323, 10,15,10)
    addImage("gamePerson1", "./imgs/Person.png", 111.8, 40, 336, 10,15,10)
    addImage("gamePerson1", "./imgs/Person.png", 119.8, 40, 336, 10,15,10)
        //interactables
    addCollider("ChairColliderPlayer",119.5, 50, 298, 5,15,7);
    addCollider("presentinGameInteraciton",100, 50, 155, 2, 22, 2)
    addCollider('EpsilonChair',110, 50, 47.5, 2,2,2)
        //stairColliders
    addStairs("SecondFloorStairs1", 95, 65, -30, 40, 22, 20, 22, "x-");
    addStairs("SecondFloorStairs2", 100, 82, -7, 50, 15, 20, 22, "x+");

    //THIRD Floor
        //floors
    addCollider("midFloor2", 126, 72, -5, 40, 1, 20);
    addCollider("midFloor3", 130, 72, -30, 35, 1, 32);


    //CHC Model
        //school
    loadModel("schoolCHC", "./models/schoolCHC.glb", [100, -20, 0], [3, 3, 3]);
        //furniture
    loadModel("TableWithChair", "./models/schoolChairAndTable.glb", [119.5, 39.8, 298], [2.3,2.3,2.3], [0, Math.PI, 0]);
    loadModel("TableWithChair", "./models/schoolChairAndTable.glb", [93.5, 39.8, 298], [2.3,2.3,2.3], [0, Math.PI, 0]);
    loadModel("TableWithChair", "./models/schoolChairAndTable.glb", [119.5, 39.8, 311], [2.3,2.3,2.3], [0, Math.PI, 0]);
    loadModel("TableWithChair", "./models/schoolChairAndTable.glb", [93.5, 39.8, 311], [2.3,2.3,2.3], [0, Math.PI, 0]);
    loadModel("TableWithChair", "./models/schoolChairAndTable.glb", [119.5, 39.8, 324], [2.3,2.3,2.3], [0, Math.PI, 0]);
    loadModel("TableWithChair", "./models/schoolChairAndTable.glb", [93.5, 39.8, 324], [2.3,2.3,2.3], [0, Math.PI, 0]);
    loadModel("TableWithChair", "./models/schoolChairAndTable.glb", [119.5, 39.8, 337], [2.3,2.3,2.3], [0, Math.PI, 0]);
    loadModel("TableWithChair", "./models/schoolChairAndTable.glb", [93.5, 39.8, 337], [2.3,2.3,2.3], [0, Math.PI, 0]);
        //lockers
    loadModel("Locker", "./models/LockerBlue.glb", [141, 0, 50], [3,2.5,3], [0, Math.PI / 2, 0]);
    loadModel("Locker", "./models/LockerBlue.glb", [141, 0, 56], [3,2.5,3], [0, Math.PI / 2, 0]);
    loadModel("Locker", "./models/LockerBlue.glb", [141, 0, 62], [3,2.5,3], [0, Math.PI / 2, 0]);
    loadModel("Locker", "./models/LockerGray.glb", [141, 0, 68], [3,2.5,3], [0, Math.PI / 2, 0]);
    loadModel("Locker", "./models/LockerGray.glb", [141, 0, 74], [3,2.5,3], [0, Math.PI / 2, 0]);
    loadModel("playerLocker", "./models/LockerInside.glb", [141, 0, 80], [3,2.5,3], [0, Math.PI / 2, 0]); //PlayerLocker
    loadModel("playerLockerDoor", "./models/LockerDoor.glb", [141, 0, 80], [3,2.5,3], [0, Math.PI / 2, 0]); //PlayerLocker Door
    loadModel("Locker", "./models/LockerBlue.glb", [141, 0, 86], [3,2.5,3], [0, Math.PI / 2, 0]);
    loadModel("Locker", "./models/LockerBlue.glb", [141, 0, 92], [3,2.5,3], [0, Math.PI / 2, 0]);
    loadModel("Locker", "./models/LockerBlue.glb", [141, 0, 98], [3,2.5,3], [0, Math.PI / 2, 0]);
    loadModel("Locker", "./models/LockerGray.glb", [141, 0, 128], [3,2.5,3], [0, Math.PI / 2, 0]);
    loadModel("Locker", "./models/LockerGray.glb", [141, 0, 134], [3,2.5,3], [0, Math.PI / 2, 0]);
    loadModel("Locker", "./models/LockerGray.glb", [141, 0, 140], [3,2.5,3], [0, Math.PI / 2, 0]);
    loadModel("Locker", "./models/LockerBlue.glb", [141, 0, 146], [3,2.5,3], [0, Math.PI / 2, 0]);
    loadModel("Locker", "./models/LockerBlue.glb", [141, 0, 152], [3,2.5,3], [0, Math.PI / 2, 0]);
    loadModel("Locker", "./models/LockerBlue.glb", [141, 0, 158], [3,2.5,3], [0, Math.PI / 2, 0]);
        //benches
    loadModel("Bench", "./models/lockerBench.glb", [141, -14.5, 113], [3.75, 3, 3], [0, Math.PI / 2, 0]);
    
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

// Check if player on stairs
function getStairsAtPosition(position) {
    for (let stair of stairs) {
        if (stair.box.containsPoint(position)) {
            return stair;
        }
    }
    return null;
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
let cutsceneActive = false;

document.addEventListener('click', () => {
    if (!cutsceneActive) {
        controls.lock();
    }
});

controls.addEventListener('lock', () => {});
controls.addEventListener('unlock', () => {});

//Player Settings

const playerPos = controls.getObject()
const playerHeight = 2.1;
const playerHalfWidth = 1.05;

const velocity = new THREE.Vector3();

const speed = 0.3;
const gravity = 0.05;

//Player Start Position and Camera
camera.position.set(0,2.1,15);
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
let item1Snapped = false;

//Interaction global
const interactionE = document.getElementById("interaction");
//Transition global
const transBG = document.getElementById("Transition");

// TAHOOT GAME
// tahoot game variables
let satDownEpsilon = false;
let tahootStarted = false;
let playedTahoot = false
const tahootQuestionsAndAnswers = 
[
{'Question' : '5 % 3 = ?', 'A' : '2', 'B' : '5', 'C' : 'null', 'D' : '3', 'Answer' : '2'},
{'Question' : 'What is smaller? Boolean or Byte? (in java)', 'A' : 'Boolean', 'B' : 'Byte', 'C' : 'Same size', 'D' : 'Neither', 'Answer' : 'Neither'},
{'Question' : '2 + (24 + 52 - 357/6) * 0 + 4 = ?', 'A' : '154', 'B' : '0','C' : '6', 'D' : '-154', 'Answer' : '6'},
{'Question' : 'Capital city of France?', 'A' : 'Louvre', 'B' : 'Paris', 'C' : 'Prague', 'D' : 'London', 'Answer' : 'Paris'},
{'Question' : 'What is gold?', 'A' : 'Al', 'B' : 'Zn', 'C' : 'Au', 'D' : 'Pb', 'Answer' : 'Au'},
{'Question' : 'Sun is the biggest star.', 'A' : 'True', 'B' : 'False', 'Answer' : 'False'}
]
const tahootUI = document.getElementById('tahoot-ui')
const tahootLogo = document.getElementById('tahoot-logo')
const tahootInputDisplay = document.getElementById('tahoot-input-display')
const tahootOutputText = document.getElementById('tahoot-output-text')
const tahootInput = document.getElementById('tahoot-input')
const tahootInputSubmit = document.getElementById('tahoot-input-submit')
const tahootGameDisplay = document.getElementById('tahoot-game-display')
const tahootQuestion = document.getElementById('tahoot-question')
const tahootAnswers = document.getElementById('tahoot-answers')
const tahootScoreText = document.getElementById('tahoot-score')
const tahootStreakText = document.getElementById('tahoot-streak')
let tahootPin = 123456;
let tahootAnsweredQuestions = []
let tahootRoundNumber = 0
const tahootRoundNumberGoal = 6;
let tahootQuestionIndex = 0
let tahootPointScore = 0
let tahootStreak = 0
let tahootScoreRAW = 0

function tahootPointCalc(addPoint){
    if(addPoint){
        tahootPointScore += 1000 * (1 + tahootStreak/10)
        tahootStreak += 1
        tahootScoreRAW +=1
        tahootScoreText.textContent = "Score: "+tahootPointScore
        tahootStreakText.textContent = "Streak: "+tahootStreak
    }else{
        tahootStreak = 0
        tahootStreakText.textContent = "Streak: "+tahootStreak
    }
    if(tahootRoundNumber >= tahootRoundNumberGoal) return showStatistics()
    createTahootQuestion()
}

function showStatistics(){
    tahootGameDisplay.style.display = 'none'
    tahootInputDisplay.style.display = 'flex'
    tahootInput.style.display = 'none'
    tahootLogo.textContent = 'Score: ' +tahootPointScore
    tahootOutputText.textContent = 'Correct: '+tahootScoreRAW+ '/' +tahootRoundNumberGoal
    tahootInputSubmit.textContent = 'Leave'
}

function endTahootGame(){
    tahootUI.style.display = 'none'
    tahootStarted = false
    canMove = true
    cutsceneActive = false
    controls.lock()
    CHCpart5 = false
    CHCpartEND = true
}

function startTahootGame(){
    canMove = false
    velocity.x = 0
    velocity.y = 0
    cutsceneActive = true;
    controls.unlock()
    tahootUI.style.display = 'flex';
    playedTahoot = true;
}

function createTahootQuestion(){
    while (tahootAnswers.firstChild) {
        tahootAnswers.removeChild(tahootAnswers.firstChild);
    }
    tahootQuestionIndex = Math.floor(Math.random() * tahootQuestionsAndAnswers.length);

    while (tahootAnsweredQuestions.includes(tahootQuestionIndex)) {
        tahootQuestionIndex = Math.floor(Math.random() * tahootQuestionsAndAnswers.length);
    }

    tahootQuestion.textContent = tahootQuestionsAndAnswers[tahootQuestionIndex].Question

    tahootRoundNumber += 1
    tahootAnsweredQuestions.push(tahootQuestionIndex)

    console.log(tahootQuestionIndex)
    if(Object.keys(tahootQuestionsAndAnswers[tahootQuestionIndex]).length > 4){
        for(let i = 0; i<4;i++){
            let question = document.createElement('button')
            question.classList.add('tahoot-answer')
            let tahootAnswerIndex = Object.keys(tahootQuestionsAndAnswers[tahootQuestionIndex])[i+1]
            question.textContent = tahootQuestionsAndAnswers[tahootQuestionIndex][tahootAnswerIndex]
            question.addEventListener('click', handleTahootQuestionClick);
            tahootAnswers.appendChild(question)
        }
    }else{
        for(let i = 0; i<2;i++){
            let question = document.createElement('button')
            question.classList.add('tahoot-answer')
            let tahootAnswerIndex = Object.keys(tahootQuestionsAndAnswers[tahootQuestionIndex])[i+1]
            question.textContent = tahootQuestionsAndAnswers[tahootQuestionIndex][tahootAnswerIndex]
            question.addEventListener('click', handleTahootQuestionClick);
            tahootAnswers.appendChild(question)
        }
    }
}

function startTahootQuiz(){
    createTahootQuestion()
}

function handleTahootQuestionClick(event){
    //console.log(event.target.textContent)
    if(event.target.textContent == tahootQuestionsAndAnswers[tahootQuestionIndex].Answer){
        tahootPointCalc(true)
    }else{
        tahootPointCalc(false)
    }
}

function handleTahootButtonClick(){
    if(tahootInputSubmit.textContent == 'Leave') return endTahootGame()
    if(tahootInput.value == tahootPin){
        tahootInputDisplay.style.display = 'none'
        tahootGameDisplay.style.display = 'flex'
        startTahootQuiz()
    }else{
        tahootOutputText.textContent = "Wrong pin!"
    }
}

tahootInputSubmit.addEventListener('click', handleTahootButtonClick);

// VENDING MACHINE GAME
// vending game variables
let vendingGameStarted = false
let venRound = 0
const venRoundGoal = 7;
const venUI = document.getElementById('vending-ui')
const venButtonGrid = document.getElementById('vending-container')
const venScore = document.getElementById('vending-score')
const venFeedback = document.getElementById('vending-message')
const venSubmitButton = document.getElementById('vending-submit-button')
let listOfVenLights = []
let playedVendingGame = false
let venCanSubmit = false
let venCanClick = false

function handleVendingButtonClick(event){
    if(!venCanClick){
        setTimeout(() => {
            venFeedback.textContent = "Watch the pattern!"
        }, 1000)
        return venFeedback.textContent = "Can´t click right now!"
    } 

    let venCurrentClickedButton = event.target
    //console.log(event.target)
    if(venCurrentClickedButton.classList.contains('lit')){
        venCurrentClickedButton.classList.remove('lit')
    }else{
        venCurrentClickedButton.classList.add('lit')
    }
}

// onclick submit button
function venSubmit(){
    if(!venCanSubmit){
        setTimeout(() => {
            venFeedback.textContent = "Watch the pattern!"
        }, 1000)
        return venFeedback.textContent = "Can´t submit right now!"
    } 
    venCanClick = false;
    venCanSubmit = false;
    if (checkVendingPatternMatch()) { 
        venFeedback.textContent = "Great!"
        setTimeout(() => {
            venFeedback.textContent = "Watch the pattern!"
            venRoundCreate();
        }, 1000)
    } else {
        endVendingGame(false);
    }
}

// onclick  submit button link
if (venSubmitButton) {
    venSubmitButton.addEventListener('click', venSubmit);
}

//Checks and returns if the patter  is right
function checkVendingPatternMatch(){
    for(let i = 0; i <20; i++){
        if(venButtonGrid.querySelector(`[data-index="${i}"]`).classList.contains('lit')){
            if(!listOfVenLights.includes(i)){
                return false
            }
        }else{
            if(listOfVenLights.includes(i)){
                return false
            }
        }
    }
    for(let i = 0; i < 20; i++){
        let venButton = venButtonGrid.querySelector(`[data-index="${i}"]`)
        if(venButton.classList.contains('lit')) {
            venButton.classList.remove('lit')
            venButton.classList.add('correct')
        }
    }
    //console.log(listOfVenLights)
    listOfVenLights = []
    return true
}

// ends vending game
function endVendingGame(succes){
    listOfVenLights = []
    venCanSubmit = false
    if(succes){
        venFeedback.textContent = "Right!"
        setTimeout(() =>{
            //console.log("Win")
            canMove = true
            cutsceneActive = false
            controls.lock()
            venUI.style.display = 'none'
            vendingGameStarted = false
            alert_text("Finally, I can take my drink.")
            CHCpart2 = false
            CHCpart3 = true;
        },1500)
    }else{
        for(let i = 0; i < 20; i++){
            let venButton = venButtonGrid.querySelector(`[data-index="${i}"]`)
            if(venButton.classList.contains('lit')) {
                venButton.classList.remove('lit')
                venButton.classList.add('incorrect')
            }
        }
        venFeedback.textContent = "Wrong!"
        setTimeout(() =>{
            canMove = true
            cutsceneActive = false
            controls.lock()
            playedVendingGame = false
            //console.log("Loss")
            venUI.style.display = 'none'
            while (venButtonGrid.firstChild) {
                venButtonGrid.removeChild(venButtonGrid.firstChild);
            }
            venRound = 0
            vendingGameStarted = false
            venFeedback.textContent = "Watch the pattern!"
            alert_text("My card declined again...")
        },1500)
    }
}

//creaters new round and clears the last
function venRoundCreate(){
    if(venRound >= 7) return endVendingGame(true);

    // clears land buttons
    for(let i = 0; i < 20; i++){
        let venButton = venButtonGrid.querySelector(`[data-index="${i}"]`)
        //console.log(venButton)
        venButton.classList.remove('lit')
        venButton.classList.remove('correct')
    }
    //updates round
    venRound +=1
    venScore.textContent = 'Round: ' +venRound+"/" + venRoundGoal;
    const countToGenerate = Math.round(venRound * 1.5);

    //creates new button - check for repeating ones
    for(let i = 0; i < countToGenerate; i++){
        let venTargetIndex;

        do {
            venTargetIndex = Math.floor(Math.random() * 20);
        } while (listOfVenLights.includes(venTargetIndex));

        listOfVenLights.push(venTargetIndex);
        
        let venButton = venButtonGrid.querySelector(`[data-index="${venTargetIndex}"]`);
        if (venButton) {
            venButton.classList.add('lit');
        }
    }
    //removes online buttons - flicker animation
    setTimeout(() =>{
        for(let i = 0; i < 20; i++){
            let venButton = venButtonGrid.querySelector(`[data-index="${i}"]`)
            venButton.classList.remove('lit')
        }
        setTimeout(() =>{
            for(let i = 0; i < 20; i++){
                if(listOfVenLights.includes(i)) {
                    let venButton = venButtonGrid.querySelector(`[data-index="${i}"]`)
                    venButton.classList.add('lit')
                }
            }
            setTimeout(() =>{
                for(let i = 0; i < 20; i++){
                    if(listOfVenLights.includes(i)) {
                        let venButton = venButtonGrid.querySelector(`[data-index="${i}"]`)
                        venButton.classList.remove('lit')
                    }
                }
                venCanClick = true;
                venCanSubmit = true;
            }, 350)
        }, 350)
    }, 1500)
    //console.log(venButton)
}

//creates  vending buttons on start of the game
function createVendingButtons(){
    for(let i = 0; i < 20; i++){
        let vendingButton = document.createElement('button')
        vendingButton.classList.add('vending-button')
        vendingButton.dataset.index = i;
        vendingButton.addEventListener('click', handleVendingButtonClick);
        venButtonGrid.appendChild(vendingButton)
    }
    venUI.style.display = "flex";
    venRoundCreate()
}

// start vending game
function startVendingGame(){
    if(!vendingGameStarted){
        playedVendingGame = true
        vendingGameStarted = true;
        createVendingButtons()
        canMove = false;
        cutsceneActive = true;
        controls.unlock();
        velocity.x = 0
        velocity.y = 0
    }
}

// PRESENTING GAME
// presenting game variables
let presentingGameActive = false;
let currentPresWord;
let currentPresInput;
let currentPresScore = 0;
let presGoal = 10;
const INITIAL_TIMER_FOR_WORD = 5000; //ms
let playedPresentaionGame = false;
let wordTypeTimeout = null;
const presUI = document.getElementById("presentation-game-ui")
const presScore = document.getElementById("presentation-score-ui")
const presFeedback = document.getElementById("presentation-feedback")
const presWords = document.getElementById("presentation-words")
const wordInput = document.getElementById("word-input")
let presWordTimer = null;
//presention words
const words = ['jakoby', 'vlastne', 'jako', 'proste', 'uhm', 'eee', 'tak', 'takze', 'realne']

// generate new word
function generateNewWord(){
    timerForWord = INITIAL_TIMER_FOR_WORD;
    if (wordTypeTimeout) clearTimeout(wordTypeTimeout);
    wordInput.value = ""
    presScore.textContent = 'Score: '+ currentPresScore +' / ' +presGoal 
    if(currentPresScore >= presGoal) return endPresentingGame(true);
    let randomIndex = Math.floor(Math.random() * words.length)
    //console.log(words[randomIndex])
    currentPresWord = words[randomIndex]
    let presWord = document.createElement("div")
    presWord.textContent = currentPresWord
    presWord.style.left = Math.floor(Math.random() * 80) + "%"
    presWord.style.top = Math.floor(Math.random() * 80) + "%"
    presWord.classList.add("presWord")
    presWordTimer = document.createElement('div');
    presWordTimer.classList.add('presWordTimer')
    presWordTimer.id = 'presWordTimer'
    presWordTimer.style.width = '100%'
    presWord.appendChild(presWordTimer)
    presWords.appendChild(presWord)
    wordTypeTimeout = setTimeout(() =>{
        if(presentingGameActive){
            endPresentingGame(false)
        }
    }, INITIAL_TIMER_FOR_WORD)
}

// start presenting game
function startPresentingGame(){
    playedPresentaionGame = true;
    alert_text("I can´t use any parasitic words.")
    controls.getObject().position.set(100, 56, 155);
    controls.getObject().rotation.x = 0;
    controls.getObject().rotation.y = Math.PI;
    controls.getObject().rotation.z = 0;
    velocity.x = 0;
    velocity.z = 0;
    canMove = false;
    cutsceneActive = true;
    controls.unlock();
    setTimeout(() => {
        if(!presentingGameActive){
            presentingGameActive = true
            presUI.style.display = "flex";
            wordInput.disabled = false;
            wordInput.focus();
            generateNewWord()
        }
    }, 2500)
}

// end presenting game
function endPresentingGame(sucess){
    if (presWords.firstChild) {
        presWords.removeChild(presWords.firstChild);
    }
    presentingGameActive = false
    presUI.style.display = "none";
    canMove = true;
    cutsceneActive = false;
    controls.lock();
    controls.getObject().position.set(100, 56, 165);
    if(sucess){
        alert_text("I did great!")
        CHCpart4 = false
        newQuest = false
        CHCpart5 = true
    }else{
        alert_text("Upps, I need to try again...")
        playedPresentaionGame = false
    }
}

function handleInput(event){
    //console.log(event.data)
    //console.log(wordInput.value)
    currentPresInput = wordInput.value;
    if(currentPresInput.toLowerCase() === currentPresWord.toLowerCase()){
        //console.log("RightWord")
        currentPresScore += 1
        if (presWords.firstChild) {
            presWords.removeChild(presWords.firstChild);
        }
        generateNewWord()
    }
}

wordInput.addEventListener('input', handleInput);

// SLEEP GAME
// sleep game variables
let sleepGameActive = false;
let gameScore = 0;
const requiredScore = 15;
const possibleKeys = ['A', 'S', 'D', 'W', 'E', 'F', 'J', 'K', 'L'];
let currentKey = '';
let keyPressTimeout = null;
const INITIAL_TIME_LIMIT = 2500;
let gameFailed = false;
const sleepGameUI = document.getElementById('sleep-game-ui');
const sleepPrompt = document.getElementById('sleep-prompt');
const sleepMessage = document.getElementById('sleep-message');
let timeBar = document.getElementById("sleepGameTimeBar");
let canPushButtons = false;
let playedSleepGame = false;

// check for right key
document.addEventListener('keydown', (e) => {
    if (!sleepGameActive || !canPushButtons) return;
    
    const pressedKey = e.code.replace('Key', '');
    //DEBUG//console.log(pressedKey) 
    if (pressedKey === currentKey) {
        gameScore++;
        //DEBUG//console.log("U press the right key!!!") 
        sleepMessage.textContent = `Score: ${gameScore} / ${requiredScore}`;
        generateNewKey();
    } else {
        alert_text(`Wrong key: ${pressedKey}`, 1000);
        endSleepGame(false)
    }
});

// sleep game
function startSleepGame() {
    playedSleepGame = true;
    alert_text("Don´t fall asleep !!!")
    sleepGameActive = true;
    setTimeout(() => {
        canPushButtons = true
        gameFailed = false;
        gameScore = 0;
        timeBar.style.width = '100%'
        sleepGameUI.style.display = 'flex';
        sleepGameUI.style.flexDirection = 'column';
        sleepMessage.textContent = `Score: ${gameScore} / ${requiredScore}`;
        generateNewKey();
    }, 2500)
}

// function generate key
function generateNewKey() {
    timeLimit = INITIAL_TIME_LIMIT; 
    if (gameFailed || !sleepGameActive) return;
    timeBar.style.width = '100%'
    if (keyPressTimeout) clearTimeout(keyPressTimeout);

    // Check for win
    if (gameScore >= requiredScore) {
        endSleepGame(true);
        //DEBUG//console.log("U won the game!!!") 
        return;
    }

    // new random key
    const randomIndex = Math.floor(Math.random() * possibleKeys.length);
    currentKey = possibleKeys[randomIndex];
    sleepPrompt.innerHTML = `Press **${currentKey}**!`;

    // timeout for key press failure
    keyPressTimeout = setTimeout(() => {
        if (sleepGameActive) {
            endSleepGame(false);
            //DEBUG//console.log("U lost the game!!!") 
        }
    }, INITIAL_TIME_LIMIT);
}

// Function end sleep game
function endSleepGame(success) {
    if (keyPressTimeout) clearTimeout(keyPressTimeout);
    sleepGameActive = false;
    canPushButtons = false
    currentKey = '';
    sleepPrompt.textContent = '';
    sleepGameUI.style.display = 'none';

    if (success) {
        alert_text("I stayed awake!");
        CHCpart3 = false;
        newQuest = false
        CHCpart4 = true;
        
        // enable player movement
        controls.getObject().position.set(104, 56, 300); //OutOfChair
        canMove = true;
        cutsceneActive = false;
        controls.lock();
        onChairGama = false;

    } else {
        playedSleepGame = false;
        gameFailed = true;
        setTimeout(() => {
            alert_text("I fell asleep, again?");
        }, 1000);
        
        setTimeout(() => {
            // enable player movement
            controls.getObject().position.set(104, 56, 300); //OutOfChair
            canMove = true;
            cutsceneActive = false;
            controls.lock();
            onChairGama = false;
        }, 1500); // Wait 1.5s
    }
}

let timeLimit = INITIAL_TIME_LIMIT; 
let timerForWord = INITIAL_TIMER_FOR_WORD;

function updateGameTimers(deltaTime) {

    if (sleepGameActive) {
        if (timeLimit > 0) {
            
            timeLimit -= deltaTime;

            if (timeLimit < 0) {
                timeLimit = 0;
            }

            let newPercentage = (timeLimit / INITIAL_TIME_LIMIT) * 100;

            timeBar.style.width = newPercentage + "%";
        }
    }

    if (presentingGameActive) {
        if (timerForWord > 0) {
            
            timerForWord -= deltaTime;

            if (timerForWord < 0) {
                timerForWord = 0;
            }

            let newPercentage = (timerForWord / INITIAL_TIMER_FOR_WORD) * 100;

            presWordTimer.style.width = newPercentage + "%";
        }
    }
}

// RENDER LOOP
function animate() {
    const delta = clock.getDelta(); // Time since last frame
    const deltaTimeMs = delta * 1000;
    
    updateGameTimers(deltaTimeMs);
    
    //People allways rotate / look at player
    people.forEach(mesh => {
    const playerPosition = controls.getObject().position;
    mesh.lookAt(playerPosition.x, mesh.position.y, playerPosition.z);
    });

    //DEBUG//console.log(lookedCollider); 
    //DEBUG//console.log(controls.getObject().position)
    colliderVisuals.children.forEach(mesh => {
        const name = mesh.name.replace('collider_', '').replace('stair_', '');
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

    detectLookedCollider();
    requestAnimationFrame(animate);

    const moveSpeed = speed * (delta * 60);
    const gravityForce = gravity * (delta * 60);

    //Player Standing on
    const groundHit = getObjectBelowPlayer();

    // --- Namesti Prace START ---
    if (locationNP){
        if(!createdNP){
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
                stairs.length = 0;

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
            controls.getObject().position.set(140, 55, 200); //Normal 0, 1.5, 10 //Debug // 140, 55, 200 // 75, 1.5, 10
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

        if(item1Snapped && CHCpart1){
            lockerUI.style.display = 'none';
            canMove = true;
            cutsceneActive = false;
            
            CHCpart1 = false;
            newQuest = false
            CHCpart2 = true;
        }   
        
        // DOORS AND INTERACTABLES CONTROLERS
        switch (lookedCollider){
            case "collider_MainCHCDoor":
                // Door Enterance / CHC
                interactionE.style.zIndex = 99;
                if(KeyPressed == "KeyE"){
                    if(!inMainCHCDoor && CHCpart1){
                        inMainCHCDoor = true;
                        interactionE.style.zIndex = -99;
                        controls.getObject().position.set(73, 3.22, 0.35)
                    } else if(CHCpartEND && inMainCHCDoor){
                        inMainCHCDoor = false;
                        interactionE.style.zIndex = -99;
                        controls.getObject().position.set(62, 3.22, 0.35)
                    } else if(CHCpartEND && !inMainCHCDoor){
                        alert_text("I need to catch the bus!!!")
                    } else{
                        alert_text("I can´t leave just yet...")
                    }
                }
                break;
            case "collider_LockerInteract":
                // Player Locker
                interactionE.style.zIndex = 99;  
                if(KeyPressed == "KeyE" && !LockerOpened && CHCpart1){
                    interactionE.style.zIndex = -99;
                    LockerOpened = true;
                    canMove = false;
                    velocity.x = 0;
                    velocity.z = 0;
                    cutsceneActive = true;
                    controls.unlock();

                    // locker minigame

                    lockerUI.style.display = 'flex';

                    // Drag logic
                    let dragging = false;
                    let offsetX = 0, offsetY = 0;

                    bootsImg.addEventListener('mousedown', e => {
                    dragging = true;
                    const rect = container.getBoundingClientRect();
                        offsetX = e.clientX - bootsImg.offsetLeft - rect.left;
                        offsetY = e.clientY - bootsImg.offsetTop - rect.top;
                    });

                    document.addEventListener('mousemove', e => {
                        if (!dragging) return;
                        const rect = container.getBoundingClientRect();
                        bootsImg.style.left = (e.clientX - rect.left - offsetX) + 'px';
                        bootsImg.style.top = (e.clientY - rect.top - offsetY) + 'px';
                    });

                    document.addEventListener('mouseup', () => {
                        if (!dragging) return;
                            dragging = false;

                            const slotRect = slot.getBoundingClientRect();
                            const bootsRect = bootsImg.getBoundingClientRect();

                            const containerRect = container.getBoundingClientRect();
                            const dx = (bootsRect.left - containerRect.left) - (slotRect.left - containerRect.left);
                            const dy = (bootsRect.top - containerRect.top) - (slotRect.top - containerRect.top);

                        if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
                            bootsImg.style.left = (slotRect.left - containerRect.left) + 'px';
                            bootsImg.style.top = (slotRect.top - containerRect.top) + 'px';
                            item1Snapped = true;
                        }
                    });
                }else if(KeyPressed == "KeyE" && LockerOpened){
                    if(CHCpartEND){

                    }else{
                        alert_text("I don´t need to go there...")
                    }
                }
                break;
            case 'collider_GamaDoor':
                // Door Gama
                interactionE.style.zIndex = 99;
                if(KeyPressed == "KeyE"){
                    interactionE.style.zIndex = -99;
                    if(!inGamaDoor && CHCpart3){
                        inGamaDoor = true;
                        controls.getObject().position.set(117.35, 55, 280.5)
                    } else if(inGamaDoor && !CHCpart3){
                        inGamaDoor = false;
                        controls.getObject().position.set(128.5, 55, 280.5)
                    } else{
                        if(CHCpart3){
                            alert_text("I can´t leave, class is starting soon...")
                        }else{
                            alert_text("Someone else has class in there!!!")
                        }
                    }
                }
                break;
            case 'collider_ChairColliderPlayer':
                if(!playedSleepGame){
                    // Chair Gama
                    interactionE.style.zIndex = 99;
                    if(KeyPressed == "KeyE"){
                        interactionE.style.zIndex = -99;
                        if(!onChairGama){
                            controls.unlock();
                            onChairGama = true;
                            velocity.x = 0;
                            velocity.z = 0;
                            controls.getObject().position.set(119.5, 50, 298);
                            controls.getObject().rotation.x = 0;
                            controls.getObject().rotation.y = Math.PI /5;
                            controls.getObject().rotation.z = 0;
                            canMove = false;
                            cutsceneActive = true;
                            startSleepGame();
                        }
                    }
                }
                break;
            case 'collider_DeltaDoor':
                // Door Delta
                interactionE.style.zIndex = 99;
                if(KeyPressed == "KeyE"){
                    interactionE.style.zIndex = -99;
                    if(!inDeltaDoor && CHCpart4){
                        inDeltaDoor = true;
                        controls.getObject().position.set(117.35, 55, 166)
                    } else if(inDeltaDoor && !CHCpart4){
                        inDeltaDoor = false;
                        controls.getObject().position.set(128.5, 55, 166)
                    } else{
                        if(CHCpart4){
                            alert_text("I can´t leave, class is starting soon...")
                        }else{
                            alert_text("Someone has class in there!!!")
                        }
                    }
                }
                break;
            case 'collider_presentinGameInteraciton':
                if(!playedPresentaionGame){
                    // Presentaion Delta
                    interactionE.style.zIndex = 99;
                    if(KeyPressed == "KeyE"){
                        interactionE.style.zIndex = -99;
                        startPresentingGame()
                    }
                }
                break;
            case 'collider_VendingMachineGame':
                interactionE.style.zIndex = 99;
                if(KeyPressed == 'KeyE'){
                    interactionE.style.zIndex = -99;
                    if(!playedTahoot){
                        startVendingGame()
                    }
                }
                break;
            case 'collider_EpsilonChair':
                if(!satDownEpsilon && !playedTahoot){
                    interactionE.style.zIndex = 99;
                    if(KeyPressed == 'KeyE'){
                        satDownEpsilon = true
                        interactionE.style.zIndex = -99;
                        controls.getObject().position.set(140, 55, 200)
                        startTahootGame()
                    }
                }
                break;
            case 'collider_EpsilonDoor':
                interactionE.style.zIndex = 99
                if(KeyPressed == 'KeyE'){
                    if(!inEpsilonDoor && CHCpart5){
                        inEpsilonDoor = true
                        controls.getObject().position.set(115, 50, 47.5);
                    } else if (inEpsilonDoor && CHCpartEND) {
                        inEpsilonDoor = false
                        controls.getObject().position.set(135, 50, 47.5)
                    } else {
                        if(CHCpart5){
                            alert_text("I can´t leave, class is starting soon...")
                        }else{
                            alert_text("Someone has class in there!!!")
                        }
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

    // Check for stairs at new position
    const stairAtNewPos = getStairsAtPosition(newPos);

    // Horizontal collision check
    const hit = colliders.some(box => box.containsPoint(newPos));

    //MOVE
    if (!hit) {
        controls.moveForward(velocity.z);
        controls.moveRight(velocity.x);
        
        if (stairAtNewPos) {
            let stairProgress = 0;

            switch (stairAtNewPos.axis) {
                //Stairs rotations
                case "x+":
                    stairProgress = (newPos.x - stairAtNewPos.box.min.x) / (stairAtNewPos.box.max.x - stairAtNewPos.box.min.x);
                    break;
                case "x-":
                    stairProgress = (stairAtNewPos.box.max.x - newPos.x) / (stairAtNewPos.box.max.x - stairAtNewPos.box.min.x);
                    break;
                case "z+":
                    stairProgress = (newPos.z - stairAtNewPos.box.min.z) / (stairAtNewPos.box.max.z - stairAtNewPos.box.min.z);
                    break;
                case "z-":
                    stairProgress = (stairAtNewPos.box.max.z - newPos.z) / (stairAtNewPos.box.max.z - stairAtNewPos.box.min.z);
                    break;
            }

            stairProgress = THREE.MathUtils.clamp(stairProgress, 0, 1);

            const targetHeight = stairAtNewPos.startY + (stairAtNewPos.heightGain * stairProgress);
            
            const currentY = controls.getObject().position.y;
            const heightDiff = targetHeight + playerHeight - currentY;
            
            if (Math.abs(heightDiff) > 0.1) {
                controls.getObject().position.y += heightDiff * 0.2;
            }
        }
    }

    // Player Colide Box
    const playerBox = new THREE.Box3(
        new THREE.Vector3(playerCurrentPos.x - playerHalfWidth, playerCurrentPos.y - playerHeight*10, playerCurrentPos.z - playerHalfWidth),
        new THREE.Vector3(playerCurrentPos.x + playerHalfWidth, playerCurrentPos.y, playerCurrentPos.z + playerHalfWidth)
    );
    
    // Ground Check y
    const onGround = colliders.some(box => box.intersectsBox(playerBox));
    const onStairs = getStairsAtPosition(playerCurrentPos);

    // GRAVITY
    if (!onGround && !onStairs) {
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
            quests_text("")
            cutsceneActive = false;
        }
        // Cut Scene 1
        else if(busWaiting){
            quests_text("Get on the bus")
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
            quests_text("Wait for the bus");
            cutsceneActive = true;
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
    if(locationCHC){
        if(CHCpart1){
            if(!newQuest){
                newQuest = true
                alert_text("New mission!")
            }
            if(!LockerOpened) changeColliderColor('LockerInteract', 0.2); else changeColliderColor("LockerInteract", 0);
            quests_text("Put your stuff into the locker")
            //Put your things into your locker
        }
        if(CHCpart2){
            changeColliderColor("VendingMachineGame", 0.2);
            if(!newQuest){
                newQuest = true
                alert_text("New mission!")
            }
            quests_text("Buy coffee/cocoa")
        }
        if(CHCpart3){
            changeColliderColor("VendingMachineGame", 0)
            if(!newQuest){
                newQuest = true
                alert_text("New mission!")
            }
            quests_text("Get to your first class - 1st floor, Gama")
            if(!inGamaDoor) changeColliderColor("GamaDoor", 0.2); else changeColliderColor("GamaDoor", 0)
            if(!sleepGameActive && inGamaDoor) changeColliderColor("ChairColliderPlayer", 0.2); else changeColliderColor("ChairColliderPlayer", 0)
            //destroy barrier
            if (BarrierPart1) {
                const deltaY = -100;
                BarrierPart1.min.y += deltaY;
                BarrierPart1.max.y += deltaY;
                BarrierPart1 = null;
            }
            const mesh = colliderVisuals.getObjectByName('collider_BarrierPart1');
            if (mesh) {
                mesh.position.y -= 100;
            }
            if(sleepGameActive){
                if(!addedTeacherGama) addImage("gamePerson1", "./imgs/Person.png", 93.8, 40, 277, 10,15,10), addedTeacherGama = true, //DEBUG//console.log("AddedTeacherGama");
                sleepMessage.textContent = `Score: ${gameScore} / ${requiredScore}`;
            }
        }
        if(CHCpart4){
            if(!newQuest){
                newQuest = true
                alert_text("New mission!")
            }
            quests_text("Get to your second class - 1st floor, Delta")
            if(inGamaDoor) changeColliderColor("GamaDoor", 0.2); else changeColliderColor("GamaDoor", 0);
            if(!inDeltaDoor) changeColliderColor("DeltaDoor", 0.2); else changeColliderColor("DeltaDoor", 0);
            if(inDeltaDoor && !playedPresentaionGame) changeColliderColor("presentinGameInteraciton", 0.2); else changeColliderColor("presentinGameInteraciton", 0);
        }
        if(CHCpart5){
            if(inDeltaDoor) changeColliderColor("GamaDoor", 0.2); else changeColliderColor("GamaDoor", 0);
            if(!inEpsilonDoor) changeColliderColor("EpsilonDoor", 0.2); else changeColliderColor("EpsilonDoor", 0);
            if(!newQuest){
                newQuest = true
                alert_text("New mission!")
            }
            if(inEpsilonDoor) changeColliderColor("EpsilonChair", 0.2); else changeColliderColor("EpsilonChair", 0);
        }
        if(CHCpartEND){
            if(inEpsilonDoor) changeColliderColor("EpsilonDoor", 0.2); else changeColliderColor("EpsilonDoor", 0);
        }
    }

    renderer.render(scene, camera);
}
animate();
