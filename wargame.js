// ============================================
// WARGAME DICE — TYPES & RESULT LEGEND
// ============================================
//
// Each die type maps its 6 physical faces (in BoxGeometry material
// order: +X, -X, +Y, -Y, +Z, -Z) to a result icon, a human-readable
// label, and one or more broad result categories used for the
// aggregate totals shown after a roll.

const DIE_TYPES = {
    infantry: {
        label: 'Infantry',
        faces: [
            { icon: 'infantry-miss.png', label: 'Miss', categories: ['miss'] },
            { icon: 'infantry-miss.png', label: 'Miss', categories: ['miss'] },
            { icon: 'infantry-probable-miss.png', label: 'Probable Miss', categories: ['probableMiss'] },
            { icon: 'infantry-probable-hit.png', label: 'Probable Hit', categories: ['probableHit'] },
            { icon: 'infantry-hit.png', label: 'Hit', categories: ['hit'] },
            { icon: 'infantry-hit.png', label: 'Hit', categories: ['hit'] }
        ]
    },
    cavalry: {
        label: 'Cavalry',
        faces: [
            { icon: 'cavalry-miss.png', label: 'Miss', categories: ['miss'] },
            { icon: 'cavalry-miss.png', label: 'Miss', categories: ['miss'] },
            { icon: 'cavalry-hit-non-fort.png', label: 'Hit (vs Non-Fortress)', categories: ['hitNonFort'] },
            { icon: 'cavalry-hit-non-fort.png', label: 'Hit (vs Non-Fortress)', categories: ['hitNonFort'] },
            { icon: 'cavalry-probable-hit.png', label: 'Probable Hit', categories: ['probableHit'] },
            { icon: 'cavalry-hit.png', label: 'Hit', categories: ['hit'] }
        ]
    },
    fortress: {
        label: 'Fortress',
        faces: [
            { icon: 'fortress-miss.png', label: 'Miss', categories: ['miss'] },
            { icon: 'fortress-block.png', label: 'Block', categories: ['block'] },
            { icon: 'fortress-probable-hit.png', label: 'Probable Hit', categories: ['probableHit'] },
            { icon: 'fortress-hit.png', label: 'Hit', categories: ['hit'] },
            { icon: 'fortress-hit-and-block.png', label: 'Hit and Block', categories: ['hit', 'block'] },
            { icon: 'fortress-double-block.png', label: 'Double Block', categories: ['block', 'block'] }
        ]
    },
    ship: {
        label: 'Ship of the Line',
        faces: [
            { icon: 'ship-miss.png', label: 'Miss', categories: ['miss'] },
            { icon: 'ship-miss.png', label: 'Miss', categories: ['miss'] },
            { icon: 'ship-block-adj-fort.png', label: 'Block (if Adj. Fortress)', categories: ['blockAdjFort'] },
            { icon: 'ship-hit-adj-fort.png', label: 'Hit (if Adj. Fortress)', categories: ['hitAdjFort'] },
            { icon: 'ship-probable-hit.png', label: 'Probable Hit', categories: ['probableHit'] },
            { icon: 'ship-double-hit.png', label: 'Double Hit', categories: ['hit', 'hit'] }
        ]
    }
};

// Display order + labels for the aggregate category totals
const CATEGORY_ORDER = [
    'hit', 'hitNonFort', 'hitAdjFort', 'probableHit',
    'block', 'blockAdjFort', 'probableMiss', 'miss'
];

const CATEGORY_LABELS = {
    hit: 'Hit',
    hitNonFort: 'Hit (vs Non-Fortress)',
    hitAdjFort: 'Hit (if Adj. Fortress)',
    probableHit: 'Probable Hit',
    block: 'Block',
    blockAdjFort: 'Block (if Adj. Fortress)',
    probableMiss: 'Probable Miss',
    miss: 'Miss'
};

const ICON_PATH = 'dice-icons/';

export { DIE_TYPES, CATEGORY_ORDER, CATEGORY_LABELS, ICON_PATH };
