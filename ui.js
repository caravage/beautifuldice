// ============================================
// RESULT DISPLAY
// ============================================

const resultEl = document.getElementById('result');

function showRolling() {
    resultEl.textContent = 'Rolling...';
}

function showResults(results) {
    const total = results.reduce((a, b) => a + b, 0);
    resultEl.textContent = `Results: [${results.join(', ')}] = ${total}`;
    addToHistory(results, total);
}

function clearResult() {
    resultEl.textContent = '';
}

// ============================================
// ROLL HISTORY
// ============================================

let history = [];
const historyEl = document.getElementById('history');

function addToHistory(results, total) {
    const sorted = [...results].sort((a, b) => b - a);
    history.unshift({ results: sorted, total, time: new Date() });
    if (history.length > 50) history = history.slice(0, 50);
    renderHistory();
}

function renderHistory() {
    if (history.length === 0) {
        historyEl.innerHTML = '<div class="empty-history">No rolls yet. Click ROLL to start!</div>';
        return;
    }

    historyEl.innerHTML = history.map(entry => {
        const diceHtml = entry.results.map(r => `<div class="history-die">${r}</div>`).join('');
        const timeStr = entry.time.toLocaleTimeString();
        return `
            <div class="history-entry">
                <div class="history-dice">${diceHtml}</div>
                <div>
                    <span class="history-total">= ${entry.total}</span>
                    <span class="history-time">${timeStr}</span>
                </div>
            </div>
        `;
    }).join('');
}

function clearHistory() {
    history = [];
    renderHistory();
}

// Init
renderHistory();

export { showRolling, showResults, clearResult, clearHistory };
