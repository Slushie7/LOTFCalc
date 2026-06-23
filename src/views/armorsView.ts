import type { ViewContext } from './view.js';
import type { ArmorsState } from '../state.js';
import {
    ARMORS_HEADER_GROUPS,
    getArmorRow,
    isArmorsHeaderKey,
    type ArmorsSuperheaderKey,
    type ArmorsHeaderKey,
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
import { calculateArmorStats } from '../calc/armorsCalc.js';
import { type Row, type SidebarSection, type ToggleGroup } from '../render/sharedRender.js';
import { TableView, type SortFunction } from './tableView.js';

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
    }

    protected collectItems(): readonly CalculatedArmorStats[] {
        const showArmors: Armor[] = this.ctx.data.armors.filter(
            (arm) =>
                (this.state.selectedSlots.has(arm.slot) && this.state.selectedWeights.has(arm.weightClass)) ||
                this.state.pinnedItems.has(arm.key)
        );
        const calcStats = showArmors.map((arm) => calculateArmorStats(arm, this.state.pinnedItems));
        return calcStats;
    }

    protected buildRow(item: CalculatedArmorStats): Row {
        return getArmorRow(item, this.state.showColGroups);
    }
}
