import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f172a);
scene.fog = new THREE.Fog(0x0f172a, 10, 500);
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 50);

function updateCameraZoom() {
    if (window.innerWidth < 600) {
        camera.zoom = window.innerWidth / 700;
    } else {
        camera.zoom = 1;
    }
    camera.updateProjectionMatrix();
}
updateCameraZoom();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('canvas-container').appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.05;

const draggableObjects = [];
const dragControls = new DragControls(draggableObjects, camera, renderer.domElement);
dragControls.transformGroup = true;

dragControls.addEventListener('dragstart', function (event) {
    controls.enabled = false;
    event.object.userData.startPos = event.object.position.clone();
});
dragControls.addEventListener('drag', function (event) {
    event.object.position.z = 0.5;
});
dragControls.addEventListener('dragend', function (event) {
    controls.enabled = true;

    let nearestSlot = null;
    let minDistance = Infinity;
    const objPos = event.object.position;
    validSlots.forEach(slot => {
        let isOccupied = false;
        for (const mesh of loadedMeshes) {
            if (mesh === event.object || mesh.userData.type.startsWith('honeycomb')) continue;

            const targetPos = mesh.userData.targetSnap || mesh.position;
            const mDx = targetPos.x - slot.x;
            const mDy = targetPos.y - slot.y;

            if (mDx * mDx + mDy * mDy < 1.0) {
                isOccupied = true;
                break;
            }
        }

        if (!isOccupied) {
            const dx = slot.x - objPos.x;
            const dy = slot.y - objPos.y;
            const dist = dx * dx + dy * dy;
            if (dist < minDistance) {
                minDistance = dist;
                nearestSlot = slot;
            }
        }
    });

    if (nearestSlot) {
        event.object.userData.targetSnap = new THREE.Vector3(nearestSlot.x, nearestSlot.y, 0.5);
    } else if (event.object.userData.startPos) {
        event.object.userData.targetSnap = event.object.userData.startPos.clone();
    }
});
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(20, 40, 20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0x3b82f6, 0.5);
fillLight.position.set(-20, 10, -20);
scene.add(fillLight);

const loader = new STLLoader();
const loadedMeshes = [];
const loadingOverlay = document.createElement('div');
loadingOverlay.id = 'loading-overlay';
loadingOverlay.textContent = 'Loading 3D model...';
document.getElementById('app').appendChild(loadingOverlay);

const materials = {
    honeycomb: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.7,
        metalness: 0.1
    }),
    button: new THREE.MeshStandardMaterial({
        color: 0xef4444,
        roughness: 0.3,
        metalness: 0.2
    }),
    lamp: new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.1,
        metalness: 0.1,
        transparent: true,
        opacity: 0.95
    }),
    metal: new THREE.MeshStandardMaterial({
        color: 0x9ca3af,
        roughness: 0.4,
        metalness: 0.8
    }),
    black_plastic: new THREE.MeshStandardMaterial({
        color: 0x1f2937,
        roughness: 0.8,
        metalness: 0.1
    }),
    blue_plastic: new THREE.MeshStandardMaterial({
        color: 0x3b82f6,
        roughness: 0.5,
        metalness: 0.1
    }),
    light_grey: new THREE.MeshStandardMaterial({
        color: 0x6b7280,
        roughness: 0.5,
        metalness: 0.3
    })
};

