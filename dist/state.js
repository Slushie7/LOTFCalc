import { isArmorSlot, isArmorWeightClass, isClassType, isRuneType, isWeaponClass } from './model.js';
import { clampStat } from './calc/sharedCalc.js';
import { isWeaponsHeaderKey, isWeaponsSuperheaderKey } from './render/weaponsRender.js';
import { isArmorsHeaderKey, isArmorsSuperheaderKey, } from './render/armorsRender.js';
import { isRunesHeaderKey, isRunesSuperheaderKey, } from './render/runesRender.js';
import { isClassesHeaderKey, isClassesSuperheaderKey, } from './render/classesRender.js';
// =========================================
// MODES
// =========================================
const MODES = ['weapons', 'armors', 'runes', 'classes'];
export function isMode(v) {
    return MODES.includes(v);
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
        pinnedItems: new Set(),
        showRawScaling: false,
    };
    const armors = {
        selectedSlots: new Set(['Head', 'Torso', 'Arms', 'Legs']),
        selectedWeights: new Set(['Light', 'Medium', 'Heavy']),
        sortKey: 'ARMR',
        ascending: true,
        showColGroups: new Set(['INFO', 'DEF', 'STATUS']),
        pinnedItems: new Set(),
        paperDoll: { Head: null, Torso: null, Arms: null, Legs: null },
    };
    const runes = {
        selectedTypes: new Set(['Strength', 'Agility', 'Radiance', 'Inferno']),
        sortKey: 'RUNE',
        ascending: true,
        showColGroups: new Set(['INFO', 'WEAP', 'ARMR']),
        pinnedItems: new Set(),
    };
    const classes = {
        selectedTypes: new Set(['Basic', 'Unlockable']),
        sortKey: 'CLASS',
        ascending: true,
        showColGroups: new Set(['INFO', 'STATS', 'GEAR']),
        pinnedItems: new Set(),
    };
    return { shared, weapons, armors, runes, classes };
}
// =========================================
// STATE LOAD/SAVE
// =========================================
// for localStorage
const STORAGE_KEY = 'lotfcalc.settings';
const STORAGE_VER = 5;
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
        if (!d)
            return false;
        const p = d;
        if (typeof p.playerStats !== 'object' || !p.playerStats)
            return false;
        const ps = p.playerStats;
        if (!Object.keys(defaultState.shared.playerStats).every((k) => typeof ps[k] === 'number'))
            return false;
        if (typeof p.saveSettings !== 'boolean')
            return false;
        if (!isMode(p.activeMode))
            return false;
        return true;
    }
    function validateTable(d, headerKeyVerif, superHeaderKeyVerif) {
        if (!d)
            return false;
        const p = d;
        if (!headerKeyVerif(p.sortKey))
            return false;
        if (typeof p.ascending !== 'boolean')
            return false;
        if (!Array.isArray(p.showColGroups))
            return false;
        if (!p.showColGroups.every((v) => superHeaderKeyVerif(v)))
            return false;
        if (!Array.isArray(p.pinnedItems))
            return false;
        if (!p.pinnedItems.every((v) => typeof v === 'string'))
            return false;
        return true;
    }
    function validateWeapons(d) {
        if (!validateTable(d, isWeaponsHeaderKey, isWeaponsSuperheaderKey))
            return false;
        const p = d;
        if (typeof p.upgLevel !== 'number')
            return false;
        if (!Array.isArray(p.selectedClasses))
            return false;
        if (!p.selectedClasses.every((v) => isWeaponClass(v)))
            return false;
        if (typeof p.showTwoHanding !== 'boolean')
            return false;
        if (typeof p.showUnwieldable !== 'boolean')
            return false;
        if (typeof p.showSplit !== 'boolean')
            return false;
        if (typeof p.showRawScaling !== 'boolean')
            return false;
        return true;
    }
    function validateArmors(d) {
        if (!validateTable(d, isArmorsHeaderKey, isArmorsSuperheaderKey))
            return false;
        const p = d;
        if (!Array.isArray(p.selectedSlots))
            return false;
        if (!p.selectedSlots.every((v) => isArmorSlot(v)))
            return false;
        if (!Array.isArray(p.selectedWeights))
            return false;
        if (!p.selectedWeights.every((v) => isArmorWeightClass(v)))
            return false;
        if (typeof p.paperDoll !== 'object' || !p.paperDoll)
            return false;
        const pd = p.paperDoll;
        if (!Object.keys(defaultState.armors.paperDoll).every((k) => isArmorSlot(k) && (pd[k] === null || typeof pd[k] === 'string')))
            return false;
        return true;
    }
    function validateRunes(d) {
        if (!validateTable(d, isRunesHeaderKey, isRunesSuperheaderKey))
            return false;
        const p = d;
        if (!Array.isArray(p.selectedTypes))
            return false;
        if (!p.selectedTypes.every((v) => isRuneType(v)))
            return false;
        return true;
    }
    function validateClasses(d) {
        if (!validateTable(d, isClassesHeaderKey, isClassesSuperheaderKey))
            return false;
        const p = d;
        if (!Array.isArray(p.selectedTypes))
            return false;
        if (!p.selectedTypes.every((v) => isClassType(v)))
            return false;
        return true;
    }
    function validateAppState(d) {
        if (typeof d !== 'object' || !d)
            return false;
        const p = d;
        if (typeof p.v !== 'number' || p.v !== STORAGE_VER)
            return false;
        if (typeof p.shared !== 'object' || !p.shared)
            return false;
        if (typeof p.weapons !== 'object' || !p.weapons)
            return false;
        if (typeof p.armors !== 'object' || !p.armors)
            return false;
        if (typeof p.runes !== 'object' || !p.runes)
            return false;
        if (typeof p.classes !== 'object' || !p.classes)
            return false;
        return (validateShared(p.shared) &&
            validateWeapons(p.weapons) &&
            validateArmors(p.armors) &&
            validateRunes(p.runes) &&
            validateClasses(p.classes));
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
    const pinnedWeapons = new Set(state.weapons.pinnedItems);
    const weapons = {
        upgLevel,
        selectedClasses,
        sortKey: state.weapons.sortKey,
        ascending: state.weapons.ascending,
        showColGroups,
        showTwoHanding: state.weapons.showTwoHanding,
        showUnwieldable: state.weapons.showUnwieldable,
        showSplit: state.weapons.showSplit,
        pinnedItems: pinnedWeapons,
        showRawScaling: state.weapons.showRawScaling,
    };
    // parse ArmorsState
    const selectedSlots = new Set(state.armors.selectedSlots);
    const selectedWeights = new Set(state.armors.selectedWeights);
    const showColGroupsArmor = new Set(state.armors.showColGroups);
    showColGroupsArmor.add('INFO');
    const pinnedArmors = new Set(state.armors.pinnedItems);
    const armors = {
        selectedSlots,
        selectedWeights,
        sortKey: state.armors.sortKey,
        ascending: state.armors.ascending,
        showColGroups: showColGroupsArmor,
        pinnedItems: pinnedArmors,
        paperDoll: state.armors.paperDoll,
    };
    const selectedTypes = new Set(state.runes.selectedTypes);
    const showColGroupsRunes = new Set(state.runes.showColGroups);
    showColGroupsRunes.add('INFO');
    const pinnedRunes = new Set(state.runes.pinnedItems);
    const runes = {
        selectedTypes,
        sortKey: state.runes.sortKey,
        ascending: state.runes.ascending,
        showColGroups: showColGroupsRunes,
        pinnedItems: pinnedRunes,
    };
    const selectedClassTypes = new Set(state.classes.selectedTypes);
    const showColGroupsClasses = new Set(state.classes.showColGroups);
    showColGroupsClasses.add('INFO');
    const pinnedClasses = new Set(state.classes.pinnedItems);
    const classes = {
        selectedTypes: selectedClassTypes,
        sortKey: state.classes.sortKey,
        ascending: state.classes.ascending,
        showColGroups: showColGroupsClasses,
        pinnedItems: pinnedClasses,
    };
    return { shared, weapons, armors, runes, classes };
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
            pinnedItems: [...state.weapons.pinnedItems],
            showRawScaling: state.weapons.showRawScaling,
        };
        const armors = {
            selectedSlots: [...state.armors.selectedSlots],
            selectedWeights: [...state.armors.selectedWeights],
            sortKey: state.armors.sortKey,
            ascending: state.armors.ascending,
            showColGroups: [...state.armors.showColGroups],
            pinnedItems: [...state.armors.pinnedItems],
            paperDoll: state.armors.paperDoll,
        };
        const runes = {
            selectedTypes: [...state.runes.selectedTypes],
            sortKey: state.runes.sortKey,
            ascending: state.runes.ascending,
            showColGroups: [...state.runes.showColGroups],
            pinnedItems: [...state.runes.pinnedItems],
        };
        const classes = {
            selectedTypes: [...state.classes.selectedTypes],
            sortKey: state.classes.sortKey,
            ascending: state.classes.ascending,
            showColGroups: [...state.classes.showColGroups],
            pinnedItems: [...state.classes.pinnedItems],
        };
        data = {
            v: STORAGE_VER,
            shared,
            weapons,
            armors,
            runes,
            classes,
        };
    }
    else {
        // user doesn't want to store their settings
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