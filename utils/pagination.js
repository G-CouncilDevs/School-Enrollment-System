/**
 * Parse page and limit query parameters with safe bounds.
 * @param {object} query - req.query
 * @param {number} [defaultLimit=10]
 * @returns {{ page: number, limit: number }}
 */
export function parsePage(query, defaultLimit = 10) {
    const page  = Math.max(parseInt(query.page)  || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit) || defaultLimit, 1), 100);
    return { page, limit };
}
