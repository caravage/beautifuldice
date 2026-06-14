import * as THREE from 'three';
import { renderer, scene, camera, world, visualSettings } from './engine.js';
import { rollDice, clearDice, syncMeshes, setDiceSize } from './dice.js';
import { showRolling, showWargameRolling, showResults, showWargameResults, clearResult, clearHistory, showError } from './ui.js';
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

// ============================================
// ROLL MODE — SIMPLE / COMMAND
// ============================================

const modeSimpleBtn = document.getElementById('mode-simple-btn');
const modeCommandBtn = document.getElementById('mode-command-btn');
const modeWargameBtn = document.getElementById('mode-wargame-btn');
const controlsPanel = document.querySelector('.controls');
const commandSection = document.querySelector('.command-section');
const wargameSection = document.querySelector('.wargame-section');
const resultEl = document.getElementById('result');
const wargameResultEl = document.getElementById('wargame-result');

let currentMode = 'simple';

function setMode(mode) {
    currentMode = mode;
    controlsPanel.classList.toggle('hidden', mode !== 'simple');
    commandSection.classList.toggle('hidden', mode !== 'command');
    wargameSection.classList.toggle('hidden', mode !== 'wargame');
    resultEl.classList.toggle('hidden', mode === 'wargame');
    wargameResultEl.classList.toggle('hidden', mode !== 'wargame');
    modeSimpleBtn.classList.toggle('active', mode === 'simple');
    modeCommandBtn.classList.toggle('active', mode === 'command');
    modeWargameBtn.classList.toggle('active', mode === 'wargame');
    if (mode === 'command') commandInput.focus();
}

modeSimpleBtn.addEventListener('click', () => setMode('simple'));
modeCommandBtn.addEventListener('click', () => setMode('command'));
modeWargameBtn.addEventListener('click', () => setMode('wargame'));

document.querySelectorAll('.op-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const text = btn.dataset.insert;
        const start = commandInput.selectionStart ?? commandInput.value.length;
        const end = commandInput.selectionEnd ?? commandInput.value.length;
        commandInput.value = commandInput.value.slice(0, start) + text + commandInput.value.slice(end);
        const pos = start + text.length;
        commandInput.focus();
        commandInput.setSelectionRange(pos, pos);
    });
});

// ============================================
// DICE SIZE
// ============================================

const diceSizeDecBtn = document.getElementById('dice-size-dec');
const diceSizeIncBtn = document.getElementById('dice-size-inc');
const diceSizeValue = document.getElementById('dice-size-value');

const DICE_SIZE_MIN = 1.2;
const DICE_SIZE_MAX = 3.6;
const DICE_SIZE_STEP = 0.2;

let diceSize = 2.4;

function updateDiceSize(size) {
    diceSize = Math.min(DICE_SIZE_MAX, Math.max(DICE_SIZE_MIN, Math.round(size * 10) / 10));
    diceSizeValue.textContent = diceSize.toFixed(1);
    setDiceSize(diceSize);
}

diceSizeDecBtn.addEventListener('click', () => updateDiceSize(diceSize - DICE_SIZE_STEP));
diceSizeIncBtn.addEventListener('click', () => updateDiceSize(diceSize + DICE_SIZE_STEP));

// ============================================
// WARGAME DICE COUNTS
// ============================================

const WARGAME_MAX_TOTAL = 15;

const wargameCounts = { infantry: 0, cavalry: 0, fortress: 0, ship: 0 };

function wargameTotal() {
    return Object.values(wargameCounts).reduce((a, b) => a + b, 0);
}

function updateWargameCount(type, delta) {
    const next = wargameCounts[type] + delta;
    if (next < 0) return;
    if (delta > 0 && wargameTotal() >= WARGAME_MAX_TOTAL) return;
    wargameCounts[type] = next;
    document.getElementById(`count-${type}`).textContent = next;
}

document.querySelectorAll('.wargame-count-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        updateWargameCount(btn.dataset.type, parseInt(btn.dataset.delta, 10));
    });
});

async function executeRoll() {
    let count;
    let condition = null;
    const wargame = currentMode === 'wargame';

    if (currentMode === 'command') {
        const cmd = commandInput.value.trim();
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
    } else if (wargame) {
        count = Object.entries(wargameCounts).flatMap(([type, n]) => Array(n).fill(type));
        if (count.length === 0) {
            showError('Select at least one die');
            return;
        }
    } else {
        count = Math.max(1, Math.min(15, parseInt(diceCountInput.value) || 1));
        diceCountInput.value = count;
    }

    rollBtn.disabled = true;
    if (wargame) showWargameRolling(); else showRolling();

    const results = await rollDice(count);
    if (wargame) showWargameResults(results); else showResults(results, condition);
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
