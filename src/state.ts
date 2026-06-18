import type { ArmorSlot, ArmorWeightClass, PlayerStats, WeaponClass } from './model.js';
import { isArmorSlot, isArmorWeightClass, isWeaponClass } from './model.js';
import { clampStat } from './calc/sharedCalc.js';
import type { WeaponsHeaderKey, WeaponsSuperheaderKey } from './render/weaponsRender.js';
import { isWeaponsHeaderKey, isWeaponsSuperheaderKey } from './render/weaponsRender.js';
import {
    isArmorsHeaderKey,
    isArmorsSuperheaderKey,
    type ArmorsHeaderGroup,
    type ArmorsHeaderKey,
    type ArmorsSuperheaderKey,
} from './render/armorsRender.js';

export type BooleanKeys<T> = {
    [K in keyof T]-?: T[K] extends boolean ? K : never;
}[keyof T];

// =========================================
// MODES
// =========================================

const MODES = ['weapons', 'armors'] as const;
export type Mode = (typeof MODES)[number];
export function isMode(v: unknown): v is Mode {
    return MODES.includes(v as Mode);
}

// =========================================
// APP STATE OBJECTS
// =========================================

export type SharedState = {
    playerStats: PlayerStats;
    saveSettings: boolean;
    activeMode: Mode;
};
const SHARED_TOGGLE_KEYS = ['saveSettings'] as const satisfies readonly BooleanKeys<SharedState>[];
export type SharedToggleKey = (typeof SHARED_TOGGLE_KEYS)[number];
export function isSharedToggleKey(k: string): k is SharedToggleKey {
    return (SHARED_TOGGLE_KEYS as readonly string[]).includes(k);
}

export type WeaponsState = {
    upgLevel: number;
    selectedClasses: Set<WeaponClass>;
    sortKey: WeaponsHeaderKey;
    ascending: boolean;
    showColGroups: Set<WeaponsSuperheaderKey>;
    showTwoHanding: boolean;
    showUnwieldable: boolean;
    showSplit: boolean;
    pinnedWeapons: Set<string>;
    showRawScaling: boolean;
};


export type ArmorsState = {
    selectedSlots: Set<ArmorSlot>;
    selectedWeights: Set<ArmorWeightClass>;
    sortKey: ArmorsHeaderKey;
    ascending: boolean;
    showColGroups: Set<ArmorsSuperheaderKey>;
    pinnedArmors: Set<string>;
};

export type AppState = {
    shared: SharedState;
    weapons: WeaponsState;
    armors: ArmorsState;
};

