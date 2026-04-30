/**
 * Format a number with French thousands separators (space).
 * @param {number|string} n - The number to format
 * @param {number} decimals - Number of decimal places (default 0)
 * @returns {string} Formatted number, e.g. "1 234 567"
 */
export function fmt(n, decimals = 0) {
    const num = parseFloat(n);
    if (isNaN(num)) return '0';
    return num.toLocaleString('fr-FR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

/**
 * Format a currency amount in FCFA.
 * @param {number|string} n - The amount
 * @param {number} decimals - Decimal places (default 0)
 * @returns {string} e.g. "1 234 567 FCFA"
 */
export function fmtCFA(n, decimals = 0) {
    return fmt(n, decimals) + ' FCFA';
}
