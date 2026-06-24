import {
    ARMOR_SLOTS,
    type Armor,
    type ArmorSlot,
    type CalculatedArmorStats,
    type CalculatedPlayerDefenses,
    type PaperDoll,
} from '../model.js';
import { escapeHtml, pushCell, type Cell, type HeaderGroup, type Row } from './sharedRender.js';

const ARMORS_HEADER_KEYS = [
    // INFO
    'ARMR',
    'EQUIP',
    'SLOT',
    'WGT',
    'POIS',
    // DEF
    'DP',
    'DF',
    'DH',
    'DW',
    'DT',
    // STATUS
    'BLE',
    'BRN',
    'PSN',
    'SMI',
    'IGN',
    'FRO',
    'RT',
    // MISC
    'WGTC',
    'KDMG',
] as const;
export type ArmorsHeaderKey = (typeof ARMORS_HEADER_KEYS)[number];
export function isArmorsHeaderKey(v: unknown): v is ArmorsHeaderKey {
    return ARMORS_HEADER_KEYS.includes(v as ArmorsHeaderKey);
}

const ARMORS_SUPERHEADER_KEYS = ['INFO', 'DEF', 'STATUS', 'MISC'] as const;
export type ArmorsSuperheaderKey = (typeof ARMORS_SUPERHEADER_KEYS)[number];
export function isArmorsSuperheaderKey(v: unknown): v is ArmorsSuperheaderKey {
    return ARMORS_SUPERHEADER_KEYS.includes(v as ArmorsSuperheaderKey);
}

export const ARMORS_HEADER_GROUPS: readonly HeaderGroup<ArmorsHeaderKey, ArmorsSuperheaderKey>[] = [
    {
        superKey: 'INFO',
        superText: '',
        columns: [
            { key: 'ARMR', text: 'Armor', hover: 'Armor Name' },
            { key: 'EQUIP', text: 'Equip', hover: 'Equip Armor In Paper Doll' },
            { key: 'SLOT', text: 'Slot', hover: 'Equipment Slot' },
            { key: 'WGT', text: 'Weight', hover: 'Weight' },
            { key: 'POIS', text: 'Poise', hover: 'Poise' },
        ],
    },
    {
        superKey: 'DEF',
        superText: 'Defenses',
        columns: [
            { key: 'DP', text: 'Phys', hover: 'Physical Defense' },
            { key: 'DF', text: 'Fire', hover: 'Fire Defense' },
            { key: 'DH', text: 'Holy', hover: 'Holy Defense' },
            { key: 'DW', text: 'Wither', hover: 'Wither Defense' },
            { key: 'DT', text: 'Total', hover: 'Total Defense' },
        ],
    },
    {
        superKey: 'STATUS',
        superText: 'Resistances',
        columns: [
            { key: 'SMI', text: 'Smi', hover: 'Smite Resistance' },
            { key: 'BLE', text: 'Ble', hover: 'Bleed Resistance' },
            { key: 'BRN', text: 'Brn', hover: 'Burn Resistance' },
            { key: 'FRO', text: 'Fro', hover: 'Frostbite Resistance' },
            { key: 'IGN', text: 'Ign', hover: 'Ignite Resistance' },
            { key: 'PSN', text: 'Psn', hover: 'Poison Resistance' },
            { key: 'RT', text: 'Total', hover: 'Total Resistances' },
        ],
    },
    {
        superKey: 'MISC',
        superText: 'Misc Stats',
        columns: [
            { key: 'WGTC', text: 'Class', hover: '' },
            { key: 'KDMG', text: 'Kick Dmg', hover: '' },
        ],
    },
] as const;

const SLOT_PLACEHOLDER_PATHS: Record<ArmorSlot, string> = {
    Head: './img/ArmorSlots/Head.webp',
    Torso: './img/ArmorSlots/Torso.webp',
    Arms: './img/ArmorSlots/Arms.webp',
    Legs: './img/ArmorSlots/Legs.webp',
} as const;

