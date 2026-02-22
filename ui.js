// ============================================
// RESULT DISPLAY
// ============================================

const resultEl = document.getElementById('result');

function showRolling() {
    resultEl.textContent = 'Rolling\u2026';
}

function showResults(results) {
    const total = results.reduce((a, b) => a + b, 0);
    resultEl.textContent = results.join(' + ') + ' = ' + total;
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
        historyEl.innerHTML = '<div class="empty-history">No rolls yet</div>';
        return;
    }

    historyEl.innerHTML = history.map(entry => {
        const pips = entry.results
            .map(r => `<span class="history-pip">${r}</span>`)
            .join('');
        return `
            <div class="history-row">
                <div class="history-dice">${pips}</div>
                <span class="history-total">${entry.total}</span>
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
