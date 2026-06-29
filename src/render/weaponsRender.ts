import type { DamageSplit, CalculatedWeaponStats } from '../model.js';
import {
    formatIntOpt,
    formatPercent,
    formatRoundOpt,
    pushCell,
    type Cell,
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
    'SMI',
    'BLE',
    'BRN',
    'IGN',
    'FRO',
    'PSN',
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

export const WEAPONS_HEADER_GROUPS: readonly HeaderGroup<WeaponsHeaderKey, WeaponsSuperheaderKey>[] = [
    {
        superKey: 'INFO',
        superHtmlText: '',
        columns: [
            { key: 'WEAP', rawText: 'Weapon', hover: 'Weapon Name' },
            { key: 'CLS', rawText: 'Class', hover: 'Class Name' },
        ],
    },
    {
        superKey: 'AR',
        superHtmlText: 'Attack Rating',
        columns: [
            { key: 'ARP', rawText: 'Phys', hover: 'Physical Attack Rating' },
            { key: 'ARF', rawText: 'Fire', hover: 'Fire Attack Rating' },
            { key: 'ARH', rawText: 'Holy', hover: 'Holy Attack Rating' },
            { key: 'ARW', rawText: 'Wither', hover: 'Wither Attack Rating' },
            { key: 'TOT', rawText: 'Total', hover: 'Total Attack Rating' },
        ],
    },
    {
        superKey: 'MAGIC',
        superHtmlText: 'Magic',
        columns: [
            { key: 'SP', rawText: 'SpellP', hover: 'Spell Power' },
            { key: 'SLOTS', rawText: 'Slots', hover: 'Catalyst Spell Slots' },
        ],
    },
    {
        superKey: 'STATUS',
        superHtmlText: 'Status Effects',
        columns: [
            { key: 'SMI', rawText: 'Smi', hover: 'Smite Status Buildup' },
            { key: 'BLE', rawText: 'Ble', hover: 'Bleed Status Buildup' },
            { key: 'BRN', rawText: 'Brn', hover: 'Burn Status Buildup' },
            { key: 'IGN', rawText: 'Ign', hover: 'Ignite Status Buildup' },
            { key: 'FRO', rawText: 'Fro', hover: 'Frostbite Status Buildup' },
            { key: 'PSN', rawText: 'Psn', hover: 'Poison Status Buildup' },
        ],
    },
    {
        superKey: 'MISC',
        superHtmlText: 'Misc Stats',
        columns: [
            { key: 'WGT', rawText: 'Wgt', hover: 'Weight' },
            {
                key: 'PD',
                rawText: 'PoiseD',
                hover: 'Poise Damage (Enemy Attack Interruption)',
            },
            {
                key: 'STAG',
                rawText: 'PstrD',
                hover: 'Posture Damage (For Grevious Strikes/Critical Hits)',
            },
            { key: 'STAD', rawText: 'StamD', hover: 'Stamina Damage Multiplier' },
            { key: 'PVP', rawText: 'PVP', hover: 'Multiplier For PVP' },
        ],
    },
    {
        superKey: 'RUNES',
        superHtmlText: 'Rune',
        columns: [{ key: 'RUN', rawText: 'Sockets', hover: 'Available Rune Sockets' }],
    },
    {
        superKey: 'DEF',
        superHtmlText: 'Defenses',
        columns: [
            { key: 'DP', rawText: 'Phys', hover: 'Physical Defense' },
            { key: 'DF', rawText: 'Fire', hover: 'Fire Defense' },
            { key: 'DH', rawText: 'Holy', hover: 'Holy Defense' },
            { key: 'DW', rawText: 'Wither', hover: 'Wither Defense' },
            {
                key: 'DS',
                rawText: 'Stab',
                hover: 'Stability Rating (Stamina To Block)',
            },
        ],
    },
    {
        superKey: 'SCALING',
        superHtmlText: 'Attribute Scaling',
        columns: [
            { key: 'SS', rawText: 'Str', hover: 'Strength Scaling' },
            { key: 'SA', rawText: 'Agi', hover: 'Agility Scaling' },
            { key: 'SR', rawText: 'Rad', hover: 'Radiance Scaling' },
            { key: 'SI', rawText: 'Inf', hover: 'Inferno Scaling' },
        ],
    },
    {
        superKey: 'REQS',
        superHtmlText: 'Wield Reqs',
        columns: [
            { key: 'RS', rawText: 'Str', hover: 'Required Strength' },
            { key: 'RA', rawText: 'Agi', hover: 'Required Agility' },
            { key: 'RR', rawText: 'Rad', hover: 'Required Radiance' },
            { key: 'RI', rawText: 'Inf', hover: 'Required Inferno' },
        ],
    },
] as const;

function formatDmg(dmg: DamageSplit, showSplit: boolean): string {
    if (!dmg.total) return '-';
    if (showSplit && dmg.fromStats) return `${dmg.base}+${dmg.fromStats}`;
    return String(dmg.total);
}

export function getWeaponRow(
    cws: CalculatedWeaponStats,
    showColGroups: Set<WeaponsSuperheaderKey>,
    showSplit: boolean,
    showRawScaling: boolean
): Row {
    const cells: Cell[] = [];

    const wieldCls = cws.wieldability.wieldable ? '' : 'unwieldable';

    // INFO fields: 'WEAP', 'CLS'
    if (showColGroups.has('INFO')) {
        pushCell(cells, `${cws.item.name} +${cws.upgLevel}`, `col-first ${wieldCls}`, [
            { src: `./img/Weapons/${cws.item.icon}.webp`, size: 30 },
        ]);
        pushCell(cells, cws.item.className, 'col-divider');
    }

    // AR fields: 'ARP', 'ARH', 'ARF', 'ARW', 'TOT', 'SP'
    if (showColGroups.has('AR')) {
        const ar = cws.offense.ar;
        pushCell(cells, formatDmg(ar.physical, showSplit), `col-starter ${wieldCls}`);
        pushCell(cells, formatDmg(ar.fire, showSplit), wieldCls);
        pushCell(cells, formatDmg(ar.holy, showSplit), wieldCls);
        pushCell(cells, formatDmg(ar.wither, showSplit), wieldCls);
        pushCell(cells, formatIntOpt(ar.totalDamage), `${wieldCls} col-divider`);
    }

    // MAGIC fields: 'SP', 'SLOTS'
    if (showColGroups.has('MAGIC')) {
        pushCell(cells, formatDmg(cws.offense.ar.spellPower, showSplit), `col-starter ${wieldCls}`);
        pushCell(cells, formatIntOpt(cws.offense.extras.spellSlots), 'col-divider');
    }

    // STATUS fields: 'SMI', 'BLE', 'BRN', 'IGN', 'FRO', 'PSN'
    if (showColGroups.has('STATUS')) {
        const status = cws.offense.status;
        pushCell(cells, formatIntOpt(status.smite), 'col-starter');
        pushCell(cells, formatIntOpt(status.bleed));
        pushCell(cells, formatIntOpt(status.burn));
        pushCell(cells, formatIntOpt(status.ignite));
        pushCell(cells, formatIntOpt(status.frost));
        pushCell(cells, formatIntOpt(status.poison), 'col-divider');
    }

    // MISC fields: 'WGT', 'PD', 'STAG', 'STAD', 'PVP'
    if (showColGroups.has('MISC')) {
        const ex = cws.offense.extras;
        pushCell(cells, cws.item.weight.toFixed(1), 'col-starter');
        pushCell(cells, ex.poiseDamage.toFixed(0));
        pushCell(cells, ex.staggerDamage.toFixed(1));
        pushCell(cells, formatPercent(ex.staminaDamage));
        pushCell(cells, formatPercent(ex.pvpMultiplier), 'col-divider');
    }

    // RUNES fields: 'RUN'
    if (showColGroups.has('RUNES')) {
        pushCell(cells, cws.runeSockets.join(', ') || '-', 'col-starter col-divider');
    }

    // DEF fields: 'DP', 'DH', 'DF', 'DW', 'DS'
    if (showColGroups.has('DEF')) {
        const def = cws.defense;
        pushCell(cells, formatPercent(def.physical), `col-starter ${wieldCls}`);
        pushCell(cells, formatPercent(def.fire), wieldCls);
        pushCell(cells, formatPercent(def.holy), wieldCls);
        pushCell(cells, formatPercent(def.wither), wieldCls);
        pushCell(cells, formatPercent(def.stability), `${wieldCls} col-divider`);
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
        const reqs = cws.item.wieldReqs;
        const wield = cws.wieldability;
        pushCell(cells, formatIntOpt(reqs.strength), wield.strength ? 'col-starter' : `col-starter ${wieldCls}`);
        pushCell(cells, formatIntOpt(reqs.agility), wield.agility ? '' : wieldCls);
        pushCell(cells, formatIntOpt(reqs.radiance), wield.radiance ? '' : wieldCls);
        pushCell(cells, formatIntOpt(reqs.inferno), wield.inferno ? 'col-divider' : `${wieldCls} col-divider`);
    }
    return { itemName: cws.item.name, itemKey: cws.item.key, pinned: cws.pinned, cells };
}
