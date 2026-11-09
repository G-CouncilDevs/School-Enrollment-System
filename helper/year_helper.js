// Helper to determine the year level (1-4) of a block or section.
// Checks block.year_level first, then parses section_name conventions like BSCS-1A, BSIT-2A, etc.
export function getBlockYearLevel(block) {
    if (typeof block === "number") return block;
    if (block?.year_level) return Number(block.year_level);
    const s = String(block?.section_name || block || "");
    const match = s.match(/(\d+)(?:st|nd|rd|th)?[-_ ]*(?:year|yr)?[-_ ]*[A-Za-z]/i) ||
                  s.match(/[-_ ]?([1-4])[A-Za-z]/i) ||
                  s.match(/([1-4])/);
    return match ? Number(match[1]) : null;
}
