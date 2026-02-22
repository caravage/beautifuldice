import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// ============================================
// THREE.JS SCENE
// ============================================

const container = document.getElementById('canvas-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a);

const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
);
camera.position.set(0, 30, 0);
camera.lookAt(0, 0, 0);
camera.up.set(0, 0, -1);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -20;
directionalLight.shadow.camera.right = 20;
directionalLight.shadow.camera.top = 20;
directionalLight.shadow.camera.bottom = -20;
scene.add(directionalLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
fillLight.position.set(-10, 10, -10);
scene.add(fillLight);

// ============================================
// CANNON PHYSICS WORLD
// ============================================

const world = new CANNON.World();
world.gravity.set(0, -40, 0);
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 20;
world.allowSleep = true;

const physicsMaterials = {
    dice: new CANNON.Material('dice'),
    floor: new CANNON.Material('floor'),
    wall: new CANNON.Material('wall')
};

world.addContactMaterial(new CANNON.ContactMaterial(
    physicsMaterials.dice, physicsMaterials.floor,
    { friction: 0.4, restitution: 0.3 }
));
world.addContactMaterial(new CANNON.ContactMaterial(
    physicsMaterials.dice, physicsMaterials.wall,
    { friction: 0.2, restitution: 0.5 }
));
world.addContactMaterial(new CANNON.ContactMaterial(
    physicsMaterials.dice, physicsMaterials.dice,
    { friction: 0.3, restitution: 0.4 }
));

// ============================================
// HEXAGONAL ARENA
// ============================================

const ARENA = {
    radius: 12,
    wallHeight: 50,
    edgeThickness: 0.15,
    sides: 6,
    rotation: 0
};

function buildArena() {
    // Hex floor shape
    const shape = new THREE.Shape();
    for (let i = 0; i < ARENA.sides; i++) {
        const angle = (i / ARENA.sides) * Math.PI * 2 + ARENA.rotation;
        const x = Math.cos(angle) * ARENA.radius;
        const y = Math.sin(angle) * ARENA.radius;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    }
    shape.closePath();

    // Visual floor
    const floorGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false });
    floorGeo.rotateX(-Math.PI / 2);
    const floorMesh = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({
        color: 0x2d5a3d, roughness: 0.9, metalness: 0.0
    }));
    floorMesh.position.y = -0.3;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Physics floor
    const floorBody = new CANNON.Body({ mass: 0, material: physicsMaterials.floor });
    floorBody.addShape(new CANNON.Plane());
    floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(floorBody);

    // Edges + walls
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.5, metalness: 0.2 });

    for (let i = 0; i < ARENA.sides; i++) {
        const a1 = (i / ARENA.sides) * Math.PI * 2 + ARENA.rotation;
        const a2 = ((i + 1) / ARENA.sides) * Math.PI * 2 + ARENA.rotation;

        const x1 = Math.cos(a1) * ARENA.radius, z1 = Math.sin(a1) * ARENA.radius;
        const x2 = Math.cos(a2) * ARENA.radius, z2 = Math.sin(a2) * ARENA.radius;

        const len = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
        const angle = Math.atan2(z2 - z1, x2 - x1);
        const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;

        // Visual edge
        const edgeMesh = new THREE.Mesh(
            new THREE.BoxGeometry(len, 3, ARENA.edgeThickness),
            edgeMat
        );
        edgeMesh.position.set(cx, 1.5, cz);
        edgeMesh.rotation.y = -angle;
        edgeMesh.castShadow = true;
        edgeMesh.receiveShadow = true;
        scene.add(edgeMesh);

        // Physics wall
        const wallBody = new CANNON.Body({ mass: 0, material: physicsMaterials.wall });
        wallBody.addShape(new CANNON.Box(new CANNON.Vec3(len / 2 + 1, ARENA.wallHeight / 2, 1.5)));
        wallBody.position.set(cx, ARENA.wallHeight / 2, cz);
        wallBody.quaternion.setFromEuler(0, -angle, 0);
        world.addBody(wallBody);
    }
}

buildArena();

// ============================================
// RESIZE HANDLER
// ============================================

window.addEventListener('resize', () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
});

export { scene, camera, renderer, world, physicsMaterials };
