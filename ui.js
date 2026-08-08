import { matches } from './parser.js';

// ============================================
// RESULT DISPLAY
// ============================================

const resultEl = document.getElementById('result');

function showRolling() {
    resultEl.textContent = 'Rolling…';
}

function showResults(results, condition) {
    const total = results.reduce((a, b) => a + b, 0);

    if (!condition) {
        resultEl.textContent = results.join(' + ') + ' = ' + total;
    } else {
        resultEl.innerHTML = '';
        results.forEach((r, i) => {
            if (i > 0) resultEl.append(' + ');
            const span = document.createElement('span');
            span.textContent = r;
            if (matches(r, condition)) span.classList.add('result-hit');
            resultEl.appendChild(span);
        });
        resultEl.append(` = ${total}`);

        const successes = results.filter(r => matches(r, condition)).length;
        const tag = document.createElement('span');
        tag.classList.add('result-successes');
        tag.textContent = `${successes} hit${successes !== 1 ? 's' : ''}`;
        resultEl.appendChild(tag);
    }

    addToHistory(results, total, condition);
}

function clearResult() {
    resultEl.textContent = '';
}

function showError(msg) {
    resultEl.textContent = msg;
    resultEl.classList.add('result-error');
    setTimeout(() => resultEl.classList.remove('result-error'), 2000);
}

// ============================================
// ROLL HISTORY
// ============================================

let history = [];
const historyEl = document.getElementById('history');

function addToHistory(results, total, condition) {
    const sorted = [...results].sort((a, b) => b - a);
    history.unshift({ results: sorted, total, condition, time: new Date() });
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
            .map(r => {
                const hit = matches(r, entry.condition);
                return `<span class="history-pip${hit ? ' history-hit' : ''}">${r}</span>`;
            })
            .join('');

        let totalHtml = `<span class="history-total">${entry.total}</span>`;
        if (entry.condition) {
            const hits = entry.results.filter(r => matches(r, entry.condition)).length;
            totalHtml += `<span class="history-hits">${hits}h</span>`;
        }

        return `
            <div class="history-row">
                <div class="history-dice">${pips}</div>
                <div class="history-right">${totalHtml}</div>
            </div>
        `;
    }).join('');
}

function clearHistory() {
    history = [];
    renderHistory();
}

renderHistory();

export { showRolling, showResults, clearResult, clearHistory, showError };
