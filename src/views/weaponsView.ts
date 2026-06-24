import type { BooleanKeys, WeaponsState } from '../state.js';
import { WEAPONS_HEADER_GROUPS, isWeaponsHeaderKey, getWeaponRow } from '../render/weaponsRender.js';
import type { WeaponsHeaderKey, WeaponsSuperheaderKey } from '../render/weaponsRender.js';
import { type Weapon, type WeaponClass, isWeaponClass, type CalculatedWeaponStats, WEAPON_CLASSES } from '../model.js';
import { calculateWeaponStats } from '../calc/weaponsCalc.js';

import type { ViewContext } from './view.js';
import { addElemListener, getTypedElem, getElem, convertHtmlDataAttrib, addClassListeners } from '../sharedDOM.js';
import { getTogglesHtml, isToggleKey, type SidebarSection, type ToggleGroup } from '../render/sharedRender.js';
import { TableView, type SortFunction } from './tableView.js';

const SettingToggles: ToggleGroup<BooleanKeys<WeaponsState>> = {
    htmlClass: 'weapons-setting-toggle',
    htmlDataKey: 'setting',
    toggles: {
        showTwoHanding: { text: 'Two-Handing', hover: 'Show effective stats from two-handing a weapon' },
        showUnwieldable: { text: 'Unwieldable', hover: 'Show weapons you lack the stats to wield' },
        showSplit: {
            text: 'Split Damage',
            hover: "Show damage values as (weapon's base damage)+(damage from scaling)",
        },
        showRawScaling: { text: 'Raw Scaling', hover: 'Show scaling grades as raw numerical values' },
    },
};

const GroupToggles: ToggleGroup<WeaponsSuperheaderKey> = {
    htmlClass: 'weapons-group-toggle',
    htmlDataKey: 'col-group',
    toggles: {
        AR: { text: 'Attack', hover: 'Show attack rating for physical, holy, fire, and wither' },
        MAGIC: { text: 'Magic', hover: 'Show spell power and number of spell slots for catalysts' },
        STATUS: { text: 'Status', hover: 'Show status effects applied by weapons' },
        MISC: {
            text: 'Misc',
            hover: 'Show weight, poise damage, posture damage, stamina damage multiplier, and pvp damage multiplier',
        },
        RUNES: {
            text: 'Runes',
            hover: "Show rune sockets available at weapon's upgrade level. S=Str, A=Agi, R=Rad, I=Inf; *=Meta (any rune)",
        },
        DEF: { text: 'Defenses', hover: 'Show defensive stats for weapons' },
        SCALING: { text: 'Scaling', hover: 'Show stat scaling strength' },
        REQS: { text: 'Wield Reqs', hover: 'Show the stats required to effectively wield weapons' },
    },
};

const weaponsSortFns: Record<WeaponsHeaderKey, SortFunction<CalculatedWeaponStats>> = {
    // INFO
    WEAP: (a, b) => a.item.name.localeCompare(b.item.name),
    CLS: (a, b) => a.item.className.localeCompare(b.item.className),
    // AR
    ARP: (a, b) => a.offense.ar.physical.total - b.offense.ar.physical.total,
    ARH: (a, b) => a.offense.ar.holy.total - b.offense.ar.holy.total,
    ARF: (a, b) => a.offense.ar.fire.total - b.offense.ar.fire.total,
    ARW: (a, b) => a.offense.ar.wither.total - b.offense.ar.wither.total,
    TOT: (a, b) => a.offense.ar.totalDamage - b.offense.ar.totalDamage,
    // MAGIC
    SP: (a, b) => a.offense.ar.spellPower.total - b.offense.ar.spellPower.total,
    SLOTS: (a, b) => a.offense.extras.spellSlots - b.offense.extras.spellSlots,
    // STATUS
    BLE: (a, b) => a.offense.status.bleed - b.offense.status.bleed,
    BRN: (a, b) => a.offense.status.burn - b.offense.status.burn,
    PSN: (a, b) => a.offense.status.poison - b.offense.status.poison,
    SMI: (a, b) => a.offense.status.smite - b.offense.status.smite,
    IGN: (a, b) => a.offense.status.ignite - b.offense.status.ignite,
    FRO: (a, b) => a.offense.status.frost - b.offense.status.frost,
    // MISC
    WGT: (a, b) => a.item.weight - b.item.weight,
    PD: (a, b) => a.offense.extras.poiseDamage - b.offense.extras.poiseDamage,
    STAG: (a, b) => a.offense.extras.staggerDamage - b.offense.extras.staggerDamage,
    STAD: (a, b) => a.offense.extras.staminaDamage - b.offense.extras.staminaDamage,
    PVP: (a, b) => a.offense.extras.pvpMultiplier - b.offense.extras.pvpMultiplier,
    // RUNES
    RUN: (a, b) => a.runeSockets.join().localeCompare(b.runeSockets.join()),
    // DEF
    DP: (a, b) => a.defense.physical - b.defense.physical,
    DH: (a, b) => a.defense.holy - b.defense.holy,
    DF: (a, b) => a.defense.fire - b.defense.fire,
    DW: (a, b) => a.defense.wither - b.defense.wither,
    DS: (a, b) => a.defense.stability - b.defense.stability,
    // SCALING
    SS: (a, b) => a.offense.scaling.strVal - b.offense.scaling.strVal,
    SA: (a, b) => a.offense.scaling.agiVal - b.offense.scaling.agiVal,
    SR: (a, b) => a.offense.scaling.radVal - b.offense.scaling.radVal,
    SI: (a, b) => a.offense.scaling.infVal - b.offense.scaling.infVal,
    // REQS
    RS: (a, b) => a.item.wieldReqs.strength - b.item.wieldReqs.strength,
    RA: (a, b) => a.item.wieldReqs.agility - b.item.wieldReqs.agility,
    RR: (a, b) => a.item.wieldReqs.radiance - b.item.wieldReqs.radiance,
    RI: (a, b) => a.item.wieldReqs.inferno - b.item.wieldReqs.inferno,
};

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
} as const;