const pieceInfoData = {
    m30: { title: "Thread M30", desc: "Large threaded fastener for high torque tests.", specs: { "Type": "Thread" } },
    m14: { title: "Thread M14", desc: "Medium threaded fastener for intermediate torque applications.", specs: { "Type": "Thread" } },
    m8: { title: "Thread M8", desc: "Small threaded fastener for precise torque applications.", specs: { "Type": "Thread" } },
    high_torque_valve: { title: "Gate Valve (Large)", desc: "Heavy duty gate valve mechanism for high resistance rotation.", specs: { "Type": "Gate Valve" } },
    small_valve: { title: "Gate Valve (Small)", desc: "Smaller gate valve for moderate resistance.", specs: { "Type": "Gate Valve" } },
    circuit_breaker: { title: "Circuit Breaker", desc: "Toggle mechanism simulating an electrical switch.", specs: { "Type": "Flip Switch" } },
    ball_valve: { title: "Ball Valve", desc: "Industrial ball valve requiring 90-degree actuation.", specs: { "Type": "Ball Valve" } },
    peg_insertion: { title: "Peg Insertion Plate", desc: "Precision task requiring alignment of multiple pegs into exact holes.", specs: { "Type": "Precision Plate" } },
    button_composed: { title: "Hidden Push Button", desc: "Spring-loaded mechanism with a protective cover.", specs: { "Type": "Push Button" } },
    key: { title: "Lock and Key", desc: "Complex insertion and rotational lock mechanism.", specs: { "Type": "Lock Mechanism" } },
    lamp: { title: "Light Bulb Socket", desc: "Threaded socket with internal electrical contacts.", specs: { "Type": "Socket" } },
    drawer: { title: "Sliding Drawer", desc: "Linear sliding mechanism for friction and alignment testing.", specs: { "Type": "Slider" } },
    shock_absorber: { title: "Shock Absorber", desc: "Spring-loaded piston mechanism.", specs: { "Type": "Piston" } },
    honeycomb_l: { title: "Large Honeycomb Board", desc: "Main base structure providing slots for attaching components.", specs: { "Type": "Board" } },
    honeycomb_m: { title: "Medium Honeycomb Board", desc: "Main base structure providing slots for attaching components.", specs: { "Type": "Board" } },
    honeycomb_s: { title: "Small Honeycomb Board", desc: "Main base structure providing slots for attaching components.", specs: { "Type": "Board" } }
};

const modelsPaths = {
    honeycomb_l: './models/boards/Honeycomb_Panel.stl',
    honeycomb_m: './models/boards/Honeycomb_Panel_M.stl',
    honeycomb_s: './models/boards/Honeycomb_Panel_S.stl'
};

const CELL_SIZE = 8.65;
const GRID_ANGLE = 30;
let availableSlots = [];
let validSlots = [];
let currentBoardMesh = null;

function updateSlots() {
    const angle = GRID_ANGLE * (Math.PI / 180);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const rawSlots = [];
    const C = CELL_SIZE;
    const H = CELL_SIZE * 0.86602540378;
    for (let a = -10; a <= 10; a++) {
        for (let b = -10; b <= 10; b++) {
            if (Math.abs(a + b) <= 15) {
                rawSlots.push({
                    x: a * C + b * (C / 2),
                    y: b * H
                });
            }
        }
    }

    rawSlots.sort((A, B) => {
        const distA = A.x * A.x + A.y * A.y;
        const distB = B.x * B.x + B.y * B.y;
        return distA - distB;
    });

    availableSlots = rawSlots.map(s => ({
        x: s.x * cos - s.y * sin,
        y: s.x * sin + s.y * cos
    }));

    validSlots = availableSlots;
}
updateSlots();

let currentSlotIndex = 0;

