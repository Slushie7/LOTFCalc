import { epsilonFloor } from '../calc/sharedCalc.js';
export function isToggleKey(k, tg) {
    return typeof k === 'string' && Object.hasOwn(tg.toggles, k);
}
export function getTogglesHtml(tg) {
    const parts = [];
    for (const [key, setting] of Object.entries(tg.toggles))
        if (setting !== undefined)
            parts.push(`<label title="${setting.hover}"><input type="checkbox" class="${tg.htmlClass}" data-${tg.htmlDataKey}="${key}" />${setting.text}</label>`);
    return parts.join('');
}
const SELECT_ALL_SVG = `<svg viewBox="0 0 122.88 120.79" style="enable-background:new 0 0 122.88 120.79"><path d="M31.4,21.63h60.68V7.68c0-0.08-0.02-0.16-0.04-0.22c-0.03-0.07-0.08-0.14-0.13-0.19l-0.01-0.01 c-0.05-0.06-0.12-0.1-0.19-0.13c-0.07-0.03-0.15-0.04-0.23-0.04H7.68c-0.08,0-0.16,0.02-0.22,0.04C7.39,7.15,7.32,7.2,7.25,7.26 L7.23,7.28C7.19,7.33,7.15,7.39,7.12,7.46C7.09,7.53,7.08,7.6,7.08,7.68v83.8c0,0.08,0.02,0.16,0.05,0.22l0.01,0.03 c0.03,0.06,0.07,0.13,0.12,0.18c0.06,0.06,0.13,0.1,0.2,0.13l0.02,0.01c0.06,0.02,0.13,0.04,0.2,0.04h16.04V29.31 c0-1.03,0.21-2.03,0.58-2.93c0.39-0.94,0.96-1.79,1.67-2.5l0.04-0.04c0.7-0.69,1.54-1.25,2.46-1.63 C29.38,21.84,30.37,21.63,31.4,21.63L31.4,21.63z M51.99,75.95c-0.95-0.86-1.47-2.03-1.53-3.23c-0.06-1.19,0.34-2.4,1.2-3.35 c0.86-0.95,2.04-1.47,3.23-1.53c1.18-0.06,2.4,0.34,3.35,1.2l9.09,8.25l20.78-21.88c0.89-0.93,2.07-1.42,3.27-1.45 c1.19-0.03,2.4,0.4,3.33,1.28c0.93,0.89,1.42,2.07,1.45,3.27c0.03,1.19-0.4,2.4-1.28,3.33L69.84,88.19L69.59,88 c-0.58,0.28-1.21,0.43-1.85,0.46c-1.17,0.04-2.36-0.35-3.29-1.2L51.99,75.95L51.99,75.95z M99.15,21.63h16.04 c1.03,0,2.03,0.21,2.93,0.59c0.94,0.39,1.79,0.96,2.5,1.67l0.04,0.04c0.69,0.7,1.25,1.53,1.63,2.45c0.38,0.91,0.58,1.9,0.58,2.94 v83.8c0,1.04-0.21,2.03-0.58,2.93c-0.39,0.94-0.96,1.79-1.67,2.5c-0.71,0.71-1.55,1.28-2.5,1.67c-0.91,0.38-1.9,0.59-2.93,0.59 H31.4c-1.03,0-2.02-0.21-2.93-0.58c-0.94-0.39-1.79-0.96-2.5-1.67c-0.71-0.71-1.28-1.56-1.67-2.5c-0.38-0.91-0.58-1.9-0.58-2.93 V99.16H7.68c-1.03,0-2.03-0.21-2.93-0.59c-0.94-0.39-1.79-0.96-2.5-1.67c-0.71-0.71-1.28-1.56-1.67-2.5C0.21,93.5,0,92.51,0,91.48 V7.68c0-1.04,0.21-2.03,0.58-2.93c0.39-0.94,0.96-1.79,1.67-2.5c0.71-0.71,1.55-1.28,2.5-1.67C5.66,0.21,6.65,0,7.68,0h83.79 c1.04,0,2.03,0.21,2.93,0.58c0.94,0.39,1.79,0.96,2.5,1.67c1.4,1.4,2.26,3.31,2.26,5.43V21.63L99.15,21.63z M115.2,28.7H31.4 c-0.08,0-0.15,0.02-0.22,0.04c-0.08,0.03-0.15,0.08-0.2,0.14l-0.01,0.01c-0.06,0.05-0.1,0.12-0.13,0.19 c-0.03,0.07-0.04,0.14-0.04,0.22v83.8c0,0.08,0.02,0.16,0.04,0.22c0.03,0.07,0.08,0.14,0.14,0.2l0.02,0.02 c0.05,0.05,0.12,0.09,0.18,0.11c0.07,0.03,0.14,0.04,0.22,0.04h83.79c0.08,0,0.16-0.02,0.22-0.04l0.02-0.01 c0.07-0.03,0.13-0.07,0.18-0.13c0.05-0.06,0.1-0.12,0.13-0.19l0.01-0.02c0.02-0.06,0.03-0.13,0.03-0.21v-83.8 c0-0.08-0.02-0.15-0.04-0.22l-0.01-0.02c-0.03-0.06-0.07-0.12-0.12-0.17c-0.06-0.06-0.13-0.11-0.2-0.14 C115.35,28.72,115.28,28.7,115.2,28.7L115.2,28.7z"/></svg>`;
const SELECT_NONE_SVG = `<svg viewBox="0 0 509 512.123"><path fill-rule="nonzero" d="M62.283 0h323.575c34.292 0 62.282 27.991 62.282 62.283v322.76c0 34.292-27.99 62.282-62.282 62.282H62.283C27.991 447.325 0 419.335 0 385.043V62.283C0 27.991 27.991 0 62.283 0zm208.515 140.372c9.56-9.613 25.105-9.656 34.719-.096 9.613 9.56 9.656 25.105.096 34.719l-47.673 47.781 47.722 47.614c9.614 9.561 9.657 25.106.097 34.719-9.56 9.614-25.106 9.656-34.719.096l-47.78-47.672-47.616 47.724c-9.56 9.613-25.105 9.656-34.718.096-9.614-9.56-9.657-25.105-.096-34.719l47.673-47.78-47.724-47.616c-9.614-9.56-9.657-25.105-.096-34.719 9.56-9.613 25.105-9.656 34.718-.096l47.781 47.673 47.616-47.724zm200.844-58.569a103.312 103.312 0 017.465 6.765C497.551 107.013 509 132.47 509 160.487v249.824c0 56.03-45.781 101.812-101.812 101.812H162.671c-28.016 0-53.473-11.449-71.918-29.894a102.796 102.796 0 01-6.763-7.462h323.198c34.81 0 63.6-28.117 64.438-62.901h.016v-1.141l.003-.414V160.487l-.003-.414v-78.27zm-85.784-44.448H62.283c-13.674 0-24.928 11.254-24.928 24.928v322.76c0 13.674 11.254 24.928 24.928 24.928h323.575c13.673 0 24.927-11.254 24.927-24.928V62.283c0-13.674-11.254-24.928-24.927-24.928z"/></svg>`;
const LOCKED_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14.2" height="10" rx="2"/><path d="M 8 11 V 6 a 4 4 0 0 1 8 0 v 5"/><circle cx="12.1" cy="15.2" r="1.2" fill="currentColor" stroke="none"/><line x1="12.1" y1="16.1" x2="12.1" y2="17.6" stroke="currentColor" stroke-width="1.5"/></svg>`;
const UNLOCKED_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14.2" height="10" rx="2"/><path d="M 8 11 V 5 a 4 4 0 0 1 7.9 -0.9"/><circle cx="12.1" cy="15.2" r="1.2" fill="currentColor" stroke="none"/><line x1="12.1" y1="16.1" x2="12.1" y2="17.6" stroke="currentColor" stroke-width="1.5"/></svg>`;
export const HEADER_STATUS_IMAGE_PATHS = {
    BLE: './img/Header/Bleed.webp',
    BRN: './img/Header/Burn.webp',
    PSN: './img/Header/Poison.webp',
    SMI: './img/Header/Smite.webp',
    IGN: './img/Header/Ignite.webp',
    FRO: './img/Header/Frostbite.webp',
};
/**
 * Replaces all special characters '&', '<', '>', '"', and "'" with HTML-safe sequences
 * @param s
 * @returns
 */