function getDefaultState(): AppState {
    const shared: SharedState = {
        playerStats: { strength: 30, agility: 30, endurance: 30, vitality: 30, radiance: 30, inferno: 30 },
        saveSettings: true,
        activeMode: 'weapons',
    };

    const weapons: WeaponsState = {
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

    const armors: ArmorsState = {
        selectedSlots: new Set(['Head', 'Torso', 'Arms', 'Legs']),
        selectedWeights: new Set(['Light', 'Medium', 'Heavy']),
        sortKey: 'ARMR',
        ascending: true,
        showColGroups: new Set(['INFO', 'DEF', 'STATUS']),
        pinnedArmors: new Set(),
    };

    return { shared, weapons, armors };
}

// =========================================
// STATE LOAD/SAVE
// =========================================

// for localStorage
const STORAGE_KEY = 'lotfcalc.settings';
const STORAGE_VER = 3;

type ExportedSharedState = {
    readonly playerStats: PlayerStats;
    readonly saveSettings: boolean;
    readonly activeMode: Mode;
};
type ExportedWeaponsState = {
    readonly upgLevel: number;
    readonly selectedClasses: readonly WeaponClass[];
    readonly sortKey: WeaponsHeaderKey;
    readonly ascending: boolean;
    readonly showColGroups: readonly WeaponsSuperheaderKey[];
    readonly showTwoHanding: boolean;
    readonly showUnwieldable: boolean;
    readonly showSplit: boolean;
    readonly pinnedWeapons: readonly string[];
    readonly showRawScaling: boolean;
};
type ExportedArmorsState = {
    readonly selectedSlots: ArmorSlot[];
    readonly selectedWeights: readonly ArmorWeightClass[];
    readonly sortKey: ArmorsHeaderKey;
    readonly ascending: boolean;
    readonly showColGroups: readonly ArmorsSuperheaderKey[];
    readonly pinnedArmors: readonly string[];
};
type ExportedAppState = {
    readonly v: number;
    readonly shared: ExportedSharedState;
    readonly weapons: ExportedWeaponsState;
    readonly armors: ExportedArmorsState;
};

/**
 * Try to load the previous AppState from localStorage
 * @returns
 */
export function loadAppState(): AppState {
    const defaultState = getDefaultState();

    // try to read JSON from localStorage
    let rawJSON: string | null = null;
    try {
        rawJSON = localStorage.getItem(STORAGE_KEY);
    } catch {
        console.log('Failed to retrieve saved app state from localStorage - using default settings');
        return defaultState;
    }
    if (!rawJSON) {
        console.log('Using default settings');
        return defaultState; // no saved AppState exists
    }

    // try to parse the JSON
    let parsed: unknown;
    try {
        parsed = JSON.parse(rawJSON);
    } catch {
        console.log('Failed to parse saved app state as JSON');
        return defaultState; // couldn't parse settings
    }

    function validateShared(d: Record<string, unknown>): d is ExportedSharedState {
        if (typeof d.playerStats !== 'object' || !d.playerStats) return false;
        const ps = d.playerStats as Record<string, number>;
        if (!Object.keys(defaultState.shared.playerStats).every((k) => typeof ps[k] === 'number')) return false;
        if (typeof d.saveSettings !== 'boolean') return false;
        if (!isMode(d.activeMode)) return false;
        return true;
    }
    function validateWeapons(d: Record<string, unknown>): d is ExportedWeaponsState {
        if (typeof d.upgLevel !== 'number') return false;
        if (!Array.isArray(d.selectedClasses)) return false;
        if (!d.selectedClasses.every((v) => isWeaponClass(v))) return false;
        if (!isWeaponsHeaderKey(d.sortKey)) return false;
        if (typeof d.ascending !== 'boolean') return false;
        if (!Array.isArray(d.showColGroups)) return false;
        if (!d.showColGroups.every((v) => isWeaponsSuperheaderKey(v))) return false;
        if (typeof d.showTwoHanding !== 'boolean') return false;
        if (typeof d.showUnwieldable !== 'boolean') return false;
        if (typeof d.showSplit !== 'boolean') return false;
        if (!Array.isArray(d.pinnedWeapons)) return false;
        if (!d.pinnedWeapons.every((v) => typeof v === 'string')) return false;
        if (typeof d.showRawScaling !== 'boolean') return false;
        return true;
    }
    function validateArmors(d: Record<string, unknown>): d is ExportedArmorsState {
        if (!Array.isArray(d.selectedSlots)) return false;
        if (!d.selectedSlots.every((v) => isArmorSlot(v))) return false;
        if (!Array.isArray(d.selectedWeights)) return false;
        if (!d.selectedWeights.every((v) => isArmorWeightClass(v))) return false;
        if (!isArmorsHeaderKey(d.sortKey)) return false;
        if (typeof d.ascending !== 'boolean') return false;
        if (!Array.isArray(d.showColGroups)) return false;
        if (!d.showColGroups.every((v) => isArmorsSuperheaderKey(v))) return false;
        if (!Array.isArray(d.pinnedArmors)) return false;
        if (!d.pinnedArmors.every((v) => typeof v === 'string')) return false;

        return true;
    }
    function validateAppState(d: Record<string, unknown>): d is ExportedAppState {
        if (typeof d.v !== 'number' || d.v !== STORAGE_VER) return false;
        if (typeof d.shared !== 'object' || !d.shared) return false;
        if (typeof d.weapons !== 'object' || !d.weapons) return false;
        if (typeof d.armors !== 'object' || !d.armors) return false;
        const shared = d.shared as Record<string, unknown>;
        const weapons = d.weapons as Record<string, unknown>;
        const armors = d.armors as Record<string, unknown>;
        return validateShared(shared) && validateWeapons(weapons) && validateArmors(armors);
    }

    // try to validate the format of the JSON data
    if (typeof parsed === 'boolean' && !parsed) {
        // user has 'Remember Settings' turned off
        defaultState.shared.saveSettings = false;
        return defaultState;
    }
    if (typeof parsed !== 'object' || !parsed) return defaultState;
    const toValidate = parsed as Record<string, unknown>;
    if (!validateAppState(toValidate)) {
        console.log('Previously saved app state is no longer valid - using defaults');
        return defaultState;
    }

    // previously saved state has been validated
    const state = toValidate as ExportedAppState;

    if (!state.shared.saveSettings) {
        // return the default settings with the saveSettings flag cleared
        defaultState.shared.saveSettings = false;
        return defaultState;
    }

    // parse SharedState
    const ps = state.shared.playerStats;
    const playerStats: PlayerStats = {
        strength: clampStat(ps.strength),
        agility: clampStat(ps.agility),
        endurance: clampStat(ps.endurance),
        vitality: clampStat(ps.vitality),
        radiance: clampStat(ps.radiance),
        inferno: clampStat(ps.inferno),
    };

    const shared: SharedState = {
        playerStats,
        saveSettings: state.shared.saveSettings,
        activeMode: state.shared.activeMode,
    };

    const upgLevel = Math.max(0, Math.min(10, Math.floor(state.weapons.upgLevel)));
    const selectedClasses = new Set(state.weapons.selectedClasses);
    const showColGroups = new Set(state.weapons.showColGroups);
    showColGroups.add('INFO');
    const pinnedWeapons = new Set(state.weapons.pinnedWeapons);

    const weapons: WeaponsState = {
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
    const showColGroupsArmor = new Set(state.armors.showColGroups);
    const pinnedArmors = new Set(state.armors.pinnedArmors);

    const armors: ArmorsState = {
        selectedSlots,
        selectedWeights,
        sortKey: state.armors.sortKey,
        ascending: state.armors.ascending,
        showColGroups: showColGroupsArmor,
        pinnedArmors,
    };

    return { shared, weapons, armors };
}

/**
 * Save the current AppState to localStorage
 */
export function saveAppState(state: AppState): void {
    let data: ExportedAppState | false;
    if (state.shared.saveSettings) {
        const shared: ExportedSharedState = {
            playerStats: state.shared.playerStats,
            saveSettings: state.shared.saveSettings,
            activeMode: state.shared.activeMode,
        };
        const weapons: ExportedWeaponsState = {
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
        const armors: ExportedArmorsState = {
            selectedSlots: [...state.armors.selectedSlots],
            selectedWeights: [...state.armors.selectedWeights],
            sortKey: state.armors.sortKey,
            ascending: state.armors.ascending,
            showColGroups: [...state.armors.showColGroups],
            pinnedArmors: [...state.armors.pinnedArmors],
        };
        data = {
            v: STORAGE_VER,
            shared,
            weapons,
            armors,
        };
    } else {
        // user doesn't want to store their settings
        data = false;
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
        // failed to save settings to localStorage - do nothing
    }
}
