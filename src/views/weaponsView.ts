import type { WeaponsState } from '../state.js';
import { isWeaponsToggleKey } from '../state.js';
import {
    WEAPONS_HEADER_GROUPS,
    isWeaponsHeaderKey,
    isWeaponsSuperheaderKey,
    getWeaponsClassesHtml,
    getWeaponsHeaderHtml,
    getWeaponRow,
    getWeaponsHtml,
    sortCalculatedWeapons,
} from '../render/weaponsRender.js';
import type { WeaponsSuperheaderKey } from '../render/weaponsRender.js';
import { type Weapon, type WeaponClass, isWeaponClass } from '../model.js';
import { calculateWeaponStats } from '../calc/weaponsCalc.js';

import type { ViewContext } from './view.js';
import { View, addElemListener, addTypedElemListener, addClassListeners, getTypedElem, getElem } from './view.js';
import { syncSidebarContent } from '../sharedDOM.js';

// =========================================
// SMART TOGGLES
// =========================================

interface SmartToggleColGroup {
    add: WeaponsSuperheaderKey[];
    remove: WeaponsSuperheaderKey[];
    indiff: WeaponsSuperheaderKey[];
}
const _melee: SmartToggleColGroup = { add: ['AR'], remove: ['MAGIC'], indiff: ['STATUS', 'DEF'] };
const _ranged: SmartToggleColGroup = { add: ['AR'], remove: ['MAGIC', 'DEF'], indiff: ['STATUS'] };
const SMART_TOGGLES: Record<WeaponClass, SmartToggleColGroup> = {
    Axes: _melee,
    Daggers: _melee,
    Fists: _melee,
    Flails: _melee,
    'Grand Axes': _melee,
    'Grand Hammers': _melee,
    'Grand Swords': _melee,
    Hammers: _melee,
    'Long Swords': _melee,
    Polearms: _melee,
    'Short Swords': _melee,
    Spears: _melee,
    Catalysts: { add: ['MAGIC'], remove: ['AR', 'STATUS', 'DEF'], indiff: [] },
    Shields: { add: ['DEF'], remove: ['AR', 'MAGIC', 'STATUS'], indiff: [] },
    Bows: _ranged,
    Crossbows: _ranged,
};

export function createWeaponsView(state: WeaponsState, ctx: ViewContext) {
    return new WeaponsView(state, ctx);
}

class WeaponsView extends View {
    readonly mode = 'weapons' as const;
    private readonly loadedWeaponClasses: WeaponClass[];

    constructor(
        private readonly state: WeaponsState,
        ctx: ViewContext
    ) {
        super(ctx);
        this.loadedWeaponClasses = [...new Set(ctx.data.weapons.map((w) => w.className))].sort();
    }

    mount(): void {
        // weapon class toggles
        addElemListener('sidebar-content', 'change', (e) => this.onSetClass(e));
        // weapon upgrade level dropdown
        addTypedElemListener('weapon-level', HTMLSelectElement, 'change', (e) => this.onSetUpgLevel(e));
        // setting toggles
        addClassListeners('weapons-setting-toggle', HTMLInputElement, 'change', (e) => this.onSetWeaponsSetting(e));
        // header group toggles
        addClassListeners('weapons-group-toggle', HTMLInputElement, 'change', (e) => this.onSetColGroup(e));
        // table header sorting
        addElemListener('weapons-header', 'click', (e) => this.onTableHeaderClick(e));
        addElemListener('weapons-body', 'click', (e) => this.onTableBodyClick(e));
    }

    show(): void {
        getElem('view-weapons').hidden = false;
        this.updateSidebar();
        this.syncUpgInput();
        this.syncToggles();
        this.refresh();
    }

    hide(): void {
        getElem('view-weapons').hidden = true;
    }

    refresh(): void {
        this.renderHeader();
        this.renderWeapons();
    }

