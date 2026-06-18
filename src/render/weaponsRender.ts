import { epsilonFloor } from '../calc/sharedCalc.js';
import type { DamageSplit, CalculatedWeaponStats } from '../model.js';
import {
    colDivider,
    colFirst,
    colStarter,
    escapeHtml,
    formatIntOpt,
    formatPercent,
    formatRoundOpt,
    getHeaderHtml,
    getPinButton,
    getTableBodyHtml,
    headerStatusImagePaths,
    pushCell,
    pushSectionHtml,
    SELECT_ALL_SVG,
    SELECT_NONE_SVG,
    type Cell,
    type HeaderColumn,
    type HeaderGroup,
    type Row,
} from './sharedRender.js';

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
] as const;
export type WeaponsHeaderKey = (typeof WEAPONS_HEADER_KEYS)[number];
export function isWeaponsHeaderKey(v: unknown): v is WeaponsHeaderKey {
    return WEAPONS_HEADER_KEYS.includes(v as WeaponsHeaderKey);
}

const WEAPONS_SUPERHEADER_KEYS = ['INFO', 'AR', 'MAGIC', 'STATUS', 'MISC', 'RUNES', 'DEF', 'SCALING', 'REQS'] as const;
export type WeaponsSuperheaderKey = (typeof WEAPONS_SUPERHEADER_KEYS)[number];
export function isWeaponsSuperheaderKey(v: unknown): v is WeaponsSuperheaderKey {
    return WEAPONS_SUPERHEADER_KEYS.includes(v as WeaponsSuperheaderKey);
}

export interface WeaponsHeaderColumn extends HeaderColumn {
    readonly key: WeaponsHeaderKey;
}

export interface WeaponsHeaderGroup extends HeaderGroup {
    readonly superKey: WeaponsSuperheaderKey;
    readonly columns: readonly WeaponsHeaderColumn[];
}

export const WEAPONS_HEADER_GROUPS: readonly WeaponsHeaderGroup[] = [
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
        superText: 'Defenses',
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
] as const;

interface WeaponRow extends Row {
    readonly wieldable: boolean;
}

/**
 * Generates the HTML to display the available weapon classes. Classes in checkedClasses will
 * be displayed in a checked state.
 * @param weaponClasses
 * @param checkedClasses
 * @returns
 */
export function getWeaponsSidebarHtml(weaponClasses: readonly string[], checkedClasses: Set<string>): string {
    const parts: string[] = [];
    pushSectionHtml(parts, 'Weapons', 'weapon-classes');
    for (const wc of weaponClasses) {
        const checked = checkedClasses.has(wc) ? ' checked' : '';
        parts.push(`<label><input type="checkbox"${checked} data-class="${escapeHtml(wc)}">${escapeHtml(wc)}</label>`);
    }
    return parts.join('');
}

export function getWeaponsHeaderHtml(
    groups: readonly WeaponsHeaderGroup[],
    sortKey: WeaponsHeaderKey,
    ascending: boolean
): string {
    return getHeaderHtml(groups, sortKey, ascending, headerStatusImagePaths);
}

export function getWeaponsHtml(weaponRows: readonly WeaponRow[], weaponFadeIn: string | null): string {
    const firstColUrl = (row: Row) =>
        `https://thelordsofthefallen.wiki.fextralife.com/${encodeURIComponent(row.itemName)}`;
    return getTableBodyHtml(weaponRows, firstColUrl, weaponFadeIn);
}

function formatDmg(dmg: DamageSplit, showSplit: boolean): string {
    if (!dmg.total) return '-';
    if (showSplit && dmg.fromStats) return `${dmg.base}+${dmg.fromStats}`;
    return String(dmg.total);
}

/**
 *
 * @param cws
 * @param showColGroups
 * @param showSplit
 * @returns
 */
