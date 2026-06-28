import { getDefenseScalar } from '../calc/armorsCalc.js';
import { ARMOR_SLOTS, } from '../model.js';
import { escapeHtml, pushCell } from './sharedRender.js';
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
    'SMI',
    'BLE',
    'BRN',
    'IGN',
    'FRO',
    'PSN',
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
            { key: 'IGN', text: 'Ign', hover: 'Ignite Resistance' },
            { key: 'FRO', text: 'Fro', hover: 'Frostbite Resistance' },
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
const SLOT_PLACEHOLDER_PATHS = {
    Head: './img/ArmorSlots/Head.webp',
    Torso: './img/ArmorSlots/Torso.webp',
    Arms: './img/ArmorSlots/Arms.webp',
    Legs: './img/ArmorSlots/Legs.webp',
};
function getSlotInnerHtml(slot, equipped) {
    if (equipped === null) {
        return `<img class="slot-icon" src="${SLOT_PLACEHOLDER_PATHS[slot]}" alt="${slot} slot (empty)" title="Equip an armor in the table below">`;
    }
    const src = `./img/Armors/${escapeHtml(equipped.icon)}.webp`;
    const name = escapeHtml(equipped.name);
    return (`<img class="slot-icon" src="${src}" alt="${name}" title="${name}">` +
        `<button class="slot-unequip" type="button" data-slot="${slot}" title="Unequip ${name}">&times;</button>`);
}
export function getPaperDollHtml(equipped, armors) {
    const parts = [];
    for (const slot of ARMOR_SLOTS) {
        let armor = null;
        if (equipped[slot] !== null) {
            const _armor = armors.get(equipped[slot]);
            if (_armor) {
                armor = _armor;
            }
            else
                console.log(`Failed to retrieve armor with key "${equipped[slot]}"`);
        }
        parts.push(`<div class="armor-slot${armor ? ' equipped' : ''}" data-slot="${slot}">${getSlotInnerHtml(slot, armor)}</div>`);
    }
    return parts.join('');
}
export function getDerivedArmorHtml(stats) {
    function pushRow(h1, d1, h2, d2) {
        rows.push(`<tr><th class="col-starter">${h1}</th><td class="col-divider">${d1}</td><th class="col-starter">${h2}</th><td class="col-divider">${d2}</td></tr>`);
    }
    function mitigation(defVal) {
        const dr = 1 - getDefenseScalar(defVal);
        return `${Math.round(defVal)} (${(dr * 100).toFixed(1)}% DR)`;
    }
    const rows = [];
    rows.push('<table id="defense-table"><colgroup><col><col style="width:25%"><col style="width:25%"><col style="width:25%"><col style="width:25%"></colgroup>' +
        '<thead><tr><th class="col-starter col-divider">Selected Armors</th><th class="col-starter col-divider" colspan="2">Player Defenses</th><th class="col-starter col-divider" colspan="2">Player Resistances</th></tr>' +
        '</thead>');
    rows.push(`<tr><th id="paper-doll-cell" rowspan="6" class="col-starter col-divider"></th>` +
        `<th class="col-starter">Physical</th><td class="col-divider">${mitigation(stats.physical)}</td><th class="col-starter">Smite</th><td class="col-divider">${stats.smite.toFixed()}</td></tr>`);
    pushRow('Fire', mitigation(stats.fire), 'Bleed', stats.bleed.toFixed());
    pushRow('Holy', mitigation(stats.holy), 'Burn', stats.burn.toFixed());
    pushRow('Wither', mitigation(stats.wither), 'Ignite', stats.ignite.toFixed());
    pushRow('Poise', stats.poise.toFixed(1), 'Frostbite', stats.frost.toFixed());
    const weightPer = stats.weight / stats.playerStats.weight + 1e-9;
    let weightClass;
    if (weightPer <= 0.4)
        weightClass = 'Light';
    else if (weightPer <= 0.75)
        weightClass = 'Medium';
    else if (weightPer <= 1.0)
        weightClass = 'Heavy';
    else
        weightClass = 'Overburdened';
    const weight = `${stats.weight.toFixed(1)} / ${stats.playerStats.weight.toFixed(1)} (${weightClass})`;
    pushRow('Weight Load', weight, 'Poison', stats.poison.toFixed());
    return `<tbody>${rows.join('')}</tbody></table>`;
}
export function getArmorRow(cas, showColGroups) {
    const cells = [];
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
    // STATUS cols (SMI, BLE, BRN, IGN, FRO, PSN, DT)
    if (showColGroups.has('STATUS')) {
        pushCell(cells, arm.stats.resSmite, 'col-starter');
        pushCell(cells, arm.stats.resBleed);
        pushCell(cells, arm.stats.resBurn);
        pushCell(cells, arm.stats.resIgnite);
        pushCell(cells, arm.stats.resFrost);
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
//# sourceMappingURL=armorsRender.js.map