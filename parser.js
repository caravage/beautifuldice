// ============================================
// DICE NOTATION PARSER
// ============================================
//
// Supported syntax:
//   3d6       → roll 3 six-sided dice
//   d6        → roll 1 six-sided die
//   3d6>5     → roll 3d6, highlight results strictly greater than 5
//   3d6>=5    → roll 3d6, highlight results greater than or equal to 5
//   3d6<3     → roll 3d6, highlight results strictly less than 3
//   3d6<=3    → roll 3d6, highlight results less than or equal to 3
//   3d6=4     → roll 3d6, highlight results equal to 4
//

const PATTERN = /^(\d*)d(\d+)\s*(?:(>=|<=|>|<|=)\s*(\d+))?$/i;

/**
 * Parse a dice command string.
 * @param {string} input - e.g. "3d6>=5"
 * @returns {{ count: number, sides: number, condition: { op: string, value: number } | null }}
 * @throws {Error} if the input doesn't match
 */
function parse(input) {
    const trimmed = input.trim();
    const match = trimmed.match(PATTERN);

    if (!match) {
        throw new Error(`Invalid notation: "${trimmed}". Use format like 3d6, 2d6>4, d6>=5`);
    }

    const count = match[1] ? parseInt(match[1], 10) : 1;
    const sides = parseInt(match[2], 10);

    if (count < 1 || count > 15) {
        throw new Error('Dice count must be between 1 and 15');
    }
    if (sides < 2) {
        throw new Error('Dice must have at least 2 sides');
    }

    let condition = null;
    if (match[3] && match[4]) {
        condition = {
            op: match[3],
            value: parseInt(match[4], 10)
        };
    }

    return { count, sides, condition };
}

/**
 * Test whether a die result matches the condition.
 * @param {number} result - the die value
 * @param {{ op: string, value: number } | null} condition
 * @returns {boolean}
 */
function matches(result, condition) {
    if (!condition) return false;

    switch (condition.op) {
        case '>':  return result > condition.value;
        case '>=': return result >= condition.value;
        case '<':  return result < condition.value;
        case '<=': return result <= condition.value;
        case '=':  return result === condition.value;
        default:   return false;
    }
}

export { parse, matches };