// ================================
// VIEW
// ================================

export function createWeaponsView(state: WeaponsState, ctx: ViewContext) {
    return new WeaponsView(state, ctx);
}

class WeaponsView extends TableView<
    WeaponsState,
    WeaponsHeaderKey,
    WeaponsSuperheaderKey,
    Weapon,
    CalculatedWeaponStats
> {
    readonly mode = 'weapons' as const;
    readonly modeBtnText = 'Weapons' as const;

    protected readonly headerGroups = WEAPONS_HEADER_GROUPS;
    protected readonly colGroupToggles = GroupToggles;
    protected readonly sortFns = weaponsSortFns;
    protected readonly ascendingByDefault: ReadonlySet<WeaponsHeaderKey> = new Set(['WEAP', 'CLS']);
    protected isHeaderKey = isWeaponsHeaderKey;
    protected processSidebarSelection = this.applySmartToggles;
    protected readonly sidebarSections: [SidebarSection<WeaponClass>] = [
        {
            text: 'Weapons',
            sectionKey: 'weapon-class',
            items: WEAPON_CLASSES,
            checkedItemsGetter: () => this.state.selectedClasses,
            itemVerifyFn: isWeaponClass,
        },
    ];

    constructor(state: WeaponsState, ctx: ViewContext) {
        super(state, ctx);
    }

    protected onShow(): void {
        getElem('view-toggles').hidden = false;
        // initialize weapon upgrade <select> element value
        getElem('weapon-level-div').hidden = false;
        getTypedElem('weapon-level', HTMLSelectElement).value = `+${this.state.upgLevel}`;
        getElem('view-toggles').insertAdjacentHTML('afterbegin', getTogglesHtml(SettingToggles));
        this.syncSettingsToggles();
    }

    protected onHide(): void {
        getElem('weapon-level-div').hidden = true;
    }

    protected bindExtra(signal: AbortSignal): void {
        // weapon upgrade level dropdown
        addElemListener('weapon-level', 'change', (e) => this.onSetUpgLevel(e), { signal });
        addClassListeners('stat-input', HTMLInputElement, 'input', () => this.fetchAndRender(), { signal });
    }

    /**
     * Automatically selects and deselects displayed column groups based on the selected weapon classes
     */
    protected applySmartToggles(): void {
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
        let updated = false;
        for (const col of toRemove) if (this.state.showColGroups.delete(col)) updated = true;
        for (const col of toAdd) {
            if (!this.state.showColGroups.has(col)) updated = true;
            this.state.showColGroups.add(col);
        }

        if (!updated) return;
        this.syncGroupToggles(); // update the group toggles
        this.renderHeader();
    }

    // =========================================
    // EVENT HANDLERS
    // =========================================

    protected onSetUpgLevel(e: Event): void {
        if (!(e.target instanceof HTMLSelectElement)) return;
        const el = e.target;

        const val = el.value.slice(1); // remove the '+' prefix
        const num = Number.parseInt(val, 10);
        if (!Number.isNaN(num)) {
            this.state.upgLevel = num;

            this.fetchAndRender();
            this.ctx.save();
        }
    }

    protected handleExtraToggle(el: HTMLInputElement): boolean {
        if (el.classList.contains(SettingToggles.htmlClass)) {
            const setting = el.dataset[convertHtmlDataAttrib(SettingToggles.htmlDataKey)];
            if (isToggleKey(setting, SettingToggles)) {
                this.state[setting] = el.checked;
                this.fetchAndRender();
                return true;
            }
        }

        return false;
    }

    // =========================================
    // RENDERING - GENERATE/UPDATE HTML
    // =========================================

    protected syncSettingsToggles(): void {
        for (const el of document.getElementsByClassName('weapons-setting-toggle')) {
            if (
                el instanceof HTMLInputElement &&
                typeof el.dataset.setting === 'string' &&
                isToggleKey(el.dataset.setting, SettingToggles)
            ) {
                // map element's 'data-setting' value to relevant current AppState value
                const setting = el.dataset.setting as keyof WeaponsState;
                const settingValue = this.state[setting];
                if (typeof settingValue === 'boolean') el.checked = settingValue;
            }
        }
    }

    protected collectItems(): CalculatedWeaponStats[] {
        const showWeaps: Weapon[] = this.ctx.data.weapons.filter(
            (weap) => this.state.selectedClasses.has(weap.className) || this.state.pinnedItems.has(weap.key)
        );
        let calcStats = showWeaps.map((weap) =>
            calculateWeaponStats(
                weap,
                this.state.upgLevel,
                this.ctx.shared.playerStats,
                this.state.showTwoHanding,
                this.ctx.data.gradeRanges,
                this.state.pinnedItems
            )
        );
        if (!this.state.showUnwieldable)
            // remove any unwieldable weapons
            calcStats = calcStats.filter((ws) => ws.wieldability.wieldable);
        return calcStats;
    }

    protected buildRow(cws: CalculatedWeaponStats) {
        return getWeaponRow(cws, this.state.showColGroups, this.state.showSplit, this.state.showRawScaling);
    }
}
