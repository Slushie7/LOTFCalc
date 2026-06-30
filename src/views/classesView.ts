import { calculateClassStats } from '../calc/classesCalc.js';
import { getPlayerLevel } from '../calc/sharedCalc.js';
import { CLASS_TYPES, isClassType, type CalculatedClassStats, type ClassType, type StartingClass } from '../model.js';
import {
    CLASSES_HEADER_GROUPS,
    getClassRow,
    isClassesHeaderKey,
    type ClassesHeaderKey,
    type ClassesSuperheaderKey,
} from '../render/classesRender.js';
import type { Row, SidebarSection, ToggleGroup } from '../render/sharedRender.js';
import { addElemListener } from '../sharedDOM.js';
import type { ClassesState } from '../state.js';
import { compareStringArrays, TableView, type SortFunction } from './tableView.js';
import type { ViewContext } from './view.js';

const GroupToggles: ToggleGroup<ClassesSuperheaderKey> = {
    htmlClass: 'classes-group-toggle',
    htmlDataKey: 'col-group',
    toggles: {
        STATS: { text: 'Starting Stats', hover: 'Show starting stats' },
        CMPT: { text: 'Optimization', hover: "Show classes' compatibility with your entered stats" },
        GEAR: { text: 'Starting Gear', hover: 'Show starting gear' },
    },
};

const classesSortFns: Record<ClassesHeaderKey, SortFunction<CalculatedClassStats>> = {
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

export function createClassesView(state: ClassesState, ctx: ViewContext) {
    return new ClassesView(state, ctx);
}

class ClassesView extends TableView<
    ClassesState,
    ClassesHeaderKey,
    ClassesSuperheaderKey,
    StartingClass,
    CalculatedClassStats
> {
    readonly mode = 'classes' as const;
    readonly modeBtnText = 'Classes' as const;

    protected readonly headerGroups = CLASSES_HEADER_GROUPS;
    protected readonly colGroupToggles = GroupToggles;
    protected readonly sortFns = classesSortFns;
    protected readonly ascendingByDefault: ReadonlySet<ClassesHeaderKey> = new Set(['CLASS', 'NLVL', 'FLVL']);
    protected isHeaderKey = isClassesHeaderKey;
    protected readonly visibleElements = ['player-stats', 'optimize-btn', 'view-toggles'];

    protected readonly sidebarSections: [SidebarSection<ClassType>] = [
        {
            text: 'Classes',
            sectionKey: 'class-type',
            items: CLASS_TYPES,
            checkedItemsGetter: () => this.state.selectedTypes,
            itemVerifyFn: isClassType,
        },
    ];

    constructor(state: ClassesState, ctx: ViewContext) {
        super(state, ctx);
    }

    protected bindExtra(signal: AbortSignal): void {
        addElemListener('optimize-btn', 'click', () => this.optimizeClass(), { signal });
    }

    override onPlayerStatsChanged(): void {
        this.fetchAndRender();
    }

    protected additionalSearchFilter(text: string, cst: CalculatedClassStats): boolean {
        const textLower = text.toLowerCase();
        return (
            cst.weaponNames.some((v) => v.toLowerCase().includes(textLower)) ||
            cst.armorNames.some((v) => v.toLowerCase().includes(textLower))
        );
    }

    protected collectItems(): readonly CalculatedClassStats[] {
        const showClasses: StartingClass[] = this.ctx.data.startingClasses.filter(
            (cls) => this.state.selectedTypes.has(cls.type) || this.state.pinnedItems.has(cls.key)
        );
        const calcStats = showClasses.map((cls) =>
            calculateClassStats(cls, this.state.pinnedItems, this.ctx.shared.playerStats)
        );
        return calcStats;
    }

    protected buildRow(item: CalculatedClassStats): Row {
        return getClassRow(item, this.state.showColGroups);
    }

    protected optimizeClass(): void {
        this.state.showColGroups.add('CMPT');
        this.state.sortKey = 'NLVL';
        this.state.ascending = true;
        this.sort();
        this.syncGroupToggles();
        this.refresh();
        this.ctx.save();
    }
}
