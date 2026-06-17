import { isArmorSlot, isArmorWeightClass, isWeaponClass } from './model.js';
import { clampStat } from './calc/calc.js';
import { isWeaponsHeaderKey, isWeaponsSuperheaderKey } from './render/weaponsRender.js';
// =========================================
// MODES
// =========================================
const MODES = ['weapons', 'armors'];
export function isMode(v) {
    return MODES.includes(v);
}
const SHARED_TOGGLE_KEYS = ['saveSettings'];
export function isSharedToggleKey(k) {
    return SHARED_TOGGLE_KEYS.includes(k);
}
const WEAPONS_TOGGLE_KEYS = [
    'showTwoHanding',
    'showUnwieldable',
    'showSplit',
    'showRawScaling',
];
export function isWeaponsToggleKey(k) {
    return WEAPONS_TOGGLE_KEYS.includes(k);
}
function getDefaultState() {
    const shared = {
        playerStats: { strength: 30, agility: 30, endurance: 30, vitality: 30, radiance: 30, inferno: 30 },
        saveSettings: true,
        activeMode: 'weapons',
    };
    const weapons = {
        upgLevel: 10,
        selectedClasses: new Set(['Axes']),
        sortKey: 'WEAP',
        ascending: true,
        showColGroups: new Set(['INFO', 'AR', 'STATUS', 'SCALING', 'REQS']),
        showTwoHanding: false,
        showUnwieldable: true,
        showSplit: false,
        pinnedWeapons: new Set(),
        showRawScaling: false,
    };
    const armors = {
        selectedSlots: new Set(['Head', 'Torso', 'Arms', 'Legs']),
        selectedWeights: new Set(['Light', 'Medium', 'Heavy']),
    };
    return { shared, weapons, armors };
}
// =========================================
// STATE LOAD/SAVE
// =========================================
// for localStorage
const STORAGE_KEY = 'lotfcalc.settings';
const STORAGE_VER = 3;
/**
 * Try to load the previous AppState from localStorage
 * @returns
 */
