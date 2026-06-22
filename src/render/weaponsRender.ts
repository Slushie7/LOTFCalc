import type { DamageSplit, CalculatedWeaponStats } from '../model.js';
import {
    formatIntOpt,
    formatPercent,
    formatRoundOpt,
    pushCell,
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

interface WeaponsHeaderColumn extends HeaderColumn<WeaponsHeaderKey> {
    readonly key: WeaponsHeaderKey;
}

interface WeaponsHeaderGroup extends HeaderGroup<WeaponsHeaderKey, WeaponsSuperheaderKey> {
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
        pushCell(
            cells,
            `${cws.weapon.name} +${cws.upgLevel}`,
            ['col-first', wieldCls],
            [{ src: `./img/Weapons/${cws.weapon.icon}.webp`, size: 30 }]
        );
        pushCell(cells, cws.weapon.className, 'col-divider');
    }

    // AR fields: 'ARP', 'ARH', 'ARF', 'ARW', 'TOT', 'SP'
    if (showColGroups.has('AR')) {
        const ar = cws.offense.ar;
        pushCell(cells, formatDmg(ar.physical, showSplit), ['col-starter', wieldCls]);
        pushCell(cells, formatDmg(ar.fire, showSplit), wieldCls);
        pushCell(cells, formatDmg(ar.holy, showSplit), wieldCls);
        pushCell(cells, formatDmg(ar.wither, showSplit), wieldCls);
        pushCell(cells, formatIntOpt(ar.totalDamage), [wieldCls, 'col-divider']);
    }

    // MAGIC fields: 'SP', 'SLOTS'
    if (showColGroups.has('MAGIC')) {
        pushCell(cells, formatDmg(cws.offense.ar.spellPower, showSplit), ['col-starter', wieldCls]);
        pushCell(cells, formatIntOpt(cws.offense.extras.spellSlots), 'col-divider');
    }

    // STATUS fields: 'SMI', 'BLE', 'BRN', 'FRO', 'IGN', 'PSN'
    if (showColGroups.has('STATUS')) {
        const status = cws.offense.status;
        pushCell(cells, formatIntOpt(status.smite), 'col-starter');
        pushCell(cells, formatIntOpt(status.bleed));
        pushCell(cells, formatIntOpt(status.burn));
        pushCell(cells, formatIntOpt(status.frost));
        pushCell(cells, formatIntOpt(status.ignite));
        pushCell(cells, formatIntOpt(status.poison), 'col-divider');
    }

    // MISC fields: 'WGT', 'PD', 'STAG', 'STAD', 'PVP'
    if (showColGroups.has('MISC')) {
        const ex = cws.offense.extras;
        pushCell(cells, cws.weapon.weight.toFixed(1), 'col-starter');
        pushCell(cells, ex.poiseDamage.toFixed(0));
        pushCell(cells, ex.staggerDamage.toFixed(1));
        pushCell(cells, formatPercent(ex.staminaDamage));
        pushCell(cells, formatPercent(ex.pvpMultiplier), 'col-divider');
    }

    // RUNES fields: 'RUN'
    if (showColGroups.has('RUNES')) {
        pushCell(cells, cws.runeSockets.join(', ') || '-', ['col-starter', 'col-divider']);
    }

    // DEF fields: 'DP', 'DH', 'DF', 'DW', 'DS'
    if (showColGroups.has('DEF')) {
        const def = cws.defense;
        pushCell(cells, formatPercent(def.physical), ['col-starter', wieldCls]);
        pushCell(cells, formatPercent(def.fire), wieldCls);
        pushCell(cells, formatPercent(def.holy), wieldCls);
        pushCell(cells, formatPercent(def.wither), wieldCls);
        pushCell(cells, formatPercent(def.stability), [wieldCls, 'col-divider']);
    }

    // SCALE fields: 'SS', 'SA', 'SR', 'SI'
    if (showColGroups.has('SCALING')) {
        const sc = cws.offense.scaling;
        if (showRawScaling) {
            pushCell(cells, formatRoundOpt(sc.strVal), 'col-starter');
            pushCell(cells, formatRoundOpt(sc.agiVal));
            pushCell(cells, formatRoundOpt(sc.radVal));
            pushCell(cells, formatRoundOpt(sc.infVal), 'col-divider');
        } else {
            pushCell(cells, sc.strGrade, 'col-starter');
            pushCell(cells, sc.agiGrade);
            pushCell(cells, sc.radGrade);
            pushCell(cells, sc.infGrade, 'col-divider');
        }
    }

    // REQS fields: 'RS', 'RA', 'RR', 'RI'
    if (showColGroups.has('REQS')) {
        const reqs = cws.weapon.wieldReqs;
        const wield = cws.wieldability;
        pushCell(cells, formatIntOpt(reqs.strength), wield.strength ? 'col-starter' : ['col-starter', wieldCls]);
        pushCell(cells, formatIntOpt(reqs.agility), wield.agility ? '' : wieldCls);
        pushCell(cells, formatIntOpt(reqs.radiance), wield.radiance ? '' : wieldCls);
        pushCell(cells, formatIntOpt(reqs.inferno), wield.inferno ? 'col-divider' : [wieldCls, 'col-divider']);
    }
    return { itemName: cws.weapon.name, itemKey: cws.weapon.key, wieldable, pinned: cws.pinned, cells };
}