const compositePieces = {
    m30: [
        { path: './models/torque_based/M30_Screw_Base.stl', materialKey: 'honeycomb', isBase: true },
        { path: './models/torque_based/M30_Nut.stl', materialKey: 'light_grey', isBase: false }
    ],
    m14: [
        { path: './models/torque_based/M14_Screw_Base.stl', materialKey: 'honeycomb', isBase: true },
        { path: './models/torque_based/M14_Nut.stl', materialKey: 'light_grey', isBase: false }
    ],
    m8: [
        { path: './models/torque_based/M8_Screw_Base.stl', materialKey: 'honeycomb', isBase: true },
        { path: './models/torque_based/M8_Nut.stl', materialKey: 'light_grey', isBase: false, endZ: 22 }
    ],
    high_torque_valve: [
        { path: './models/torque_based/High_Torque_Valve_Base.stl', materialKey: 'honeycomb', isBase: true },
        { path: './models/torque_based/High_Torque_Valve_Screw.stl', materialKey: 'light_grey', isBase: false, spinOnly: true, turns: 0.5, speed: 0.005, endZ: 125 }
    ],
    small_valve: [
        { path: './models/torque_based/Small_Valve_Base.stl', materialKey: 'honeycomb', isBase: true },
        { path: './models/torque_based/Small_Valve_Screw.stl', materialKey: 'light_grey', isBase: false, spinOnly: true, turns: 0.5, speed: 0.005, endZ: 65 }
    ],
    circuit_breaker: [
        { path: './models/precision_based/Circuit_Breaker_Base.stl', materialKey: 'honeycomb', isBase: true },
        { path: './models/precision_based/Circuit_Breaker_Switch.stl', materialKey: 'light_grey', isBase: false, spinOnly: true, axis: 'x', turns: 0.15, states: [0, -1, 0, 1], speed: 0.1, endZ: 43, pivotOffset: { x: 0, y: -10, z: -20 } }
    ],
    ball_valve: [
        { path: './models/composed_assembly/Ball_Valve_Assembly.stl', materialKey: 'honeycomb', isBase: true, fixCenter: { x: -37, y: 0 } }
    ],

    peg_insertion: [
        { path: './models/composed_assembly/Shock_Absorber_Base.stl', materialKey: 'honeycomb', isBase: true },
        {
            path: './models/composed_assembly/Shock_Absorber_Pin.stl', materialKey: 'light_grey', isBase: false, speed: 0.04, independentClick: true,
            keyframes: [
                { p: 0, x: 0, y: 0, z: 40 },
                { p: 1, x: 0, y: 0, z: 20 }
            ]
        },
        {
            path: './models/composed_assembly/Shock_Absorber_Pin.stl', materialKey: 'light_grey', isBase: false, speed: 0.04, independentClick: true,
            keyframes: [
                { p: 0, x: 0, y: 28, z: 40 },
                { p: 1, x: 0, y: 28, z: 20 }
            ]
        },
        {
            path: './models/composed_assembly/Shock_Absorber_Pin.stl', materialKey: 'light_grey', isBase: false, speed: 0.04, independentClick: true,
            keyframes: [
                { p: 0, x: -35, y: 0, z: 40 },
                { p: 1, x: -35, y: 0, z: 20 }
            ]
        },
        {
            path: './models/composed_assembly/Shock_Absorber_Pin.stl', materialKey: 'light_grey', isBase: false, speed: 0.04, independentClick: true,
            keyframes: [
                { p: 0, x: 25, y: 0, z: 40 },
                { p: 1, x: 25, y: 0, z: 20 }
            ]
        }
    ],
    button_composed: [
        { path: './models/precision_based/Button_Base.stl', materialKey: 'honeycomb', isBase: true },
        { path: './models/precision_based/Button.stl', materialKey: 'button', isBase: false, turns: 0, startZ: 22, endZ: 17, speed: 0.08, states: [0, 0, 1, 0] },
        { path: './models/composed_assembly/Button_Cover.stl', materialKey: 'light_grey', isBase: false, spinOnly: true, axis: 'x', turns: -0.3, speed: 0.08, pivotOffset: { x: 0, y: 32, z: -4 }, endZ: 22, states: [0, 1, 1, 1] }
    ],
    key: [
        { path: './models/composed_assembly/Key_Base.stl', materialKey: 'honeycomb', isBase: true, mirrorX: true },
        {
            path: './models/composed_assembly/Key.stl', materialKey: 'metal', isBase: false, fixRotation: { x: Math.PI / 2 }, speed: 0.02, pivotOffset: { x: -4, y: 0, z: 0 },
            keyframes: [
                { p: 0, x: 0, z: 60, rz: 0 },
                { p: 0.5, x: 0, z: 18, rz: 0 },
                { p: 1, x: 5, z: 18, rz: -Math.PI / 2 }
            ]
        }
    ],
    lamp: [
        { path: './models/composed_assembly/Lamp_Base.stl', materialKey: 'honeycomb', isBase: true },
        { path: './models/composed_assembly/Half_Lamp.stl', materialKey: 'lamp', isBase: false, turns: 2, startZ: 50, endZ: 25, speed: 0.03, keepCADOrigin: true },
        { path: './models/composed_assembly/Half_Lamp.stl', materialKey: 'lamp', isBase: false, turns: 2, startZ: 50, endZ: 25, speed: 0.03, fixRotation: { z: Math.PI }, keepCADOrigin: true }
    ],
    drawer: [
        { path: './models/composed_assembly/Drawer_Base.stl', materialKey: 'honeycomb', isBase: true },
        {
            path: './models/composed_assembly/Drawer.stl', materialKey: 'blue_plastic', isBase: false, turns: 0, speed: 0.005, fixRotation: { z: Math.PI },
            keyframes: [
                { p: 0, x: -12, z: 65 },
                { p: 0.33, x: -12, z: 50 },
                { p: 0.66, x: 0, z: 50 },
                { p: 1, x: 0, z: 30 }
            ]
        }
    ],
    shock_absorber: [
        { path: './models/composed_assembly/Shock_Absorber_Base.stl', materialKey: 'honeycomb', isBase: true, unselectable: true },
        { path: './models/composed_assembly/Shock_Absorber.stl', materialKey: 'light_grey', isBase: false },
        { path: './models/composed_assembly/Shock_Absorber_Pin.stl', materialKey: 'light_grey', isBase: false },
        { path: './models/composed_assembly/Shock_Absorber_Screw.stl', materialKey: 'light_grey', isBase: false }
    ]
};

