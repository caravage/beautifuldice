import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { scene, world, physicsMaterials } from './engine.js';
import { DIE_TYPES, ICON_PATH } from './wargame.js';

let DICE_SIZE = 2.4;

function setDiceSize(size) {
    DICE_SIZE = size;
}

// Face order for BoxGeometry materials: +X, -X, +Y, -Y, +Z, -Z
const FACE_DIRS = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1)
];

// Pip values for a standard d6, in the same face order as FACE_DIRS
const FACE_VALUES = [2, 5, 3, 4, 1, 6];

// All live dice on the board
const dice = [];

// ============================================
// TEXTURES — PIP DICE (d6)
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

function createDiceMaterials() {
    return FACE_VALUES.map(val => new THREE.MeshStandardMaterial({
        map: createFaceTexture(val),
        roughness: 0.3,
        metalness: 0.1
    }));
}

// ============================================
// TEXTURES — WARGAME DICE
// ============================================

const textureLoader = new THREE.TextureLoader();
const iconTextureCache = new Map();

function getIconTexture(icon) {
    let texture = iconTextureCache.get(icon);
    if (!texture) {
        texture = textureLoader.load(ICON_PATH + icon);
        iconTextureCache.set(icon, texture);
    }
    return texture;
}

function createWargameMaterials(type) {
    return DIE_TYPES[type].faces.map(face => new THREE.MeshStandardMaterial({
        map: getIconTexture(face.icon),
        roughness: 0.3,
        metalness: 0.1
    }));
}

// ============================================
// CREATE / CLEAR
// ============================================

function createDie(type = 'd6') {
    const radius = DICE_SIZE * 0.08;
    const geometry = new RoundedBoxGeometry(DICE_SIZE, DICE_SIZE, DICE_SIZE, 2, radius);

    const materials = type === 'd6' ? createDiceMaterials() : createWargameMaterials(type);
    const mesh = new THREE.Mesh(geometry, materials);
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

    const die = { mesh, body, size: DICE_SIZE, type, nudgeAttempts: 0 };
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
                // Wargame icon textures are cached and shared across rolls
                if (die.type === 'd6' && m.map) m.map.dispose();
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

/**
 * Rolls a set of dice. `spec` is either a number (rolls that many
 * standard d6) or an array of die type strings, e.g.
 * ['d6', 'd6'] or ['infantry', 'infantry', 'ship'].
 */
function rollDice(spec) {
    if (isRolling) return Promise.resolve([]);
    isRolling = true;

    clearDice();

    const types = Array.isArray(spec) ? spec : Array(spec).fill('d6');

    types.forEach(type => {
        const die = createDie(type);

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
    });

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

            if (!allStopped) return;

            // A die can come to rest balanced on an edge or corner. Give
            // it a few small nudges so it falls flat naturally; if it
            // keeps landing on an edge, flatten it directly.
            let unsettled = false;
            dice.forEach(die => {
                const resting = getRestingFace(die);
                if (resting.dot >= SETTLE_DOT_THRESHOLD) return;

                unsettled = true;
                if (die.nudgeAttempts < MAX_NUDGE_ATTEMPTS) {
                    die.nudgeAttempts++;
                    die.body.angularVelocity.set(
                        (Math.random() - 0.5) * 6,
                        (Math.random() - 0.5) * 6,
                        (Math.random() - 0.5) * 6
                    );
                    die.body.velocity.y += 2;
                    die.body.wakeUp();
                } else {
                    flattenDie(die, resting);
                }
            });
            if (unsettled) return;

            clearInterval(checkInterval);
            setTimeout(() => {
                const results = readResults();
                isRolling = false;
                resolve(results);
            }, 300);
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

const UP = new THREE.Vector3(0, 1, 0);

// How aligned a face normal must be with "up" to count as resting flat
// (1 = perfectly flat, ~0.7 = balanced on an edge, ~0.58 = on a corner)
const SETTLE_DOT_THRESHOLD = 0.97;

// Number of physics nudges to try before forcing the die flat
const MAX_NUDGE_ATTEMPTS = 3;

/** Returns the face index most aligned with "up" and how flat it's resting (1 = flat) */
function getRestingFace(die) {
    const q = new THREE.Quaternion(
        die.body.quaternion.x,
        die.body.quaternion.y,
        die.body.quaternion.z,
        die.body.quaternion.w
    );

    let maxDot = -Infinity;
    let faceIndex = 0;

    FACE_DIRS.forEach((dir, i) => {
        const dot = dir.clone().applyQuaternion(q).dot(UP);
        if (dot > maxDot) {
            maxDot = dot;
            faceIndex = i;
        }
    });

    return { faceIndex, dot: maxDot };
}

/** Rotates a stuck die so its resting face points straight up, and rests it on the floor */
function flattenDie(die, resting) {
    const dir = FACE_DIRS[resting.faceIndex];
    const q = new THREE.Quaternion(
        die.body.quaternion.x,
        die.body.quaternion.y,
        die.body.quaternion.z,
        die.body.quaternion.w
    );

    const currentUp = dir.clone().applyQuaternion(q).normalize();
    const correction = new THREE.Quaternion().setFromUnitVectors(currentUp, UP);
    const flattened = correction.multiply(q);

    die.body.quaternion.set(flattened.x, flattened.y, flattened.z, flattened.w);
    die.body.position.y = die.size / 2;
    die.body.velocity.setZero();
    die.body.angularVelocity.setZero();
}

/** Builds the result for a single die: a pip number for 'd6', or a face descriptor for wargame dice */
function buildResult(die) {
    const { faceIndex } = getRestingFace(die);
    if (die.type === 'd6') return FACE_VALUES[faceIndex];

    const face = DIE_TYPES[die.type].faces[faceIndex];
    return { type: die.type, icon: face.icon, label: face.label, categories: face.categories };
}

function readResults() {
    return dice.map(buildResult);
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

export { dice, isRolling, rollDice, clearDice, syncMeshes, setDiceSize };
