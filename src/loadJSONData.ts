import {
    type Curve,
    type LeveledValue,
    type BaseDamage,
    type StatKey,
    type StatScalarGradeRange,
    type StatScaledDamage,
    type PlayerStats,
    type Weapon,
    type WeaponDamageAR,
    type WeaponDamageExtras,
    type WeaponDamageStatus,
    type WeaponDefense,
    type WeaponOffense,
    type WeaponRuneSockets,
    type WeaponClass,
    type RuneSocketType,
    type ScalingType,
    type BuffTarget,
    type Effect,
    type Buff,
    type Rune,
    isRuneSocketType,
    isWeaponClass,
    isArmorSlot,
    isArmorWeightClass,
    type ArmorSlot,
    type Armor,
    type ArmorWeightClass,
    type ArmorStats,
    type RuneType,
    type StartingClass,
} from './model.js';

// interfaces matching JSON structures
interface RawCurve {
    key: string;
    _interp_mode: string;
    _points: readonly [number, number][];
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
    endurance: number;
    vitality: number;
    radiance: number;
    inferno: number;
}
interface RawStartingClass {
    name: string;
    stats: RawPlayerStats;
}
interface RawWeaponRuneSockets {
    rune_sockets: readonly RuneSocketType[];
    curve_key: string | null;
}
interface RawWeaponDamageAR {
    bd_key: string;
    scaled_str: RawStatScaledDamage;
    scaled_agi: RawStatScaledDamage;
    scaled_rad: RawStatScaledDamage;
    scaled_inf: RawStatScaledDamage;
    two_hand_bonus: number;
}
interface RawWeaponDamageExtras {
    dmg_poise: RawLeveledValue;
    dmg_stagger: RawLeveledValue;
    dmg_stamina: RawLeveledValue;
    pvp_multiplier: number;
    spell_slots: number;
}
interface RawWeaponDamageStatus {
    dmg_status_smite: RawLeveledValue;
    dmg_status_bleed: RawLeveledValue;
    dmg_status_burn: RawLeveledValue;
    dmg_status_ignite: RawLeveledValue;
    dmg_status_frost: RawLeveledValue;
    dmg_status_poison: RawLeveledValue;
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
    icon: string;
    class_name: string;
    weight: number;
    max_upg_level: number;
    wield_reqs: RawPlayerStats;
    rune_sockets: RawWeaponRuneSockets;
    offense: RawWeaponOffense;
    defense: RawWeaponDefense;
}
interface RawEffect {
    attribute: string;
    scaling_type: ScalingType;
    value: number;
    app_type: string;
}
interface RawBuff {
    key: string;
    effects: RawEffect[];
}
interface RawRune {
    key: string;
    name: string;
    icon: string;
    type: RuneType;
    weapon_buff_key: string;
    weapon_buff_target: BuffTarget;
    armor_buff_key: string;
    armor_buff_target: BuffTarget;
}
interface RawArmorStats {
    readonly weight: number;
    readonly def_physical: number;
    readonly def_fire: number;
    readonly def_holy: number;
    readonly def_wither: number;
    readonly res_smite: number;
    readonly res_bleed: number;
    readonly res_burn: number;
    readonly res_ignite: number;
    readonly res_frost: number;
    readonly res_poison: number;
    readonly poise: number;
    readonly kick_mult: number;
}
interface RawArmor {
    key: string;
    name: string;
    icon: string;
    slot: ArmorSlot;
    weight_class: ArmorWeightClass;
    set: string;
    stats: RawArmorStats;
}

// data.json data interface
interface RawDataJSON {
    curves: readonly RawCurve[];
    base_damages: readonly RawBaseDamage[];
    stat_grade_ranges: readonly RawStatScalarGradeRange[];
    weapons: readonly RawWeapon[];
    buffs: readonly RawBuff[];
    runes: readonly RawRune[];
    armor: readonly RawArmor[];
    starting_classes: readonly RawStartingClass[];
}

// helpers
function getCurveOrNull(key: string | null, curves: Map<string, Curve>): Curve | null {
    if (key === null) return null;

    const curve = curves.get(key);
    if (curve === undefined) throw new Error(`Failed to retrieve Curve with key: ${key}`);

    return curve;
}

function getBaseDamage(key: string, baseDamages: Map<string, BaseDamage>): BaseDamage {
    const bd = baseDamages.get(key);
    if (bd === undefined) throw new Error(`Failed to retrieve BaseDamage with key: ${key}`);
    return bd;
}

// transforms
function toCurve(r: RawCurve): Curve {
    if (r._interp_mode !== 'RCIM_Linear') throw new Error(`Unsupported curve interpolation mode: ${r._interp_mode}`);

    return { key: r.key, interpMode: r._interp_mode, points: r._points };
}

function toLeveledValue(r: RawLeveledValue, curves: Map<string, Curve>): LeveledValue {
    const curve = getCurveOrNull(r.curve_key, curves);
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
        statCurve: getCurveOrNull(r.stat_curve_key, curves),
    };
}

function toPlayerStats(r: RawPlayerStats): PlayerStats {
    return {
        strength: r.strength,
        agility: r.agility,
        endurance: r.endurance,
        vitality: r.vitality,
        radiance: r.radiance,
        inferno: r.inferno,
    };
}

