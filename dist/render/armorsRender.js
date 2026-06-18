import { epsilonFloor } from '../calc/sharedCalc.js';
import { ARMOR_SLOTS, ARMOR_WEIGHT_CLASSES, } from '../model.js';
import { colDivider, colFirst, colStarter, escapeHtml, getHeaderHtml, getTableBodyHtml, headerStatusImagePaths, pushCell, pushSectionHtml, } from './sharedRender.js';
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
/**
 * Generates the HTML to display the available armor slots and weight classes. Slots in checkedSlots will
 * be displayed in a checked state; weight classes in checkedWeights will be also checked.
 * @param armorsClasses
 * @param checkedClasses
 * @returns
 */
export function getArmorsSidebarHtml(checkedSlots, checkedWeights) {
    const parts = [];
    pushSectionHtml(parts, 'Armors', 'armor-slots');
    for (const slot of ARMOR_SLOTS) {
        const checked = checkedSlots.has(slot) ? ' checked' : '';
        parts.push(`<label><input type="checkbox"${checked} data-slot="${escapeHtml(slot)}">${escapeHtml(slot)}</label>`);
    }
    parts.push('<br>');
    pushSectionHtml(parts, 'Weights', 'armor-weights');
    for (const wc of ARMOR_WEIGHT_CLASSES) {
        const checked = checkedWeights.has(wc) ? ' checked' : '';
        parts.push(`<label><input type="checkbox"${checked} data-weight-class="${escapeHtml(wc)}">${escapeHtml(wc)}</label>`);
    }
    return parts.join('');
}
export function getArmorsHeaderHtml(groups, sortKey, ascending) {
    return getHeaderHtml(groups, sortKey, ascending, headerStatusImagePaths);
}
export function getArmorsHtml(weaponRows, armorFadeIn) {
    const firstColUrl = (row) => `https://thelordsofthefallen.wiki.fextralife.com/${encodeURIComponent(row.itemName)}`;
    return getTableBodyHtml(weaponRows, firstColUrl, armorFadeIn);
}
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
const SlotEnum = {
    Head: 0,
    Torso: 1,
    Arms: 2,
    Legs: 3,
};
const WeightEnum = {
    Light: 0,
    Medium: 1,
    Heavy: 2,
};
const sortFunctions = {
    // INFO
    ARMR: (cas1, cas2) => cas1.armor.name.localeCompare(cas2.armor.name),
    SLOT: (cas1, cas2) => SlotEnum[cas1.armor.slot] - SlotEnum[cas2.armor.slot],
    WGT: (cas1, cas2) => cas1.armor.stats.weight - cas2.armor.stats.weight,
    POIS: (cas1, cas2) => cas1.armor.stats.poise - cas2.armor.stats.poise,
    // DEF
    DP: (cas1, cas2) => cas1.armor.stats.defPhysical - cas2.armor.stats.defPhysical,
    DF: (cas1, cas2) => cas1.armor.stats.defFire - cas2.armor.stats.defFire,
    DH: (cas1, cas2) => cas1.armor.stats.defHoly - cas2.armor.stats.defHoly,
    DW: (cas1, cas2) => cas1.armor.stats.defWither - cas2.armor.stats.defWither,
    DT: (cas1, cas2) => cas1.defTotal - cas2.defTotal,
    // STATUS
    BLE: (cas1, cas2) => cas1.armor.stats.resBleed - cas2.armor.stats.resBleed,
    BRN: (cas1, cas2) => cas1.armor.stats.resBurn - cas2.armor.stats.resBurn,
    PSN: (cas1, cas2) => cas1.armor.stats.resPoison - cas2.armor.stats.resPoison,
    SMI: (cas1, cas2) => cas1.armor.stats.resSmite - cas2.armor.stats.resSmite,
    IGN: (cas1, cas2) => cas1.armor.stats.resIgnite - cas2.armor.stats.resIgnite,
    FRO: (cas1, cas2) => cas1.armor.stats.resFrost - cas2.armor.stats.resFrost,
    RT: (cas1, cas2) => cas1.resTotal - cas2.resTotal,
    // MISC
    WGTC: (cas1, cas2) => WeightEnum[cas1.armor.weightClass] - WeightEnum[cas2.armor.weightClass],
    KDMG: (cas1, cas2) => cas1.armor.stats.kickMult - cas2.armor.stats.kickMult,
};
/**
 * Sort the CalculatedWeaponStats by the given sort key. Pinned weapons are separated from unpinned weapons,
 * and then both lists are sorted and returned.
 * @param calculated
 * @param sortKey
 * @param ascending
 * @returns
 */
export function sortCalculatedArmors(calculated, sortKey, ascending) {
    const pinned = [];
    const unpinned = [];
    // separate pinned from unpinned armors
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
//# sourceMappingURL=armorsRender.js.map