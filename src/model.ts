export type StatKey = 'S' | 'A' | 'R' | 'I';
export type HeaderKey =
    // basic
    | 'WEAP'
    | 'CLS'
    // AR
    | 'ARP'
    | 'ARH'
    | 'ARF'
    | 'ARW'
    | 'TOT'
    // spell
    | 'SP'
    | 'SLOTS'
    // status
    | 'BLE'
    | 'BRN'
    | 'PSN'
    | 'SMI'
    | 'IGN'
    | 'FRO'
    // extras
    | 'WGT'
    | 'PD'
    | 'STAG'
    | 'STAD'
    | 'PVP'
    // runes
    | 'RUN'
    // defense
    | 'DP'
    | 'DH'
    | 'DF'
    | 'DW'
    | 'DS'
    // scaling
    | 'SS'
    | 'SA'
    | 'SR'
    | 'SI'
    // wield reqs
    | 'RS'
    | 'RA'
    | 'RR'
    | 'RI';

export type SuperheaderKey = 'INFO' | 'AR' | 'MAGIC' | 'STATUS' | 'MISC' | 'RUNES' | 'DEF' | 'SCALING' | 'REQS';

export type WeaponClass =
    | 'Axes'
    | 'Bows'
    | 'Catalysts'
    | 'Crossbows'
    | 'Daggers'
    | 'Fists'
    | 'Flails'
    | 'Grand Axes'
    | 'Grand Hammers'
    | 'Grand Swords'
    | 'Hammers'
    | 'Long Swords'
    | 'Polearms'
    | 'Shields'
    | 'Short Swords'
    | 'Spears';

// stored types

export type InterpMode = 'RCIM_Linear';
export type ScalingType = 'Additive' | 'Multiplicative';

export interface Curve {
    readonly key: string;
    readonly interpMode: InterpMode;
    readonly points: readonly [number, number][];
}

export interface LeveledValue {
    readonly base: number;
    readonly curve: Curve | null;
    readonly scalingType: ScalingType;
}

export interface BaseDamage {
    readonly dmgPhysical: LeveledValue;
    readonly dmgHoly: LeveledValue;
    readonly dmgFire: LeveledValue;
    readonly dmgWither: LeveledValue;
    readonly dmgSpell: LeveledValue;
    readonly key: string;
}

export interface StatScalarGradeRange {
    readonly grade: string;
    readonly minIncl: number;
    readonly maxExcl: number;
}

export interface StatScaledDamage {
    readonly stat: StatKey;
    readonly baseDamage: BaseDamage;
    readonly statScaling: LeveledValue;
    readonly statCurve: Curve | null;
}

export interface PlayerStats {
    readonly strength: number;
    readonly agility: number;
    readonly radiance: number;
    readonly inferno: number;
}

export interface WeaponRunes {
    readonly runeSockets: string[];
    readonly numByLevel: Curve | null;
}

export interface WeaponDamageAR {
    readonly baseDamage: BaseDamage;
    readonly scaledStr: StatScaledDamage;
    readonly scaledAgi: StatScaledDamage;
    readonly scaledRad: StatScaledDamage;
    readonly scaledInf: StatScaledDamage;
}

export interface WeaponDamageExtras {
    readonly dmgPoise: LeveledValue;
    readonly dmgStagger: LeveledValue;
    readonly dmgStamina: LeveledValue;
    readonly pvpMultiplier: number;
    readonly spellSlots: number;
}

export interface WeaponDamageStatus {
    readonly dmgStatusBleed: LeveledValue;
    readonly dmgStatusBurn: LeveledValue;
    readonly dmgStatusPoison: LeveledValue;
    readonly dmgStatusSmite: LeveledValue;
    readonly dmgStatusFrost: LeveledValue;
    readonly dmgStatusIgnite: LeveledValue;
}

export interface WeaponOffense {
    readonly damageAR: WeaponDamageAR;
    readonly damageExtras: WeaponDamageExtras;
    readonly damageStatus: WeaponDamageStatus;
}

export interface WeaponDefense {
    readonly defPhysical: LeveledValue;
    readonly defHoly: LeveledValue;
    readonly defFire: LeveledValue;
    readonly defWither: LeveledValue;
    readonly stability: LeveledValue;
}

export interface Weapon {
    readonly key: string;
    readonly name: string;
    readonly className: WeaponClass;
    readonly weight: number;
    readonly maxUpgLevel: number;
    readonly wieldReqs: PlayerStats;
    readonly runes: WeaponRunes;
    readonly offense: WeaponOffense;
    readonly defense: WeaponDefense;
}

// calculated Weapon values

export interface AttackRating {
    readonly physical: number;
    readonly holy: number;
    readonly fire: number;
    readonly wither: number;
    readonly spellPower: number;
}

export interface DamageSplit {
    readonly base: number;
    readonly fromStats: number;
    readonly total: number;
}

export interface CalculatedWeaponAR {
    readonly physical: DamageSplit;
    readonly holy: DamageSplit;
    readonly fire: DamageSplit;
    readonly wither: DamageSplit;
    readonly spellPower: DamageSplit;
    readonly totalDamage: number;
}

export interface CalculatedWeaponExtras {
    readonly poiseDamage: number;
    readonly staggerDamage: number;
    readonly staminaDamage: number;
    readonly pvpMultiplier: number;
    readonly spellSlots: number;
}

export interface CalculatedWeaponStatus {
    readonly bleed: number;
    readonly burn: number;
    readonly poison: number;
    readonly smite: number;
    readonly ignite: number;
    readonly frost: number;
}

export interface CalculatedWeaponScaling {
    readonly strVal: number;
    readonly strGrade: string;
    readonly agiVal: number;
    readonly agiGrade: string;
    readonly radVal: number;
    readonly radGrade: string;
    readonly infVal: number;
    readonly infGrade: string;
}

export interface CalculatedCanWield {
    readonly strength: boolean;
    readonly agility: boolean;
    readonly radiance: boolean;
    readonly inferno: boolean;
    readonly wieldable: boolean;
}

export interface CalculatedWeaponOffense {
    readonly ar: CalculatedWeaponAR;
    readonly extras: CalculatedWeaponExtras;
    readonly status: CalculatedWeaponStatus;
    readonly scaling: CalculatedWeaponScaling;
}

export interface CalculatedWeaponDefense {
    readonly physical: number;
    readonly holy: number;
    readonly fire: number;
    readonly wither: number;
    readonly stability: number;
}

/**
 * Calculated weapon stats for displaying in the app
 */
export interface CalculatedWeaponStats {
    readonly weapon: Weapon;
    readonly offense: CalculatedWeaponOffense;
    readonly defense: CalculatedWeaponDefense;
    readonly runes: string[];
    readonly upgLevel: number;
    readonly playerStats: PlayerStats;
    readonly wieldability: CalculatedCanWield;
}
