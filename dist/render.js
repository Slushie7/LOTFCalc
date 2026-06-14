import { epsilonFloor } from './calc.js';
const LOCKED_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14.2" height="10" rx="2"/><path d="M 8 11 V 6 a 4 4 0 0 1 8 0 v 5"/><circle cx="12.1" cy="15.2" r="1.2" fill="currentColor" stroke="none"/><line x1="12.1" y1="16.1" x2="12.1" y2="17.6" stroke="currentColor" stroke-width="1.5"/></svg>`;
const UNLOCKED_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14.2" height="10" rx="2"/><path d="M 8 11 V 5 a 4 4 0 0 1 7.9 -0.9"/><circle cx="12.1" cy="15.2" r="1.2" fill="currentColor" stroke="none"/><line x1="12.1" y1="16.1" x2="12.1" y2="17.6" stroke="currentColor" stroke-width="1.5"/></svg>`;
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
/**
 * Generates the HTML to display the available weapon classes. Classes in checkedClasses will
 * be displayed in a checked state.
 * @param weaponClasses
 * @param checkedClasses
 * @returns
 */
export function getClassesHtml(weaponClasses, checkedClasses) {
    const parts = [];
    for (const wc of weaponClasses) {
        const checked = checkedClasses.has(wc) ? 'checked' : '';
        parts.push(`<label><input type="checkbox" ${checked} data-class="${escapeHtml(wc)}">${escapeHtml(wc)}</label>`);
    }
    return parts.join('');
}
const headerImagePaths = {
    BLE: './img/Header/Bleed.png',
    BRN: './img/Header/Burn.png',
    PSN: './img/Header/Poison.png',
    SMI: './img/Header/Smite.png',
    IGN: './img/Header/Ignite.png',
    FRO: './img/Header/Frostbite.png',
};
/**
 * Given the currently visible HeaderGroups, generates the HTML to display the grouping header and
 * main table header. The column with sortKey is decorated with an arrow indicating sort direction.
 * @param groups
 * @param sortKey
 * @param ascending
 * @returns
 */