    /**
     * Automatically selects and deselects displayed column groups based on the selected weapon classes
     */
    private applySmartToggles(): void {
        // toAdd: will be added; can't be removed (users want to see these col groups for some weapon classes)
        const toAdd: Set<WeaponsSuperheaderKey> = new Set();
        // toRemove: won't be added; might be removed (user may want to see these col groups for some weapon classes)
        const toRemove: Set<WeaponsSuperheaderKey> = new Set();
        // indifferent: can be added; won't be removed (user may want to see these col groups for some weapon classes)
        const indifferent: Set<WeaponsSuperheaderKey> = new Set();

        const classes = [...this.state.selectedClasses];
        const smarts = classes.map((c) => SMART_TOGGLES[c]);
        for (const smart of smarts) {
            // determine col groups to be added, and cache indifferent col groups
            for (const add of smart.add) toAdd.add(add);
            for (const indiff of smart.indiff) indifferent.add(indiff);
        }

        // delete col groups to remove - only col groups not in either toAdd or indifferent
        for (const smart of smarts) {
            for (const remove of smart.remove) if (!toAdd.has(remove) && !indifferent.has(remove)) toRemove.add(remove);
        }

        // update the currently selected header column groups
        for (const col of toRemove) this.state.showColGroups.delete(col);
        for (const col of toAdd) this.state.showColGroups.add(col);

        this.syncToggles(); // update the group toggles
    }

    // =========================================
    // EVENT HANDLERS
    // =========================================

    private onSetClass(e: Event): void {
        if (!this.isActiveMode()) return;
        if (!(e.target instanceof HTMLInputElement)) return;

        const el = e.target;
        if (!isWeaponClass(el.dataset.class)) return;

        // add/remove the class name from selectedClasses
        const className = el.dataset.class;
        if (el.checked) this.state.selectedClasses.add(className);
        else this.state.selectedClasses.delete(className);

        this.applySmartToggles();
        this.renderHeader();
        this.renderWeapons();
        this.ctx.save();
    }

    private onSetUpgLevel(e: Event): void {
        if (!this.isActiveMode()) return;
        if (!(e.target instanceof HTMLSelectElement)) return;

        const el = e.target;
        const val = el.value.slice(1); // remove the '+' prefix
        const num = Number.parseInt(val, 10);
        if (!Number.isNaN(num)) {
            this.state.upgLevel = num;

            this.renderWeapons();
            this.ctx.save();
        }
    }

    private onSetWeaponsSetting(e: Event): void {
        if (!this.isActiveMode()) return;
        if (!(e.target instanceof HTMLInputElement)) return;

        const el = e.target;
        const setting = el.dataset.setting;
        if (typeof setting !== 'string' || !isWeaponsToggleKey(setting)) return;

        this.state[setting] = el.checked;

        this.renderWeapons();
        this.ctx.save();
    }

    private onSetColGroup(e: Event): void {
        if (!this.isActiveMode()) return;
        if (!(e.target instanceof HTMLInputElement)) return;

        const el = e.target;
        if (!isWeaponsSuperheaderKey(el.dataset.group)) return;
        const superKey = el.dataset.group;
        if (el.checked) this.state.showColGroups.add(superKey);
        else this.state.showColGroups.delete(superKey);

        this.renderHeader();
        this.renderWeapons();
        this.ctx.save();
    }

    private onTableHeaderClick(e: Event): void {
        if (!this.isActiveMode()) return;
        if (!(e instanceof MouseEvent)) return;
        if (!(e.target instanceof Element)) return;

        const el = e.target.closest<HTMLElement>('th.sortable');
        if (!el) return;
        if (!isWeaponsHeaderKey(el.dataset.colKey)) return;

        const colKey = el.dataset.colKey;

        if (colKey === this.state.sortKey) this.state.ascending = !this.state.ascending;
        else {
            this.state.sortKey = colKey;
            if (colKey === 'WEAP' || colKey === 'CLS')
                // weapon name and weapon class columns default to ascending
                this.state.ascending = true;
            else this.state.ascending = false;
        }

        this.refresh();
        this.ctx.save();
    }

