import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { scene, world, physicsMaterials } from './engine.js';

let DICE_SIZE = 2.4;

function setDiceSize(size) {
    DICE_SIZE = size;
}

// Face order for BoxGeometry: +X, -X, +Y, -Y, +Z, -Z
const FACE_VALUES = [2, 5, 3, 4, 1, 6];

// A d10 is drawn a little larger than a d6 so the two read as the same size
const D10_RADIUS_RATIO = 0.6;

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

function createNumberTexture(value) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, 256, 256);

    const label = String(value);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${label.length > 1 ? 76 : 96}px 'Libre Franklin', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 128, 128);

    // 6 and 9 are indistinguishable upside down, so underline them
    if (value === 6 || value === 9) {
        const w = ctx.measureText(label).width;
        ctx.fillRect(128 - w / 2, 184, w, 8);
    }

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

function createD10Materials() {
    return D10_SHAPE.faces.map((_, i) => new THREE.MeshStandardMaterial({
        map: createNumberTexture(i + 1),
        roughness: 0.3,
        metalness: 0.1
    }));
}

// ============================================
// D10 SHAPE — PENTAGONAL TRAPEZOHEDRON
// ============================================

/**
 * The 10-sided die: two apexes plus ten alternating equator vertices, giving
 * ten kite-shaped faces. Faces are wound counter-clockwise seen from outside,
 * which is what both THREE and CANNON expect.
 */
function buildD10Shape() {
    const c = Math.cos(Math.PI / 5);

    // The one equator offset that leaves every kite perfectly planar
    const ringY = (1 - c) / (1 + c);

    const vertices = [];
    for (let i = 0; i < 10; i++) {
        const a = (Math.PI * 2 * i) / 10;
        vertices.push(new THREE.Vector3(
            Math.cos(a),
            i % 2 === 0 ? ringY : -ringY,
            Math.sin(a)
        ));
    }

    const TOP = vertices.push(new THREE.Vector3(0, 1, 0)) - 1;
    const BOTTOM = vertices.push(new THREE.Vector3(0, -1, 0)) - 1;

    // Even faces hang off the top apex, odd faces off the bottom one. The two
    // halves are mirror images, so they wind in opposite directions.
    const faces = [];
    for (let i = 0; i < 10; i++) {
        const ring = [i, (i + 1) % 10, (i + 2) % 10];
        if (i % 2 === 0) {
            faces.push([TOP, ...ring.reverse()]);
        } else {
            faces.push([BOTTOM, ...ring]);
        }
    }

    return { vertices, faces };
}

const D10_SHAPE = buildD10Shape();

/** Outward normal of a face, from its first three (counter-clockwise) vertices */
function faceNormal(points) {
    return new THREE.Vector3()
        .subVectors(points[1], points[0])
        .cross(new THREE.Vector3().subVectors(points[2], points[0]))
        .normalize();
}

function createD10Geometry(radius) {
    const verts = D10_SHAPE.vertices.map(v => v.clone().multiplyScalar(radius));
    const position = [];
    const normal = [];
    const uv = [];
    const geometry = new THREE.BufferGeometry();

    D10_SHAPE.faces.forEach((face, faceIndex) => {
        const p = face.map(i => verts[i]);
        const n = faceNormal(p);

        const centroid = new THREE.Vector3();
        p.forEach(v => centroid.add(v));
        centroid.divideScalar(p.length);

        // Flatten the kite into its own plane so the number lands centred on it.
        // uAxis x vAxis must equal the outward normal, otherwise the texture
        // comes out mirrored when read from outside the die.
        const vAxis = new THREE.Vector3().subVectors(p[0], centroid).normalize();
        const uAxis = new THREE.Vector3().crossVectors(vAxis, n).normalize();
        const flat = p.map(v => {
            const d = new THREE.Vector3().subVectors(v, centroid);
            return [d.dot(uAxis), d.dot(vAxis)];
        });
        const extent = Math.max(...flat.map(([x, y]) => Math.max(Math.abs(x), Math.abs(y)))) * 1.05;
        const uvs = flat.map(([x, y]) => [0.5 + x / (2 * extent), 0.5 + y / (2 * extent)]);

        // Fan-triangulate the kite from its apex: two triangles, six vertices
        for (let t = 1; t < p.length - 1; t++) {
            [0, t, t + 1].forEach(k => {
                position.push(p[k].x, p[k].y, p[k].z);
                normal.push(n.x, n.y, n.z);
                uv.push(uvs[k][0], uvs[k][1]);
            });
        }

        geometry.addGroup(faceIndex * 6, 6, faceIndex);
    });

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return geometry;
}

