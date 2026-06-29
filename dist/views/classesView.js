import { calculateClassStats } from '../calc/classesCalc.js';
import { getPlayerLevel } from '../calc/sharedCalc.js';
import { CLASS_TYPES, isClassType } from '../model.js';
import { CLASSES_HEADER_GROUPS, getClassRow, isClassesHeaderKey, } from '../render/classesRender.js';
import { addElemListener } from '../sharedDOM.js';
import { compareStringArrays, TableView } from './tableView.js';
const GroupToggles = {
    htmlClass: 'classes-group-toggle',
    htmlDataKey: 'col-group',
    toggles: {
        STATS: { text: 'Starting Stats', hover: 'Show starting stats' },
        CMPT: { text: 'Optimality', hover: "Show classes' compatibility with your entered stats" },
        GEAR: { text: 'Starting Gear', hover: 'Show starting gear' },
    },
};
const classesSortFns = {
    // INFO
    CLASS: (a, b) => a.item.name.localeCompare(b.item.name),
    TYPE: (a, b) => a.item.type.localeCompare(b.item.type),
    // STATS
    STR: (a, b) => a.item.stats.strength - b.item.stats.strength,
    AGI: (a, b) => a.item.stats.agility - b.item.stats.agility,
    END: (a, b) => a.item.stats.endurance - b.item.stats.endurance,
    VIT: (a, b) => a.item.stats.vitality - b.item.stats.vitality,
    RAD: (a, b) => a.item.stats.radiance - b.item.stats.radiance,
    INF: (a, b) => a.item.stats.inferno - b.item.stats.inferno,
    LVL: (a, b) => a.item.level - b.item.level,
    // CMPT
    NLVL: (a, b) => a.levelsNeeded - b.levelsNeeded,
    FLVL: (a, b) => getPlayerLevel(a.finalStats) - getPlayerLevel(b.finalStats),
    // GEAR
    WEAP: (a, b) => compareStringArrays(a.weaponNames, b.weaponNames),
    ARMR: (a, b) => compareStringArrays(a.armorNames, b.armorNames),
};
// ================================
// VIEW
// ================================
export function createClassesView(state, ctx) {
    return new ClassesView(state, ctx);
}
class ClassesView extends TableView {
    mode = 'classes';
    modeBtnText = 'Classes';
    headerGroups = CLASSES_HEADER_GROUPS;
    colGroupToggles = GroupToggles;
    sortFns = classesSortFns;
    ascendingByDefault = new Set(['CLASS', 'NLVL', 'FLVL']);
    isHeaderKey = isClassesHeaderKey;
    visibleElements = ['player-stats', 'optimize-btn', 'view-toggles'];
    sidebarSections = [
        {
            text: 'Classes',
            sectionKey: 'class-type',
            items: CLASS_TYPES,
            checkedItemsGetter: () => this.state.selectedTypes,
            itemVerifyFn: isClassType,
        },
    ];
    constructor(state, ctx) {
        super(state, ctx);
    }
    bindExtra(signal) {
        addElemListener('optimize-btn', 'click', () => this.optimizeClass(), { signal });
    }
    onPlayerStatsChanged() {
        this.fetchAndRender();
    }
    additionalSearchFilter(text, cst) {
        const textLower = text.toLowerCase();
        return (cst.weaponNames.some((v) => v.toLowerCase().includes(textLower)) ||
            cst.armorNames.some((v) => v.toLowerCase().includes(textLower)));
    }
    collectItems() {
        const showClasses = this.ctx.data.startingClasses.filter((cls) => this.state.selectedTypes.has(cls.type) || this.state.pinnedItems.has(cls.key));
        const calcStats = showClasses.map((cls) => calculateClassStats(cls, this.state.pinnedItems, this.ctx.shared.playerStats));
        return calcStats;
    }
    buildRow(item) {
        return getClassRow(item, this.state.showColGroups);
    }
    optimizeClass() {
        this.state.showColGroups.add('CMPT');
        this.state.sortKey = 'NLVL';
        this.state.ascending = true;
        this.sort();
        this.syncGroupToggles();
        this.refresh();
        this.ctx.save();
    }
}
//# sourceMappingURL=classesView.js.map