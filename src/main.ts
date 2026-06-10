import { loadJSONData } from './load.js';
import { HEADER_GROUPS } from './header.js';
import type { Weapon, HeaderKey, SuperheaderKey, PlayerStats, WeaponClass, CalculatedPlayerStats } from './model.js';
import { getClassesHtml, getHeaderHtml, getWeaponRow, getWeaponsHtml, sortCalculated } from './render.js';
import { calculateStats, calculatePlayerStats } from './calc.js';

// for localStorage
const STORAGE_KEY = 'lotfcalc.settings';
const STORAGE_VER = 2;

// map HTML checkboxes' 'data-setting' fields to AppState fields
type SettingKey = 'UNWIELDABLE' | 'SPLIT' | 'REMEMBER';
type BooleanKeys<T> = { [K in keyof T]: T[K] extends boolean ? K : never }[keyof T];
const htmlTogglesMapping: Record<SettingKey, BooleanKeys<AppState>> = {
    UNWIELDABLE: 'showUnwieldable',
    SPLIT: 'showSplit',
    REMEMBER: 'saveSettings',
};

// main app variables
const { weapons, gradeRanges, curves } = await loadJSONData();
const loadedWeaponClasses: string[] = [...new Set(weapons.map((w) => w.className))].sort();
interface AppState {
    playerStats: PlayerStats;
    upgLevel: number;
    selectedClasses: Set<WeaponClass>;
    sortKey: HeaderKey;
    ascending: boolean;
    showColGroups: Set<SuperheaderKey>;
    showUnwieldable: boolean;
    showSplit: boolean;
    saveSettings: boolean;
}
const state: AppState = {
    // defaults
    playerStats: { strength: 30, agility: 30, endurance: 30, vitality: 30, radiance: 30, inferno: 30 },
    upgLevel: 10,
    selectedClasses: new Set(['Axes']),
    sortKey: 'WEAP',
    ascending: true,
    showColGroups: new Set(['INFO', 'AR', 'STATUS', 'SCALING', 'REQS']),
    showUnwieldable: true,
    showSplit: false,
    saveSettings: true,
};

// =========================================
// UI INITIALIZATION
// =========================================

function init(): void {
    loadState();
    initSettingsDisplay();
    wireInputs();
    renderClasses();
    renderHeader();
    renderWeapons();
}

function initSettingsDisplay(): void {
    // initialize player stat entries
    for (const el of document.getElementsByClassName('stat-input')) {
        if (el instanceof HTMLInputElement && typeof el.dataset.stat === 'string') {
            const stat = el.dataset.stat as keyof PlayerStats;
            if (state.playerStats[stat] !== undefined) el.value = String(state.playerStats[stat]);
        }
    }

    // initialize weapon upgrade level
    const el = document.getElementById('weapon-level');
    if (el instanceof HTMLSelectElement) el.value = `+${state.upgLevel}`;

    // initialize settings toggles
    updateSettingsToggles();
}

function updateSettingsToggles(): void {
    for (const el of document.getElementsByClassName('setting-toggle')) {
        if (el instanceof HTMLInputElement && typeof el.dataset.setting === 'string') {
            // map element's 'data-setting' value to relevant current AppState value
            const setting = htmlTogglesMapping[el.dataset.setting as SettingKey];
            el.checked = state[setting];
        }
    }
    for (const el of document.getElementsByClassName('group-toggle')) {
        if (el instanceof HTMLInputElement) el.checked = state.showColGroups.has(el.dataset.group as SuperheaderKey);
    }
}

function wireInputs(): void {
    function mustGet(id: string): HTMLElement {
        const el = document.getElementById(id);
        if (el === null) throw new Error(`Missing element: ${id}`);
        if (!(el instanceof HTMLElement)) throw new Error();
        return el;
    }

    // hamburger button
    mustGet('hamburger').addEventListener('click', toggleSidebar);

    // weapon class toggles
    mustGet('weapon-classes').addEventListener('change', setClass);

    // player stats inputs
    for (const elStat of document.getElementsByClassName('stat-input')) {
        if (elStat instanceof HTMLInputElement) elStat.addEventListener('change', () => setPlayerStat(elStat));
    }

    // weapon upgrade level dropdown
    const elUpg = mustGet('weapon-level') as HTMLSelectElement;
    elUpg.addEventListener('change', () => setUpgLevel(elUpg));

    // setting toggles
    for (const elSetting of document.getElementsByClassName('setting-toggle')) {
        if (elSetting instanceof HTMLInputElement) elSetting.addEventListener('change', () => setSetting(elSetting));
    }

    // header group toggles
    for (const elGroup of document.getElementsByClassName('group-toggle')) {
        if (elGroup instanceof HTMLInputElement) elGroup.addEventListener('change', () => setColGroup(elGroup));
    }

    // table header sorting
    mustGet('weapons-header').addEventListener('click', tableHeaderClick);
}

// =========================================
// STORAGE - STORE AND RETRIEVE SETTINGS
// =========================================
/**
 * Try to load the previous AppState from localStorage
 * @returns
 */
