import * as THREE from 'three';

// ============================================
// SKIN: CLASSIC (canvas-generated white dice with black dots)
// ============================================

function createClassicTexture(value) {
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
// SKIN: REALISTIC (image files from root folder)
// ============================================

// Expected files in root:
//   1_dot.png, 2_dots.png, 3_dots.png, 4_dots.png, 5_dots.png, 6_dots.png
const realisticTextureCache = {};
const textureLoader = new THREE.TextureLoader();

function createRealisticTexture(value) {
    const filename = value === 1 ? '1_dot.png' : `${value}_dots.png`;

    if (!realisticTextureCache[value]) {
        realisticTextureCache[value] = textureLoader.load(filename);
    }
    return realisticTextureCache[value];
}

// ============================================
// SKIN REGISTRY
// ============================================

const SKINS = {
    classic: {
        label: 'Classic',
        createTexture: createClassicTexture,
        roughness: 0.3,
        metalness: 0.1
    },
    realistic: {
        label: 'Realistic',
        createTexture: createRealisticTexture,
        roughness: 0.45,
        metalness: 0.05
    }
};

const skinOrder = Object.keys(SKINS);
let currentSkinIndex = 0;
let currentSkinKey = skinOrder[0];

/** Cycle to the next skin and return its key */
function cycleSkin() {
    currentSkinIndex = (currentSkinIndex + 1) % skinOrder.length;
    currentSkinKey = skinOrder[currentSkinIndex];
    return currentSkinKey;
}

/** Get the currently active skin object */
function getCurrentSkin() {
    return SKINS[currentSkinKey];
}

export { SKINS, cycleSkin, getCurrentSkin };
