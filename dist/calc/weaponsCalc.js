import { epsilonFloor, interpolate, getValue } from './sharedCalc.js';
/** Returns an Array of the rune sockets available for the weapon's given upgrade level */
function getRunes(weaponRuneSockets, upg_level) {
    if (weaponRuneSockets.numByLevel === null)
        return [];
    const numRunes = epsilonFloor(interpolate(weaponRuneSockets.numByLevel, upg_level));
    if (numRunes < 0)
        throw new Error(`Failed to get rune sockets: negative Curve value`);
    return weaponRuneSockets.runeSockets.slice(0, numRunes);
}
/** Translates a scaling value into a letter grade (like 'C+', 'A-', etc) */
function getGrade(gradeRanges, scalingVal) {
    if (!gradeRanges.length)
        throw new Error('Failed to get stat scaling grade: gradeRanges is empty');
    if (scalingVal < 0)
        throw new Error('Failed to get stat scaling grade: scalingValue must be >= 0');
    let lo = 0;
    let hi = gradeRanges.length - 1;
    while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const midRange = gradeRanges[mid];
        if (scalingVal >= midRange.minIncl && scalingVal < midRange.maxExcl)
            return midRange.grade;
        if (scalingVal < midRange.minIncl) {
            hi = mid - 1;
        }
        else {
            lo = mid + 1;
        }
    }
    // unmatched non-negative value is below the min range or above the top range → clamp
    if (scalingVal < gradeRanges[0].minIncl)
        return gradeRanges[0].grade;
    return gradeRanges[gradeRanges.length - 1].grade;
}
/** Calculate the base damage of the weapon (P,H,F,W,SP), given its upgrade level */
function calculateBaseDamage(baseDamage, upgLevel) {
    const physical = getValue(baseDamage.dmgPhysical, upgLevel);
    const holy = getValue(baseDamage.dmgHoly, upgLevel);
    const fire = getValue(baseDamage.dmgFire, upgLevel);
    const wither = getValue(baseDamage.dmgWither, upgLevel);
    const spellPower = getValue(baseDamage.dmgSpell, upgLevel);
    return { physical, holy, fire, wither, spellPower };
}
/** Calculate contributions to the main damage types from stats */
function calculateContribution(statScaledDmg, upgLevel, statLevel) {
    const weaponScalingStat = getValue(statScaledDmg.statScaling, upgLevel);
    const gameStatScalar = statScaledDmg.statCurve !== null ? interpolate(statScaledDmg.statCurve, statLevel) : 0.0;
    const factor = (weaponScalingStat / 100) * (gameStatScalar / 100);
    // contributions to physical can ONLY come from weapon's str/agi scaling
    // contributions to holy, fire, wither, and SP can ONLY come from weapon's rad/inf scaling
    let physical = 0;
    let holy = 0;
    let fire = 0;
    let wither = 0;
    let spellPower = 0;
    const bd = statScaledDmg.baseDamage;
    if (statScaledDmg.stat === 'S' || statScaledDmg.stat === 'A') {
        physical = getValue(bd.dmgPhysical, upgLevel) * factor;
    }
    if (statScaledDmg.stat === 'R' || statScaledDmg.stat === 'I') {
        wither = getValue(bd.dmgWither, upgLevel) * factor;
        spellPower = getValue(bd.dmgSpell, upgLevel) * factor;
    }
    if (statScaledDmg.stat === 'R')
        holy = getValue(bd.dmgHoly, upgLevel) * factor;
    if (statScaledDmg.stat === 'I')
        fire = getValue(bd.dmgFire, upgLevel) * factor;
    const ar = { physical, holy, fire, wither, spellPower };
    return { ar, weaponScalingStatCoef: weaponScalingStat };
}
function makeDamageSplit(base, fromStats, wieldable, scalar) {
    base *= scalar;
    fromStats *= scalar;
    if (!wieldable) {
        base /= 5;
        fromStats /= 5;
    }
    // total is calculated PRIOR to flooring base and fromStats - the sum doesn't necessarily equal the total in-game
    const total = epsilonFloor(base + fromStats);
    base = epsilonFloor(base);
    fromStats = epsilonFloor(fromStats);
    return { base, fromStats, total };
}
function canWield(playerStats, wieldReqs) {
    const strength = playerStats.strength >= wieldReqs.strength;
    const agility = playerStats.agility >= wieldReqs.agility;
    const radiance = playerStats.radiance >= wieldReqs.radiance;
    const inferno = playerStats.inferno >= wieldReqs.inferno;
    const wieldable = strength && agility && radiance && inferno;
    return { strength, agility, radiance, inferno, wieldable };
}
function calculateAR(AR, upgLevel, playerStats, wieldable, twoHanding, gradeRanges) {
    const baseDamage = calculateBaseDamage(AR.baseDamage, upgLevel);
    // calculate contributions to AR (physical, holy, fire, wither, and spellpower) from stats
    const contribsStr = calculateContribution(AR.scaledStr, upgLevel, playerStats.strength);
    const contribsAgi = calculateContribution(AR.scaledAgi, upgLevel, playerStats.agility);
    const contribsRad = calculateContribution(AR.scaledRad, upgLevel, playerStats.radiance);
    const contribsInf = calculateContribution(AR.scaledInf, upgLevel, playerStats.inferno);
    // calculate additional damage to damage types
    const arStr = contribsStr.ar;
    const arAgi = contribsAgi.ar;
    const arRad = contribsRad.ar;
    const arInf = contribsInf.ar;
    const addPhysical = arStr.physical + arAgi.physical + arRad.physical + arInf.physical;
    const addHoly = arStr.holy + arAgi.holy + arRad.holy + arInf.holy;
    const addFire = arStr.fire + arAgi.fire + arRad.fire + arInf.fire;
    const addWither = arStr.wither + arAgi.wither + arRad.wither + arInf.wither;
    const addSP = arStr.spellPower + arAgi.spellPower + arRad.spellPower + arInf.spellPower;
    const scalar = twoHanding ? 1.17 * AR.twoHandBonus : 1.0;
    // create DamageSplits from base+additional; considering wieldability
    const physical = makeDamageSplit(baseDamage.physical, addPhysical, wieldable, scalar);
    const holy = makeDamageSplit(baseDamage.holy, addHoly, wieldable, scalar);
    const fire = makeDamageSplit(baseDamage.fire, addFire, wieldable, scalar);
    const wither = makeDamageSplit(baseDamage.wither, addWither, wieldable, scalar);
    const spellPower = makeDamageSplit(baseDamage.spellPower, addSP, wieldable, 1.0);
    // stat scaling values/grades
    const strVal = contribsStr.weaponScalingStatCoef;
    const agiVal = contribsAgi.weaponScalingStatCoef;
    const radVal = contribsRad.weaponScalingStatCoef;
    const infVal = contribsInf.weaponScalingStatCoef;
    const strGrade = getGrade(gradeRanges, strVal);
    const agiGrade = getGrade(gradeRanges, agiVal);
    const radGrade = getGrade(gradeRanges, radVal);
    const infGrade = getGrade(gradeRanges, infVal);
    const calcAR = {
        physical,
        holy,
        fire,
        wither,
        spellPower,
        totalDamage: physical.total + holy.total + fire.total + wither.total,
    };
    const calcScaling = {
        strVal,
        strGrade,
        agiVal,
        agiGrade,
        radVal,
        radGrade,
        infVal,
        infGrade,
    };
    return { calcAR, calcScaling };
}
function calculateExtras(wde, upgLevel, twoHanding) {
    // 2-handing gives roughly 40% more poise and stagger. Not sure about stamina damage.
    const scalar = twoHanding ? 1.4 : 1.0;
    const poiseDamage = getValue(wde.dmgPoise, upgLevel) * scalar;
    const staggerDamage = getValue(wde.dmgStagger, upgLevel) * scalar;
    const staminaDamage = getValue(wde.dmgStamina, upgLevel);
    const pvpMultiplier = wde.pvpMultiplier;
    const spellSlots = wde.spellSlots;
    return {
        poiseDamage,
        staggerDamage,
        staminaDamage,
        pvpMultiplier,
        spellSlots,
    };
}
function calculateStatus(wds, upgLevel) {
    const bleed = getValue(wds.dmgStatusBleed, upgLevel);
    const burn = getValue(wds.dmgStatusBurn, upgLevel);
    const poison = getValue(wds.dmgStatusPoison, upgLevel);
    const smite = getValue(wds.dmgStatusSmite, upgLevel);
    const ignite = getValue(wds.dmgStatusIgnite, upgLevel);
    const frost = getValue(wds.dmgStatusFrost, upgLevel);
    return { bleed, burn, poison, smite, ignite, frost };
}
function calculateOffense(wo, upgLevel, playerStats, wieldability, twoHanding, gradeRanges) {
    const calcAR = calculateAR(wo.damageAR, upgLevel, playerStats, wieldability.wieldable, twoHanding, gradeRanges);
    const AR = calcAR.calcAR;
    const scaling = calcAR.calcScaling;
    const extras = calculateExtras(wo.damageExtras, upgLevel, twoHanding);
    const status = calculateStatus(wo.damageStatus, upgLevel);
    return { ar: AR, extras, status, scaling };
}
function calculateDefense(wd, upgLevel, wieldable) {
    let physical = getValue(wd.defPhysical, upgLevel);
    let holy = getValue(wd.defHoly, upgLevel);
    let fire = getValue(wd.defFire, upgLevel);
    let wither = getValue(wd.defWither, upgLevel);
    let stability = getValue(wd.stability, upgLevel);
    if (!wieldable) {
        physical /= 5;
        holy /= 5;
        fire /= 5;
        wither /= 5;
        stability /= 5;
    }
    return { physical, holy, fire, wither, stability };
}
export function calculateWeaponStats(weapon, upgLevel, playerStats, twoHanding, gradeRanges, pinnedWeapons) {
    upgLevel = Math.max(0, Math.min(weapon.maxUpgLevel, upgLevel));
    const wieldability = canWield(playerStats, weapon.wieldReqs);
    const offense = calculateOffense(weapon.offense, upgLevel, playerStats, wieldability, twoHanding, gradeRanges);
    const defense = calculateDefense(weapon.defense, upgLevel, wieldability.wieldable);
    const runeSockets = getRunes(weapon.runeSockets, upgLevel);
    const pinned = pinnedWeapons.has(weapon.key);
    return { item: weapon, offense, defense, runeSockets, upgLevel, playerStats, wieldability, pinned };
}
//# sourceMappingURL=weaponsCalc.js.map