function toStartingClass(r: RawStartingClass): StartingClass {
    const stats = toPlayerStats(r.stats);
    const level =
        stats.strength + stats.agility + stats.endurance + stats.vitality + stats.radiance + stats.inferno - 53;

    return {
        name: r.name,
        stats,
        level,
    };
}

function toWeaponRunes(r: RawWeaponRuneSockets, curves: Map<string, Curve>): WeaponRuneSockets {
    const runeSockets = r.rune_sockets as RuneSocketType[];
    if (!r.rune_sockets.every((rs) => isRuneSocketType(rs))) throw new Error(`Invalid rune socket type in ${r}`);

    return {
        runeSockets,
        numByLevel: getCurveOrNull(r.curve_key, curves),
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
        twoHandBonus: r.two_hand_bonus,
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
        dmgStatusSmite: toLeveledValue(r.dmg_status_smite, curves),
        dmgStatusBleed: toLeveledValue(r.dmg_status_bleed, curves),
        dmgStatusBurn: toLeveledValue(r.dmg_status_burn, curves),
        dmgStatusIgnite: toLeveledValue(r.dmg_status_ignite, curves),
        dmgStatusFrost: toLeveledValue(r.dmg_status_frost, curves),
        dmgStatusPoison: toLeveledValue(r.dmg_status_poison, curves),
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
    const className = r.class_name as WeaponClass;
    if (!isWeaponClass(className)) throw new Error(`Invalid weapon class: ${className}`);

    return {
        key: r.key,
        name: r.name,
        icon: r.icon,
        className,
        weight: r.weight,
        maxUpgLevel: r.max_upg_level,
        wieldReqs: toPlayerStats(r.wield_reqs),
        runeSockets: toWeaponRunes(r.rune_sockets, curves),
        offense: toWeaponOffense(r.offense, curves, baseDamages),
        defense: toWeaponDefense(r.defense, curves),
    };
}

function toEffect(r: RawEffect): Effect {
    return { attribute: r.attribute, scalingType: r.scaling_type, value: r.value, appType: r.app_type };
}

function toBuff(r: RawBuff): Buff {
    return { key: r.key, effects: r.effects.map((rEff) => toEffect(rEff)) };
}

function toRune(r: RawRune, buffs: Map<string, Buff>): Rune {
    const weaponBuff = buffs.get(r.weapon_buff_key);
    if (weaponBuff === undefined) throw new Error(`Failed to retrieve Buff with key: ${r.weapon_buff_key}`);
    const armorBuff = buffs.get(r.armor_buff_key);
    if (armorBuff === undefined) throw new Error(`Failed to retrieve Buff with key: ${r.armor_buff_key}`);

    return {
        key: r.key,
        name: r.name,
        icon: r.icon,
        type: r.type,
        weaponBuff,
        weaponBuffTarget: r.weapon_buff_target,
        armorBuff,
        armorBuffTarget: r.armor_buff_target,
    };
}

function toArmorStats(r: RawArmorStats): ArmorStats {
    return {
        weight: r.weight,
        defPhysical: r.def_physical,
        defFire: r.def_fire,
        defHoly: r.def_holy,
        defWither: r.def_wither,
        resSmite: r.res_smite,
        resBleed: r.res_bleed,
        resBurn: r.res_burn,
        resIgnite: r.res_ignite,
        resFrost: r.res_frost,
        resPoison: r.res_poison,
        poise: r.poise,
        kickMult: r.kick_mult,
    };
}

function toArmor(r: RawArmor): Armor {
    const slot = r.slot as ArmorSlot;
    if (!isArmorSlot(slot)) throw new Error(`Invalid armor slot: ${slot}`);
    const weightClass = r.weight_class as ArmorWeightClass;
    if (!isArmorWeightClass(weightClass)) throw new Error(`Invalid armor weightClass: ${weightClass}`);
    const stats = toArmorStats(r.stats);

    return { key: r.key, name: r.name, icon: r.icon, slot, weightClass, set: r.set, stats };
}

/**
 * data.json data loader
 * @returns
 */
export async function loadAppData(): Promise<{
    weapons: Weapon[];
    gradeRanges: StatScalarGradeRange[];
    curves: Map<string, Curve>;
    runes: Rune[];
    armors: Armor[];
    startingClasses: StartingClass[];
}> {
    const res = await fetch('data/data.json');
    if (!res.ok) throw new Error(`Failed to load data.json: ${res.status}`);
    const data = (await res.json()) as RawDataJSON;

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

    const buffs = new Map<string, Buff>();
    for (const rawBuff of data.buffs) {
        const buff = toBuff(rawBuff);
        buffs.set(buff.key, buff);
    }

    const gradeRanges = data.stat_grade_ranges.map(toStatScalarGradeRange);
    const weapons = data.weapons.map((w) => toWeapon(w, curves, baseDamages));
    const runes = data.runes.map((r) => toRune(r, buffs));
    const armors = data.armor.map((arm) => toArmor(arm));
    const startingClasses = data.starting_classes.map((sc) => toStartingClass(sc));

    return { weapons, gradeRanges, curves, runes, armors, startingClasses };
}