function loadPiece(type) {
    loadingOverlay.style.display = 'block';

    if (type.startsWith('honeycomb')) {
        const path = modelsPaths[type];
        loader.load(path, (geometry) => {
            geometry.computeVertexNormals();

            const material = materials['honeycomb'];
            const mesh = new THREE.Mesh(geometry, material);
            const scaleFactor = 0.1;
            mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
            mesh.castShadow = false;
            mesh.receiveShadow = false;
            mesh.position.set(0, 0, 0);

            for (let i = loadedMeshes.length - 1; i >= 0; i--) {
                const oldMesh = loadedMeshes[i];
                scene.remove(oldMesh);

                if (oldMesh.isGroup) {
                    oldMesh.children[0].children.forEach(c => {
                        if (c.geometry) c.geometry.dispose();
                    });
                } else {
                    if (oldMesh.geometry) oldMesh.geometry.dispose();
                }
            }
            loadedMeshes.length = 0;
            draggableObjects.length = 0;

            mesh.userData.type = type;
            scene.add(mesh);
            loadedMeshes.push(mesh);

            currentBoardMesh = mesh;
            currentSlotIndex = 0;

            const bbox = new THREE.Box3().setFromObject(mesh);
            const margin = 3;

            validSlots = availableSlots.filter(slot => {
                return slot.x > bbox.min.x + margin && slot.x < bbox.max.x - margin &&
                    slot.y > bbox.min.y + margin && slot.y < bbox.max.y - margin;
            });

            loadingOverlay.style.display = 'none';
        });
    } else {
        const largePieces = ['high_torque_valve', 'small_valve', 'ball_valve'];
        if (largePieces.includes(type)) {
            const hasLargePiece = loadedMeshes.some(m => largePieces.includes(m.userData.type));
            if (hasLargePiece) {
                showError("Only one large piece can be placed at a time to prevent collisions. Remove the current one first.");
                loadingOverlay.style.display = 'none';
                return;
            }
        }

        const parts = compositePieces[type];
        const innerGroup = new THREE.Group();
        const wrapper = new THREE.Group();
        let loadedCount = 0;
        let baseCenter = new THREE.Vector3();

        let slot = null;
        for (let i = 0; i < validSlots.length; i++) {
            const index = (currentSlotIndex + i) % validSlots.length;
            const testSlot = validSlots[index];

            let isOccupied = false;
            for (const mesh of loadedMeshes) {
                if (mesh.userData.type.startsWith('honeycomb')) continue;

                const targetPos = mesh.userData.targetSnap || mesh.position;
                const dx = targetPos.x - testSlot.x;
                const dy = targetPos.y - testSlot.y;
                if (dx * dx + dy * dy < 1.0) {
                    isOccupied = true;
                    break;
                }
            }

            if (!isOccupied) {
                slot = testSlot;
                currentSlotIndex = index + 1;
                break;
            }
        }

        if (!slot) {
            showError("The board is full! Clear the scene or change to a larger board to add more pieces.");
            loadingOverlay.style.display = 'none';
            return;
        }

        parts.forEach(part => {
            loader.load(part.path, (geometry) => {
                if (part.fixRotation) {
                    if (part.fixRotation.x) geometry.rotateX(part.fixRotation.x);
                    if (part.fixRotation.y) geometry.rotateY(part.fixRotation.y);
                    if (part.fixRotation.z) geometry.rotateZ(part.fixRotation.z);
                }

                if (part.mirrorX || part.mirrorY) {
                    if (part.mirrorX) geometry.scale(-1, 1, 1);
                    if (part.mirrorY) geometry.scale(1, -1, 1);

                    const positions = geometry.attributes.position;
                    for (let i = 0; i < positions.count; i += 3) {
                        const x1 = positions.getX(i + 1);
                        const y1 = positions.getY(i + 1);
                        const z1 = positions.getZ(i + 1);

                        const x2 = positions.getX(i + 2);
                        const y2 = positions.getY(i + 2);
                        const z2 = positions.getZ(i + 2);

                        positions.setXYZ(i + 1, x2, y2, z2);
                        positions.setXYZ(i + 2, x1, y1, z1);
                    }
                    geometry.computeVertexNormals();
                }

                if (part.isBase) {
                    geometry.computeBoundingBox();
                    geometry.boundingBox.getCenter(baseCenter);
                    baseCenter.z = 0;

                    if (part.fixCenter) {
                        baseCenter.x += part.fixCenter.x;
                        baseCenter.y += part.fixCenter.y;
                    }
                }

                const material = materials[part.materialKey] || new THREE.MeshStandardMaterial({ color: 0xcccccc });
                const mesh = new THREE.Mesh(geometry, material.clone());
                mesh.castShadow = true;
                mesh.receiveShadow = true;

                mesh.userData.isBase = part.isBase;
                mesh.userData.partConfig = part;
                innerGroup.add(mesh);
                loadedCount++;

                if (loadedCount === parts.length) {
                    innerGroup.children.forEach(child => {
                        if (child.userData.isBase) {
                            child.position.sub(baseCenter);
                        } else {
                            child.geometry.computeBoundingBox();
                            const objCenter = new THREE.Vector3();
                            child.geometry.boundingBox.getCenter(objCenter);

                            const config = child.userData.partConfig;

                            if (config.keepCADOrigin) {
                                child.geometry.translate(-baseCenter.x, -baseCenter.y, -baseCenter.z);
                            } else {
                                child.geometry.translate(-objCenter.x, -objCenter.y, -objCenter.z);
                            }

                            let pivotX = 0, pivotY = 0, pivotZ = 0;
                            if (config.pivotOffset) {
                                child.geometry.translate(-config.pivotOffset.x, -config.pivotOffset.y, -config.pivotOffset.z);
                                pivotX = config.pivotOffset.x;
                                pivotY = config.pivotOffset.y;
                                pivotZ = config.pivotOffset.z;
                            }

                            child.position.x = pivotX;
                            child.position.y = pivotY;

                            const finalDepth = config.endZ !== undefined ? config.endZ : 18;
                            const endZ = finalDepth + pivotZ;

                            const startZOffset = config.startZ !== undefined ? config.startZ : 50;
                            const startZ = config.spinOnly ? endZ : (startZOffset + pivotZ);

                            child.position.z = startZ;

                            child.userData.startZ = startZ;
                            child.userData.endZ = endZ;
                            child.userData.progress = 0;
                            child.userData.targetProgress = 0;
                            child.userData.startTurns = config.startTurns !== undefined ? config.startTurns : 0;
                            child.userData.turns = config.turns !== undefined ? config.turns : 0.5;
                            child.userData.speed = config.speed !== undefined ? config.speed : 0.02;
                            child.userData.axis = config.axis || 'z';

                            if (config.keyframes) {
                                child.userData.keyframes = config.keyframes;
                                if (config.keyframes[0].x !== undefined) child.position.x = config.keyframes[0].x;
                                if (config.keyframes[0].y !== undefined) child.position.y = config.keyframes[0].y;
                                if (config.keyframes[0].z !== undefined) child.position.z = config.keyframes[0].z;
                                if (config.keyframes[0].rx !== undefined) child.rotation.x = config.keyframes[0].rx;
                                if (config.keyframes[0].ry !== undefined) child.rotation.y = config.keyframes[0].ry;
                                if (config.keyframes[0].rz !== undefined) child.rotation.z = config.keyframes[0].rz;
                            }

                            if (config.states) {
                                child.userData.states = config.states;
                                child.userData.currentState = 0;
                                child.userData.targetProgress = config.states[0];
                                child.userData.progress = config.states[0];
                            }
                        }
                    });

                    const scaleFactor = 0.1;
                    innerGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);

                    wrapper.add(innerGroup);
                    wrapper.position.x = slot.x;
                    wrapper.position.y = slot.y;
                    wrapper.position.z = 0.5;

                    wrapper.userData.type = type;
                    scene.add(wrapper);
                    loadedMeshes.push(wrapper);

                    if (!parts[0].unselectable) {
                        draggableObjects.push(wrapper);
                    }

                    loadingOverlay.style.display = 'none';
                }
            });
        });
    }
}

