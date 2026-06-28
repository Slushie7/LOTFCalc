import { calculateClassStats } from '../calc/classesCalc.js';
import { CLASS_TYPES, isClassType } from '../model.js';
import { CLASSES_HEADER_GROUPS, getClassRow, isClassesHeaderKey, } from '../render/classesRender.js';
import { TableView } from './tableView.js';
const GroupToggles = {
    htmlClass: 'classes-group-toggle',
    htmlDataKey: 'col-group',
    toggles: {
        STATS: { text: 'Starting Stats', hover: 'Show starting stats' },
        GEAR: { text: 'Starting Gear', hover: 'Show starting gear' },
    },
};
function compareArrays(a, b) {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
        const x = a[i];
        const y = b[i];
        const c = x.localeCompare(y);
        if (c !== 0)
            return c < 0 ? -1 : 1;
    }
    return a.length - b.length;
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
    // GEAR
    WEAP: (a, b) => compareArrays(a.weapons, b.weapons),
    ARMR: (a, b) => compareArrays(a.armor, b.armor),
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
    ascendingByDefault = new Set(['CLASS']);
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
    additionalSearchFilter(text, cst) {
        const textLower = text.toLowerCase();
        return (cst.weapons.some((v) => v.toLowerCase().includes(textLower)) ||
            cst.armor.some((v) => v.toLowerCase().includes(textLower)));
    }
    collectItems() {
        const showClasses = this.ctx.data.startingClasses.filter((cls) => this.state.selectedTypes.has(cls.type) || this.state.pinnedItems.has(cls.key));
        const calcStats = showClasses.map((cls) => calculateClassStats(cls, this.state.pinnedItems));
        return calcStats;
    }
    buildRow(item) {
        return getClassRow(item, this.state.showColGroups);
    }
}
//# sourceMappingURL=classesView.js.map