function loadState(): void {
    // try to read JSON from localStorage
    let rawJSON: string | null = null;
    try {
        rawJSON = localStorage.getItem(STORAGE_KEY);
    } catch {
        return; // no saved settings exist
    }
    if (!rawJSON) return;

    // try to parse JSON
    let parsed: unknown;
    try {
        parsed = JSON.parse(rawJSON);
    } catch {
        return; // couldn't parse settings
    }
    if (typeof parsed !== 'object' || parsed === null) return;

    // process the save settings
    const data = parsed as Record<string, unknown>;

    if (!(typeof data.saveSettings === 'boolean')) return;
    const saveSettings = data.saveSettings;
    if (!saveSettings) {
        // user doesn't want to use cached-settings feature
        state.saveSettings = false;
        return;
    }

    if (data.v !== STORAGE_VER)
        // wrong version - keep defaults
        return;

    // parse PlayerStats
    const ds = data.playerStats as Record<string, unknown>;
    if (typeof ds !== 'object' || ds === null) return;
    if (!Object.keys(state.playerStats).every((k) => typeof ds[k] === 'number')) return;
    const ps = ds as unknown as PlayerStats; // ds has a number value for every PlayerStats key
    const playerStats: PlayerStats = {
        strength: clampStat(ps.strength),
        agility: clampStat(ps.agility),
        endurance: clampStat(ps.endurance),
        vitality: clampStat(ps.vitality),
        radiance: clampStat(ps.radiance),
        inferno: clampStat(ps.inferno),
    };

    if (!(typeof data.upgLevel === 'number')) return;
    const upgLevel = Math.max(0, Math.min(99, Math.floor(data.upgLevel)));

    if (!Array.isArray(data.selectedClasses)) return;
    const validClasses = new Set<string>(loadedWeaponClasses);
    const selectedClasses = new Set(data.selectedClasses.filter((v) => typeof v === 'string' && validClasses.has(v)));

    if (!(typeof data.sortKey === 'string')) return;
    const sortKey = data.sortKey as HeaderKey;

    if (!(typeof data.ascending === 'boolean')) return;
    const ascending = data.ascending;

    if (!Array.isArray(data.showColGroups)) return;
    const showColGroups = new Set(data.showColGroups.filter((v): v is SuperheaderKey => typeof v === 'string'));
    showColGroups.add('INFO');

    if (!(typeof data.showUnwieldable === 'boolean')) return;
    const showUnwieldable = data.showUnwieldable;

    if (!(typeof data.showSplit === 'boolean')) return;
    const showSplit = data.showSplit;

    // all data read successfully - assign values
    state.playerStats = playerStats;
    state.upgLevel = upgLevel;
    state.selectedClasses = selectedClasses;
    state.sortKey = sortKey;
    state.ascending = ascending;
    state.showColGroups = showColGroups;
    state.showUnwieldable = showUnwieldable;
    state.showSplit = showSplit;
    state.saveSettings = saveSettings;
}

/**
 * Save the current AppState to localStorage
 */
function saveState(): void {
    let data;
    if (state.saveSettings) {
        data = {
            v: STORAGE_VER,
            playerStats: state.playerStats,
            upgLevel: state.upgLevel,
            selectedClasses: [...state.selectedClasses],
            sortKey: state.sortKey,
            ascending: state.ascending,
            showColGroups: [...state.showColGroups],
            showUnwieldable: state.showUnwieldable,
            showSplit: state.showSplit,
            saveSettings: state.saveSettings,
        };
    } else {
        // user doesn't want to cache their settings - just store a flag
        data = { saveSettings: false };
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
        // failed to save settings to localStorage - do nothing
    }
}

// =========================================
// RENDERING - GENERATE/UPDATE HTML
// =========================================

function renderClasses(): void {
    const elClasses = document.getElementById('weapon-classes');
    if (elClasses) elClasses.innerHTML = getClassesHtml(loadedWeaponClasses, state.selectedClasses);
}

function renderHeader(): void {
    const elHeader = document.getElementById('weapons-header');
    if (elHeader) {
        const groups = HEADER_GROUPS.filter((group) => state.showColGroups.has(group.superKey));
        elHeader.innerHTML = getHeaderHtml(groups, state.sortKey, state.ascending);
    }
}

function renderWeapons(): void {
    // update the player's derived stats
    const derivedStats = calculatePlayerStats(state.playerStats, curves);
    for (const el of document.getElementsByClassName('derived-val')) {
        if (el instanceof HTMLSpanElement && typeof el.dataset.stat === 'string') {
            const stat = el.dataset.stat as keyof CalculatedPlayerStats;
            const val = derivedStats[stat];
            if (typeof val === 'string') el.textContent = val;
            else if (typeof val === 'number') el.textContent = String(val);
        }
    }

    // update the weapons table
    const elBody = document.getElementById('weapons-body');
    if (elBody) {
        const showWeaps: Weapon[] = weapons.filter((weap) => state.selectedClasses.has(weap.className));
        let calcStats = showWeaps.map((weap) => calculateStats(weap, state.upgLevel, state.playerStats, gradeRanges));
        if (!state.showUnwieldable)
            // remove any unwieldable weapons
            calcStats = calcStats.filter((ws) => ws.wieldability.wieldable);
        // sort calculated weapon stats by current sortKey
        sortCalculated(calcStats, state.sortKey, state.ascending);
        // display the weapon rows
        const rows = calcStats.map((cs) => getWeaponRow(cs, state.showColGroups, state.showSplit));
        elBody.innerHTML = getWeaponsHtml(rows);
    }
}

