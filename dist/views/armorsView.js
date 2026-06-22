import { ARMORS_HEADER_GROUPS, getArmorRow, isArmorsHeaderKey, } from '../render/armorsRender.js';
import { ARMOR_SLOTS, ARMOR_WEIGHT_CLASSES, isArmorSlot, isArmorWeightClass, } from '../model.js';
import { calculateArmorStats } from '../calc/armorsCalc.js';
import {} from '../render/sharedRender.js';
import { TableView } from './tableView.js';
const GroupToggles = {
    htmlClass: 'armors-group-toggle',
    htmlDataKey: 'col-group',
    toggles: {
        DEF: { text: 'Defenses', hover: 'Armor defenses' },
        STATUS: { text: 'Resistances', hover: 'Show armor resistances' },
        MISC: {
            text: 'Misc',
            hover: 'Show armor weight class and kick-damage multiplier',
        },
    },
};
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
const armorsSortFns = {
    // INFO
    ARMR: (a, b) => a.armor.name.localeCompare(b.armor.name),
    SLOT: (a, b) => SlotEnum[a.armor.slot] - SlotEnum[b.armor.slot],
    WGT: (a, b) => a.armor.stats.weight - b.armor.stats.weight,
    POIS: (a, b) => a.armor.stats.poise - b.armor.stats.poise,
    // DEF
    DP: (a, b) => a.armor.stats.defPhysical - b.armor.stats.defPhysical,
    DF: (a, b) => a.armor.stats.defFire - b.armor.stats.defFire,
    DH: (a, b) => a.armor.stats.defHoly - b.armor.stats.defHoly,
    DW: (a, b) => a.armor.stats.defWither - b.armor.stats.defWither,
    DT: (a, b) => a.defTotal - b.defTotal,
    // STATUS
    BLE: (a, b) => a.armor.stats.resBleed - b.armor.stats.resBleed,
    BRN: (a, b) => a.armor.stats.resBurn - b.armor.stats.resBurn,
    PSN: (a, b) => a.armor.stats.resPoison - b.armor.stats.resPoison,
    SMI: (a, b) => a.armor.stats.resSmite - b.armor.stats.resSmite,
    IGN: (a, b) => a.armor.stats.resIgnite - b.armor.stats.resIgnite,
    FRO: (a, b) => a.armor.stats.resFrost - b.armor.stats.resFrost,
    RT: (a, b) => a.resTotal - b.resTotal,
    // MISC
    WGTC: (a, b) => WeightEnum[a.armor.weightClass] - WeightEnum[b.armor.weightClass],
    KDMG: (a, b) => a.armor.stats.kickMult - b.armor.stats.kickMult,
};
// ================================
// VIEW
// ================================
export function createArmorsView(state, ctx) {
    return new ArmorsView(state, ctx);
}
class ArmorsView extends TableView {
    mode = 'armors';
    modeBtnText = 'Armors';
    headerGroups = ARMORS_HEADER_GROUPS;
    colGroupToggles = GroupToggles;
    sortFns = armorsSortFns;
    ascendingByDefault = new Set(['ARMR', 'SLOT', 'WGT']);
    isHeaderKey = isArmorsHeaderKey;
    sidebarSections = [
        {
            text: 'Armors',
            sectionKey: 'armor-slot',
            items: ARMOR_SLOTS,
            checkedItemsGetter: () => this.state.selectedSlots,
            itemVerifyFn: isArmorSlot,
        },
        {
            text: 'Weights',
            sectionKey: 'armor-weight',
            items: ARMOR_WEIGHT_CLASSES,
            checkedItemsGetter: () => this.state.selectedWeights,
            itemVerifyFn: isArmorWeightClass,
        },
    ];
    constructor(state, ctx) {
        super(state, ctx);
    }
    collectItems() {
        const showArmors = this.ctx.data.armors.filter((arm) => (this.state.selectedSlots.has(arm.slot) && this.state.selectedWeights.has(arm.weightClass)) ||
            this.state.pinnedItems.has(arm.key));
        const calcStats = showArmors.map((arm) => calculateArmorStats(arm, this.state.pinnedItems));
        return calcStats;
    }
    buildRow(item) {
        return getArmorRow(item, this.state.showColGroups);
    }
}
//# sourceMappingURL=armorsView.js.map