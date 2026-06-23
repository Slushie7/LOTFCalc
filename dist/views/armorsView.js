import { ARMORS_HEADER_GROUPS, getArmorRow, isArmorsHeaderKey, getPaperDollHtml, } from '../render/armorsRender.js';
import { ARMOR_SLOTS, ARMOR_WEIGHT_CLASSES, isArmorSlot, isArmorWeightClass, } from '../model.js';
import { calculateArmorStats } from '../calc/armorsCalc.js';
import {} from '../render/sharedRender.js';
import { TableView } from './tableView.js';
import { addClassListeners, addElemListener, getElem } from '../sharedDOM.js';
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
    ARMR: (a, b) => a.item.name.localeCompare(b.item.name),
    EQUIP: (a, b) => Number(a.equipped) - Number(b.equipped),
    SLOT: (a, b) => SlotEnum[a.item.slot] - SlotEnum[b.item.slot],
    WGT: (a, b) => a.item.stats.weight - b.item.stats.weight,
    POIS: (a, b) => a.item.stats.poise - b.item.stats.poise,
    // DEF
    DP: (a, b) => a.item.stats.defPhysical - b.item.stats.defPhysical,
    DF: (a, b) => a.item.stats.defFire - b.item.stats.defFire,
    DH: (a, b) => a.item.stats.defHoly - b.item.stats.defHoly,
    DW: (a, b) => a.item.stats.defWither - b.item.stats.defWither,
    DT: (a, b) => a.defTotal - b.defTotal,
    // STATUS
    BLE: (a, b) => a.item.stats.resBleed - b.item.stats.resBleed,
    BRN: (a, b) => a.item.stats.resBurn - b.item.stats.resBurn,
    PSN: (a, b) => a.item.stats.resPoison - b.item.stats.resPoison,
    SMI: (a, b) => a.item.stats.resSmite - b.item.stats.resSmite,
    IGN: (a, b) => a.item.stats.resIgnite - b.item.stats.resIgnite,
    FRO: (a, b) => a.item.stats.resFrost - b.item.stats.resFrost,
    RT: (a, b) => a.resTotal - b.resTotal,
    // MISC
    WGTC: (a, b) => WeightEnum[a.item.weightClass] - WeightEnum[b.item.weightClass],
    KDMG: (a, b) => a.item.stats.kickMult - b.item.stats.kickMult,
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
    armors;
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
        this.armors = new Map(ctx.data.armors.map((armr) => [armr.key, armr]));
    }
    onShow() {
        getElem('paper-doll').hidden = false;
        getElem('derived-armor').hidden = false;
        this.updatePaperDoll();
    }
    onHide() {
        getElem('paper-doll').hidden = true;
        getElem('derived-armor').hidden = true;
    }
    bindExtra(_signal) {
        addClassListeners('stat-input', HTMLInputElement, 'input', () => this.updateDerivedArmor());
        // paper doll 'X' buttons
        addElemListener('paper-doll', 'click', (e) => this.onPaperDollClick(e));
    }
    onPaperDollClick(e) {
        if (!(e.target instanceof Element))
            return;
        const el = e.target.closest('button.slot-unequip');
        if (!el)
            return;
        // clear the paper doll slot and refresh the paper doll's HTML
        const slot = el.dataset.slot;
        if (!isArmorSlot(slot))
            return;
        this.state.paperDoll[slot] = null;
        this.updatePaperDoll();
        this.ctx.save();
    }
    handleExtraBodyClick(e) {
        if (!(e.target instanceof HTMLButtonElement))
            return false;
        const el = e.target;
        if (el.classList.contains('equip-unequip')) {
            if (el.dataset.equipArmor) {
                // equip the armor in the paper doll
                const armor = this.armors.get(el.dataset.equipArmor);
                if (!armor)
                    return false;
                this.state.paperDoll[armor.slot] = armor.key;
            }
            else if (el.dataset.unequipArmor) {
                // unequip the armor from the paper doll
                const armor = this.armors.get(el.dataset.unequipArmor);
                if (!armor)
                    return false;
                this.state.paperDoll[armor.slot] = null;
            }
            this.updatePaperDoll();
            return true;
        }
        return false;
    }
    updateDerivedArmor() { }
    updatePaperDoll() {
        // update the 'equipped' attribute for all items in the table's CalculatedArmorStats cache
        const equipped = new Set(Object.values(this.state.paperDoll));
        this.calculatedItems.map((v) => (v.equipped = equipped.has(v.item.key)));
        // update the DOM
        getElem('paper-doll').innerHTML = getPaperDollHtml(this.state.paperDoll, this.armors);
        this.updateDerivedArmor();
        this.renderItems();
    }
    collectItems() {
        const showArmors = this.ctx.data.armors.filter((arm) => (this.state.selectedSlots.has(arm.slot) && this.state.selectedWeights.has(arm.weightClass)) ||
            this.state.pinnedItems.has(arm.key));
        const equipped = new Set(Object.values(this.state.paperDoll));
        const calcStats = showArmors.map((arm) => calculateArmorStats(arm, this.state.pinnedItems, equipped));
        return calcStats;
    }
    buildRow(item) {
        return getArmorRow(item, this.state.showColGroups);
    }
}
//# sourceMappingURL=armorsView.js.map