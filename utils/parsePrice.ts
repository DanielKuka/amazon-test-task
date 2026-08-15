export function parsePrice(text: string): number {
    const cleaned = text.replace(/,/g, '');
    const match = cleaned.match(/\d+\.?\d*/);
    return match ? parseFloat(match[0]) : NaN;
}
