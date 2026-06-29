import { calculateRuneStats } from '../calc/runesCalc.js';
import { isRuneType, RUNE_TYPES, type CalculatedRuneStats, type Rune, type RuneType } from '../model.js';
import {
    getRuneRow,
    isRunesHeaderKey,
    RUNES_HEADER_GROUPS,
    type RunesHeaderKey,
    type RunesSuperheaderKey,
} from '../render/runesRender.js';
import type { Row, SidebarSection, ToggleGroup } from '../render/sharedRender.js';
import type { RunesState } from '../state.js';
import { compareStringArrays, TableView, type SortFunction } from './tableView.js';
import type { ViewContext } from './view.js';

const GroupToggles: ToggleGroup<RunesSuperheaderKey> = {
    htmlClass: 'runes-group-toggle',
    htmlDataKey: 'col-group',
    toggles: {
        WEAP: { text: 'Weapon Effects', hover: 'Show rune weapon effects' },
        ARMR: { text: 'Shield Effects', hover: 'Show rune shield effects' },
    },
};

const runesSortFns: Record<RunesHeaderKey, SortFunction<CalculatedRuneStats>> = {
    // INFO
    RUNE: (a, b) => a.item.name.localeCompare(b.item.name),
    TYPE: (a, b) => a.item.type.localeCompare(b.item.type),
    WEAPFX: (a, b) => compareStringArrays(a.weaponEffects, b.weaponEffects),
    ARMRFX: (a, b) => compareStringArrays(a.armorEffects, b.armorEffects),
};

// ================================
// VIEW
// ================================

export function createRunesView(state: RunesState, ctx: ViewContext) {
    return new RunesView(state, ctx);
}

class RunesView extends TableView<RunesState, RunesHeaderKey, RunesSuperheaderKey, Rune, CalculatedRuneStats> {
    readonly mode = 'runes' as const;
    readonly modeBtnText = 'Runes' as const;

    protected readonly headerGroups = RUNES_HEADER_GROUPS;
    protected readonly colGroupToggles = GroupToggles;
    protected readonly sortFns = runesSortFns;
    protected readonly ascendingByDefault: ReadonlySet<RunesHeaderKey> = new Set(['RUNE', 'TYPE', 'WEAPFX', 'ARMRFX']);
    protected isHeaderKey = isRunesHeaderKey;

    protected readonly sidebarSections: [SidebarSection<RuneType>] = [
        {
            text: 'Runes',
            sectionKey: 'rune-type',
            items: RUNE_TYPES,
            checkedItemsGetter: () => this.state.selectedTypes,
            itemVerifyFn: isRuneType,
        },
    ];

    constructor(state: RunesState, ctx: ViewContext) {
        super(state, ctx);
    }

    protected additionalSearchFilter(_text: string, _cst: CalculatedRuneStats): boolean {
        const textLower = _text.toLowerCase();
        return (
            _cst.weaponEffects.some((v) => v.toLowerCase().includes(textLower)) ||
            _cst.armorEffects.some((v) => v.toLowerCase().includes(textLower))
        );
    }

    protected collectItems(): readonly CalculatedRuneStats[] {
        const showRunes: Rune[] = this.ctx.data.runes.filter(
            (rune) => this.state.selectedTypes.has(rune.type) || this.state.pinnedItems.has(rune.key)
        );
        const calcStats = showRunes.map((rune) => calculateRuneStats(rune, this.state.pinnedItems));
        return calcStats;
    }

    protected buildRow(item: CalculatedRuneStats): Row {
        return getRuneRow(item, this.state.showColGroups);
    }
}
