export const LOCKED_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14.2" height="10" rx="2"/><path d="M 8 11 V 6 a 4 4 0 0 1 8 0 v 5"/><circle cx="12.1" cy="15.2" r="1.2" fill="currentColor" stroke="none"/><line x1="12.1" y1="16.1" x2="12.1" y2="17.6" stroke="currentColor" stroke-width="1.5"/></svg>`;
export const UNLOCKED_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14.2" height="10" rx="2"/><path d="M 8 11 V 5 a 4 4 0 0 1 7.9 -0.9"/><circle cx="12.1" cy="15.2" r="1.2" fill="currentColor" stroke="none"/><line x1="12.1" y1="16.1" x2="12.1" y2="17.6" stroke="currentColor" stroke-width="1.5"/></svg>`;
/**
 * Replaces all special characters '&', '<', '>', '"', and "'" with HTML-safe sequences
 * @param s
 * @returns
 */
export function escapeHtml(s) {
    return s
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#x27;');
}
export function getPinButton(row, text, dataKey, data) {
    const action = row.pinned ? 'Unpin from top of list' : 'Pin to top of list';
    return `<button class="lock${row.pinned ? ' pinned' : ''}" data-${dataKey}="${escapeHtml(data)}" aria-label="${action} ${escapeHtml(text)}" title="${action}">${row.pinned ? LOCKED_SVG : UNLOCKED_SVG}</button>`;
}
//# sourceMappingURL=shared.js.map