import type {
    Curve,
    LeveledValue,
    BaseDamage,
    StatKey,
    StatScalarGradeRange,
    StatScaledDamage,
    PlayerStats,
    Weapon,
    WeaponDamageAR,
    WeaponDamageExtras,
    WeaponDamageStatus,
    WeaponDefense,
    WeaponOffense,
    WeaponRunes,
    WeaponClass,
} from './model.js';

// interfaces matching JSON structures
interface RawCurve {
    key: string;
    _interp_mode: string;
    _points: [number, number][];
}
interface RawLeveledValue {
    base: number;
    curve_key: string | null;
    scaling_type: string;
}
interface RawBaseDamage {
    dmg_physical: RawLeveledValue;
    dmg_holy: RawLeveledValue;
    dmg_fire: RawLeveledValue;
    dmg_wither: RawLeveledValue;
    dmg_spell: RawLeveledValue;
    key: string;
}
interface RawStatScalarGradeRange {
    grade: string;
    min_incl: number;
    max_excl: number;
}
interface RawStatScaledDamage {
    stat: StatKey;
    bd_key: string;
    stat_scaling: RawLeveledValue;
    stat_curve_key: string | null;
}
interface RawPlayerStats {
    strength: number;
    agility: number;
    radiance: number;
    inferno: number;
}
interface RawWeaponRunes {
    rune_sockets: string[];
    curve_key: string | null;
}
interface RawWeaponDamageAR {
    bd_key: string;
    scaled_str: RawStatScaledDamage;
    scaled_agi: RawStatScaledDamage;
    scaled_rad: RawStatScaledDamage;
    scaled_inf: RawStatScaledDamage;
}
interface RawWeaponDamageExtras {
    dmg_poise: RawLeveledValue;
    dmg_stagger: RawLeveledValue;
    dmg_stamina: RawLeveledValue;
    pvp_multiplier: number;
    spell_slots: number;
}
interface RawWeaponDamageStatus {
    dmg_status_bleed: RawLeveledValue;
    dmg_status_poison: RawLeveledValue;
    dmg_status_frost: RawLeveledValue;
    dmg_status_smite: RawLeveledValue;
    dmg_status_burn: RawLeveledValue;
    dmg_status_ignite: RawLeveledValue;
}
interface RawWeaponOffense {
    damage_ar: RawWeaponDamageAR;
    damage_extras: RawWeaponDamageExtras;
    damage_status: RawWeaponDamageStatus;
}
interface RawWeaponDefense {
    def_physical: RawLeveledValue;
    def_holy: RawLeveledValue;
    def_fire: RawLeveledValue;
    def_wither: RawLeveledValue;
    stability: RawLeveledValue;
}
interface RawWeapon {
    key: string;
    name: string;
    class_name: string;
    weight: number;
    max_upg_level: number;
    wield_reqs: RawPlayerStats;
    runes: RawWeaponRunes;
    offense: RawWeaponOffense;
    defense: RawWeaponDefense;
}

// weapons.json data interface
interface RawWeaponsJSONData {
    curves: RawCurve[];
    base_damages: RawBaseDamage[];
    stat_grade_ranges: RawStatScalarGradeRange[];
    weapons: RawWeapon[];
}

// helpers
function getCurve(key: string | null, curves: Map<string, Curve>): Curve | null {
    if (key === null) return null;

    const curve = curves.get(key);
    if (curve === undefined) throw new Error(`Unknown curve key: ${key}`);

    return curve;
}

function getBaseDamage(key: string, baseDamages: Map<string, BaseDamage>): BaseDamage {
    const bd = baseDamages.get(key);
    if (bd === undefined) throw new Error(`Unknown baseDamage key: ${key}`);
    return bd;
}

// transforms
function toCurve(r: RawCurve): Curve {
    if (r._interp_mode !== 'RCIM_Linear') throw new Error(`Unsupported curve interpolation mode: ${r._interp_mode}`);

    return { key: r.key, interpMode: r._interp_mode, points: r._points };
}

function toLeveledValue(r: RawLeveledValue, curves: Map<string, Curve>): LeveledValue {
    const curve = getCurve(r.curve_key, curves);
    if (!(r.scaling_type === 'Additive' || r.scaling_type === 'Multiplicative'))
        throw new Error(`Unsupported leveled value scaling type: ${r.scaling_type}`);
    return { base: r.base, curve, scalingType: r.scaling_type };
}

function toBaseDamage(r: RawBaseDamage, curves: Map<string, Curve>): BaseDamage {
    return {
        dmgPhysical: toLeveledValue(r.dmg_physical, curves),
        dmgHoly: toLeveledValue(r.dmg_holy, curves),
        dmgFire: toLeveledValue(r.dmg_fire, curves),
        dmgWither: toLeveledValue(r.dmg_wither, curves),
        dmgSpell: toLeveledValue(r.dmg_spell, curves),
        key: r.key,
    };
}

function toStatScalarGradeRange(r: RawStatScalarGradeRange): StatScalarGradeRange {
    return { grade: r.grade, minIncl: r.min_incl, maxExcl: r.max_excl };
}