document.querySelectorAll('.add-piece').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const type = e.target.getAttribute('data-type');
        loadPiece(type);
    });
});

document.querySelectorAll('.change-board').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const type = e.target.getAttribute('data-type');
        loadPiece(type);
    });
});

document.getElementById('reset-scene').addEventListener('click', () => {
    for (let i = loadedMeshes.length - 1; i >= 0; i--) {
        const mesh = loadedMeshes[i];
        if (!mesh.userData.type.startsWith('honeycomb')) {
            scene.remove(mesh);
            if (mesh.isGroup) {
                mesh.children[0].children.forEach(c => {
                    if (c.geometry) c.geometry.dispose();
                });
            } else {
                if (mesh.geometry) mesh.geometry.dispose();
            }
            loadedMeshes.splice(i, 1);

            const dragIndex = draggableObjects.indexOf(mesh);
            if (dragIndex > -1) {
                draggableObjects.splice(dragIndex, 1);
            }
        }
    }
    currentSlotIndex = 0;
});

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedObject = null;
const deleteBtn = document.getElementById('delete-btn');
const rotateBtn = document.getElementById('rotate-btn');

renderer.domElement.addEventListener('pointerdown', (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const infoPanel = document.getElementById('piece-info-panel');

    if (selectedObject) {
        if (selectedObject.isGroup) {
            selectedObject.children[0].children.forEach(mesh => {
                if (mesh.userData.originalMaterial) {
                    mesh.material = mesh.userData.originalMaterial;
                }
            });
        }
        selectedObject = null;
        if (deleteBtn) deleteBtn.style.display = 'none';
        if (rotateBtn) rotateBtn.style.display = 'none';
        if (infoPanel) infoPanel.classList.add('hidden');
    }

    const intersects = raycaster.intersectObjects(loadedMeshes, true);

    if (intersects.length > 0) {
        let object = intersects[0].object;
        while (object.parent && !loadedMeshes.includes(object)) {
            object = object.parent;
        }

        if (loadedMeshes.includes(object)) {
            selectedObject = object;

            if (object.isGroup) {
                const clickedMesh = intersects[0].object;
                const isIndependent = clickedMesh.userData.partConfig && clickedMesh.userData.partConfig.independentClick;

                const meshesToAnimate = isIndependent ? [clickedMesh] : selectedObject.children[0].children;

                meshesToAnimate.forEach(mesh => {
                    if (!mesh.userData.isBase && mesh.userData.startZ !== undefined) {
                        if (mesh.userData.states) {
                            mesh.userData.currentState = (mesh.userData.currentState + 1) % mesh.userData.states.length;
                            mesh.userData.targetProgress = mesh.userData.states[mesh.userData.currentState];
                        } else {
                            mesh.userData.targetProgress = mesh.userData.targetProgress === 1 ? 0 : 1;
                        }
                    }
                });

                selectedObject.children[0].children.forEach(mesh => {
                    if (!mesh.userData.originalMaterial) {
                        mesh.userData.originalMaterial = mesh.material;
                    }
                    mesh.material = mesh.userData.originalMaterial.clone();
                    if (mesh.material.emissive) {
                        mesh.material.emissive.setHex(0x3b82f6);
                        mesh.material.emissiveIntensity = 0.1;
                    }
                });

                if (deleteBtn) deleteBtn.style.display = 'flex';
                if (rotateBtn) rotateBtn.style.display = 'flex';
            }

            const typeStr = object.userData.type;
            const infoData = pieceInfoData[typeStr];
            if (infoPanel && infoData) {
                document.getElementById('info-title').textContent = infoData.title;
                document.getElementById('info-desc').textContent = infoData.desc;
                const specsList = document.getElementById('info-specs');
                specsList.innerHTML = '';
                for (const [key, value] of Object.entries(infoData.specs)) {
                    specsList.innerHTML += `<li><span>${key}</span> <span>${value}</span></li>`;
                }

                if (window.innerWidth <= 768) {
                    infoPanel.classList.add('collapsed');
                } else {
                    infoPanel.classList.remove('collapsed');
                }

                infoPanel.classList.remove('hidden');
            }
        }
    }
});

