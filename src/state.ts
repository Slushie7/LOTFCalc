import type { ArmorSlot, ArmorWeightClass, PaperDoll, PlayerStats, RuneType, WeaponClass } from './model.js';
import { isArmorSlot, isArmorWeightClass, isRuneType, isWeaponClass } from './model.js';
import { clampStat } from './calc/sharedCalc.js';
import type { WeaponsHeaderKey, WeaponsSuperheaderKey } from './render/weaponsRender.js';
import { isWeaponsHeaderKey, isWeaponsSuperheaderKey } from './render/weaponsRender.js';
import {
    isArmorsHeaderKey,
    isArmorsSuperheaderKey,
    type ArmorsHeaderKey,
    type ArmorsSuperheaderKey,
} from './render/armorsRender.js';
import {
    isRunesHeaderKey,
    isRunesSuperheaderKey,
    type RunesHeaderKey,
    type RunesSuperheaderKey,
} from './render/runesRender.js';

export type BooleanKeys<T> = {
    [K in keyof T]-?: T[K] extends boolean ? K : never;
}[keyof T] &
    string;

// =========================================
// MODES
// =========================================

const MODES = ['weapons', 'armors', 'runes'] as const;
export type Mode = (typeof MODES)[number];
export function isMode(v: unknown): v is Mode {
    return MODES.includes(v as Mode);
}

// =========================================
// APP STATE OBJECTS
// =========================================

export interface SharedState {
    playerStats: PlayerStats;
    saveSettings: boolean;
    activeMode: Mode;
}

export interface TableState<HK extends string, SHK extends string> {
    sortKey: HK;
    ascending: boolean;
    showColGroups: Set<SHK>;
    pinnedItems: Set<string>;
}

export interface WeaponsState extends TableState<WeaponsHeaderKey, WeaponsSuperheaderKey> {
    upgLevel: number;
    selectedClasses: Set<WeaponClass>;
    showTwoHanding: boolean;
    showUnwieldable: boolean;
    showSplit: boolean;
    showRawScaling: boolean;
}

export interface ArmorsState extends TableState<ArmorsHeaderKey, ArmorsSuperheaderKey> {
    selectedSlots: Set<ArmorSlot>;
    selectedWeights: Set<ArmorWeightClass>;
    paperDoll: PaperDoll;
}

export interface RunesState extends TableState<RunesHeaderKey, RunesSuperheaderKey> {
    selectedTypes: Set<RuneType>;
}

export interface AppState {
    shared: SharedState;
    weapons: WeaponsState;
    armors: ArmorsState;
    runes: RunesState;
}

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
        pinnedItems: new Set(),
        showRawScaling: false,
    };

    const armors: ArmorsState = {
        selectedSlots: new Set(['Head', 'Torso', 'Arms', 'Legs']),
        selectedWeights: new Set(['Light', 'Medium', 'Heavy']),
        sortKey: 'ARMR',
        ascending: true,
        showColGroups: new Set(['INFO', 'DEF', 'STATUS']),
        pinnedItems: new Set(),
        paperDoll: { Head: null, Torso: null, Arms: null, Legs: null },
    };

    const runes: RunesState = {
        selectedTypes: new Set(['Strength', 'Agility', 'Radiance', 'Inferno']),
        sortKey: 'RUNE',
        ascending: true,
        showColGroups: new Set(['INFO', 'WEAP', 'ARMR']),
        pinnedItems: new Set(),
    };

    return { shared, weapons, armors, runes };
}

// =========================================
// STATE LOAD/SAVE
// =========================================

// for localStorage
const STORAGE_KEY = 'lotfcalc.settings';
const STORAGE_VER = 4;

interface ExportedSharedState {
    readonly playerStats: PlayerStats;
    readonly saveSettings: boolean;
    readonly activeMode: Mode;
}

interface ExportedTableState<HK extends string, SHK extends string> {
    readonly sortKey: HK;
    readonly ascending: boolean;
    readonly showColGroups: readonly SHK[];
    readonly pinnedItems: readonly string[];
}

interface ExportedWeaponsState extends ExportedTableState<WeaponsHeaderKey, WeaponsSuperheaderKey> {
    readonly upgLevel: number;
    readonly selectedClasses: readonly WeaponClass[];
    readonly showTwoHanding: boolean;
    readonly showUnwieldable: boolean;
    readonly showSplit: boolean;
    readonly showRawScaling: boolean;
}

interface ExportedArmorsState extends ExportedTableState<ArmorsHeaderKey, ArmorsSuperheaderKey> {
    readonly selectedSlots: ArmorSlot[];
    readonly selectedWeights: readonly ArmorWeightClass[];
    readonly paperDoll: PaperDoll;
}

interface ExportedRunesState extends ExportedTableState<RunesHeaderKey, RunesSuperheaderKey> {
    readonly selectedTypes: readonly RuneType[];
}