    private onTableBodyClick(e: Event): void {
        if (!this.isActiveMode()) return;
        if (!(e instanceof MouseEvent)) return;
        if (!(e.target instanceof Element)) return;

        const el = e.target.closest<HTMLButtonElement>('button.lock');
        if (!el) return;
        if (!(typeof el.dataset.item === 'string')) return;
        const weaponKey = el.dataset.item;

        if (this.state.pinnedWeapons.has(weaponKey)) this.state.pinnedWeapons.delete(weaponKey);
        else this.state.pinnedWeapons.add(weaponKey);

        this.renderWeapons(weaponKey); // render weapons with the pinned/unpinned weapon transitioning into view
        this.ctx.save();
    }

    // =========================================
    // RENDERING - GENERATE/UPDATE HTML
    // =========================================

    private updateSidebar(): void {
        if (!this.isActiveMode()) return;

        const classesHtml = getWeaponsClassesHtml(this.loadedWeaponClasses, this.state.selectedClasses);
        syncSidebarContent('Weapon Classes', classesHtml);
    }

    private syncToggles(): void {
        if (!this.isActiveMode()) return;

        for (const el of document.getElementsByClassName('weapons-setting-toggle')) {
            if (
                el instanceof HTMLInputElement &&
                typeof el.dataset.setting === 'string' &&
                isWeaponsToggleKey(el.dataset.setting)
            ) {
                // map element's 'data-setting' value to relevant current AppState value
                const setting = el.dataset.setting as keyof WeaponsState;
                const settingValue = this.state[setting];
                if (typeof settingValue === 'boolean') el.checked = settingValue;
            }
        }
        for (const el of document.getElementsByClassName('weapons-group-toggle')) {
            if (el instanceof HTMLInputElement)
                el.checked = this.state.showColGroups.has(el.dataset.group as WeaponsSuperheaderKey);
        }
    }

    private syncUpgInput(): void {
        if (!this.isActiveMode()) return;

        // initialize weapon upgrade <select> element value
        const elUpg = getTypedElem('weapon-level', HTMLSelectElement);
        elUpg.hidden = false;
        elUpg.value = `+${this.state.upgLevel}`;
    }

    private renderHeader(): void {
        if (!this.isActiveMode()) return;

        const elHeader = getElem('weapons-header');
        const groups = WEAPONS_HEADER_GROUPS.filter((group) => this.state.showColGroups.has(group.superKey));
        elHeader.innerHTML = getWeaponsHeaderHtml(groups, this.state.sortKey, this.state.ascending);
    }

    private renderWeapons(weaponFadeIn: string | null = null): void {
        if (!this.isActiveMode()) return;

        // update the weapons table
        const elBody = getElem('weapons-body');
        const showWeaps: Weapon[] = this.ctx.data.weapons.filter(
            (weap) => this.state.selectedClasses.has(weap.className) || this.state.pinnedWeapons.has(weap.key)
        );
        let calcStats = showWeaps.map((weap) =>
            calculateWeaponStats(
                weap,
                this.state.upgLevel,
                this.ctx.shared.playerStats,
                this.state.showTwoHanding,
                this.ctx.data.gradeRanges,
                this.state.pinnedWeapons
            )
        );
        if (!this.state.showUnwieldable)
            // remove any unwieldable weapons
            calcStats = calcStats.filter((ws) => ws.wieldability.wieldable);
        // sort calculated weapon stats by current sortKey
        const { pinned, unpinned } = sortCalculatedWeapons(calcStats, this.state.sortKey, this.state.ascending);
        calcStats = [...pinned, ...unpinned]; // pinned weapons go at front of list
        // display the weapon rows
        const rows = calcStats.map((cs) => getWeaponRow(cs, this.state.showColGroups, this.state.showSplit));
        elBody.innerHTML = getWeaponsHtml(rows, weaponFadeIn);
    }
}
