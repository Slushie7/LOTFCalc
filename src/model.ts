const STAT_KEYS = ['S', 'A', 'R', 'I'] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export function isStatKey(v: unknown): v is StatKey {
    return STAT_KEYS.includes(v as StatKey);
}

const RUNE_TYPES = [...STAT_KEYS, '*'] as const;
export type RuneType = (typeof RUNE_TYPES)[number];
export function isRuneType(v: unknown): v is RuneType {
    return RUNE_TYPES.includes(v as RuneType);
}

const WEAPON_CLASSES = [
    'Axes',
    'Bows',
    'Catalysts',
    'Crossbows',
    'Daggers',
    'Fists',
    'Flails',
    'Grand Axes',
    'Grand Hammers',
    'Grand Swords',
    'Hammers',
    'Long Swords',
    'Polearms',
    'Shields',
    'Short Swords',
    'Spears',
] as const;
export type WeaponClass = (typeof WEAPON_CLASSES)[number];
export function isWeaponClass(v: unknown): v is WeaponClass {
    return WEAPON_CLASSES.includes(v as WeaponClass);
}

// stored types
const INTERP_MODES = ['RCIM_Linear'] as const;
export type InterpMode = (typeof INTERP_MODES)[number];
export function isInterpMode(v: unknown): v is InterpMode {
    return INTERP_MODES.includes(v as InterpMode);
}

const SCALING_TYPES = ['Additive', 'Multiplicative'] as const;
export type ScalingType = (typeof SCALING_TYPES)[number];
export function isScalingType(v: unknown): v is ScalingType {
    return SCALING_TYPES.includes(v as ScalingType);
}

const BUFF_TARGETS = ['Character', 'Equipment'] as const;
export type BuffTarget = (typeof BUFF_TARGETS)[number];
export function isBuffTarget(v: unknown): v is BuffTarget {
    return BUFF_TARGETS.includes(v as BuffTarget);
}

export const ARMOR_SLOTS = ['Head', 'Torso', 'Arms', 'Legs'] as const;
export type ArmorSlot = (typeof ARMOR_SLOTS)[number];
export function isArmorSlot(v: unknown): v is ArmorSlot {
    return ARMOR_SLOTS.includes(v as ArmorSlot);
}

export const ARMOR_WEIGHT_CLASSES = ['Light', 'Medium', 'Heavy'] as const;
export type ArmorWeightClass = (typeof ARMOR_WEIGHT_CLASSES)[number];
export function isArmorWeightClass(v: unknown): v is ArmorWeightClass {
    return ARMOR_WEIGHT_CLASSES.includes(v as ArmorWeightClass);
}

interface TableData {
    readonly pinned: boolean
}

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

export type PlayerStats = {
    readonly strength: number;
    readonly agility: number;
    readonly endurance: number;
    readonly vitality: number;
    readonly radiance: number;
    readonly inferno: number;
};

export interface WeaponRuneSockets {
    readonly runeSockets: RuneType[];
    readonly numByLevel: Curve | null;
}

export interface WeaponDamageAR {
    readonly baseDamage: BaseDamage;
    readonly scaledStr: StatScaledDamage;
    readonly scaledAgi: StatScaledDamage;
    readonly scaledRad: StatScaledDamage;
    readonly scaledInf: StatScaledDamage;
    readonly twoHandBonus: number;
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
    readonly dmgStatusIgnite: LeveledValue;
    readonly dmgStatusFrost: LeveledValue;
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
    readonly icon: string;
    readonly className: WeaponClass;
    readonly weight: number;
    readonly maxUpgLevel: number;
    readonly wieldReqs: PlayerStats;
    readonly runeSockets: WeaponRuneSockets;
    readonly offense: WeaponOffense;
    readonly defense: WeaponDefense;
}

export interface Effect {
    readonly attribute: string;
    readonly scalingType: ScalingType;
    readonly value: number;
}

export interface Buff {
    readonly key: string;
    readonly effects: readonly Effect[];
}

export interface Rune {
    readonly key: string;
    readonly name: string;
    readonly icon: string;
    readonly type: RuneType;
    readonly weaponBuff: Buff;
    readonly weaponBuffTarget: BuffTarget;
    readonly armorBuff: Buff;
    readonly armorBuffTarget: BuffTarget;
}

export interface ArmorStats {
    readonly weight: number;
    readonly defPhysical: number;
    readonly defFire: number;
    readonly defHoly: number;
    readonly defWither: number;
    readonly resBleed: number;
    readonly resBurn: number;
    readonly resPoison: number;
    readonly resSmite: number;
    readonly resIgnite: number;
    readonly resFrost: number;
    readonly poise: number;
    readonly kickMult: number;
}

export interface Armor {
    readonly key: string;
    readonly name: string;
    readonly icon: string;
    readonly slot: ArmorSlot;
    readonly weightClass: ArmorWeightClass;
    readonly set: string;
    readonly stats: ArmorStats;
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
export interface CalculatedWeaponStats extends TableData {
    readonly weapon: Weapon;
    readonly offense: CalculatedWeaponOffense;
    readonly defense: CalculatedWeaponDefense;
    readonly runeSockets: string[];
    readonly upgLevel: number;
    readonly playerStats: PlayerStats;
    readonly wieldability: CalculatedCanWield;
}

export interface CalculatedPlayerStats {
    readonly level: number;
    readonly hp: number;
    readonly mana: number;
    readonly stamina: number;
    readonly weight: number;
    readonly defPhysical: number;
    readonly defFire: number;
    readonly defHoly: number;
    readonly defWither: number;
    readonly resBleed: number;
    readonly resBurn: number;
    readonly resPoison: number;
    readonly resSmite: number;
    readonly resIgnite: number;
    readonly resFrost: number;
}

export interface CalculatedArmorStats extends TableData {
    readonly armor: Armor;
    readonly defTotal: number;
    readonly resTotal: number;
}

export interface CalculatedPlayerDefenses {
    readonly weight: number;
    readonly poise: number;
    readonly physical: number;
    readonly fire: number;
    readonly holy: number;
    readonly wither: number;
    readonly bleed: number;
    readonly burn: number;
    readonly poison: number;
    readonly smite: number;
    readonly ignite: number;
    readonly frost: number;
    readonly kickMult: number;
}