interface ExportedAppState {
    readonly v: number;
    readonly shared: ExportedSharedState;
    readonly weapons: ExportedWeaponsState;
    readonly armors: ExportedArmorsState;
    readonly runes: ExportedRunesState;
}

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

    function validateShared(d: object): d is ExportedSharedState {
        if (!d) return false;
        const p = d as ExportedSharedState;
        if (typeof p.playerStats !== 'object' || !p.playerStats) return false;
        const ps = p.playerStats as Record<string, number>;
        if (!Object.keys(defaultState.shared.playerStats).every((k) => typeof ps[k] === 'number')) return false;
        if (typeof p.saveSettings !== 'boolean') return false;
        if (!isMode(p.activeMode)) return false;
        return true;
    }
    function validateTable<HK extends string, SHK extends string>(
        d: object,
        headerKeyVerif: (s: unknown) => boolean,
        superHeaderKeyVerif: (s: unknown) => boolean
    ): d is ExportedTableState<HK, SHK> {
        if (!d) return false;
        const p = d as ExportedTableState<HK, SHK>;
        if (!headerKeyVerif(p.sortKey)) return false;
        if (typeof p.ascending !== 'boolean') return false;
        if (!Array.isArray(p.showColGroups)) return false;
        if (!p.showColGroups.every((v) => superHeaderKeyVerif(v))) return false;
        if (!Array.isArray(p.pinnedItems)) return false;
        if (!p.pinnedItems.every((v) => typeof v === 'string')) return false;
        return true;
    }
    function validateWeapons(d: object): d is ExportedWeaponsState {
        if (!validateTable<WeaponsHeaderKey, WeaponsSuperheaderKey>(d, isWeaponsHeaderKey, isWeaponsSuperheaderKey))
            return false;
        const p = d as ExportedWeaponsState;
        if (typeof p.upgLevel !== 'number') return false;
        if (!Array.isArray(p.selectedClasses)) return false;
        if (!p.selectedClasses.every((v) => isWeaponClass(v))) return false;
        if (typeof p.showTwoHanding !== 'boolean') return false;
        if (typeof p.showUnwieldable !== 'boolean') return false;
        if (typeof p.showSplit !== 'boolean') return false;
        if (typeof p.showRawScaling !== 'boolean') return false;
        return true;
    }
    function validateArmors(d: object): d is ExportedArmorsState {
        if (!validateTable<ArmorsHeaderKey, ArmorsSuperheaderKey>(d, isArmorsHeaderKey, isArmorsSuperheaderKey))
            return false;
        const p = d as ExportedArmorsState;
        if (!Array.isArray(p.selectedSlots)) return false;
        if (!p.selectedSlots.every((v) => isArmorSlot(v))) return false;
        if (!Array.isArray(p.selectedWeights)) return false;
        if (!p.selectedWeights.every((v) => isArmorWeightClass(v))) return false;

        if (typeof p.paperDoll !== 'object' || !p.paperDoll) return false;
        const pd = p.paperDoll as Record<ArmorSlot, string | null>;
        if (
            !Object.keys(defaultState.armors.paperDoll).every(
                (k) => isArmorSlot(k) && (pd[k] === null || typeof pd[k] === 'string')
            )
        )
            return false;
        return true;
    }
    function validateRunes(d: object): d is ExportedRunesState {
        if (!validateTable<RunesHeaderKey, RunesSuperheaderKey>(d, isRunesHeaderKey, isRunesSuperheaderKey))
            return false;
        const p = d as ExportedRunesState;
        if (!Array.isArray(p.selectedTypes)) return false;
        if (!p.selectedTypes.every((v) => isRuneType(v))) return false;
        return true;
    }
    function validateAppState(d: unknown): d is ExportedAppState {
        if (typeof d !== 'object' || !d) return false;
        const p = d as ExportedAppState;
        if (typeof p.v !== 'number' || p.v !== STORAGE_VER) return false;
        if (typeof p.shared !== 'object' || !p.shared) return false;
        if (typeof p.weapons !== 'object' || !p.weapons) return false;
        if (typeof p.armors !== 'object' || !p.armors) return false;
        if (typeof p.runes !== 'object' || !p.runes) return false;
        return (
            validateShared(p.shared) && validateWeapons(p.weapons) && validateArmors(p.armors) && validateRunes(p.runes)
        );
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
    const pinnedWeapons = new Set(state.weapons.pinnedItems);

    const weapons: WeaponsState = {
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

    const armors: ArmorsState = {
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

    const runes: RunesState = {
        selectedTypes,
        sortKey: state.runes.sortKey,
        ascending: state.runes.ascending,
        showColGroups: showColGroupsRunes,
        pinnedItems: pinnedRunes,
    };

    return { shared, weapons, armors, runes };
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
            pinnedItems: [...state.weapons.pinnedItems],
            showRawScaling: state.weapons.showRawScaling,
        };
        const armors: ExportedArmorsState = {
            selectedSlots: [...state.armors.selectedSlots],
            selectedWeights: [...state.armors.selectedWeights],
            sortKey: state.armors.sortKey,
            ascending: state.armors.ascending,
            showColGroups: [...state.armors.showColGroups],
            pinnedItems: [...state.armors.pinnedItems],
            paperDoll: state.armors.paperDoll,
        };
        const runes: ExportedRunesState = {
            selectedTypes: [...state.runes.selectedTypes],
            sortKey: state.runes.sortKey,
            ascending: state.runes.ascending,
            showColGroups: [...state.runes.showColGroups],
            pinnedItems: [...state.runes.pinnedItems],
        };
        data = {
            v: STORAGE_VER,
            shared,
            weapons,
            armors,
            runes,
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
