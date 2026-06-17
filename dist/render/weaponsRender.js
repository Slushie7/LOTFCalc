import { epsilonFloor } from '../calc/sharedCalc.js';
import { colDivider, colFirst, colStarter, escapeHtml, getHeaderHtml, getPinButton, getTableBodyHtml, headerStatusImagePaths, } from './sharedRender.js';
const WEAPONS_HEADER_KEYS = [
    // basic
    'WEAP',
    'CLS',
    // AR
    'ARP',
    'ARH',
    'ARF',
    'ARW',
    'TOT',
    // spell
    'SP',
    'SLOTS',
    // status
    'BLE',
    'BRN',
    'PSN',
    'SMI',
    'IGN',
    'FRO',
    // extras
    'WGT',
    'PD',
    'STAG',
    'STAD',
    'PVP',
    // runes
    'RUN',
    // defense
    'DP',
    'DH',
    'DF',
    'DW',
    'DS',
    // scaling
    'SS',
    'SA',
    'SR',
    'SI',
    // wield reqs
    'RS',
    'RA',
    'RR',
    'RI',
];
export function isWeaponsHeaderKey(v) {
    return WEAPONS_HEADER_KEYS.includes(v);
}
const WEAPONS_SUPERHEADER_KEYS = ['INFO', 'AR', 'MAGIC', 'STATUS', 'MISC', 'RUNES', 'DEF', 'SCALING', 'REQS'];
export function isWeaponsSuperheaderKey(v) {
    return WEAPONS_SUPERHEADER_KEYS.includes(v);
}
export const WEAPONS_HEADER_GROUPS = [
    {
        superKey: 'INFO',
        superText: '',
        columns: [
            { key: 'WEAP', text: 'Weapon', hover: 'Weapon Name' },
            { key: 'CLS', text: 'Class', hover: 'Class Name' },
        ],
    },
    {
        superKey: 'AR',
        superText: 'Attack Rating',
        columns: [
            { key: 'ARP', text: 'Phys', hover: 'Physical Attack Rating' },
            { key: 'ARF', text: 'Fire', hover: 'Fire Attack Rating' },
            { key: 'ARH', text: 'Holy', hover: 'Holy Attack Rating' },
            { key: 'ARW', text: 'Wither', hover: 'Wither Attack Rating' },
            { key: 'TOT', text: 'Total', hover: 'Total Attack Rating' },
        ],
    },
    {
        superKey: 'MAGIC',
        superText: 'Magic',
        columns: [
            { key: 'SP', text: 'SpellP', hover: 'Spell Power' },
            { key: 'SLOTS', text: 'Slots', hover: 'Catalyst Spell Slots' },
        ],
    },
    {
        superKey: 'STATUS',
        superText: 'Status Effects',
        columns: [
            { key: 'SMI', text: 'Smi', hover: 'Smite Status Buildup' },
            { key: 'BLE', text: 'Ble', hover: 'Bleed Status Buildup' },
            { key: 'BRN', text: 'Brn', hover: 'Burn Status Buildup' },
            { key: 'FRO', text: 'Fro', hover: 'Frostbite Status Buildup' },
            { key: 'IGN', text: 'Ign', hover: 'Ignite Status Buildup' },
            { key: 'PSN', text: 'Psn', hover: 'Poison Status Buildup' },
        ],
    },
    {
        superKey: 'MISC',
        superText: 'Misc Stats',
        columns: [
            { key: 'WGT', text: 'Wgt', hover: 'Weight' },
            {
                key: 'PD',
                text: 'PoiseD',
                hover: 'Poise Damage (Enemy Attack Interruption)',
            },
            {
                key: 'STAG',
                text: 'PstrD',
                hover: 'Posture Damage (For Grevious Strikes/Critical Hits)',
            },
            { key: 'STAD', text: 'StamD', hover: 'Stamina Damage Multiplier' },
            { key: 'PVP', text: 'PVP', hover: 'Multiplier For PVP' },
        ],
    },
    {
        superKey: 'RUNES',
        superText: 'Rune',
        columns: [{ key: 'RUN', text: 'Sockets', hover: 'Available Rune Sockets' }],
    },
    {
        superKey: 'DEF',
        superText: 'Defense',
        columns: [
            { key: 'DP', text: 'Phys', hover: 'Physical Defense' },
            { key: 'DF', text: 'Fire', hover: 'Fire Defense' },
            { key: 'DH', text: 'Holy', hover: 'Holy Defense' },
            { key: 'DW', text: 'Wither', hover: 'Wither Defense' },
            {
                key: 'DS',
                text: 'Stab',
                hover: 'Stability Rating (Stamina To Block)',
            },
        ],
    },
    {
        superKey: 'SCALING',
        superText: 'Attribute Scaling',
        columns: [
            { key: 'SS', text: 'Str', hover: 'Strength Scaling' },
            { key: 'SA', text: 'Agi', hover: 'Agility Scaling' },
            { key: 'SR', text: 'Rad', hover: 'Radiance Scaling' },
            { key: 'SI', text: 'Inf', hover: 'Inferno Scaling' },
        ],
    },
    {
        superKey: 'REQS',
        superText: 'Wield Reqs',
        columns: [
            { key: 'RS', text: 'Str', hover: 'Required Strength' },
            { key: 'RA', text: 'Agi', hover: 'Required Agility' },
            { key: 'RR', text: 'Rad', hover: 'Required Radiance' },
            { key: 'RI', text: 'Inf', hover: 'Required Inferno' },
        ],
    },
];
/**
 * Generates the HTML to display the available weapon classes. Classes in checkedClasses will
 * be displayed in a checked state.
 * @param weaponClasses
 * @param checkedClasses
 * @returns
 */
export function getWeaponsClassesHtml(weaponClasses, checkedClasses) {
    const parts = [];
    for (const wc of weaponClasses) {
        const checked = checkedClasses.has(wc) ? ' checked' : '';
        parts.push(`<label><input type="checkbox"${checked} data-class="${escapeHtml(wc)}">${escapeHtml(wc)}</label>`);
    }
    return parts.join('');
}
export function getWeaponsHeaderHtml(groups, sortKey, ascending) {
    return getHeaderHtml(groups, sortKey, ascending, headerStatusImagePaths);
}
export function getWeaponsHtml(weaponRows, weaponFadeIn) {
    const firstColUrl = (row) => `https://thelordsofthefallen.wiki.fextralife.com/${encodeURIComponent(row.itemName)}`;
    return getTableBodyHtml(weaponRows, firstColUrl, weaponFadeIn);
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
    // INFO fields: 'WEAP', 'CLS'
    if (showColGroups.has('INFO')) {
        pushCell(`${cws.weapon.name} +${cws.upgLevel}`, [colFirst, wieldCls]);
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
    // STATUS fields: 'SMI', 'BLE', 'BRN', 'FRO', 'IGN', 'PSN'
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
    return { itemName: cws.weapon.name, itemKey: cws.weapon.key, wieldable, pinned: cws.pinned, cells };
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
export function sortCalculatedWeapons(calculated, sortKey, ascending) {
    const pinned = [];
    const unpinned = [];
    // separate pinned weapons from unpinned weapons
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
//# sourceMappingURL=weaponsRender.js.map