import { loadJSONData } from './loadJSONData.js';
import { loadState, saveState } from './state.js';
import { HEADER_GROUPS } from './header.js';
import { isWeaponClass, isSuperheaderKey, } from './model.js';
import { getClassesHtml, getHeaderHtml, getWeaponRow, getWeaponsHtml, sortCalculated } from './render.js';
import { calculateStats, calculatePlayerStats, clampStat } from './calc.js';
// main app variables
const { weapons, gradeRanges, curves, runes, armor } = await loadJSONData();
const loadedWeaponClasses = [...new Set(weapons.map((w) => w.className))].sort();
let state = {
    // defaults
    playerStats: { strength: 30, agility: 30, endurance: 30, vitality: 30, radiance: 30, inferno: 30 },
    upgLevel: 10,
    selectedClasses: new Set(['Axes']),
    sortKey: 'WEAP',
    ascending: true,
    showColGroups: new Set(['INFO', 'AR', 'STATUS', 'SCALING', 'REQS']),
    showTwoHanding: false,
    showUnwieldable: true,
    showSplit: false,
    saveSettings: true,
    pinnedWeapons: new Set(),
    showRawScaling: false,
};
// =========================================
// UI INITIALIZATION
// =========================================
function init() {
    loadState(state);
    initSettingsDisplay();
    wireInputs();
    renderDerivedStats();
    renderClasses();
    renderHeader();
    renderWeapons();
}
function initSettingsDisplay() {
    // initialize player stat entries
    for (const el of document.getElementsByClassName('stat-input')) {
        if (el instanceof HTMLInputElement && typeof el.dataset.stat === 'string') {
            const stat = el.dataset.stat;
            if (state.playerStats[stat] !== undefined)
                el.value = String(state.playerStats[stat]);
        }
    }
    // initialize weapon upgrade level
    const el = document.getElementById('weapon-level');
    if (el instanceof HTMLSelectElement)
        el.value = `+${state.upgLevel}`;
    // initialize settings toggles
    updateSettingsToggles();
}
function updateSettingsToggles() {
    for (const el of document.getElementsByClassName('setting-toggle')) {
        if (el instanceof HTMLInputElement && typeof el.dataset.setting === 'string') {
            // map element's 'data-setting' value to relevant current AppState value
            const settingValue = state[el.dataset.setting];
            if (typeof settingValue === 'boolean')
                el.checked = settingValue;
        }
    }
    for (const el of document.getElementsByClassName('group-toggle')) {
        if (el instanceof HTMLInputElement)
            el.checked = state.showColGroups.has(el.dataset.group);
    }
}
function wireInputs() {
    function mustGet(id) {
        const el = document.getElementById(id);
        if (el === null)
            throw new Error(`Missing element: ${id}`);
        if (!(el instanceof HTMLElement))
            throw new Error();
        return el;
    }
    // hamburger button
    mustGet('hamburger').addEventListener('click', toggleSidebar);
    // weapon class toggles
    mustGet('sidebar-content').addEventListener('change', setClass);
    // player stats inputs
    for (const elStat of document.getElementsByClassName('stat-input')) {
        if (elStat instanceof HTMLInputElement)
            elStat.addEventListener('change', () => setPlayerStat(elStat));
    }
    // weapon upgrade level dropdown
    const elUpg = mustGet('weapon-level');
    elUpg.addEventListener('change', () => setUpgLevel(elUpg));
    // setting toggles
    for (const elSetting of document.getElementsByClassName('setting-toggle')) {
        if (elSetting instanceof HTMLInputElement)
            elSetting.addEventListener('change', () => setSetting(elSetting));
    }
    // header group toggles
    for (const elGroup of document.getElementsByClassName('group-toggle')) {
        if (elGroup instanceof HTMLInputElement)
            elGroup.addEventListener('change', () => setColGroup(elGroup));
    }
    // table header sorting
    mustGet('weapons-header').addEventListener('click', tableHeaderClick);
    mustGet('weapons-body').addEventListener('click', tableBodyClick);
}
// =========================================
// RENDERING - GENERATE/UPDATE HTML
// =========================================
function renderClasses() {
    const elClasses = document.getElementById('sidebar-content');
    if (elClasses)
        elClasses.innerHTML = getClassesHtml(loadedWeaponClasses, state.selectedClasses);
}
function renderHeader() {
    const elHeader = document.getElementById('weapons-header');
    if (elHeader) {
        const groups = HEADER_GROUPS.filter((group) => state.showColGroups.has(group.superKey));
        elHeader.innerHTML = getHeaderHtml(groups, state.sortKey, state.ascending);
    }
}
function renderDerivedStats() {
    // update the player's derived stats
    const derivedStats = calculatePlayerStats(state.playerStats, curves);
    for (const el of document.getElementsByClassName('derived-val')) {
        if (el instanceof HTMLSpanElement && typeof el.dataset.stat === 'string') {
            const stat = el.dataset.stat;
            const val = derivedStats[stat];
            if (typeof val === 'string')
                el.textContent = val;
            else if (typeof val === 'number')
                el.textContent = String(val);
        }
    }
}
function renderWeapons(weaponFadeIn = null) {
    // update the weapons table
    const elBody = document.getElementById('weapons-body');
    if (elBody) {
        const showWeaps = weapons.filter((weap) => state.selectedClasses.has(weap.className) || state.pinnedWeapons.has(weap.key));
        let calcStats = showWeaps.map((weap) => calculateStats(weap, state.upgLevel, state.playerStats, state.showTwoHanding, gradeRanges, state.pinnedWeapons));
        if (!state.showUnwieldable)
            // remove any unwieldable weapons
            calcStats = calcStats.filter((ws) => ws.wieldability.wieldable);
        // sort calculated weapon stats by current sortKey
        const { pinned, unpinned } = sortCalculated(calcStats, state.sortKey, state.ascending);
        calcStats = [...pinned, ...unpinned]; // pinned weapons go at front of list
        // display the weapon rows
        const rows = calcStats.map((cs) => getWeaponRow(cs, state.showColGroups, state.showSplit));
        elBody.innerHTML = getWeaponsHtml(rows, weaponFadeIn);
    }
}
// =========================================
// EVENT HANDLERS
// =========================================
function toggleSidebar() {
    document.body.classList.toggle('sidebar-hidden');
}
function setClass(e) {
    const el = e.target;
    if (el instanceof HTMLInputElement) {
        if (el.dataset.class === undefined)
            return;
        // add/remove the class name from selectedClasses
        const className = el.dataset.class;
        if (el.checked)
            state.selectedClasses.add(className);
        else
            state.selectedClasses.delete(className);
        smartToggles();
        saveState(state);
        updateSettingsToggles();
        renderHeader();
        renderWeapons();
    }
}
function setPlayerStat(el) {
    const input = el.valueAsNumber;
    if (Number.isNaN(input))
        return;
    const value = clampStat(input);
    if (input !== value) {
        // update the user's input to reflect the clamped value
        el.value = String(value);
    }
    // update the stat
    const field = el.dataset.stat;
    state.playerStats = { ...state.playerStats, [field]: value };
    saveState(state);
    renderDerivedStats();
    renderWeapons();
}
function setUpgLevel(el) {
    const val = el.value.slice(1);
    const num = Number.parseInt(val, 10);
    if (!Number.isNaN(num)) {
        state.upgLevel = num;
        saveState(state);
        renderWeapons();
    }
}
function setColGroup(el) {
    const superKey = el.dataset.group;
    if (el.checked)
        state.showColGroups.add(superKey);
    else
        state.showColGroups.delete(superKey);
    saveState(state);
    renderHeader();
    renderWeapons();
}
function setSetting(el) {
    const setting = el.dataset.setting;
    if (setting && typeof setting === 'string' && Object.hasOwn(state, setting)) {
        const key = setting;
        if (typeof state[key] === 'boolean')
            state[key] = el.checked;
    }
    saveState(state);
    renderWeapons();
}
function setSorting(colKey) {
    if (colKey === state.sortKey)
        state.ascending = !state.ascending;
    else {
        state.sortKey = colKey;
        if (colKey === 'WEAP' || colKey === 'CLS')
            // weapon name and weapon class columns default to ascending
            state.ascending = true;
        else
            state.ascending = false;
    }
    saveState(state);
    renderHeader();
    renderWeapons();
}
function setPinned(weaponKey) {
    if (state.pinnedWeapons.has(weaponKey))
        state.pinnedWeapons.delete(weaponKey);
    else
        state.pinnedWeapons.add(weaponKey);
    saveState(state);
    renderWeapons(weaponKey); // render weapons with the pinned/unpinned weapon transitioning into view
}
function tableHeaderClick(e) {
    if (!(e.target instanceof Element))
        return;
    const el = e.target.closest('th.sortable');
    if (el !== null && el.dataset.colKey)
        setSorting(el.dataset.colKey);
}
function tableBodyClick(e) {
    if (!(e.target instanceof Element))
        return;
    const el = e.target.closest('button.lock');
    if (el !== null && el.dataset.weapon)
        setPinned(el.dataset.weapon);
}
function createSmartToggles() {
    const melee = { add: ['AR'], remove: ['MAGIC'], indiff: ['STATUS', 'DEF'] };
    const ranged = { add: ['AR'], remove: ['MAGIC', 'DEF'], indiff: ['STATUS'] };
    return {
        Axes: melee,
        Daggers: melee,
        Fists: melee,
        Flails: melee,
        'Grand Axes': melee,
        'Grand Hammers': melee,
        'Grand Swords': melee,
        Hammers: melee,
        'Long Swords': melee,
        Polearms: melee,
        'Short Swords': melee,
        Spears: melee,
        Catalysts: { add: ['MAGIC'], remove: ['AR', 'STATUS', 'DEF'], indiff: [] },
        Shields: { add: ['DEF'], remove: ['AR', 'MAGIC', 'STATUS'], indiff: [] },
        Bows: ranged,
        Crossbows: ranged,
    };
}
const SMART_TOGGLES = createSmartToggles();
/**
 * Automatically selects and deselects displayed column groups based on the selected weapon classes
 */
function smartToggles() {
    // toAdd: will be added; can't be removed (users want to see these col groups for some weapon classes)
    const toAdd = new Set();
    // toRemove: won't be added; might be removed (user may want to see these col groups for some weapon classes)
    const toRemove = new Set();
    // indifferent: can be added; won't be removed (user may want to see these col groups for some weapon classes)
    const indifferent = new Set();
    const classes = [...state.selectedClasses];
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
        state.showColGroups.delete(col);
    for (const col of toAdd)
        state.showColGroups.add(col);
}
init();
//# sourceMappingURL=main.js.map