export function loadAppState() {
    const defaultState = getDefaultState();
    // try to read JSON from localStorage
    let rawJSON = null;
    try {
        rawJSON = localStorage.getItem(STORAGE_KEY);
    }
    catch {
        console.log('Failed to retrieve saved app state from localStorage - using default settings');
        return defaultState;
    }
    if (!rawJSON) {
        console.log('Using default settings');
        return defaultState; // no saved AppState exists
    }
    // try to parse the JSON
    let parsed;
    try {
        parsed = JSON.parse(rawJSON);
    }
    catch {
        console.log('Failed to parse saved app state as JSON');
        return defaultState; // couldn't parse settings
    }
    function validateShared(d) {
        if (typeof d.playerStats !== 'object' || !d.playerStats)
            return false;
        const ps = d.playerStats;
        if (!Object.keys(defaultState.shared.playerStats).every((k) => typeof ps[k] === 'number'))
            return false;
        if (typeof d.saveSettings !== 'boolean')
            return false;
        if (!isMode(d.activeMode))
            return false;
        return true;
    }
    function validateWeapons(d) {
        if (typeof d.upgLevel !== 'number')
            return false;
        if (!Array.isArray(d.selectedClasses))
            return false;
        if (!d.selectedClasses.every((v) => isWeaponClass(v)))
            return false;
        if (!isWeaponsHeaderKey(d.sortKey))
            return false;
        if (typeof d.ascending !== 'boolean')
            return false;
        if (!Array.isArray(d.showColGroups))
            return false;
        if (!d.showColGroups.every((v) => isWeaponsSuperheaderKey(v)))
            return false;
        if (typeof d.showTwoHanding !== 'boolean')
            return false;
        if (typeof d.showUnwieldable !== 'boolean')
            return false;
        if (typeof d.showSplit !== 'boolean')
            return false;
        if (!Array.isArray(d.pinnedWeapons))
            return false;
        if (!d.pinnedWeapons.every((v) => typeof v === 'string'))
            return false;
        if (typeof d.showRawScaling !== 'boolean')
            return false;
        return true;
    }
    function validateArmors(d) {
        if (!Array.isArray(d.selectedSlots))
            return false;
        if (!d.selectedSlots.every((v) => isArmorSlot(v)))
            return false;
        if (!Array.isArray(d.selectedWeights))
            return false;
        if (!d.selectedWeights.every((v) => isArmorWeightClass(v)))
            return false;
        return true;
    }
    function validateAppState(d) {
        if (typeof d.v !== 'number' || d.v !== STORAGE_VER)
            return false;
        if (typeof d.shared !== 'object' || !d.shared)
            return false;
        if (typeof d.weapons !== 'object' || !d.weapons)
            return false;
        if (typeof d.armors !== 'object' || !d.armors)
            return false;
        const shared = d.shared;
        const weapons = d.weapons;
        const armors = d.armors;
        return validateShared(shared) && validateWeapons(weapons) && validateArmors(armors);
    }
    // try to validate the format of the JSON data
    if (typeof parsed === 'boolean' && !parsed) {
        // user has 'Remember Settings' turned off
        defaultState.shared.saveSettings = false;
        return defaultState;
    }
    if (typeof parsed !== 'object' || !parsed)
        return defaultState;
    const toValidate = parsed;
    if (!validateAppState(toValidate)) {
        console.log('Previously saved app state is no longer valid - using defaults');
        return defaultState;
    }
    // previously saved state has been validated
    const state = toValidate;
    if (!state.shared.saveSettings) {
        // return the default settings with the saveSettings flag cleared
        defaultState.shared.saveSettings = false;
        return defaultState;
    }
    // parse SharedState
    const ps = state.shared.playerStats;
    const playerStats = {
        strength: clampStat(ps.strength),
        agility: clampStat(ps.agility),
        endurance: clampStat(ps.endurance),
        vitality: clampStat(ps.vitality),
        radiance: clampStat(ps.radiance),
        inferno: clampStat(ps.inferno),
    };
    const shared = {
        playerStats,
        saveSettings: state.shared.saveSettings,
        activeMode: state.shared.activeMode,
    };
    const upgLevel = Math.max(0, Math.min(10, Math.floor(state.weapons.upgLevel)));
    const selectedClasses = new Set(state.weapons.selectedClasses);
    const showColGroups = new Set(state.weapons.showColGroups);
    showColGroups.add('INFO');
    const pinnedWeapons = new Set(state.weapons.pinnedWeapons);
    const weapons = {
        upgLevel,
        selectedClasses,
        sortKey: state.weapons.sortKey,
        ascending: state.weapons.ascending,
        showColGroups,
        showTwoHanding: state.weapons.showTwoHanding,
        showUnwieldable: state.weapons.showUnwieldable,
        showSplit: state.weapons.showSplit,
        pinnedWeapons: pinnedWeapons,
        showRawScaling: state.weapons.showRawScaling,
    };
    // parse ArmorsState
    const selectedSlots = new Set(state.armors.selectedSlots);
    const selectedWeights = new Set(state.armors.selectedWeights);
    const armors = { selectedSlots, selectedWeights };
    return { shared, weapons, armors };
}
/**
 * Save the current AppState to localStorage
 */
export function saveAppState(state) {
    let data;
    if (state.shared.saveSettings) {
        const shared = {
            playerStats: state.shared.playerStats,
            saveSettings: state.shared.saveSettings,
            activeMode: state.shared.activeMode,
        };
        const weapons = {
            upgLevel: state.weapons.upgLevel,
            selectedClasses: [...state.weapons.selectedClasses],
            sortKey: state.weapons.sortKey,
            ascending: state.weapons.ascending,
            showColGroups: [...state.weapons.showColGroups],
            showTwoHanding: state.weapons.showTwoHanding,
            showUnwieldable: state.weapons.showUnwieldable,
            showSplit: state.weapons.showSplit,
            pinnedWeapons: [...state.weapons.pinnedWeapons],
            showRawScaling: state.weapons.showRawScaling,
        };
        const armors = {
            selectedSlots: [...state.armors.selectedSlots],
            selectedWeights: [...state.armors.selectedWeights],
        };
        data = {
            v: STORAGE_VER,
            shared,
            weapons,
            armors,
        };
    }
    else {
        // user doesn't want to cache their settings
        data = false;
    }
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
    catch {
        // failed to save settings to localStorage - do nothing
    }
}
//# sourceMappingURL=state.js.map