function getSlotInnerHtml(slot: ArmorSlot, equipped: Armor | null): string {
    if (equipped === null) {
        return `<img class="slot-icon" src="${SLOT_PLACEHOLDER_PATHS[slot]}" alt="${slot} slot (empty)" title="Equip an armor in the table below">`;
    }
    const src = `./img/Armors/${escapeHtml(equipped.icon)}.webp`;
    const name = escapeHtml(equipped.name);
    return (
        `<img class="slot-icon" src="${src}" alt="${name}" title="${name}">` +
        `<button class="slot-unequip" type="button" data-slot="${slot}" title="Unequip ${name}" aria-label="Unequip ${name}">&times;</button>`
    );
}

export function getDerivedArmorHtml(_stats: CalculatedPlayerDefenses): string {
    return '';
}

export function getPaperDollHtml(equipped: PaperDoll, armors: Map<string, Armor>): string {
    const parts: string[] = [];
    for (const slot of ARMOR_SLOTS) {
        let armor: Armor | null = null;
        if (equipped[slot] !== null) {
            const _armor = armors.get(equipped[slot]);
            if (_armor) {
                armor = _armor;
            } else console.log(`Failed to retrieve armor with key "${equipped[slot]}"`);
        }
        parts.push(
            `<div class="armor-slot${armor ? ' equipped' : ''}" data-slot="${slot}">${getSlotInnerHtml(slot, armor)}</div>`
        );
    }
    return parts.join('');
}

export function getArmorRow(cas: CalculatedArmorStats, showColGroups: Set<ArmorsSuperheaderKey>): Row {
    const cells: Cell[] = [];
    const arm = cas.item;

    // INFO cols (ARMR, EQUIP, SLOT, WGT, POIS)
    if (showColGroups.has('INFO')) {
        pushCell(cells, arm.name, 'col-first', [{ src: `./img/Armors/${arm.icon}.webp`, size: 30 }]);
        if (cas.equipped)
            pushCell(cells, 'Unequip', '', undefined, {
                classes: 'btn-unequip equip-unequip',
                data: { htmlDataKey: 'unequip-armor', htmlDataValue: arm.key },
            });
        else
            pushCell(cells, 'Equip', '', undefined, {
                classes: 'btn-equip equip-unequip',
                data: { htmlDataKey: 'equip-armor', htmlDataValue: arm.key },
            });
        pushCell(cells, arm.slot);
        pushCell(cells, arm.stats.weight.toFixed(1));
        pushCell(cells, arm.stats.poise.toFixed(1), 'col-divider');
    }

    // DEF cols (DP, DF, DH, DW, DT)
    if (showColGroups.has('DEF')) {
        pushCell(cells, arm.stats.defPhysical, 'col-starter');
        pushCell(cells, arm.stats.defFire);
        pushCell(cells, arm.stats.defHoly);
        pushCell(cells, arm.stats.defWither);
        pushCell(cells, cas.defTotal, 'col-divider');
    }

    // STATUS cols (SMI, BLE, BRN, FRO, IGN, PSN, DT)
    if (showColGroups.has('STATUS')) {
        pushCell(cells, arm.stats.resSmite, 'col-starter');
        pushCell(cells, arm.stats.resBleed);
        pushCell(cells, arm.stats.resBurn);
        pushCell(cells, arm.stats.resFrost);
        pushCell(cells, arm.stats.resIgnite);
        pushCell(cells, arm.stats.resPoison);
        pushCell(cells, cas.resTotal, 'col-divider');
    }

    // MISC cols (WGTC, KDMG)
    if (showColGroups.has('MISC')) {
        pushCell(cells, arm.weightClass, 'col-starter');
        pushCell(cells, `${Math.round(arm.stats.kickMult * 100)}%`, 'col-divider');
    }

    return { itemName: arm.name, itemKey: arm.key, cells, pinned: cas.pinned };
}