export function getWeaponRow(
    cws: CalculatedWeaponStats,
    showColGroups: Set<WeaponsSuperheaderKey>,
    showSplit: boolean,
    showRawScaling: boolean
): WeaponRow {
    const cells: Cell[] = [];

    const wieldable = cws.wieldability.wieldable;
    const wieldCls = wieldable ? '' : 'unwieldable';

    // INFO fields: 'WEAP', 'CLS'
    if (showColGroups.has('INFO')) {
        pushCell(cells, `${cws.weapon.name} +${cws.upgLevel}`, [colFirst, wieldCls]);
        pushCell(cells, cws.weapon.className, colDivider);
    }

    // AR fields: 'ARP', 'ARH', 'ARF', 'ARW', 'TOT', 'SP'
    if (showColGroups.has('AR')) {
        const ar = cws.offense.ar;
        pushCell(cells, formatDmg(ar.physical, showSplit), [colStarter, wieldCls]);
        pushCell(cells, formatDmg(ar.fire, showSplit), wieldCls);
        pushCell(cells, formatDmg(ar.holy, showSplit), wieldCls);
        pushCell(cells, formatDmg(ar.wither, showSplit), wieldCls);
        pushCell(cells, formatIntOpt(ar.totalDamage), [wieldCls, colDivider]);
    }

    // MAGIC fields: 'SP', 'SLOTS'
    if (showColGroups.has('MAGIC')) {
        pushCell(cells, formatDmg(cws.offense.ar.spellPower, showSplit), [colStarter, wieldCls]);
        pushCell(cells, formatIntOpt(cws.offense.extras.spellSlots), colDivider);
    }

    // STATUS fields: 'SMI', 'BLE', 'BRN', 'FRO', 'IGN', 'PSN'
    if (showColGroups.has('STATUS')) {
        const status = cws.offense.status;
        pushCell(cells, formatIntOpt(status.smite), colStarter);
        pushCell(cells, formatIntOpt(status.bleed));
        pushCell(cells, formatIntOpt(status.burn));
        pushCell(cells, formatIntOpt(status.frost));
        pushCell(cells, formatIntOpt(status.ignite));
        pushCell(cells, formatIntOpt(status.poison), colDivider);
    }

    // MISC fields: 'WGT', 'PD', 'STAG', 'STAD', 'PVP'
    if (showColGroups.has('MISC')) {
        const ex = cws.offense.extras;
        pushCell(cells, cws.weapon.weight.toFixed(1), colStarter);
        pushCell(cells, ex.poiseDamage.toFixed(0));
        pushCell(cells, ex.staggerDamage.toFixed(1));
        pushCell(cells, formatPercent(ex.staminaDamage));
        pushCell(cells, formatPercent(ex.pvpMultiplier), colDivider);
    }

    // RUNES fields: 'RUN'
    if (showColGroups.has('RUNES')) {
        pushCell(cells, cws.runeSockets.join(',') || '-', [colStarter, colDivider]);
    }

    // DEF fields: 'DP', 'DH', 'DF', 'DW', 'DS'
    if (showColGroups.has('DEF')) {
        const def = cws.defense;
        pushCell(cells, formatPercent(def.physical), [colStarter, wieldCls]);
        pushCell(cells, formatPercent(def.fire), wieldCls);
        pushCell(cells, formatPercent(def.holy), wieldCls);
        pushCell(cells, formatPercent(def.wither), wieldCls);
        pushCell(cells, formatPercent(def.stability), [wieldCls, colDivider]);
    }

    // SCALE fields: 'SS', 'SA', 'SR', 'SI'
    if (showColGroups.has('SCALING')) {
        const sc = cws.offense.scaling;
        if (showRawScaling) {
            pushCell(cells, formatRoundOpt(sc.strVal), colStarter);
            pushCell(cells, formatRoundOpt(sc.agiVal));
            pushCell(cells, formatRoundOpt(sc.radVal));
            pushCell(cells, formatRoundOpt(sc.infVal), colDivider);
        } else {
            pushCell(cells, sc.strGrade, colStarter);
            pushCell(cells, sc.agiGrade);
            pushCell(cells, sc.radGrade);
            pushCell(cells, sc.infGrade, colDivider);
        }
    }

    // REQS fields: 'RS', 'RA', 'RR', 'RI'
    if (showColGroups.has('REQS')) {
        const reqs = cws.weapon.wieldReqs;
        const wield = cws.wieldability;
        pushCell(cells, formatIntOpt(reqs.strength), wield.strength ? colStarter : [colStarter, wieldCls]);
        pushCell(cells, formatIntOpt(reqs.agility), wield.agility ? '' : wieldCls);
        pushCell(cells, formatIntOpt(reqs.radiance), wield.radiance ? '' : wieldCls);
        pushCell(cells, formatIntOpt(reqs.inferno), wield.inferno ? colDivider : [wieldCls, colDivider]);
    }
    return { itemName: cws.weapon.name, itemKey: cws.weapon.key, wieldable, pinned: cws.pinned, cells };
}

type SortFunction = (cws1: CalculatedWeaponStats, cws2: CalculatedWeaponStats) => number;
const sortFunctions: Record<WeaponsHeaderKey, SortFunction> = {
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
export function sortCalculatedWeapons(
    calculated: CalculatedWeaponStats[],
    sortKey: WeaponsHeaderKey,
    ascending: boolean
): { pinned: CalculatedWeaponStats[]; unpinned: CalculatedWeaponStats[] } {
    const pinned: CalculatedWeaponStats[] = [];
    const unpinned: CalculatedWeaponStats[] = [];

    // separate pinned weapons from unpinned weapons
    calculated.map((cws) => (cws.pinned ? pinned.push(cws) : unpinned.push(cws)));

    const fn = sortFunctions[sortKey];
    if (fn !== undefined) {
        if (ascending) {
            pinned.sort(fn);
            unpinned.sort(fn);
        } else {
            pinned.sort((a, b) => -fn(a, b));
            unpinned.sort((a, b) => -fn(a, b));
        }
    } else console.log(`Failed to retrieve sort function for sortKey "${sortKey}"`);

    return { pinned, unpinned };
}
