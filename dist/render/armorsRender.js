import {} from '../model.js';
import { colDivider, colFirst, colStarter, pushCell, } from './sharedRender.js';
const ARMORS_HEADER_KEYS = [
    // INFO
    'ARMR',
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
];
export function isArmorsHeaderKey(v) {
    return ARMORS_HEADER_KEYS.includes(v);
}
const ARMORS_SUPERHEADER_KEYS = ['INFO', 'DEF', 'STATUS', 'MISC'];
export function isArmorsSuperheaderKey(v) {
    return ARMORS_SUPERHEADER_KEYS.includes(v);
}
export const ARMORS_HEADER_GROUPS = [
    {
        superKey: 'INFO',
        superText: '',
        columns: [
            { key: 'ARMR', text: 'Armor', hover: 'Armor Name' },
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
];
export function getArmorRow(cas, showColGroups) {
    const cells = [];
    const arm = cas.armor;
    // INFO cols (ARMR, SLOT, WGT, POIS)
    if (showColGroups.has('INFO')) {
        pushCell(cells, arm.name, colFirst);
        pushCell(cells, arm.slot);
        pushCell(cells, arm.stats.weight.toFixed(1));
        pushCell(cells, arm.stats.poise.toFixed(1), colDivider);
    }
    // DEF cols (DP, DF, DH, DW, DT)
    if (showColGroups.has('DEF')) {
        pushCell(cells, arm.stats.defPhysical, colStarter);
        pushCell(cells, arm.stats.defFire);
        pushCell(cells, arm.stats.defHoly);
        pushCell(cells, arm.stats.defWither);
        pushCell(cells, cas.defTotal, colDivider);
    }
    // STATUS cols (SMI, BLE, BRN, FRO, IGN, PSN, DT)
    if (showColGroups.has('STATUS')) {
        pushCell(cells, arm.stats.resSmite, colStarter);
        pushCell(cells, arm.stats.resBleed);
        pushCell(cells, arm.stats.resBurn);
        pushCell(cells, arm.stats.resFrost);
        pushCell(cells, arm.stats.resIgnite);
        pushCell(cells, arm.stats.resPoison);
        pushCell(cells, cas.resTotal, colDivider);
    }
    // MISC cols (WGTC, KDMG)
    if (showColGroups.has('MISC')) {
        pushCell(cells, arm.weightClass, colStarter);
        pushCell(cells, `${Math.round(arm.stats.kickMult * 100)}%`, colDivider);
    }
    return { itemName: arm.name, itemKey: arm.key, cells, pinned: cas.pinned };
}
//# sourceMappingURL=armorsRender.js.map