import { calculateClassStats } from '../calc/classesCalc.js';
import { getPlayerLevel } from '../calc/sharedCalc.js';
import { CLASS_TYPES, isClassType } from '../model.js';
import { CLASSES_HEADER_GROUPS, getClassRow, isClassesHeaderKey, } from '../render/classesRender.js';
import { addClassListeners, addElemListener, getElem } from '../sharedDOM.js';
import { compareNumArrays, compareStringArrays, TableView } from './tableView.js';
const GroupToggles = {
    htmlClass: 'classes-group-toggle',
    htmlDataKey: 'col-group',
    toggles: {
        STATS: { text: 'Starting Stats', hover: 'Show starting stats' },
        CMPT: { text: 'Stats Compatibility', hover: "Show classes' compatibility with your entered stats" },
        GEAR: { text: 'Starting Gear', hover: 'Show starting gear' },
    },
};
function compareCompatScores(a, b) {
    if (a.compatScore !== b.compatScore)
        return a.compatScore - b.compatScore;
    // because the 'score' column is a descending column (higher is better),
    // the remaining comparisons must be reversed (lower is better for them)
    if (a.levelsNeeded !== b.levelsNeeded)
        return b.levelsNeeded - a.levelsNeeded;
    const lvlA = getPlayerLevel(a.finalStats);
    const lvlB = getPlayerLevel(b.finalStats);
    if (lvlA !== lvlB)
        return lvlB - lvlA;
    return 0;
}
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
    SCORE: (a, b) => compareCompatScores(a, b),
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
    onShow() {
        getElem('player-stats').hidden = false;
        getElem('optimize-btn').hidden = false;
        getElem('view-toggles').hidden = false;
    }
    onHide() {
        getElem('player-stats').hidden = true;
        getElem('optimize-btn').hidden = true;
        getElem('view-toggles').hidden = true;
    }
    bindExtra(signal) {
        addClassListeners('stat-input', HTMLInputElement, 'input', () => this.fetchAndRender(), { signal });
        addElemListener('optimize-btn', 'click', () => this.optimizeClass(), { signal });
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
        this.state.sortKey = 'SCORE';
        this.state.ascending = false;
        this.sort();
        this.syncGroupToggles();
        this.refresh();
        this.ctx.save();
    }
}
//# sourceMappingURL=classesView.js.map