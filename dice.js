import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { scene, world, physicsMaterials } from './engine.js';

const DICE_SIZE = 2.4;

// Face order for BoxGeometry: +X, -X, +Y, -Y, +Z, -Z
const FACE_VALUES = [2, 5, 3, 4, 1, 6];

// All live dice on the board
const dice = [];

// ============================================
// TEXTURES
// ============================================

function createFaceTexture(value) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 248, 248);

    const dotPositions = {
        1: [[128, 128]],
        2: [[64, 64], [192, 192]],
        3: [[64, 64], [128, 128], [192, 192]],
        4: [[64, 64], [192, 64], [64, 192], [192, 192]],
        5: [[64, 64], [192, 64], [128, 128], [64, 192], [192, 192]],
        6: [[64, 64], [64, 128], [64, 192], [192, 64], [192, 128], [192, 192]]
    };

    ctx.fillStyle = '#000000';
    const positions = dotPositions[value];
    const dotRadius = value === 1 ? 30 : 22;

    positions.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

// ============================================
// MATERIALS
// ============================================

function createDiceMaterials() {
    return FACE_VALUES.map(val => new THREE.MeshStandardMaterial({
        map: createFaceTexture(val),
        roughness: 0.3,
        metalness: 0.1
    }));
}

// ============================================
// CREATE / CLEAR
// ============================================

function createDie() {
    const geometry = new THREE.BoxGeometry(DICE_SIZE, DICE_SIZE, DICE_SIZE, 1, 1, 1);

    // Slightly round the corners
    const posAttr = geometry.getAttribute('position');
    const v = new THREE.Vector3();
    const roundFactor = 0.30;
    const threshold = DICE_SIZE / 2 - 0.01;

    for (let i = 0; i < posAttr.count; i++) {
        v.fromBufferAttribute(posAttr, i);
        if (Math.abs(v.x) > threshold &&
            Math.abs(v.y) > threshold &&
            Math.abs(v.z) > threshold) {
            v.multiplyScalar(1 - roundFactor);
        }
        posAttr.setXYZ(i, v.x, v.y, v.z);
    }
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, createDiceMaterials());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const body = new CANNON.Body({
        mass: 1,
        shape: new CANNON.Box(new CANNON.Vec3(DICE_SIZE / 2, DICE_SIZE / 2, DICE_SIZE / 2)),
        material: physicsMaterials.dice,
        angularDamping: 0.3,
        linearDamping: 0.1
    });
    world.addBody(body);

    const die = { mesh, body };
    dice.push(die);
    return die;
}

function clearDice() {
    dice.forEach(die => {
        scene.remove(die.mesh);
        world.removeBody(die.body);
        die.mesh.geometry.dispose();
        if (Array.isArray(die.mesh.material)) {
            die.mesh.material.forEach(m => {
                if (m.map) m.map.dispose();
                m.dispose();
            });
        }
    });
    dice.length = 0;
}

// ============================================
// ROLLING
// ============================================

let isRolling = false;

function rollDice(count) {
    if (isRolling) return;
    isRolling = true;

    clearDice();

    for (let i = 0; i < count; i++) {
        const die = createDie();

        // Random spawn within a small central area
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 4;
        die.body.position.set(
            Math.cos(angle) * radius,
            8 + Math.random() * 4,
            Math.sin(angle) * radius
        );

        // Random initial rotation
        die.body.quaternion.setFromEuler(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );

        die.body.velocity.setZero();
        die.body.angularVelocity.setZero();

        // Randomized throw impulse
        const strength = 8 + Math.random() * 20;
        const throwAngle = Math.random() * Math.PI * 2;
        die.body.applyImpulse(
            new CANNON.Vec3(
                Math.cos(throwAngle) * strength,
                -2 - Math.random() * 5,
                Math.sin(throwAngle) * strength
            ),
            new CANNON.Vec3(0, 0, 0)
        );

        // Randomized spin
        const spin = 10 + Math.random() * 25;
        die.body.angularVelocity.set(
            (Math.random() - 0.5) * spin,
            (Math.random() - 0.5) * spin,
            (Math.random() - 0.5) * spin
        );

        die.body.wakeUp();
    }

    return waitForStop();
}

/** Returns a Promise that resolves with the results array once dice stop */
function waitForStop() {
    return new Promise(resolve => {
        const checkInterval = setInterval(() => {
            const allStopped = dice.every(die =>
                die.body.velocity.length() < 0.1 &&
                die.body.angularVelocity.length() < 0.1
            );

            if (allStopped) {
                clearInterval(checkInterval);
                setTimeout(() => {
                    const results = readResults();
                    isRolling = false;
                    resolve(results);
                }, 300);
            }
        }, 100);

        // Safety timeout
        setTimeout(() => {
            if (isRolling) {
                clearInterval(checkInterval);
                const results = readResults();
                isRolling = false;
                resolve(results);
            }
        }, 10000);
    });
}

// ============================================
// READING RESULTS
// ============================================

const FACE_DIRS = [
    { dir: new THREE.Vector3(1, 0, 0),  value: 2 },
    { dir: new THREE.Vector3(-1, 0, 0), value: 5 },
    { dir: new THREE.Vector3(0, 1, 0),  value: 3 },
    { dir: new THREE.Vector3(0, -1, 0), value: 4 },
    { dir: new THREE.Vector3(0, 0, 1),  value: 1 },
    { dir: new THREE.Vector3(0, 0, -1), value: 6 }
];

function readResults() {
    const up = new THREE.Vector3(0, 1, 0);

    return dice.map(die => {
        const q = new THREE.Quaternion(
            die.body.quaternion.x,
            die.body.quaternion.y,
            die.body.quaternion.z,
            die.body.quaternion.w
        );

        let maxDot = -Infinity;
        let result = 1;

        FACE_DIRS.forEach(face => {
            const rotated = face.dir.clone().applyQuaternion(q);
            const dot = rotated.dot(up);
            if (dot > maxDot) {
                maxDot = dot;
                result = face.value;
            }
        });

        return result;
    });
}

// ============================================
// SYNC (called each frame from main loop)
// ============================================

function syncMeshes() {
    dice.forEach(die => {
        die.mesh.position.copy(die.body.position);
        die.mesh.quaternion.copy(die.body.quaternion);
    });
}

export { dice, isRolling, rollDice, clearDice, syncMeshes };