function toStatScaledDamage(
    r: RawStatScaledDamage,
    curves: Map<string, Curve>,
    baseDamages: Map<string, BaseDamage>
): StatScaledDamage {
    return {
        stat: r.stat,
        baseDamage: getBaseDamage(r.bd_key, baseDamages),
        statScaling: toLeveledValue(r.stat_scaling, curves),
        statCurve: getCurve(r.stat_curve_key, curves),
    };
}

function toPlayerStats(r: RawPlayerStats): PlayerStats {
    return {
        strength: r.strength,
        agility: r.agility,
        radiance: r.radiance,
        inferno: r.inferno,
    };
}

function toWeaponRunes(r: RawWeaponRunes, curves: Map<string, Curve>): WeaponRunes {
    return {
        runeSockets: r.rune_sockets,
        numByLevel: getCurve(r.curve_key, curves),
    };
}

function toWeaponDamageAR(
    r: RawWeaponDamageAR,
    curves: Map<string, Curve>,
    baseDamages: Map<string, BaseDamage>
): WeaponDamageAR {
    return {
        baseDamage: getBaseDamage(r.bd_key, baseDamages),
        scaledStr: toStatScaledDamage(r.scaled_str, curves, baseDamages),
        scaledAgi: toStatScaledDamage(r.scaled_agi, curves, baseDamages),
        scaledRad: toStatScaledDamage(r.scaled_rad, curves, baseDamages),
        scaledInf: toStatScaledDamage(r.scaled_inf, curves, baseDamages),
    };
}

function toWeaponDamageExtras(r: RawWeaponDamageExtras, curves: Map<string, Curve>): WeaponDamageExtras {
    return {
        dmgPoise: toLeveledValue(r.dmg_poise, curves),
        dmgStagger: toLeveledValue(r.dmg_stagger, curves),
        dmgStamina: toLeveledValue(r.dmg_stamina, curves),
        pvpMultiplier: r.pvp_multiplier,
        spellSlots: r.spell_slots,
    };
}

function toWeaponDamageStatus(r: RawWeaponDamageStatus, curves: Map<string, Curve>): WeaponDamageStatus {
    return {
        dmgStatusBleed: toLeveledValue(r.dmg_status_bleed, curves),
        dmgStatusPoison: toLeveledValue(r.dmg_status_poison, curves),
        dmgStatusFrost: toLeveledValue(r.dmg_status_frost, curves),
        dmgStatusSmite: toLeveledValue(r.dmg_status_smite, curves),
        dmgStatusBurn: toLeveledValue(r.dmg_status_burn, curves),
        dmgStatusIgnite: toLeveledValue(r.dmg_status_ignite, curves),
    };
}

function toWeaponOffense(
    r: RawWeaponOffense,
    curves: Map<string, Curve>,
    baseDamages: Map<string, BaseDamage>
): WeaponOffense {
    return {
        damageAR: toWeaponDamageAR(r.damage_ar, curves, baseDamages),
        damageExtras: toWeaponDamageExtras(r.damage_extras, curves),
        damageStatus: toWeaponDamageStatus(r.damage_status, curves),
    };
}

function toWeaponDefense(r: RawWeaponDefense, curves: Map<string, Curve>): WeaponDefense {
    return {
        defPhysical: toLeveledValue(r.def_physical, curves),
        defHoly: toLeveledValue(r.def_holy, curves),
        defFire: toLeveledValue(r.def_fire, curves),
        defWither: toLeveledValue(r.def_wither, curves),
        stability: toLeveledValue(r.stability, curves),
    };
}

function toWeapon(r: RawWeapon, curves: Map<string, Curve>, baseDamages: Map<string, BaseDamage>): Weapon {
    return {
        key: r.key,
        name: r.name,
        className: r.class_name as WeaponClass,
        weight: r.weight,
        maxUpgLevel: r.max_upg_level,
        wieldReqs: toPlayerStats(r.wield_reqs),
        runes: toWeaponRunes(r.runes, curves),
        offense: toWeaponOffense(r.offense, curves, baseDamages),
        defense: toWeaponDefense(r.defense, curves),
    };
}

/**
 * weapons.json data loader
 * @returns
 */
export async function loadWeapons(): Promise<{
    weapons: Weapon[];
    gradeRanges: StatScalarGradeRange[];
}> {
    const res = await fetch('data/weapons.json');
    if (!res.ok) throw new Error(`Failed to load weapons.json: ${res.status}`);
    const data = (await res.json()) as RawWeaponsJSONData;

    const curves = new Map<string, Curve>();
    for (const rawCurve of data.curves) {
        const curve = toCurve(rawCurve);
        curves.set(curve.key, curve);
    }

    const baseDamages = new Map<string, BaseDamage>();
    for (const rawBaseDamage of data.base_damages) {
        const baseDamage = toBaseDamage(rawBaseDamage, curves);
        baseDamages.set(baseDamage.key, baseDamage);
    }

    const gradeRanges = data.stat_grade_ranges.map(toStatScalarGradeRange);
    const weapons = data.weapons.map((w) => toWeapon(w, curves, baseDamages));

    return { weapons, gradeRanges };
}
