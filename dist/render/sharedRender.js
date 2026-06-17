export const LOCKED_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14.2" height="10" rx="2"/><path d="M 8 11 V 6 a 4 4 0 0 1 8 0 v 5"/><circle cx="12.1" cy="15.2" r="1.2" fill="currentColor" stroke="none"/><line x1="12.1" y1="16.1" x2="12.1" y2="17.6" stroke="currentColor" stroke-width="1.5"/></svg>`;
export const UNLOCKED_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14.2" height="10" rx="2"/><path d="M 8 11 V 5 a 4 4 0 0 1 7.9 -0.9"/><circle cx="12.1" cy="15.2" r="1.2" fill="currentColor" stroke="none"/><line x1="12.1" y1="16.1" x2="12.1" y2="17.6" stroke="currentColor" stroke-width="1.5"/></svg>`;
export const headerStatusImagePaths = {
    BLE: './img/Header/Bleed.webp',
    BRN: './img/Header/Burn.webp',
    PSN: './img/Header/Poison.webp',
    SMI: './img/Header/Smite.webp',
    IGN: './img/Header/Ignite.webp',
    FRO: './img/Header/Frostbite.webp',
};
export const colFirst = 'col-first';
export const colStarter = 'col-starter';
export const colDivider = 'col-divider';
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
export function getPinButton(row, text, data) {
    const action = row.pinned ? 'Unpin from top of list' : 'Pin to top of list';
    return `<button class="lock${row.pinned ? ' pinned' : ''}" data-item="${escapeHtml(data)}" aria-label="${action} ${escapeHtml(text)}" title="${action}">${row.pinned ? LOCKED_SVG : UNLOCKED_SVG}</button>`;
}
/**
 * Given the currently visible HeaderGroups, generates the HTML to display the grouping header and
 * main table header. The column with sortKey is decorated with an arrow indicating sort direction.
 * @param groups
 * @param sortKey
 * @param ascending
 * @returns
 */
export function getHeaderHtml(groups, sortKey, ascending, headerImagePaths) {
    const superParts = [];
    const headerParts = [];
    groups.forEach((group, superIdx) => {
        const superCls = superIdx === 0 ? 'col-first col-divider' : 'col-starter col-divider';
        superParts.push(`<th class="${superCls}" colspan="${group.columns.length}">${escapeHtml(group.superText)}</th>`);
        group.columns.forEach((col, idx) => {
            let text = col.text;
            if (col.key === sortKey)
                // add ▲ / ▼ to identify sorting column
                text += ascending ? ' \u25b2' : ' \u25bc';
            // calculate HTML classes for the header cell
            const classes = ['sortable'];
            if (idx === 0)
                classes.push(superIdx === 0 ? 'col-first-header' : 'col-starter'); // col-first-header instead of col-starter so first header cell gets some extra padding
            if (idx === group.columns.length - 1)
                classes.push('col-divider');
            const cls = classes.join(' ');
            // determine content - image or text
            let content = '';
            const imagePath = headerImagePaths[col.key];
            if (imagePath)
                // image exists for this HeaderKey
                content = `<img class="header-image" src="${escapeHtml(imagePath)}" alt="${escapeHtml(text)}" width="24" height="24">`;
            else
                content = `${escapeHtml(text)}`;
            headerParts.push(`<th class="${cls}" data-col-key="${col.key}" title="${escapeHtml(col.hover)}">${content}</th>`);
        });
    });
    return `<tr>${superParts.join('')}</tr><tr>${headerParts.join('')}</tr>`;
}
export function getTableBodyHtml(rows, firstColUrl, fadeItemWithKey) {
    const tableParts = [];
    for (const row of rows) {
        const rowParts = [];
        row.cells.forEach((cell, idx) => {
            let inner = escapeHtml(cell.text);
            if (idx === 0) {
                // first col - pin button and url link
                const pinBtn = getPinButton(row, row.itemName, row.itemKey);
                if (firstColUrl)
                    inner = `<a class="${cell.cls}" href="${escapeHtml(firstColUrl(row))}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
                inner = pinBtn + inner;
            }
            rowParts.push(`<td class="${cell.cls}">${inner}</td>`);
        });
        const trClasses = `${row.pinned ? 'pinned' : ''} ${row.itemKey === fadeItemWithKey ? 'fade-size-in' : ''}`.trim();
        const clsStr = trClasses ? ` class="${trClasses}"` : '';
        tableParts.push(`<tr${clsStr}>${rowParts.join('')}</tr>`);
    }
    return tableParts.join('');
}
//# sourceMappingURL=sharedRender.js.map