function escapeHtml(s) {
    return s
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#x27;');
}
function getPinButton(row, text, data) {
    const action = row.pinned ? 'Unpin from top of list' : 'Pin to top of list';
    return `<button class="lock${row.pinned ? ' pinned' : ''}" data-item="${escapeHtml(data)}" aria-label="${action} ${escapeHtml(text)}" title="${action}">${row.pinned ? LOCKED_SVG : UNLOCKED_SVG}</button>`;
}
export function getSidebarHtml(sections) {
    if (!Array.isArray(sections))
        sections = [sections];
    const sectionsHtml = [];
    for (const section of sections) {
        const parts = [];
        parts.push(`<div class="sidebar-section-header">` +
            `<h2>${escapeHtml(section.text)}</h2>` +
            `<button class="meta-btn meta-left" type="button" data-section-key="${section.sectionKey}" data-command="select-all" title="Select All">${SELECT_ALL_SVG}</button>` +
            `<button class="meta-btn meta-right" type="button" data-section-key="${section.sectionKey}" data-command="select-none" title="Clear Selection">${SELECT_NONE_SVG}</button>` +
            `</div>`);
        const checkedSet = section.checkedItemsGetter();
        for (const item of section.items) {
            const checked = checkedSet.has(item) ? ' checked' : '';
            const escaped = escapeHtml(item);
            parts.push(`<label><input type="checkbox"${checked} data-${section.sectionKey}="${escaped}">${escaped}</label>`);
        }
        sectionsHtml.push(parts.join(''));
    }
    return sectionsHtml.join('<br>');
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
        const superCls = superIdx === 0 ? `col-first col-divider` : `col-starter col-divider`;
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
function getTableBodyHtml(rows, firstColUrl, fadeItemWithKey) {
    const tableParts = [];
    for (const row of rows) {
        const rowParts = [];
        row.cells.forEach((cell, idx) => {
            let imgTags = '';
            if (cell.images.length) {
                const imageParts = [];
                for (const imgInfo of cell.images) {
                    imageParts.push(`<img src="${imgInfo.src}" width="${imgInfo.size}" height="${imgInfo.size}">`);
                }
                imgTags = imageParts.join('');
            }
            let text;
            if (Array.isArray(cell.text))
                text = cell.text.map(escapeHtml).join('<br>');
            else
                text = escapeHtml(cell.text);
            let pinBtn = '';
            if (idx === 0) {
                // first col - pin button and url link
                pinBtn = getPinButton(row, row.itemName, row.itemKey);
                if (firstColUrl)
                    text = `<a class="${cell.cls}" href="${escapeHtml(firstColUrl(row))}" target="_blank" rel="noopener noreferrer">${text}</a>`;
            }
            rowParts.push(`<td class="${cell.cls}">${pinBtn}${imgTags}${text}</td>`);
        });
        const trClasses = `${row.pinned ? 'pinned' : ''} ${row.itemKey === fadeItemWithKey ? 'fade-size-in' : ''}`.trim();
        const clsStr = trClasses ? ` class="${trClasses}"` : '';
        tableParts.push(`<tr${clsStr}>${rowParts.join('')}</tr>`);
    }
    return tableParts.join('');
}
export function getItemTableBodyHtml(rows, fadeItemWitKey) {
    const firstColUrl = (row) => `https://thelordsofthefallen.wiki.fextralife.com/${encodeURIComponent(row.itemName)}`;
    return getTableBodyHtml(rows, firstColUrl, fadeItemWitKey);
}
export function formatIntOpt(val) {
    const floored = epsilonFloor(val);
    return floored ? String(floored) : '-';
}
export function formatRoundOpt(val) {
    val = Math.round(val);
    return val ? String(val) : '-';
}
export function formatPercent(val) {
    return `${epsilonFloor(val * 100)}%`;
}
/** Add a Cell to cells containing the given data. If text is a number, it is floored. If that value
 * is 0, the number is replaced with '-'
 */
export function pushCell(cells, text, classes, images = []) {
    if (classes === undefined)
        classes = [];
    else if (typeof classes === 'string')
        classes = [classes];
    if (typeof text === 'number') {
        text = epsilonFloor(text);
        if (!text)
            text = '-'; // replace 0 with '-'
        else
            text = String(text);
    }
    if (!text || text === '-') {
        classes = [...classes, 'empty'];
    }
    const cls = classes.filter((s) => s !== '').join(' ');
    cells.push({ text, images, cls });
}
//# sourceMappingURL=sharedRender.js.map