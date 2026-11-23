
// services/fractionUtils.ts

export const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

// Standard culinary fractions ordered by value
const KITCHEN_FRACTIONS: [number, number, number][] = [
    [1 / 16, 1, 16],
    [1 / 8,  1, 8],
    [1 / 6,  1, 6],
    [1 / 5,  1, 5],
    [1 / 4,  1, 4],
    [1 / 3,  1, 3],
    [3 / 8,  3, 8],
    [2 / 5,  2, 5],
    [1 / 2,  1, 2],
    [3 / 5,  3, 5],
    [5 / 8,  5, 8],
    [2 / 3,  2, 3],
    [3 / 4,  3, 4],
    [4 / 5,  4, 5],
    [5 / 6,  5, 6],
    [7 / 8,  7, 8],
];

export const numberToFraction = (value: number | undefined): string => {
    if (value === undefined || value === null || isNaN(value) || Math.abs(value) < 0.0001) return '';
    
    // Check if close to a whole number
    const wholePart = Math.floor(value);
    const fractionalPart = value - wholePart;

    if (fractionalPart < 0.04) {
        return wholePart > 0 ? String(wholePart) : '';
    }
    if (fractionalPart > 0.96) {
        return String(wholePart + 1);
    }

    // Find the closest standard culinary fraction
    let bestN = 1;
    let bestD = 2;
    let minDiff = 1.0;

    for (const [val, n, d] of KITCHEN_FRACTIONS) {
        const diff = Math.abs(fractionalPart - val);
        if (diff < minDiff) {
            minDiff = diff;
            bestN = n;
            bestD = d;
            if (diff < 0.00001) break;
        }
    }

    const prefix = wholePart > 0 ? `${wholePart} ` : '';
    return `${prefix}${bestN}/${bestD}`;
};

export const fractionToNumber = (value: string | undefined): number => {
    if (!value || typeof value !== 'string' || value.trim() === '') return NaN;
    
    let str = value.trim();
    const unicodeFractions: Record<string, number> = {
        '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875
    };

    // If string is exactly a unicode fraction
    if (unicodeFractions[str] !== undefined) return unicodeFractions[str];

    // Replace any unicode fractions in mixed strings (e.g. "1½" -> "1 0.5")
    for (const [char, dec] of Object.entries(unicodeFractions)) {
        if (str.includes(char)) {
            str = str.replace(new RegExp(char, 'g'), ` + ${dec}`);
        }
    }
    
    if (!str.includes('/') && !str.includes('+')) return Number(str);
    
    let total = 0;
    const parts = str.split(/[\s+]+/).filter(Boolean);
    for (const part of parts) {
        if (part.includes('/')) {
            const [n, d] = part.split('/').map(Number);
            if (!isNaN(n) && !isNaN(d) && d !== 0) total += n / d;
            else return NaN;
        } else {
            const num = Number(part);
            if (!isNaN(num)) total += num;
            else return NaN;
        }
    }
    return total;
};
