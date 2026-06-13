import * as THREE from 'three';
import { renderer, scene, camera, world, visualSettings } from './engine.js';
import { rollDice, clearDice, syncMeshes } from './dice.js';
import { showRolling, showResults, clearResult, clearHistory, showError } from './ui.js';
import { parse } from './parser.js';

// ============================================
// ANIMATION LOOP
// ============================================

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    world.step(1 / 60, delta, 3);
    syncMeshes();
    renderer.render(scene, camera);
}

animate();

// ============================================
// ROLL LOGIC
// ============================================

const rollBtn = document.getElementById('roll-btn');
const resetBtn = document.getElementById('reset-btn');
const diceCountInput = document.getElementById('dice-count');
const commandInput = document.getElementById('command-input');

async function executeRoll() {
    const cmd = commandInput.value.trim();
    let count;
    let condition = null;

    if (cmd) {
        try {
            const parsed = parse(cmd);
            count = parsed.count;
            condition = parsed.condition;
            if (parsed.sides !== 6) {
                showError('Only d6 is supported for 3D rolling');
                return;
            }
        } catch (e) {
            showError(e.message);
            return;
        }
    } else {
        count = Math.max(1, Math.min(15, parseInt(diceCountInput.value) || 1));
        diceCountInput.value = count;
    }

    rollBtn.disabled = true;
    showRolling();

    const results = await rollDice(count);
    showResults(results, condition);
    rollBtn.disabled = false;
}

// ============================================
// EVENT LISTENERS — ROLLING
// ============================================

rollBtn.addEventListener('click', executeRoll);

commandInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        executeRoll();
    }
});

resetBtn.addEventListener('click', () => {
    clearDice();
    rollBtn.disabled = false;
    clearResult();
});

document.getElementById('clear-history').addEventListener('click', clearHistory);

// ============================================
// EVENT LISTENERS — VISUAL SETTINGS
// ============================================

document.getElementById('setting-shadows').addEventListener('change', (e) => {
    visualSettings.setShadows(e.target.checked);
});

document.getElementById('setting-shadow-quality').addEventListener('change', (e) => {
    visualSettings.setShadowQuality(e.target.value);
});

document.getElementById('setting-elevation').addEventListener('input', (e) => {
    visualSettings.setCameraElevation(parseFloat(e.target.value));
    document.getElementById('val-elevation').textContent = e.target.value + '\u00b0';
});

document.getElementById('setting-distance').addEventListener('input', (e) => {
    visualSettings.setCameraDistance(parseFloat(e.target.value));
    document.getElementById('val-distance').textContent = e.target.value;
});

document.getElementById('setting-rotation').addEventListener('input', (e) => {
    visualSettings.setCameraRotation(parseFloat(e.target.value));
    document.getElementById('val-rotation').textContent = e.target.value + '\u00b0';
});

document.getElementById('setting-ambient').addEventListener('input', (e) => {
    visualSettings.setAmbientIntensity(parseFloat(e.target.value));
    document.getElementById('val-ambient').textContent = parseFloat(e.target.value).toFixed(1);
});

document.getElementById('setting-directional').addEventListener('input', (e) => {
    visualSettings.setDirectionalIntensity(parseFloat(e.target.value));
    document.getElementById('val-directional').textContent = parseFloat(e.target.value).toFixed(1);
});
