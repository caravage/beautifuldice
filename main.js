import * as THREE from 'three';
import { renderer, scene, camera, world } from './engine.js';
import { rollDice, clearDice, syncMeshes } from './dice.js';
import { showRolling, showResults, clearResult, clearHistory } from './ui.js';

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
// EVENT LISTENERS
// ============================================

const rollBtn = document.getElementById('roll-btn');
const resetBtn = document.getElementById('reset-btn');
const diceCountInput = document.getElementById('dice-count');

rollBtn.addEventListener('click', async () => {
    const count = Math.max(1, Math.min(15, parseInt(diceCountInput.value) || 1));
    diceCountInput.value = count;

    rollBtn.disabled = true;
    showRolling();

    const results = await rollDice(count);
    showResults(results);
    rollBtn.disabled = false;
});

resetBtn.addEventListener('click', () => {
    clearDice();
    rollBtn.disabled = false;
    clearResult();
});

document.getElementById('clear-history').addEventListener('click', clearHistory);
