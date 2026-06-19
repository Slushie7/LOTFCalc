import { WEAPONS_HEADER_GROUPS, isWeaponsHeaderKey, getWeaponRow } from '../render/weaponsRender.js';
import { isWeaponClass } from '../model.js';
import { calculateWeaponStats } from '../calc/weaponsCalc.js';
import { View } from './view.js';
import { addElemListener, getTypedElem, getElem, handleMetaButtons, setSidebarContent, syncSidebarToggles, convertHtmlDataAttrib, } from '../sharedDOM.js';
import { getHeaderHtml, getItemTableBodyHtml, getSidebarHtml, getTogglesHtml, headerStatusImagePaths, isToggleKey, } from '../render/sharedRender.js';
const SettingToggles = {
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
const GroupToggles = {
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
const weaponsSortFns = {
    // INFO
    WEAP: (cws1, cws2) => cws1.weapon.name.localeCompare(cws2.weapon.name),
    CLS: (cws1, cws2) => cws1.weapon.className.localeCompare(cws2.weapon.className),
    // AR
    ARP: (cws1, cws2) => cws1.offense.ar.physical.total - cws2.offense.ar.physical.total,
    ARH: (cws1, cws2) => cws1.offense.ar.holy.total - cws2.offense.ar.holy.total,
    ARF: (cws1, cws2) => cws1.offense.ar.fire.total - cws2.offense.ar.fire.total,
    ARW: (cws1, cws2) => cws1.offense.ar.wither.total - cws2.offense.ar.wither.total,
    TOT: (cws1, cws2) => cws1.offense.ar.totalDamage - cws2.offense.ar.totalDamage,
    // MAGIC
    SP: (cws1, cws2) => cws1.offense.ar.spellPower.total - cws2.offense.ar.spellPower.total,
    SLOTS: (cws1, cws2) => cws1.offense.extras.spellSlots - cws2.offense.extras.spellSlots,
    // STATUS
    BLE: (cws1, cws2) => cws1.offense.status.bleed - cws2.offense.status.bleed,
    BRN: (cws1, cws2) => cws1.offense.status.burn - cws2.offense.status.burn,
    PSN: (cws1, cws2) => cws1.offense.status.poison - cws2.offense.status.poison,
    SMI: (cws1, cws2) => cws1.offense.status.smite - cws2.offense.status.smite,
    IGN: (cws1, cws2) => cws1.offense.status.ignite - cws2.offense.status.ignite,
    FRO: (cws1, cws2) => cws1.offense.status.frost - cws2.offense.status.frost,
    // MISC
    WGT: (cws1, cws2) => cws1.weapon.weight - cws2.weapon.weight,
    PD: (cws1, cws2) => cws1.offense.extras.poiseDamage - cws2.offense.extras.poiseDamage,
    STAG: (cws1, cws2) => cws1.offense.extras.staggerDamage - cws2.offense.extras.staggerDamage,
    STAD: (cws1, cws2) => cws1.offense.extras.staminaDamage - cws2.offense.extras.staminaDamage,
    PVP: (cws1, cws2) => cws1.offense.extras.pvpMultiplier - cws2.offense.extras.pvpMultiplier,
    // RUNES
    RUN: (cws1, cws2) => cws1.runeSockets.join().localeCompare(cws2.runeSockets.join()),
    // DEF
    DP: (cws1, cws2) => cws1.defense.physical - cws2.defense.physical,
    DH: (cws1, cws2) => cws1.defense.holy - cws2.defense.holy,
    DF: (cws1, cws2) => cws1.defense.fire - cws2.defense.fire,
    DW: (cws1, cws2) => cws1.defense.wither - cws2.defense.wither,
    DS: (cws1, cws2) => cws1.defense.stability - cws2.defense.stability,
    // SCALING
    SS: (cws1, cws2) => cws1.offense.scaling.strVal - cws2.offense.scaling.strVal,
    SA: (cws1, cws2) => cws1.offense.scaling.agiVal - cws2.offense.scaling.agiVal,
    SR: (cws1, cws2) => cws1.offense.scaling.radVal - cws2.offense.scaling.radVal,
    SI: (cws1, cws2) => cws1.offense.scaling.infVal - cws2.offense.scaling.infVal,
    // REQS
    RS: (cws1, cws2) => cws1.weapon.wieldReqs.strength - cws2.weapon.wieldReqs.strength,
    RA: (cws1, cws2) => cws1.weapon.wieldReqs.agility - cws2.weapon.wieldReqs.agility,
    RR: (cws1, cws2) => cws1.weapon.wieldReqs.radiance - cws2.weapon.wieldReqs.radiance,
    RI: (cws1, cws2) => cws1.weapon.wieldReqs.inferno - cws2.weapon.wieldReqs.inferno,
};
const _melee = { add: ['AR'], remove: ['MAGIC'], indiff: ['STATUS', 'DEF'] };
const _ranged = { add: ['AR'], remove: ['MAGIC', 'DEF'], indiff: ['STATUS'] };
const SMART_TOGGLES = {
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
// ================================
// VIEW
// ================================
export function createWeaponsView(state, ctx) {
    return new WeaponsView(state, ctx);
}
class WeaponsView extends View {
    state;
    mode = 'weapons';
    modeBtnText = 'Weapons';
    loadedWeaponClasses;
    constructor(state, ctx) {
        super(ctx);
        this.state = state;
        this.loadedWeaponClasses = [...new Set(ctx.data.weapons.map((w) => w.className))].sort();
    }
    mount() {
        // weapon class toggles
        addElemListener('sidebar-content', 'click', (e) => this.onSidebarMetaClick(e));
        addElemListener('sidebar-content', 'change', (e) => this.onSetClass(e));
        // weapon upgrade level dropdown
        addElemListener('weapon-level', 'change', (e) => this.onSetUpgLevel(e));
        // setting/groups toggles
        addElemListener('view-toggles', 'change', (e) => this.onSettingToggle(e));
        // table header sorting
        addElemListener('weapons-header', 'click', (e) => this.onTableHeaderClick(e));
        addElemListener('weapons-body', 'click', (e) => this.onTableBodyClick(e));
    }
    show() {
        getElem('view-weapons').hidden = false;
        this.renderWeaponsModeElements();
        this.syncUpgInput();
        this.syncToggles();
        this.refresh();
    }
    hide() {
        getElem('view-weapons').hidden = true;
    }
    refresh() {
        this.renderHeader();
        this.renderWeapons();
    }
    /**
     * Automatically selects and deselects displayed column groups based on the selected weapon classes
     */
    applySmartToggles() {
        // toAdd: will be added; can't be removed (users want to see these col groups for some weapon classes)
        const toAdd = new Set();
        // toRemove: won't be added; might be removed (user may want to see these col groups for some weapon classes)
        const toRemove = new Set();
        // indifferent: can be added; won't be removed (user may want to see these col groups for some weapon classes)
        const indifferent = new Set();
        const classes = [...this.state.selectedClasses];
        const smarts = classes.map((c) => SMART_TOGGLES[c]);
        for (const smart of smarts) {
            // determine col groups to be added, and cache indifferent col groups
            for (const add of smart.add)
                toAdd.add(add);
            for (const indiff of smart.indiff)
                indifferent.add(indiff);
        }
        // delete col groups to remove - only col groups not in either toAdd or indifferent
        for (const smart of smarts) {
            for (const remove of smart.remove)
                if (!toAdd.has(remove) && !indifferent.has(remove))
                    toRemove.add(remove);
        }
        // update the currently selected header column groups
        for (const col of toRemove)
            this.state.showColGroups.delete(col);
        for (const col of toAdd)
            this.state.showColGroups.add(col);
        this.syncToggles(); // update the group toggles
    }
    // =========================================
    // EVENT HANDLERS
    // =========================================
    onSidebarMetaClick(e) {
        if (!this.isActiveMode())
            return;
        if (!handleMetaButtons(e, 'weapon-classes', () => {
            this.loadedWeaponClasses.forEach((v) => this.state.selectedClasses.add(v));
        }, () => {
            this.state.selectedClasses.clear();
        }))
            return;
        syncSidebarToggles('class', this.state.selectedClasses, isWeaponClass);
        this.applySmartToggles();
        this.refresh();
        this.ctx.save();
    }
    onSetClass(e) {
        if (!this.isActiveMode())
            return;
        if (!(e.target instanceof HTMLInputElement))
            return;
        const el = e.target;
        if (!isWeaponClass(el.dataset.class))
            return;
        // add/remove the class name from selectedClasses
        const className = el.dataset.class;
        if (el.checked)
            this.state.selectedClasses.add(className);
        else
            this.state.selectedClasses.delete(className);
        this.applySmartToggles();
        this.refresh();
        this.ctx.save();
    }
    onSetUpgLevel(e) {
        if (!this.isActiveMode())
            return;
        if (!(e.target instanceof HTMLSelectElement))
            return;
        const el = e.target;
        const val = el.value.slice(1); // remove the '+' prefix
        const num = Number.parseInt(val, 10);
        if (!Number.isNaN(num)) {
            this.state.upgLevel = num;
            this.renderWeapons();
            this.ctx.save();
        }
    }
    onSettingToggle(e) {
        if (!this.isActiveMode())
            return;
        if (!(e.target instanceof HTMLInputElement))
            return;
        const el = e.target;
        if (el.classList.contains(SettingToggles.htmlClass)) {
            const setting = el.dataset[convertHtmlDataAttrib(SettingToggles.htmlDataKey)];
            if (isToggleKey(setting, SettingToggles)) {
                this.state[setting] = el.checked;
                this.renderWeapons();
            }
        }
        else if (el.classList.contains(GroupToggles.htmlClass)) {
            const group = el.dataset[convertHtmlDataAttrib(GroupToggles.htmlDataKey)];
            if (isToggleKey(group, GroupToggles)) {
                if (el.checked)
                    this.state.showColGroups.add(group);
                else
                    this.state.showColGroups.delete(group);
                this.refresh();
            }
        }
        else
            return;
        this.ctx.save();
    }
    onTableHeaderClick(e) {
        if (!this.isActiveMode())
            return;
        if (!(e instanceof MouseEvent))
            return;
        if (!(e.target instanceof Element))
            return;
        const el = e.target.closest('th.sortable');
        if (!el)
            return;
        if (!isWeaponsHeaderKey(el.dataset.colKey))
            return;
        const colKey = el.dataset.colKey;
        if (colKey === this.state.sortKey)
            this.state.ascending = !this.state.ascending;
        else {
            this.state.sortKey = colKey;
            if (colKey === 'WEAP' || colKey === 'CLS')
                // weapon name and weapon class columns default to ascending
                this.state.ascending = true;
            else
                this.state.ascending = false;
        }
        this.refresh();
        this.ctx.save();
    }
    onTableBodyClick(e) {
        if (!this.isActiveMode())
            return;
        if (!(e instanceof MouseEvent))
            return;
        if (!(e.target instanceof Element))
            return;
        const el = e.target.closest('button.lock');
        if (!el)
            return;
        if (!(typeof el.dataset.item === 'string'))
            return;
        const weaponKey = el.dataset.item;
        if (this.state.pinnedItems.has(weaponKey))
            this.state.pinnedItems.delete(weaponKey);
        else
            this.state.pinnedItems.add(weaponKey);
        this.renderWeapons(weaponKey); // render weapons with the pinned/unpinned weapon transitioning into view
        this.ctx.save();
    }
    // =========================================
    // RENDERING - GENERATE/UPDATE HTML
    // =========================================
    renderWeaponsModeElements() {
        if (!this.isActiveMode())
            return;
        // update the sidebar's content
        const section = {
            text: 'Weapons',
            sectionKey: 'weapon-classes',
            items: this.loadedWeaponClasses,
            checkedItems: this.state.selectedClasses,
        };
        setSidebarContent(getSidebarHtml(section));
        // create the settings/col-group toggles
        getElem('view-toggles').innerHTML = getTogglesHtml(SettingToggles) + getTogglesHtml(GroupToggles);
    }
    syncToggles() {
        if (!this.isActiveMode())
            return;
        for (const el of document.getElementsByClassName('weapons-setting-toggle')) {
            if (el instanceof HTMLInputElement &&
                typeof el.dataset.setting === 'string' &&
                isToggleKey(el.dataset.setting, SettingToggles)) {
                // map element's 'data-setting' value to relevant current AppState value
                const setting = el.dataset.setting;
                const settingValue = this.state[setting];
                if (typeof settingValue === 'boolean')
                    el.checked = settingValue;
            }
        }
        for (const el of document.getElementsByClassName('weapons-group-toggle')) {
            if (el instanceof HTMLInputElement)
                el.checked = this.state.showColGroups.has(el.dataset.colGroup);
        }
    }
    syncUpgInput() {
        if (!this.isActiveMode())
            return;
        // initialize weapon upgrade <select> element value
        getElem('weapon-level-div').hidden = false;
        getTypedElem('weapon-level', HTMLSelectElement).value = `+${this.state.upgLevel}`;
    }
    renderHeader() {
        if (!this.isActiveMode())
            return;
        const elHeader = getElem('weapons-header');
        const groups = WEAPONS_HEADER_GROUPS.filter((group) => this.state.showColGroups.has(group.superKey));
        elHeader.innerHTML = getHeaderHtml(groups, this.state.sortKey, this.state.ascending, headerStatusImagePaths);
    }
    renderWeapons(weaponFadeIn = null) {
        if (!this.isActiveMode())
            return;
        // update the weapons table
        const elBody = getElem('weapons-body');
        const showWeaps = this.ctx.data.weapons.filter((weap) => this.state.selectedClasses.has(weap.className) || this.state.pinnedItems.has(weap.key));
        let calcStats = showWeaps.map((weap) => calculateWeaponStats(weap, this.state.upgLevel, this.ctx.shared.playerStats, this.state.showTwoHanding, this.ctx.data.gradeRanges, this.state.pinnedItems));
        if (!this.state.showUnwieldable)
            // remove any unwieldable weapons
            calcStats = calcStats.filter((ws) => ws.wieldability.wieldable);
        // sort calculated weapon stats by current sortKey
        calcStats = this.sortCalculated(calcStats, this.state.sortKey, this.state.ascending, weaponsSortFns);
        // display the weapon rows
        const rows = calcStats.map((cs) => getWeaponRow(cs, this.state.showColGroups, this.state.showSplit, this.state.showRawScaling));
        elBody.innerHTML = getItemTableBodyHtml(rows, weaponFadeIn);
    }
}
//# sourceMappingURL=weaponsView.js.map