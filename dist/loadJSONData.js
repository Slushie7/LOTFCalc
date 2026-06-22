import { isRuneSocketType, isWeaponClass, isArmorSlot, isArmorWeightClass, } from './model.js';
// helpers
function getCurveOrNull(key, curves) {
    if (key === null)
        return null;
    const curve = curves.get(key);
    if (curve === undefined)
        throw new Error(`Failed to retrieve Curve with key: ${key}`);
    return curve;
}
function getBaseDamage(key, baseDamages) {
    const bd = baseDamages.get(key);
    if (bd === undefined)
        throw new Error(`Failed to retrieve BaseDamage with key: ${key}`);
    return bd;
}
// transforms
function toCurve(r) {
    if (r._interp_mode !== 'RCIM_Linear')
        throw new Error(`Unsupported curve interpolation mode: ${r._interp_mode}`);
    return { key: r.key, interpMode: r._interp_mode, points: r._points };
}
function toLeveledValue(r, curves) {
    const curve = getCurveOrNull(r.curve_key, curves);
    if (!(r.scaling_type === 'Additive' || r.scaling_type === 'Multiplicative'))
        throw new Error(`Unsupported leveled value scaling type: ${r.scaling_type}`);
    return { base: r.base, curve, scalingType: r.scaling_type };
}
function toBaseDamage(r, curves) {
    return {
        dmgPhysical: toLeveledValue(r.dmg_physical, curves),
        dmgHoly: toLeveledValue(r.dmg_holy, curves),
        dmgFire: toLeveledValue(r.dmg_fire, curves),
        dmgWither: toLeveledValue(r.dmg_wither, curves),
        dmgSpell: toLeveledValue(r.dmg_spell, curves),
        key: r.key,
    };
}
function toStatScalarGradeRange(r) {
    return { grade: r.grade, minIncl: r.min_incl, maxExcl: r.max_excl };
}
function toStatScaledDamage(r, curves, baseDamages) {
    return {
        stat: r.stat,
        baseDamage: getBaseDamage(r.bd_key, baseDamages),
        statScaling: toLeveledValue(r.stat_scaling, curves),
        statCurve: getCurveOrNull(r.stat_curve_key, curves),
    };
}
function toPlayerStats(r) {
    return {
        strength: r.strength,
        agility: r.agility,
        endurance: r.endurance,
        vitality: r.vitality,
        radiance: r.radiance,
        inferno: r.inferno,
    };
}
function toWeaponRunes(r, curves) {
    const runeSockets = r.rune_sockets;
    if (!r.rune_sockets.every((rs) => isRuneSocketType(rs)))
        throw new Error(`Invalid rune socket type in ${r}`);
    return {
        runeSockets,
        numByLevel: getCurveOrNull(r.curve_key, curves),
    };
}
function toWeaponDamageAR(r, curves, baseDamages) {
    return {
        baseDamage: getBaseDamage(r.bd_key, baseDamages),
        scaledStr: toStatScaledDamage(r.scaled_str, curves, baseDamages),
        scaledAgi: toStatScaledDamage(r.scaled_agi, curves, baseDamages),
        scaledRad: toStatScaledDamage(r.scaled_rad, curves, baseDamages),
        scaledInf: toStatScaledDamage(r.scaled_inf, curves, baseDamages),
        twoHandBonus: r.two_hand_bonus,
    };
}
function toWeaponDamageExtras(r, curves) {
    return {
        dmgPoise: toLeveledValue(r.dmg_poise, curves),
        dmgStagger: toLeveledValue(r.dmg_stagger, curves),
        dmgStamina: toLeveledValue(r.dmg_stamina, curves),
        pvpMultiplier: r.pvp_multiplier,
        spellSlots: r.spell_slots,
    };
}
function toWeaponDamageStatus(r, curves) {
    return {
        dmgStatusBleed: toLeveledValue(r.dmg_status_bleed, curves),
        dmgStatusBurn: toLeveledValue(r.dmg_status_burn, curves),
        dmgStatusPoison: toLeveledValue(r.dmg_status_poison, curves),
        dmgStatusSmite: toLeveledValue(r.dmg_status_smite, curves),
        dmgStatusIgnite: toLeveledValue(r.dmg_status_ignite, curves),
        dmgStatusFrost: toLeveledValue(r.dmg_status_frost, curves),
    };
}
function toWeaponOffense(r, curves, baseDamages) {
    return {
        damageAR: toWeaponDamageAR(r.damage_ar, curves, baseDamages),
        damageExtras: toWeaponDamageExtras(r.damage_extras, curves),
        damageStatus: toWeaponDamageStatus(r.damage_status, curves),
    };
}
function toWeaponDefense(r, curves) {
    return {
        defPhysical: toLeveledValue(r.def_physical, curves),
        defHoly: toLeveledValue(r.def_holy, curves),
        defFire: toLeveledValue(r.def_fire, curves),
        defWither: toLeveledValue(r.def_wither, curves),
        stability: toLeveledValue(r.stability, curves),
    };
}
function toWeapon(r, curves, baseDamages) {
    const className = r.class_name;
    if (!isWeaponClass(className))
        throw new Error(`Invalid weapon class: ${className}`);
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
function toEffect(r) {
    return { attribute: r.attribute, scalingType: r.scaling_type, value: r.value };
}
function toBuff(r) {
    return { key: r.key, effects: r.effects.map((rEff) => toEffect(rEff)) };
}
function toRune(r, buffs) {
    const weaponBuff = buffs.get(r.weapon_buff_key);
    if (weaponBuff === undefined)
        throw new Error(`Failed to retrieve Buff with key: ${r.weapon_buff_key}`);
    const armorBuff = buffs.get(r.armor_buff_key);
    if (armorBuff === undefined)
        throw new Error(`Failed to retrieve Buff with key: ${r.armor_buff_key}`);
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
function toArmorStats(r) {
    return {
        weight: r.weight,
        defPhysical: r.def_physical,
        defFire: r.def_fire,
        defHoly: r.def_holy,
        defWither: r.def_wither,
        resBleed: r.res_bleed,
        resBurn: r.res_burn,
        resPoison: r.res_poison,
        resSmite: r.res_smite,
        resIgnite: r.res_ignite,
        resFrost: r.res_frost,
        poise: r.poise,
        kickMult: r.kick_mult,
    };
}
function toArmor(r) {
    const slot = r.slot;
    if (!isArmorSlot(slot))
        throw new Error(`Invalid armor slot: ${slot}`);
    const weightClass = r.weight_class;
    if (!isArmorWeightClass(weightClass))
        throw new Error(`Invalid armor weightClass: ${weightClass}`);
    const stats = toArmorStats(r.stats);
    return { key: r.key, name: r.name, icon: r.icon, slot, weightClass, set: r.set, stats };
}
/**
 * data.json data loader
 * @returns
 */
export async function loadAppData() {
    const res = await fetch('data/data.json');
    if (!res.ok)
        throw new Error(`Failed to load data.json: ${res.status}`);
    const data = (await res.json());
    const curves = new Map();
    for (const rawCurve of data.curves) {
        const curve = toCurve(rawCurve);
        curves.set(curve.key, curve);
    }
    const baseDamages = new Map();
    for (const rawBaseDamage of data.base_damages) {
        const baseDamage = toBaseDamage(rawBaseDamage, curves);
        baseDamages.set(baseDamage.key, baseDamage);
    }
    const buffs = new Map();
    for (const rawBuff of data.buffs) {
        const buff = toBuff(rawBuff);
        buffs.set(buff.key, buff);
    }
    const gradeRanges = data.stat_grade_ranges.map(toStatScalarGradeRange);
    const weapons = data.weapons.map((w) => toWeapon(w, curves, baseDamages));
    const runes = data.runes.map((r) => toRune(r, buffs));
    const armor = data.armor.map((arm) => toArmor(arm));
    return { weapons, gradeRanges, curves, runes, armors: armor };
}
//# sourceMappingURL=loadJSONData.js.map