export function getHeaderHtml(groups, sortKey, ascending) {
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
                classes.push('col-starter');
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
export function getWeaponsHtml(weaponRows, weaponFadeIn) {
    const tableParts = [];
    for (const row of weaponRows) {
        const rowParts = [];
        row.cells.forEach((cell, idx) => {
            if (idx === 0) {
                // first column - show 'pin weapon' button and link weapon text to FextraLife Wiki
                const action = row.pinned ? 'Unpin weapon' : 'Pin weapon to top of list';
                const pinBtn = `<button class="lock${row.pinned ? ' pinned' : ''}" data-weapon="${escapeHtml(row.weaponKey)}" aria-label="${action} ${escapeHtml(row.weaponName)}" title="${action}">${row.pinned ? LOCKED_SVG : UNLOCKED_SVG}</button>`;
                const url = `https://thelordsofthefallen.wiki.fextralife.com/${encodeURIComponent(row.weaponName)}`;
                rowParts.push(`<td class="${cell.cls}">${pinBtn}<a class="${cell.cls}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(cell.text)}</a></td>`);
            }
            else {
                rowParts.push(`<td class="${cell.cls}">${escapeHtml(cell.text)}</td>`);
            }
        });
        const trClasses = `${row.pinned ? 'pinned' : ''} ${row.weaponKey === weaponFadeIn ? 'fade-size-in' : ''}`.trim();
        const clsStr = trClasses ? ` class="${trClasses}"` : '';
        tableParts.push(`<tr${clsStr}>${rowParts.join('')}</tr>`);
    }
    return tableParts.join('');
}
function formatDmg(dmg, showSplit) {
    if (!dmg.total)
        return '-';
    if (showSplit && dmg.fromStats)
        return `${dmg.base}+${dmg.fromStats}`;
    return String(dmg.total);
}
function formatIntOpt(val) {
    const floored = epsilonFloor(val);
    if (floored)
        return String(floored);
    return '-';
}
function formatPercent(val) {
    return `${epsilonFloor(val * 100)}%`;
}
/**
 *
 * @param cws
 * @param showColGroups
 * @param showSplit
 * @returns
 */
export function getWeaponRow(cws, showColGroups, showSplit) {
    function pushCell(text, classes) {
        if (typeof classes === 'string')
            classes = [classes];
        if (!text || text === '-') {
            classes = [...classes, 'empty'];
        }
        const cls = classes.filter((s) => s !== '').join(' ');
        cells.push({ text, cls });
    }
    const cells = [];
    const wieldable = cws.wieldability.wieldable;
    const wieldCls = wieldable ? '' : 'unwieldable';
    const colStarter = 'col-starter';
    const colDivider = 'col-divider';
    // INFO fields: 'WEAP', 'CLS'
    if (showColGroups.has('INFO')) {
        pushCell(`${cws.weapon.name} +${cws.upgLevel}`, ['col-first', wieldCls]);
        pushCell(cws.weapon.className, colDivider);
    }
    // AR fields: 'ARP', 'ARH', 'ARF', 'ARW', 'TOT', 'SP'
    if (showColGroups.has('AR')) {
        const ar = cws.offense.ar;
        pushCell(formatDmg(ar.physical, showSplit), [colStarter, wieldCls]);
        pushCell(formatDmg(ar.fire, showSplit), wieldCls);
        pushCell(formatDmg(ar.holy, showSplit), wieldCls);
        pushCell(formatDmg(ar.wither, showSplit), wieldCls);
        pushCell(formatIntOpt(ar.totalDamage), [wieldCls, colDivider]);
    }
    // MAGIC fields: 'SP', 'SLOTS'
    if (showColGroups.has('MAGIC')) {
        pushCell(formatDmg(cws.offense.ar.spellPower, showSplit), [colStarter, wieldCls]);
        pushCell(formatIntOpt(cws.offense.extras.spellSlots), colDivider);
    }
    // STATUS fields: 'BLE', 'BRN', 'PSN', 'SMI', 'IGN', 'FRO'
    if (showColGroups.has('STATUS')) {
        const status = cws.offense.status;
        pushCell(formatIntOpt(status.smite), colStarter);
        pushCell(formatIntOpt(status.bleed), '');
        pushCell(formatIntOpt(status.burn), '');
        pushCell(formatIntOpt(status.frost), '');
        pushCell(formatIntOpt(status.ignite), '');
        pushCell(formatIntOpt(status.poison), colDivider);
    }
    // MISC fields: 'WGT', 'PD', 'STAG', 'STAD', 'PVP'
    if (showColGroups.has('MISC')) {
        const ex = cws.offense.extras;
        pushCell(cws.weapon.weight.toFixed(1), colStarter);
        pushCell(ex.poiseDamage.toFixed(0), '');
        pushCell(ex.staggerDamage.toFixed(1), '');
        pushCell(formatPercent(ex.staminaDamage), '');
        pushCell(formatPercent(ex.pvpMultiplier), colDivider);
    }
    // RUNES fields: 'RUN'
    if (showColGroups.has('RUNES')) {
        pushCell(cws.runeSockets.join(',') || '-', [colStarter, colDivider]);
    }
    // DEF fields: 'DP', 'DH', 'DF', 'DW', 'DS'
    if (showColGroups.has('DEF')) {
        const def = cws.defense;
        pushCell(formatPercent(def.physical), [colStarter, wieldCls]);
        pushCell(formatPercent(def.fire), wieldCls);
        pushCell(formatPercent(def.holy), wieldCls);
        pushCell(formatPercent(def.wither), wieldCls);
        pushCell(formatPercent(def.stability), [wieldCls, colDivider]);
    }
    // SCALE fields: 'SS', 'SA', 'SR', 'SI'
    if (showColGroups.has('SCALING')) {
        const sc = cws.offense.scaling;
        pushCell(sc.strGrade, colStarter);
        pushCell(sc.agiGrade, '');
        pushCell(sc.radGrade, '');
        pushCell(sc.infGrade, colDivider);
    }
    // REQS fields: 'RS', 'RA', 'RR', 'RI'
    if (showColGroups.has('REQS')) {
        const reqs = cws.weapon.wieldReqs;
        const wield = cws.wieldability;
        pushCell(formatIntOpt(reqs.strength), wield.strength ? colStarter : [colStarter, wieldCls]);
        pushCell(formatIntOpt(reqs.agility), wield.agility ? '' : wieldCls);
        pushCell(formatIntOpt(reqs.radiance), wield.radiance ? '' : wieldCls);
        pushCell(formatIntOpt(reqs.inferno), wield.inferno ? colDivider : [wieldCls, colDivider]);
    }
    return { weaponName: cws.weapon.name, weaponKey: cws.weapon.key, wieldable, pinned: cws.pinned, cells };
}
const sortFunctions = {
    // INFO
    WEAP: (cws1, cws2) => cws1.weapon.name.localeCompare(cws2.weapon.name),
    CLS: (cws1, cws2) => cws1.weapon.className.localeCompare(cws2.weapon.className),
    // AR
    ARP: (cws1, cws2) => cws1.offense.ar.physical.total - cws2.offense.ar.physical.total,
    ARH: (cws1, cws2) => cws1.offense.ar.holy.total - cws2.offense.ar.holy.total,
    ARF: (cws1, cws2) => cws1.offense.ar.fire.total - cws2.offense.ar.fire.total,
    ARW: (cws1, cws2) => cws1.offense.ar.wither.total - cws2.offense.ar.wither.total,
    TOT: (cws1, cws2) => cws1.offense.ar.totalDamage - cws2.offense.ar.totalDamage,
    // MAGIC
    SP: (cws1, cws2) => cws1.offense.ar.spellPower.total - cws2.offense.ar.spellPower.total,
    SLOTS: (cws1, cws2) => cws1.offense.extras.spellSlots - cws2.offense.extras.spellSlots,
    // STATUS
    BLE: (cws1, cws2) => cws1.offense.status.bleed - cws2.offense.status.bleed,
    BRN: (cws1, cws2) => cws1.offense.status.burn - cws2.offense.status.burn,
    PSN: (cws1, cws2) => cws1.offense.status.poison - cws2.offense.status.poison,
    SMI: (cws1, cws2) => cws1.offense.status.smite - cws2.offense.status.smite,
    IGN: (cws1, cws2) => cws1.offense.status.ignite - cws2.offense.status.ignite,
    FRO: (cws1, cws2) => cws1.offense.status.frost - cws2.offense.status.frost,
    // MISC
    WGT: (cws1, cws2) => cws1.weapon.weight - cws2.weapon.weight,
    PD: (cws1, cws2) => cws1.offense.extras.poiseDamage - cws2.offense.extras.poiseDamage,
    STAG: (cws1, cws2) => cws1.offense.extras.staggerDamage - cws2.offense.extras.staggerDamage,
    STAD: (cws1, cws2) => cws1.offense.extras.staminaDamage - cws2.offense.extras.staminaDamage,
    PVP: (cws1, cws2) => cws1.offense.extras.pvpMultiplier - cws2.offense.extras.pvpMultiplier,
    // RUNES
    RUN: (cws1, cws2) => cws1.runeSockets.join().localeCompare(cws2.runeSockets.join()),
    // DEF
    DP: (cws1, cws2) => cws1.defense.physical - cws2.defense.physical,
    DH: (cws1, cws2) => cws1.defense.holy - cws2.defense.holy,
    DF: (cws1, cws2) => cws1.defense.fire - cws2.defense.fire,
    DW: (cws1, cws2) => cws1.defense.wither - cws2.defense.wither,
    DS: (cws1, cws2) => cws1.defense.stability - cws2.defense.stability,
    // SCALING
    SS: (cws1, cws2) => cws1.offense.scaling.strVal - cws2.offense.scaling.strVal,
    SA: (cws1, cws2) => cws1.offense.scaling.agiVal - cws2.offense.scaling.agiVal,
    SR: (cws1, cws2) => cws1.offense.scaling.radVal - cws2.offense.scaling.radVal,
    SI: (cws1, cws2) => cws1.offense.scaling.infVal - cws2.offense.scaling.infVal,
    // REQS
    RS: (cws1, cws2) => cws1.weapon.wieldReqs.strength - cws2.weapon.wieldReqs.strength,
    RA: (cws1, cws2) => cws1.weapon.wieldReqs.agility - cws2.weapon.wieldReqs.agility,
    RR: (cws1, cws2) => cws1.weapon.wieldReqs.radiance - cws2.weapon.wieldReqs.radiance,
    RI: (cws1, cws2) => cws1.weapon.wieldReqs.inferno - cws2.weapon.wieldReqs.inferno,
};
/**
 * Sort the CalculatedWeaponStats by the given sort key. Pinned weapons are separated from unpinned weapons,
 * and then both lists are sorted and returned.
 * @param calculated
 * @param sortKey
 * @param ascending
 * @returns
 */
export function sortCalculated(calculated, sortKey, ascending) {
    const pinned = [];
    const unpinned = [];
    calculated.map((cws) => (cws.pinned ? pinned.push(cws) : unpinned.push(cws)));
    const fn = sortFunctions[sortKey];
    if (fn !== undefined) {
        if (ascending) {
            pinned.sort(fn);
            unpinned.sort(fn);
        }
        else {
            pinned.sort((a, b) => -fn(a, b));
            unpinned.sort((a, b) => -fn(a, b));
        }
    }
    else
        console.log(`Failed to retrieve sort function for sortKey "${sortKey}"`);
    return { pinned, unpinned };
}
//# sourceMappingURL=render.js.map