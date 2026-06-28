import { calculateRuneStats } from '../calc/runesCalc.js';
import { isRuneType, RUNE_TYPES } from '../model.js';
import { getRuneRow, isRunesHeaderKey, RUNES_HEADER_GROUPS, } from '../render/runesRender.js';
import { TableView } from './tableView.js';
const GroupToggles = {
    htmlClass: 'runes-group-toggle',
    htmlDataKey: 'col-group',
    toggles: {
        WEAP: { text: 'Weapon Effects', hover: 'Show rune weapon effects' },
        ARMR: { text: 'Shield Effects', hover: 'Show rune shield effects' },
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
const runesSortFns = {
    // INFO
    RUNE: (a, b) => a.item.name.localeCompare(b.item.name),
    TYPE: (a, b) => a.item.type.localeCompare(b.item.type),
    WEAPFX: (a, b) => compareArrays(a.weaponEffects, b.weaponEffects),
    ARMRFX: (a, b) => compareArrays(a.armorEffects, b.armorEffects),
};
// ================================
// VIEW
// ================================
export function createRunesView(state, ctx) {
    return new RunesView(state, ctx);
}
class RunesView extends TableView {
    mode = 'runes';
    modeBtnText = 'Runes';
    headerGroups = RUNES_HEADER_GROUPS;
    colGroupToggles = GroupToggles;
    sortFns = runesSortFns;
    ascendingByDefault = new Set(['RUNE', 'TYPE', 'WEAPFX', 'ARMRFX']);
    isHeaderKey = isRunesHeaderKey;
    sidebarSections = [
        {
            text: 'Runes',
            sectionKey: 'rune-type',
            items: RUNE_TYPES,
            checkedItemsGetter: () => this.state.selectedTypes,
            itemVerifyFn: isRuneType,
        },
    ];
    constructor(state, ctx) {
        super(state, ctx);
    }
    additionalSearchFilter(_text, _cst) {
        const textLower = _text.toLowerCase();
        return (_cst.weaponEffects.some((v) => v.toLowerCase().includes(textLower)) ||
            _cst.armorEffects.some((v) => v.toLowerCase().includes(textLower)));
    }
    collectItems() {
        const showRunes = this.ctx.data.runes.filter((rune) => this.state.selectedTypes.has(rune.type) || this.state.pinnedItems.has(rune.key));
        const calcStats = showRunes.map((rune) => calculateRuneStats(rune, this.state.pinnedItems));
        return calcStats;
    }
    buildRow(item) {
        return getRuneRow(item, this.state.showColGroups);
    }
}
//# sourceMappingURL=runesView.js.map