const infoHeader = document.getElementById('info-header');
if (infoHeader) {
    infoHeader.addEventListener('click', () => {
        document.getElementById('piece-info-panel').classList.toggle('collapsed');
    });
}

if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
        if (selectedObject) {
            scene.remove(selectedObject);
            const indexM = loadedMeshes.indexOf(selectedObject);
            if (indexM > -1) loadedMeshes.splice(indexM, 1);

            const indexD = draggableObjects.indexOf(selectedObject);
            if (indexD > -1) draggableObjects.splice(indexD, 1);

            if (selectedObject.isGroup) {
                selectedObject.children[0].children.forEach(c => {
                    if (c.geometry) c.geometry.dispose();
                });
            }

            selectedObject = null;
            deleteBtn.style.display = 'none';
            if (rotateBtn) rotateBtn.style.display = 'none';
        }
    });
}

if (rotateBtn) {
    rotateBtn.addEventListener('click', () => {
        if (selectedObject) {
            selectedObject.rotation.z += Math.PI / 3;
        }
    });
}

const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const controlsPanel = document.querySelector('.controls');

controlsPanel.classList.add('mobile-hidden');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        controlsPanel.classList.toggle('mobile-hidden');
    });
}

document.querySelectorAll('.add-piece, .change-board').forEach(btn => {
    btn.addEventListener('click', () => {
        controlsPanel.classList.add('mobile-hidden');
    });
});


