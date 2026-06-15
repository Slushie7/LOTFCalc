import { loadJSONData } from './load.js';
import { HEADER_GROUPS } from './header.js';
import {
    type Weapon,
    type HeaderKey,
    type SuperheaderKey,
    type PlayerStats,
    type WeaponClass,
    type CalculatedPlayerStats,
    isWeaponClass,
    isSuperheaderKey,
} from './model.js';
import { getClassesHtml, getHeaderHtml, getWeaponRow, getWeaponsHtml, sortCalculated } from './render.js';
import { calculateStats, calculatePlayerStats } from './calc.js';

// for localStorage
const STORAGE_KEY = 'lotfcalc.settings';
const STORAGE_VER = 3;

// main app variables
const { weapons, gradeRanges, curves, runes, armor } = await loadJSONData();
const loadedWeaponClasses: string[] = [...new Set(weapons.map((w) => w.className))].sort();
type AppState = {
    playerStats: PlayerStats;
    upgLevel: number;
    selectedClasses: Set<WeaponClass>;
    sortKey: HeaderKey;
    ascending: boolean;
    showColGroups: Set<SuperheaderKey>;
    showTwoHanding: boolean;
    showUnwieldable: boolean;
    showSplit: boolean;
    saveSettings: boolean;
    pinnedWeapons: Set<string>;
    showRawScaling: boolean;
};
type ExportedAppState = {
    v: number;
    playerStats: PlayerStats;
    upgLevel: number;
    selectedClasses: WeaponClass[];
    sortKey: HeaderKey;
    ascending: boolean;
    showColGroups: SuperheaderKey[];
    showTwoHanding: boolean;
    showUnwieldable: boolean;
    showSplit: boolean;
    saveSettings: boolean;
    pinnedWeapons: string[];
    showRawScaling: boolean;
};
let state: AppState = {
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

function init(): void {
    loadState();
    initSettingsDisplay();
    wireInputs();
    renderDerivedStats();
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
            const settingValue = state[el.dataset.setting as keyof AppState];
            if (typeof settingValue === 'boolean') el.checked = settingValue;
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
    mustGet('sidebar-content').addEventListener('change', setClass);

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
    mustGet('weapons-body').addEventListener('click', tableBodyClick);
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

    function validate(d: unknown): d is ExportedAppState {
        if (typeof d !== 'object' || !d) return false;
        const o = d as Record<string, unknown>;
        if (!(typeof o.v === 'number')) return false;
        if (!(typeof o.playerStats === 'object') || !o.playerStats) return false;
        const ps = o.playerStats as Record<string, unknown>;
        if (!Object.keys(state.playerStats).every((k) => typeof ps[k] === 'number')) return false;
        if (!(typeof o.upgLevel === 'number')) return false;
        if (!Array.isArray(o.selectedClasses)) return false;
        if (!o.selectedClasses.every((v) => isWeaponClass(v))) return false;
        if (!(typeof o.sortKey === 'string')) return false;
        if (!(typeof o.ascending === 'boolean')) return false;
        if (!Array.isArray(o.showColGroups)) return false;
        if (!o.showColGroups.every((v) => isSuperheaderKey(v))) return false;
        if (!(typeof o.showTwoHanding === 'boolean')) return false;
        if (!(typeof o.showUnwieldable === 'boolean')) return false;
        if (!(typeof o.showSplit === 'boolean')) return false;
        if (!(typeof o.saveSettings === 'boolean')) return false;
        if (!Array.isArray(o.pinnedWeapons)) return false;
        if (!o.pinnedWeapons.every((v) => typeof v === 'string')) return false;
        if (!(typeof o.showRawScaling === 'boolean')) return false;
        return true;
    }

    // check whether parsed.saveSettings is false
    if (parsed && Object.hasOwn(parsed, 'saveSettings')) {
        if (!(parsed as Record<string, unknown>)['saveSettings']) {
            state.saveSettings = false;
            return;
        }
    }

    // check whether parsed is a valid ExportedAppState
    if (!validate(parsed)) return;

    if (!parsed.saveSettings) {
        // user doesn't want to use cached-settings feature
        state.saveSettings = false;
        return;
    }

    if (parsed.v !== STORAGE_VER)
        // wrong version - keep defaults
        return;

    // parse PlayerStats
    const ps = parsed.playerStats;
    const playerStats: PlayerStats = {
        strength: clampStat(ps.strength),
        agility: clampStat(ps.agility),
        endurance: clampStat(ps.endurance),
        vitality: clampStat(ps.vitality),
        radiance: clampStat(ps.radiance),
        inferno: clampStat(ps.inferno),
    };

    const upgLevel = Math.max(0, Math.min(10, Math.floor(parsed.upgLevel)));
    const selectedClasses = new Set(parsed.selectedClasses);

    const showColGroups: Set<SuperheaderKey> = new Set(parsed.showColGroups);
    showColGroups.add('INFO');

    const pinnedWeapons = new Set(parsed.pinnedWeapons);

    // all data read successfully - assign values
    state = {
        playerStats,
        upgLevel,
        selectedClasses,
        sortKey: parsed.sortKey,
        ascending: parsed.ascending,
        showColGroups,
        showTwoHanding: parsed.showTwoHanding,
        showUnwieldable: parsed.showUnwieldable,
        showSplit: parsed.showSplit,
        saveSettings: parsed.saveSettings,
        pinnedWeapons,
        showRawScaling: parsed.showRawScaling,
    };
}

/**
 * Save the current AppState to localStorage
 */
function saveState(): void {
    let data: ExportedAppState | { saveSettings: boolean };
    if (state.saveSettings) {
        data = {
            v: STORAGE_VER,
            playerStats: state.playerStats,
            upgLevel: state.upgLevel,
            selectedClasses: [...state.selectedClasses],
            sortKey: state.sortKey,
            ascending: state.ascending,
            showColGroups: [...state.showColGroups],
            showTwoHanding: state.showTwoHanding,
            showUnwieldable: state.showUnwieldable,
            showSplit: state.showSplit,
            saveSettings: state.saveSettings,
            pinnedWeapons: [...state.pinnedWeapons],
            showRawScaling: state.showRawScaling,
        };
    } else {
        // user doesn't want to cache their settings
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
    const elClasses = document.getElementById('sidebar-content');
    if (elClasses) elClasses.innerHTML = getClassesHtml(loadedWeaponClasses, state.selectedClasses);
}

function renderHeader(): void {
    const elHeader = document.getElementById('weapons-header');
    if (elHeader) {
        const groups = HEADER_GROUPS.filter((group) => state.showColGroups.has(group.superKey));
        elHeader.innerHTML = getHeaderHtml(groups, state.sortKey, state.ascending);
    }
}

function renderDerivedStats(): void {
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
}

function renderWeapons(weaponFadeIn: string | null = null): void {
    // update the weapons table
    const elBody = document.getElementById('weapons-body');
    if (elBody) {
        const showWeaps: Weapon[] = weapons.filter(
            (weap) => state.selectedClasses.has(weap.className) || state.pinnedWeapons.has(weap.key)
        );
        let calcStats = showWeaps.map((weap) =>
            calculateStats(
                weap,
                state.upgLevel,
                state.playerStats,
                state.showTwoHanding,
                gradeRanges,
                state.pinnedWeapons
            )
        );
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
    renderDerivedStats();
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
    if (setting && typeof setting === 'string' && Object.hasOwn(state, setting)) {
        const key = setting as keyof AppState;
        if (typeof state[key] === 'boolean') (state as Record<string, unknown>)[key] = el.checked;
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

function setPinned(weaponKey: string): void {
    if (state.pinnedWeapons.has(weaponKey)) state.pinnedWeapons.delete(weaponKey);
    else state.pinnedWeapons.add(weaponKey);

    saveState();
    renderWeapons(weaponKey); // render weapons with the pinned/unpinned weapon transitioning into view
}

function tableHeaderClick(e: MouseEvent): void {
    if (!(e.target instanceof Element)) return;
    const el = e.target.closest<HTMLElement>('th.sortable');
    if (el !== null && el.dataset.colKey) setSorting(el.dataset.colKey as HeaderKey);
}

function tableBodyClick(e: MouseEvent): void {
    if (!(e.target instanceof Element)) return;
    const el = e.target.closest<HTMLButtonElement>('button.lock');
    if (el !== null && el.dataset.weapon) setPinned(el.dataset.weapon);
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
    const ranged: SmartToggleColGroup = { add: ['AR'], remove: ['MAGIC', 'DEF'], indiff: ['STATUS'] };

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
