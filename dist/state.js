import { isWeaponClass } from './model.js';
import { isSuperheaderKey } from './model.js';
import { clampStat } from './calc.js';
// =========================================
// STORAGE - STORE AND RETRIEVE SETTINGS
// =========================================
// for localStorage
const STORAGE_KEY = 'lotfcalc.settings';
const STORAGE_VER = 3;
/**
 * Try to load the previous AppState from localStorage
 * @returns
 */
export function loadState(state) {
    // try to read JSON from localStorage
    let rawJSON = null;
    try {
        rawJSON = localStorage.getItem(STORAGE_KEY);
    }
    catch {
        return; // no saved settings exist
    }
    if (!rawJSON)
        return;
    // try to parse JSON
    let parsed;
    try {
        parsed = JSON.parse(rawJSON);
    }
    catch {
        return; // couldn't parse settings
    }
    function validate(d) {
        if (typeof d !== 'object' || !d)
            return false;
        const o = d;
        if (!(typeof o.v === 'number'))
            return false;
        if (!(typeof o.playerStats === 'object') || !o.playerStats)
            return false;
        const ps = o.playerStats;
        if (!Object.keys(state.playerStats).every((k) => typeof ps[k] === 'number'))
            return false;
        if (!(typeof o.upgLevel === 'number'))
            return false;
        if (!Array.isArray(o.selectedClasses))
            return false;
        if (!o.selectedClasses.every((v) => isWeaponClass(v)))
            return false;
        if (!(typeof o.sortKey === 'string'))
            return false;
        if (!(typeof o.ascending === 'boolean'))
            return false;
        if (!Array.isArray(o.showColGroups))
            return false;
        if (!o.showColGroups.every((v) => isSuperheaderKey(v)))
            return false;
        if (!(typeof o.showTwoHanding === 'boolean'))
            return false;
        if (!(typeof o.showUnwieldable === 'boolean'))
            return false;
        if (!(typeof o.showSplit === 'boolean'))
            return false;
        if (!(typeof o.saveSettings === 'boolean'))
            return false;
        if (!Array.isArray(o.pinnedWeapons))
            return false;
        if (!o.pinnedWeapons.every((v) => typeof v === 'string'))
            return false;
        if (!(typeof o.showRawScaling === 'boolean'))
            return false;
        return true;
    }
    // check whether parsed.saveSettings is false
    if (parsed && Object.hasOwn(parsed, 'saveSettings')) {
        if (!parsed['saveSettings']) {
            state.saveSettings = false;
            return;
        }
    }
    // check whether parsed is a valid ExportedAppState
    if (!validate(parsed))
        return;
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
    const playerStats = {
        strength: clampStat(ps.strength),
        agility: clampStat(ps.agility),
        endurance: clampStat(ps.endurance),
        vitality: clampStat(ps.vitality),
        radiance: clampStat(ps.radiance),
        inferno: clampStat(ps.inferno),
    };
    const upgLevel = Math.max(0, Math.min(10, Math.floor(parsed.upgLevel)));
    const selectedClasses = new Set(parsed.selectedClasses);
    const showColGroups = new Set(parsed.showColGroups);
    showColGroups.add('INFO');
    const pinnedWeapons = new Set(parsed.pinnedWeapons);
    // all data read successfully - assign values
    state.playerStats = playerStats;
    state.upgLevel = upgLevel;
    state.selectedClasses = selectedClasses;
    state.sortKey = parsed.sortKey;
    state.ascending = parsed.ascending;
    state.showColGroups = showColGroups;
    state.showTwoHanding = parsed.showTwoHanding;
    state.showUnwieldable = parsed.showUnwieldable;
    state.showSplit = parsed.showSplit;
    state.saveSettings = parsed.saveSettings;
    state.pinnedWeapons = pinnedWeapons;
    state.showRawScaling = parsed.showRawScaling;
}
/**
 * Save the current AppState to localStorage
 */
export function saveState(state) {
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
            showTwoHanding: state.showTwoHanding,
            showUnwieldable: state.showUnwieldable,
            showSplit: state.showSplit,
            saveSettings: state.saveSettings,
            pinnedWeapons: [...state.pinnedWeapons],
            showRawScaling: state.showRawScaling,
        };
    }
    else {
        // user doesn't want to cache their settings
        data = { saveSettings: false };
    }
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
    catch {
        // failed to save settings to localStorage - do nothing
    }
}
//# sourceMappingURL=state.js.map