// services/fractionUtils.ts

// --- FRACTION HELPERS ---

export const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

export const numberToFraction = (value: number | undefined): string => {
    if (value === undefined || value === null || value === 0) return '';
    
    const tolerance = 0.01;

    // Check if it's very close to a whole number.
    if (Math.abs(value - Math.round(value)) < 0.001) {
        return String(Math.round(value));
    }

    const wholePart = Math.floor(value);
    const fractionalPart = value - wholePart;

    const commonFractions: { [key: string]: number } = {
        '1/16': 1/16, '1/8': 1/8, '1/5': 1/5, '1/4': 1/4, '1/3': 1/3, '3/8': 3/8, '2/5': 2/5,
        '1/2': 1/2, '3/5': 3/5, '5/8': 5/8, '2/3': 2/3, '3/4': 3/4, '4/5': 4/5, '7/8': 7/8, '15/16': 15/16
    };

    let closestFraction = '';
    let minDiff = 1;

    // Find the closest common fraction within tolerance
    for (const [fractionStr, decimalVal] of Object.entries(commonFractions)) {
        const diff = Math.abs(fractionalPart - decimalVal);
        if (diff < minDiff && diff < tolerance) {
            minDiff = diff;
            closestFraction = fractionStr;
        }
    }

    if (closestFraction) {
        return (wholePart > 0 ? `${wholePart} ` : '') + closestFraction;
    }
    
    // Fallback: try to generate a simple fraction for common kitchen measurements
    const maxDenominator = 16;
    for (let d = 2; d <= maxDenominator; d++) {
        const n = Math.round(fractionalPart * d);
        if (n > 0) {
            const error = Math.abs(fractionalPart - (n / d));
            if (error < tolerance) {
                const commonDivisor = gcd(n, d);
                const simplifiedN = n / commonDivisor;
                const simplifiedD = d / commonDivisor;
                if (simplifiedD > 1) { // Ensure it's a fraction, not a simplified whole number
                    return (wholePart > 0 ? `${wholePart} ` : '') + `${simplifiedN}/${simplifiedD}`;
                }
            }
        }
    }
    
    // Final fallback for uncommon fractions to 2 decimal places
    const fixed = value.toFixed(2);
    if (fixed.endsWith('.00')) {
        return String(Math.round(value));
    }
    return fixed.replace(/\.?0+$/, '');
};


export const fractionToNumber = (value: string | undefined): number => {
    if (value === undefined || value === null || typeof value !== 'string' || value.trim() === '') {
        return NaN;
    }
    
    value = value.trim();

    const unicodeFractions: { [key: string]: number } = {
        '½': 0.5, '⅓': 1/3, '⅔': 2/3, '¼': 0.25, '¾': 0.75, '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8,
        '⅙': 1/6, '⅚': 5/6, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
    };
    if (unicodeFractions[value]) return unicodeFractions[value];
    
    if (!value.includes('/') && !isNaN(Number(value))) return Number(value);
    
    let total = 0;
    const parts = value.split(/[\s+]/).filter(Boolean);
    
    for (const part of parts) {
        if (part.includes('/')) {
            const [numerator, denominator] = part.split('/').map(Number);
            if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
                total += numerator / denominator;
            } else {
                return NaN;
            }
        } else if (!isNaN(Number(part))) {
            total += Number(part);
        } else {
            return NaN;
        }
    }
    
    return total;
};