// =========================================
// EVENT HANDLERS
// =========================================

function toggleSidebar(): void {
    document.body.classList.toggle('sidebar-hidden');
}

function setClass(e: Event): void {
    const el = e.target;
    if (el instanceof HTMLInputElement) {
        if (el.dataset.class === undefined) return;

        // add/remove the class name from selectedClasses
        const className = el.dataset.class as WeaponClass;
        if (el.checked) state.selectedClasses.add(className);
        else state.selectedClasses.delete(className);

        smartToggles();
        saveState();
        updateSettingsToggles();
        renderHeader();
        renderWeapons();
    }
}

function setPlayerStat(el: HTMLInputElement): void {
    const input = el.valueAsNumber;
    if (Number.isNaN(input)) return;
    const value = clampStat(input);
    if (input !== value) {
        // update the user's input to reflect the clamped value
        el.value = String(value);
    }

    // update the stat
    const field = el.dataset.stat as keyof PlayerStats;
    state.playerStats = { ...state.playerStats, [field]: value };

    saveState();
    renderWeapons();
}

function setUpgLevel(el: HTMLSelectElement): void {
    const val = el.value.slice(1);
    const num = Number.parseInt(val, 10);
    if (!Number.isNaN(num)) {
        state.upgLevel = num;

        saveState();
        renderWeapons();
    }
}

function setColGroup(el: HTMLInputElement): void {
    const superKey = el.dataset.group as SuperheaderKey;
    if (el.checked) state.showColGroups.add(superKey);
    else state.showColGroups.delete(superKey);

    saveState();
    renderHeader();
    renderWeapons();
}

function setSetting(el: HTMLInputElement): void {
    const setting = el.dataset.setting;
    if (typeof setting === 'string') {
        const stateKey = htmlTogglesMapping[setting as SettingKey];
        if (typeof stateKey === 'string' && typeof state[stateKey] === 'boolean') {
            state[stateKey] = el.checked;
        }
    }

    saveState();
    renderWeapons();
}

function setSorting(colKey: HeaderKey): void {
    if (colKey === state.sortKey) state.ascending = !state.ascending;
    else {
        state.sortKey = colKey;
        if (colKey === 'WEAP' || colKey === 'CLS')
            // weapon name and weapon class columns default to ascending
            state.ascending = true;
        else state.ascending = false;
    }

    saveState();
    renderHeader();
    renderWeapons();
}

function tableHeaderClick(e: MouseEvent): void {
    if (!(e.target instanceof Element)) return;
    const el = e.target.closest<HTMLElement>('th.sortable');
    if (el !== null && el.dataset.colKey) setSorting(el.dataset.colKey as HeaderKey);
}

// =========================================
// SMART TOGGLES
// =========================================

interface SmartToggleColGroup {
    add: SuperheaderKey[];
    remove: SuperheaderKey[];
    indiff: SuperheaderKey[];
}
function createSmartToggles(): Record<WeaponClass, SmartToggleColGroup> {
    const melee: SmartToggleColGroup = { add: ['AR'], remove: ['MAGIC'], indiff: ['STATUS', 'DEF'] };
    const bows: SmartToggleColGroup = { add: ['AR'], remove: ['MAGIC', 'DEF'], indiff: ['STATUS'] };

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
        Bows: bows,
        Crossbows: bows,
    };
}

const SMART_TOGGLES = createSmartToggles();
/**
 * Automatically selects and deselects displayed column groups based on the selected weapon classes
 */
function smartToggles(): void {
    // toAdd: will be added; can't be removed (users want to see these col groups for some weapon classes)
    const toAdd: Set<SuperheaderKey> = new Set();
    // toRemove: won't be added; might be removed (user may want to see these col groups for some weapon classes)
    const toRemove: Set<SuperheaderKey> = new Set();
    // indifferent: can be added; won't be removed (user may want to see these col groups for some weapon classes)
    const indifferent: Set<SuperheaderKey> = new Set();

    const classes = [...state.selectedClasses];
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
    for (const col of toRemove) state.showColGroups.delete(col);
    for (const col of toAdd) state.showColGroups.add(col);
}

// =========================================
// HELPERS
// =========================================

/**
 * Floor and clamp the given number to the range [0, 99]
 * @param val
 * @returns
 */
function clampStat(val: number): number {
    return Math.max(0, Math.min(Math.floor(val), 99));
}

init();
