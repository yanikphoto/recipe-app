
// services/fractionUtils.ts

// --- FRACTION HELPERS ---

export const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

export const numberToFraction = (value: number | undefined): string => {
    if (value === undefined || value === null || Math.abs(value) < 0.0001) return '';
    
    // Very tight check for whole numbers first
    if (Math.abs(value - Math.round(value)) < 0.001) {
        return String(Math.round(value));
    }

    const wholePart = Math.floor(value);
    const fractionalPart = value - wholePart;

    // 1. PRIORITY CHECK: Standard kitchen units.
    // We check these first to ensure that if a value is EXACTLY (or very close to) 
    // a standard unit like 9/16, we return that immediately.
    // This prevents 9/16 (0.5625) from being approximated as 4/7 (0.5714) just because 7 comes before 16.
    const priorityDenominators = [2, 3, 4, 8, 16, 32, 64];

    for (const d of priorityDenominators) {
         const n = Math.round(fractionalPart * d);
         // Extremely tight tolerance for priority matches to ensure accuracy
         if (Math.abs(fractionalPart - (n / d)) < 0.0001) {
             const common = gcd(n, d);
             // Handle case where rounding bumped it to a whole number (e.g. 15.99/16)
             if (n === d) return String(wholePart + 1);
             return (wholePart > 0 ? `${wholePart} ` : '') + `${n/common}/${d/common}`;
         }
    }

    // 2. GENERAL SEARCH: Find the best fit among all denominators
    let bestN = 1;
    let bestD = 1;
    let minError = 1.0;

    // We scan up to 64 to catch weird conversions if they are the best fit
    for (let d = 2; d <= 64; d++) {
        const n = Math.round(fractionalPart * d);
        const error = Math.abs(fractionalPart - (n / d));

        if (error < minError) {
            minError = error;
            bestN = n;
            bestD = d;
            
            // If exact match found, break early
            if (error < 0.000001) break;
        }
    }

    // Tolerance of 0.005 (0.5%) prevents wild approximations
    if (minError < 0.005) {
        const common = gcd(bestN, bestD);
        const finalN = bestN / common;
        const finalD = bestD / common;
        
        if (finalN === finalD) {
            return String(wholePart + 1);
        }
        
        return (wholePart > 0 ? `${wholePart} ` : '') + `${finalN}/${finalD}`;
    }
    
    // Fallback: return decimal formatted to remove trailing zeros
    // e.g. 1.50 -> 1.5, 1.567 -> 1.57
    return parseFloat(value.toFixed(2)).toString();
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
