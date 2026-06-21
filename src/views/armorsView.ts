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

// ================================
// VIEW
// ================================

export function createArmorsView(state: ArmorsState, ctx: ViewContext) {
    return new ArmorsView(state, ctx);
}

class ArmorsView extends TableView<ArmorsState, ArmorsHeaderKey, ArmorsSuperheaderKey, CalculatedArmorStats> {
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
