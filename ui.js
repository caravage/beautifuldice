import { matches } from './parser.js';
import { DIE_TYPES, CATEGORY_ORDER, CATEGORY_LABELS, ICON_PATH } from './wargame.js';

// ============================================
// RESULT DISPLAY
// ============================================

const resultEl = document.getElementById('result');
const wargameResultEl = document.getElementById('wargame-result');

function showRolling() {
    resultEl.textContent = 'Rolling…';
}

function showWargameRolling() {
    wargameResultEl.innerHTML = '<div class="wargame-rolling">Rolling…</div>';
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

// ============================================
// WARGAME RESULTS
// ============================================

/** Tallies how many times each broad result category occurs across a roll */
function aggregateCategories(results) {
    const counts = {};
    results.forEach(r => {
        r.categories.forEach(cat => {
            counts[cat] = (counts[cat] || 0) + 1;
        });
    });
    return counts;
}

function showWargameResults(results) {
    wargameResultEl.innerHTML = '';

    const diceRow = document.createElement('div');
    diceRow.className = 'wargame-dice-row';

    results.forEach(r => {
        const card = document.createElement('div');
        card.className = 'wargame-die';

        const img = document.createElement('img');
        img.src = ICON_PATH + r.icon;
        img.alt = r.label;
        card.appendChild(img);

        const type = document.createElement('span');
        type.className = 'wargame-die-type';
        type.textContent = DIE_TYPES[r.type].label;
        card.appendChild(type);

        const label = document.createElement('span');
        label.className = 'wargame-die-label';
        label.textContent = r.label;
        card.appendChild(label);

        diceRow.appendChild(card);
    });

    wargameResultEl.appendChild(diceRow);

    const totals = aggregateCategories(results);
    const totalsRow = document.createElement('div');
    totalsRow.className = 'wargame-totals';

    CATEGORY_ORDER.forEach(cat => {
        if (!totals[cat]) return;
        const badge = document.createElement('span');
        badge.className = `wargame-total-badge cat-${cat}`;
        badge.textContent = `${totals[cat]} ${CATEGORY_LABELS[cat]}`;
        totalsRow.appendChild(badge);
    });

    wargameResultEl.appendChild(totalsRow);

    addWargameToHistory(results, totals);
}

function clearResult() {
    resultEl.textContent = '';
    resultEl.classList.remove('result-error');
    wargameResultEl.innerHTML = '';
}

function showError(msg) {
    const target = wargameResultEl.classList.contains('hidden') ? resultEl : wargameResultEl;
    target.textContent = msg;
    target.classList.add('result-error');
    setTimeout(() => target.classList.remove('result-error'), 2000);
}

// ============================================
// ROLL HISTORY
// ============================================

let history = [];
const historyEl = document.getElementById('history');

function addToHistory(results, total, condition) {
    const sorted = [...results].sort((a, b) => b - a);
    history.unshift({ kind: 'dice', results: sorted, total, condition, time: new Date() });
    if (history.length > 50) history = history.slice(0, 50);
    renderHistory();
}

function addWargameToHistory(results, totals) {
    history.unshift({ kind: 'wargame', results, totals, time: new Date() });
    if (history.length > 50) history = history.slice(0, 50);
    renderHistory();
}

function renderDiceHistoryRow(entry) {
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
}

function renderWargameHistoryRow(entry) {
    const icons = entry.results
        .map(r => `<img class="history-icon" src="${ICON_PATH}${r.icon}" alt="${r.label}" title="${DIE_TYPES[r.type].label}: ${r.label}">`)
        .join('');

    const hits = (entry.totals.hit || 0) + (entry.totals.hitNonFort || 0) + (entry.totals.hitAdjFort || 0);
    const totalHtml = `<span class="history-hits">${hits}h</span>`;

    return `
        <div class="history-row">
            <div class="history-dice">${icons}</div>
            <div class="history-right">${totalHtml}</div>
        </div>
    `;
}

function renderHistory() {
    if (history.length === 0) {
        historyEl.innerHTML = '<div class="empty-history">No rolls yet</div>';
        return;
    }

    historyEl.innerHTML = history
        .map(entry => entry.kind === 'wargame' ? renderWargameHistoryRow(entry) : renderDiceHistoryRow(entry))
        .join('');
}

function clearHistory() {
    history = [];
    renderHistory();
}

renderHistory();

export { showRolling, showWargameRolling, showResults, showWargameResults, clearResult, clearHistory, showError };
