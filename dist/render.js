import { epsilonFloor } from './calc.js';
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
    BLE: './img/bleed.png',
    BRN: './img/burn.png',
    PSN: './img/poison.png',
    SMI: './img/smite.png',
    IGN: './img/ignite.png',
    FRO: './img/frostbite.png',
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
export function getWeaponsHtml(weaponRows) {
    const tableParts = [];
    for (const row of weaponRows) {
        const rowParts = [];
        row.cells.forEach((cell, idx) => {
            if (idx === 0) {
                // first column - link weapon text to FextraLife Wiki
                const cls = `${cell.cls} weap-link`.trim();
                const url = `https://thelordsofthefallen.wiki.fextralife.com/${encodeURIComponent(row.weaponName)}`;
                rowParts.push(`<td class="${cell.cls}"><a class="${cls}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(cell.text)}</a></td>`);
            }
            else {
                rowParts.push(`<td class="${cell.cls}">${escapeHtml(cell.text)}</td>`);
            }
        });
        tableParts.push(`<tr>${rowParts.join('')}</tr>`);
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
export function getWeaponRow(cws, showColGroups, showSplit) {
    const cells = [];
    const wieldable = cws.wieldability.wieldable;
    const wieldCls = wieldable ? '' : 'unwieldable';
    const colStarter = 'col-starter';
    const colDivider = 'col-divider';
    // INFO fields: 'WEAP', 'CLS'
    if (showColGroups.has('INFO')) {
        cells.push({ text: `${cws.weapon.name} +${cws.upgLevel}`, cls: `col-first ${wieldCls}`.trim() });
        cells.push({ text: cws.weapon.className, cls: colDivider });
    }
    // AR fields: 'ARP', 'ARH', 'ARF', 'ARW', 'TOT', 'SP'
    if (showColGroups.has('AR')) {
        const ar = cws.offense.ar;
        cells.push({ text: formatDmg(ar.physical, showSplit), cls: `${colStarter} ${wieldCls}`.trim() });
        cells.push({ text: formatDmg(ar.fire, showSplit), cls: wieldCls });
        cells.push({ text: formatDmg(ar.holy, showSplit), cls: wieldCls });
        cells.push({ text: formatDmg(ar.wither, showSplit), cls: wieldCls });
        cells.push({ text: formatIntOpt(ar.totalDamage), cls: `${wieldCls} ${colDivider}`.trim() });
    }
    // MAGIC fields: 'SP', 'SLOTS'
    if (showColGroups.has('MAGIC')) {
        cells.push({ text: formatDmg(cws.offense.ar.spellPower, showSplit), cls: `${colStarter} ${wieldCls}`.trim() });
        cells.push({ text: formatIntOpt(cws.offense.extras.spellSlots), cls: colDivider });
    }
    // STATUS fields: 'BLE', 'BRN', 'PSN', 'SMI', 'IGN', 'FRO'
    if (showColGroups.has('STATUS')) {
        const status = cws.offense.status;
        cells.push({ text: formatIntOpt(status.smite), cls: colStarter });
        cells.push({ text: formatIntOpt(status.bleed), cls: '' });
        cells.push({ text: formatIntOpt(status.burn), cls: '' });
        cells.push({ text: formatIntOpt(status.frost), cls: '' });
        cells.push({ text: formatIntOpt(status.ignite), cls: '' });
        cells.push({ text: formatIntOpt(status.poison), cls: colDivider });
    }
    // MISC fields: 'WGT', 'PD', 'STAG', 'STAD', 'PVP'
    if (showColGroups.has('MISC')) {
        const ex = cws.offense.extras;
        cells.push({ text: cws.weapon.weight.toFixed(1), cls: colStarter });
        cells.push({ text: ex.poiseDamage.toFixed(0), cls: '' });
        cells.push({ text: ex.staggerDamage.toFixed(1), cls: '' });
        cells.push({ text: formatPercent(ex.staminaDamage), cls: '' });
        cells.push({ text: formatPercent(ex.pvpMultiplier), cls: colDivider });
    }
    // RUNES fields: 'RUN'
    if (showColGroups.has('RUNES')) {
        cells.push({ text: cws.runes.join(',') || '-', cls: `${colStarter} ${colDivider}` });
    }
    // DEF fields: 'DP', 'DH', 'DF', 'DW', 'DS'
    if (showColGroups.has('DEF')) {
        const def = cws.defense;
        cells.push({ text: formatPercent(def.physical), cls: `${colStarter} ${wieldCls}`.trim() });
        cells.push({ text: formatPercent(def.fire), cls: wieldCls });
        cells.push({ text: formatPercent(def.holy), cls: wieldCls });
        cells.push({ text: formatPercent(def.wither), cls: wieldCls });
        cells.push({ text: formatPercent(def.stability), cls: `${colDivider} ${wieldCls}`.trim() });
    }
    // SCALE fields: 'SS', 'SA', 'SR', 'SI'
    if (showColGroups.has('SCALING')) {
        const sc = cws.offense.scaling;
        cells.push({ text: sc.strGrade, cls: colStarter });
        cells.push({ text: sc.agiGrade, cls: '' });
        cells.push({ text: sc.radGrade, cls: '' });
        cells.push({ text: sc.infGrade, cls: colDivider });
    }
    // REQS fields: 'RS', 'RA', 'RR', 'RI'
    if (showColGroups.has('REQS')) {
        const reqs = cws.weapon.wieldReqs;
        const wield = cws.wieldability;
        cells.push({
            text: formatIntOpt(reqs.strength),
            cls: wield.strength ? colStarter : `${colStarter} ${wieldCls}`.trim(),
        });
        cells.push({ text: formatIntOpt(reqs.agility), cls: wield.agility ? '' : wieldCls });
        cells.push({ text: formatIntOpt(reqs.radiance), cls: wield.radiance ? '' : wieldCls });
        cells.push({ text: formatIntOpt(reqs.inferno), cls: wield.inferno ? colDivider : `${wieldCls} ${colDivider}` });
    }
    return { cells, wieldable, weaponName: cws.weapon.name };
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
    RUN: (cws1, cws2) => cws1.runes.join().localeCompare(cws2.runes.join()),
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
export function sortCalculated(calculated, sortKey, ascending) {
    const fn = sortFunctions[sortKey];
    if (fn !== undefined) {
        if (ascending)
            calculated.sort(fn);
        else
            calculated.sort((a, b) => -fn(a, b));
    }
}
//# sourceMappingURL=render.js.map