function createD10CollisionShape(radius) {
    return new CANNON.ConvexPolyhedron({
        vertices: D10_SHAPE.vertices.map(v =>
            new CANNON.Vec3(v.x * radius, v.y * radius, v.z * radius)
        ),
        faces: D10_SHAPE.faces.map(f => f.slice())
    });
}

// ============================================
// FACE TABLES
// ============================================
//
// Each die carries the list of its faces: the outward normal in local space,
// the value printed there, and how far the face sits from the die's centre
// (used to drop a stuck die flat onto the floor).

const UP = new THREE.Vector3(0, 1, 0);

const FACE_DIRS = [
    { dir: new THREE.Vector3(1, 0, 0),  value: 2 },
    { dir: new THREE.Vector3(-1, 0, 0), value: 5 },
    { dir: new THREE.Vector3(0, 1, 0),  value: 3 },
    { dir: new THREE.Vector3(0, -1, 0), value: 4 },
    { dir: new THREE.Vector3(0, 0, 1),  value: 1 },
    { dir: new THREE.Vector3(0, 0, -1), value: 6 }
];

function d6Faces(size) {
    return FACE_DIRS.map(f => ({ dir: f.dir.clone(), value: f.value, dist: size / 2 }));
}

function d10Faces(radius) {
    return D10_SHAPE.faces.map((face, i) => {
        const p = face.map(idx => D10_SHAPE.vertices[idx].clone().multiplyScalar(radius));
        const dir = faceNormal(p);
        return { dir, value: i + 1, dist: Math.abs(dir.dot(p[0])) };
    });
}

// ============================================
// CREATE / CLEAR
// ============================================

function createDie(sides) {
    let mesh;
    let shape;
    let faces;

    if (sides === 10) {
        const radius = DICE_SIZE * D10_RADIUS_RATIO;
        mesh = new THREE.Mesh(createD10Geometry(radius), createD10Materials());
        shape = createD10CollisionShape(radius);
        faces = d10Faces(radius);
    } else {
        const radius = DICE_SIZE * 0.08;
        const geometry = new RoundedBoxGeometry(DICE_SIZE, DICE_SIZE, DICE_SIZE, 2, radius);
        mesh = new THREE.Mesh(geometry, createDiceMaterials());
        shape = new CANNON.Box(new CANNON.Vec3(DICE_SIZE / 2, DICE_SIZE / 2, DICE_SIZE / 2));
        faces = d6Faces(DICE_SIZE);
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const body = new CANNON.Body({
        mass: 1,
        shape,
        material: physicsMaterials.dice,
        angularDamping: 0.3,
        linearDamping: 0.1
    });
    world.addBody(body);

    const die = { mesh, body, faces, nudgeAttempts: 0 };
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

function rollDice(count, sides = 6) {
    if (isRolling) return Promise.resolve([]);
    isRolling = true;

    clearDice();

    for (let i = 0; i < count; i++) {
        const die = createDie(sides);

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

// How aligned a face normal must be with "up" to count as resting flat
// (1 = perfectly flat, ~0.7 = balanced on an edge, ~0.58 = on a corner)
const SETTLE_DOT_THRESHOLD = 0.97;

// Number of physics nudges to try before forcing the die flat
const MAX_NUDGE_ATTEMPTS = 3;

/** Returns the face pointing most nearly up, and how flat it's resting (1 = flat) */
function getRestingFace(die) {
    const q = new THREE.Quaternion(
        die.body.quaternion.x,
        die.body.quaternion.y,
        die.body.quaternion.z,
        die.body.quaternion.w
    );

    let maxDot = -Infinity;
    let best = die.faces[0];

    die.faces.forEach(face => {
        const dot = face.dir.clone().applyQuaternion(q).dot(UP);
        if (dot > maxDot) {
            maxDot = dot;
            best = face;
        }
    });

    return { face: best, value: best.value, dot: maxDot };
}

/** Rotates a stuck die so its resting face points straight up, and rests it on the floor */
function flattenDie(die, resting) {
    const q = new THREE.Quaternion(
        die.body.quaternion.x,
        die.body.quaternion.y,
        die.body.quaternion.z,
        die.body.quaternion.w
    );

    const currentUp = resting.face.dir.clone().applyQuaternion(q).normalize();
    const correction = new THREE.Quaternion().setFromUnitVectors(currentUp, UP);
    const flattened = correction.multiply(q);

    die.body.quaternion.set(flattened.x, flattened.y, flattened.z, flattened.w);
    die.body.position.y = resting.face.dist;
    die.body.velocity.setZero();
    die.body.angularVelocity.setZero();
}

function readResults() {
    return dice.map(die => getRestingFace(die).value);
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
