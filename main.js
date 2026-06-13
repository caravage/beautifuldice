import * as THREE from 'three';
import { renderer, scene, camera, world } from './engine.js';
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

/** Execute a roll — either from command input or dice count */
async function executeRoll() {
    const cmd = commandInput.value.trim();

    let count;
    let condition = null;

    if (cmd) {
        // Command mode
        try {
            const parsed = parse(cmd);
            count = parsed.count;
            condition = parsed.condition;

            // Currently only d6 is supported in 3D
            if (parsed.sides !== 6) {
                showError('Only d6 is supported for 3D rolling');
                return;
            }
        } catch (e) {
            showError(e.message);
            return;
        }
    } else {
        // Simple mode
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
// EVENT LISTENERS
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
