import type { ViewContext } from './view.js';
import type { ArmorsState } from '../state.js';
import {
    ARMORS_HEADER_GROUPS,
    getArmorRow,
    isArmorsHeaderKey,
    type ArmorsSuperheaderKey,
    type ArmorsHeaderKey,
    getPaperDollHtml,
    getDerivedArmorHtml,
} from '../render/armorsRender.js';
import {
    ARMOR_SLOTS,
    ARMOR_WEIGHT_CLASSES,
    isArmorSlot,
    isArmorWeightClass,
    type Armor,
    type ArmorSlot,
    type ArmorWeightClass,
    type CalculatedArmorStats,
} from '../model.js';
import { calculateArmorStats, calculatePlayerDefenses } from '../calc/armorsCalc.js';
import { type Row, type SidebarSection, type ToggleGroup } from '../render/sharedRender.js';
import { TableView, type SortFunction } from './tableView.js';
import { addClassListeners, addElemListener, getElem } from '../sharedDOM.js';

const GroupToggles: ToggleGroup<ArmorsSuperheaderKey> = {
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

const SlotEnum: Record<ArmorSlot, number> = {
    Head: 0,
    Torso: 1,
    Arms: 2,
    Legs: 3,
};
const WeightEnum: Record<ArmorWeightClass, number> = {
    Light: 0,
    Medium: 1,
    Heavy: 2,
};
const armorsSortFns: Record<ArmorsHeaderKey, SortFunction<CalculatedArmorStats>> = {
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

export function createArmorsView(state: ArmorsState, ctx: ViewContext) {
    return new ArmorsView(state, ctx);
}

class ArmorsView extends TableView<ArmorsState, ArmorsHeaderKey, ArmorsSuperheaderKey, Armor, CalculatedArmorStats> {
    readonly mode = 'armors' as const;
    readonly modeBtnText = 'Armors' as const;
    readonly armors: Map<string, Armor>;

    protected readonly headerGroups = ARMORS_HEADER_GROUPS;
    protected readonly colGroupToggles = GroupToggles;
    protected readonly sortFns = armorsSortFns;
    protected readonly ascendingByDefault: ReadonlySet<ArmorsHeaderKey> = new Set(['ARMR', 'SLOT', 'WGT']);
    protected isHeaderKey = isArmorsHeaderKey;

    protected readonly sidebarSections: [SidebarSection<ArmorSlot>, SidebarSection<ArmorWeightClass>] = [
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

    constructor(state: ArmorsState, ctx: ViewContext) {
        super(state, ctx);
        this.armors = new Map(ctx.data.armors.map((armr) => [armr.key, armr]));
    }

    protected onShow(): void {
        getElem('player-stats').hidden = false;
        getElem('paper-doll').hidden = false;
        getElem('derived-armor').hidden = false;
        this.updatePaperDoll();
    }

    protected onHide(): void {
        getElem('player-stats').hidden = true;
        getElem('paper-doll').hidden = true;
        getElem('derived-armor').hidden = true;
    }

    protected bindExtra(signal: AbortSignal): void {
        // changes to player's stats should update derived armor display
        addClassListeners('stat-input', HTMLInputElement, 'input', () => this.updateDerivedArmor(), { signal });
        // paper doll 'X' buttons for unequipping armors
        addElemListener('paper-doll', 'click', (e) => this.onPaperDollClick(e), { signal });
    }

    protected onPaperDollClick(e: Event): void {
        if (!(e.target instanceof Element)) return;
        const el = e.target.closest<HTMLButtonElement>('button.slot-unequip');
        if (!el) return;

        // clear the paper doll slot and refresh the paper doll's HTML
        const slot = el.dataset.slot;
        if (!isArmorSlot(slot)) return;
        this.state.paperDoll[slot] = null;
        this.updatePaperDoll();
        this.ctx.save();
    }

    protected handleExtraBodyClick(e: Event): boolean {
        if (!(e.target instanceof HTMLButtonElement)) return false;
        const el = e.target;

        if (el.classList.contains('equip-unequip')) {
            if (el.dataset.equipArmor) {
                // equip the armor in the paper doll
                const armor = this.armors.get(el.dataset.equipArmor);
                if (!armor) return false;
                this.state.paperDoll[armor.slot] = armor.key;
            } else if (el.dataset.unequipArmor) {
                // unequip the armor from the paper doll
                const armor = this.armors.get(el.dataset.unequipArmor);
                if (!armor) return false;
                this.state.paperDoll[armor.slot] = null;
            }
            this.updatePaperDoll();
            this.ctx.save();
            return true;
        }

        return false;
    }

    protected updatePaperDoll(): void {
        // update the 'equipped' attribute for all items in the table's CalculatedArmorStats cache
        const equipped = new Set(Object.values(this.state.paperDoll));
        this.calculatedItems.map((v) => (v.equipped = equipped.has(v.item.key)));

        // update the DOM
        getElem('paper-doll').innerHTML = getPaperDollHtml(this.state.paperDoll, this.armors);
        this.updateDerivedArmor();
        this.renderItems();
    }

    protected updateDerivedArmor(): void {
        const pd = this.state.paperDoll;
        const head = pd.Head ? this.armors.get(pd.Head) || null : null;
        const torso = pd.Torso ? this.armors.get(pd.Torso) || null : null;
        const arms = pd.Arms ? this.armors.get(pd.Arms) || null : null;
        const legs = pd.Legs ? this.armors.get(pd.Legs) || null : null;
        const derivedArmor = calculatePlayerDefenses(
            this.ctx.shared.playerStats,
            head,
            torso,
            arms,
            legs,
            this.ctx.data.curves
        );
        getElem('derived-armor').innerHTML = getDerivedArmorHtml(derivedArmor);
    }

    protected collectItems(): readonly CalculatedArmorStats[] {
        const showArmors: Armor[] = this.ctx.data.armors.filter(
            (arm) =>
                (this.state.selectedSlots.has(arm.slot) && this.state.selectedWeights.has(arm.weightClass)) ||
                this.state.pinnedItems.has(arm.key)
        );
        const equipped = new Set(Object.values(this.state.paperDoll));
        const calcStats = showArmors.map((arm) => calculateArmorStats(arm, this.state.pinnedItems, equipped));
        return calcStats;
    }

    protected buildRow(item: CalculatedArmorStats): Row {
        return getArmorRow(item, this.state.showColGroups);
    }
}
