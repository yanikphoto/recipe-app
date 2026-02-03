
// services/fractionUtils.ts

export const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

export const numberToFraction = (value: number | undefined): string => {
    if (value === undefined || value === null || Math.abs(value) < 0.0001) return '';
    
    // Check for whole numbers with high precision
    if (Math.abs(value - Math.round(value)) < 0.0001) {
        return String(Math.round(value));
    }

    const wholePart = Math.floor(value);
    const fractionalPart = value - wholePart;

    // Standard kitchen denominators in order of commonality/importance
    const commonDenominators = [2, 4, 8, 16, 3, 32, 64];

    // Try to find an exact or very close match in standard kitchen units first
    for (const d of commonDenominators) {
        const n = Math.round(fractionalPart * d);
        if (Math.abs(fractionalPart - (n / d)) < 0.0001) {
            if (n === 0) return String(wholePart);
            if (n === d) return String(wholePart + 1);
            
            const common = gcd(n, d);
            const finalN = n / common;
            const finalD = d / common;
            
            return (wholePart > 0 ? `${wholePart} ` : '') + `${finalN}/${finalD}`;
        }
    }

    // Fallback for non-standard fractions (find best fit up to 64)
    let bestN = 1, bestD = 1, minError = 1.0;
    for (let d = 2; d <= 64; d++) {
        const n = Math.round(fractionalPart * d);
        const error = Math.abs(fractionalPart - (n / d));
        if (error < minError) {
            minError = error;
            bestN = n;
            bestD = d;
            if (error < 0.000001) break;
        }
    }

    if (minError < 0.001) {
        const common = gcd(bestN, bestD);
        return (wholePart > 0 ? `${wholePart} ` : '') + `${bestN/common}/${bestD/common}`;
    }
    
    return parseFloat(value.toFixed(2)).toString();
};

export const fractionToNumber = (value: string | undefined): number => {
    if (!value || typeof value !== 'string' || value.trim() === '') return NaN;
    
    const str = value.trim();
    const unicodeFractions: Record<string, number> = {
        '½': 0.5, '⅓': 0.3333, '⅔': 0.6666, '¼': 0.25, '¾': 0.75, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875
    };
    if (unicodeFractions[str]) return unicodeFractions[str];
    
    if (!str.includes('/')) return Number(str);
    
    let total = 0;
    const parts = str.split(/[\s+]/).filter(Boolean);
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