document.addEventListener('pointerdown', (event) => {
    if (!controlsPanel.classList.contains('mobile-hidden')) {
        if (!controlsPanel.contains(event.target) && !mobileMenuBtn.contains(event.target)) {
            controlsPanel.classList.add('mobile-hidden');
        }
    }
});

let isCentering = false;
const targetCameraPos = new THREE.Vector3(0, 5, 50);
const targetControlPos = new THREE.Vector3(0, 0, 0);

document.getElementById('center-view').addEventListener('click', () => {
    targetCameraPos.set(0, 5, 50);
    targetControlPos.set(0, 0, 0);
    isCentering = true;
});

document.getElementById('view-top').addEventListener('click', () => {
    targetCameraPos.set(0, 60, 0.1);
    targetControlPos.set(0, 0, 0);
    isCentering = true;
});

document.getElementById('view-side').addEventListener('click', () => {
    targetCameraPos.set(50, 5, 0);
    targetControlPos.set(0, 0, 0);
    isCentering = true;
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;

    if (window.innerWidth < 600) {
        camera.zoom = window.innerWidth / 300;
    } else {
        camera.zoom = 1;
    }

    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);

    const time = clock.getElapsedTime();

    if (isCentering) {
        camera.position.lerp(targetCameraPos, 0.015);
        controls.target.lerp(targetControlPos, 0.015);

        if (camera.position.distanceTo(targetCameraPos) < 0.1 && controls.target.distanceTo(targetControlPos) < 0.1) {
            isCentering = false;
            camera.position.copy(targetCameraPos);
            controls.target.copy(targetControlPos);
        }
    }

    loadedMeshes.forEach(wrapper => {
        if (wrapper.userData.targetSnap) {
            wrapper.position.lerp(wrapper.userData.targetSnap, 0.15);
            if (wrapper.position.distanceTo(wrapper.userData.targetSnap) < 0.05) {
                wrapper.position.copy(wrapper.userData.targetSnap);
                wrapper.userData.targetSnap = null;
            }
        }

        if (!wrapper.userData.type.startsWith('honeycomb')) {
            wrapper.children[0].children.forEach(mesh => {
                if (!mesh.userData.isBase && mesh.userData.startZ !== undefined) {
                    const spd = mesh.userData.speed || 0.02;
                    const diff = mesh.userData.targetProgress - mesh.userData.progress;
                    mesh.userData.progress += diff * spd;

                    if (Math.abs(diff) > 0.001) {

                        if (mesh.userData.keyframes) {
                            const keys = mesh.userData.keyframes;
                            const p = mesh.userData.progress;
                            let k1 = keys[0], k2 = keys[keys.length - 1];

                            for (let i = 0; i < keys.length - 1; i++) {
                                if (p >= keys[i].p && p <= keys[i + 1].p) {
                                    k1 = keys[i];
                                    k2 = keys[i + 1];
                                    break;
                                }
                            }

                            const interval = k2.p - k1.p;
                            const t = interval === 0 ? 0 : (p - k1.p) / interval;

                            if (k1.x !== undefined) mesh.position.x = THREE.MathUtils.lerp(k1.x, k2.x, t);
                            if (k1.y !== undefined) mesh.position.y = THREE.MathUtils.lerp(k1.y, k2.y, t);
                            if (k1.z !== undefined) mesh.position.z = THREE.MathUtils.lerp(k1.z, k2.z, t);

                            if (k1.rx !== undefined) mesh.rotation.x = THREE.MathUtils.lerp(k1.rx, k2.rx, t);
                            if (k1.ry !== undefined) mesh.rotation.y = THREE.MathUtils.lerp(k1.ry, k2.ry, t);
                            if (k1.rz !== undefined) mesh.rotation.z = THREE.MathUtils.lerp(k1.rz, k2.rz, t);

                        } else {
                            mesh.position.z = THREE.MathUtils.lerp(mesh.userData.startZ, mesh.userData.endZ, mesh.userData.progress);

                            const turns = mesh.userData.turns;
                            const startTurns = mesh.userData.startTurns;
                            const angulo = THREE.MathUtils.lerp(Math.PI * 2 * startTurns, Math.PI * 2 * turns, mesh.userData.progress);

                            if (mesh.userData.axis === 'x') {
                                mesh.rotation.x = angulo;
                            } else if (mesh.userData.axis === 'y') {
                                mesh.rotation.y = angulo;
                            } else {
                                mesh.rotation.z = angulo;
                            }
                        }

                        if (mesh.userData.partConfig.materialKey === 'lamp') {
                            if (mesh.userData.progress >= 0.95) {
                                mesh.material.emissive.setHex(0xfff5b5);
                                mesh.material.emissiveIntensity = 0.8;
                            } else {
                                mesh.material.emissiveIntensity = 0;
                            }
                        }
                    }
                }
            });
        }
    });

    controls.update();
    renderer.render(scene, camera);
}

let toastTimeout;
function showError(message) {
    const toast = document.getElementById('toast-error');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.add('hidden');
    }, 4000);
}

animate();
loadPiece('honeycomb_l');
