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
    return {
        runeSockets: r.rune_sockets,
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
        dmgStatusPoison: toLeveledValue(r.dmg_status_poison, curves),
        dmgStatusFrost: toLeveledValue(r.dmg_status_frost, curves),
        dmgStatusSmite: toLeveledValue(r.dmg_status_smite, curves),
        dmgStatusBurn: toLeveledValue(r.dmg_status_burn, curves),
        dmgStatusIgnite: toLeveledValue(r.dmg_status_ignite, curves),
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
    return {
        key: r.key,
        name: r.name,
        className: r.class_name,
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
export async function loadJSONData() {
    const res = await fetch('data/weapons.json');
    if (!res.ok)
        throw new Error(`Failed to load weapons.json: ${res.status}`);
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
    const gradeRanges = data.stat_grade_ranges.map(toStatScalarGradeRange);
    const weapons = data.weapons.map((w) => toWeapon(w, curves, baseDamages));
    return { weapons, gradeRanges, curves };
}
//# sourceMappingURL=load.js.map