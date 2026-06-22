import type {
    StatScalarGradeRange,
    StatScaledDamage,
    Weapon,
    WeaponDamageAR,
    WeaponDamageExtras,
    WeaponDamageStatus,
    WeaponDefense,
    WeaponOffense,
    WeaponRuneSockets,
    BaseDamage,
    AttackRating,
    CalculatedCanWield,
    CalculatedWeaponAR,
    CalculatedWeaponDefense,
    CalculatedWeaponExtras,
    CalculatedWeaponOffense,
    CalculatedWeaponScaling,
    CalculatedWeaponStats,
    CalculatedWeaponStatus,
    PlayerStats,
    DamageSplit,
    RuneSocketType,
} from '../model.js';
import { epsilonFloor, interpolate, getValue } from './sharedCalc.js';

/**
 * Returns an Array of the rune sockets available for the weapon's given upgrade level
 * @param weaponRuneSockets
 * @param upg_level
 * @returns
 */
function getRunes(weaponRuneSockets: WeaponRuneSockets, upg_level: number): RuneSocketType[] {
    if (weaponRuneSockets.numByLevel === null) return [];
    const numRunes = epsilonFloor(interpolate(weaponRuneSockets.numByLevel, upg_level));
    if (numRunes < 0) throw new Error(`Failed to get rune sockets: negative Curve value`);

    return weaponRuneSockets.runeSockets.slice(0, numRunes);
}

/**
 * Translates a scaling value into a letter grade (like 'C+', 'A-', etc)
 * @param gradeRanges
 * @param scalingVal
 * @returns
 */
function getGrade(gradeRanges: readonly StatScalarGradeRange[], scalingVal: number): string {
    if (!gradeRanges.length) throw new Error('Failed to get stat scaling grade: gradeRanges is empty');
    if (scalingVal < 0) throw new Error('Failed to get stat scaling grade: scalingValue must be >= 0');

    let lo = 0;
    let hi = gradeRanges.length - 1;
    while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const midRange = gradeRanges[mid]!;
        if (scalingVal >= midRange.minIncl && scalingVal < midRange.maxExcl) return midRange.grade;

        if (scalingVal < midRange.minIncl) {
            hi = mid - 1;
        } else {
            lo = mid + 1;
        }
    }

    // unmatched non-negative value is above the top range → clamp
    return gradeRanges[gradeRanges.length - 1]!.grade;
}

/**
 * Calculate the base damage of the weapon (P,H,F,W,SP), given its upgrade level
 * @param baseDamage
 * @param upgLevel
 */
function calculateBaseDamage(baseDamage: BaseDamage, upgLevel: number): AttackRating {
    const physical = getValue(baseDamage.dmgPhysical, upgLevel);
    const holy = getValue(baseDamage.dmgHoly, upgLevel);
    const fire = getValue(baseDamage.dmgFire, upgLevel);
    const wither = getValue(baseDamage.dmgWither, upgLevel);
    const spellPower = getValue(baseDamage.dmgSpell, upgLevel);

    return { physical, holy, fire, wither, spellPower };
}

/**
 * Calculate contributions to the main damage types from stats
 * @param statScaledDmg
 * @param upgLevel
 * @param statLevel
 * @returns
 */
function calculateContribution(
    statScaledDmg: StatScaledDamage,
    upgLevel: number,
    statLevel: number
): { ar: AttackRating; weaponScalingStatCoef: number } {
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
    if (statScaledDmg.stat === 'R') holy = getValue(bd.dmgHoly, upgLevel) * factor;
    if (statScaledDmg.stat === 'I') fire = getValue(bd.dmgFire, upgLevel) * factor;

    const ar: AttackRating = { physical, holy, fire, wither, spellPower };

    return { ar, weaponScalingStatCoef: weaponScalingStat };
}

function makeDamageSplit(base: number, fromStats: number, wieldable: boolean, scalar: number): DamageSplit {
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

function canWield(playerStats: PlayerStats, wieldReqs: PlayerStats): CalculatedCanWield {
    const strength = playerStats.strength >= wieldReqs.strength;
    const agility = playerStats.agility >= wieldReqs.agility;
    const radiance = playerStats.radiance >= wieldReqs.radiance;
    const inferno = playerStats.inferno >= wieldReqs.inferno;
    const wieldable = strength && agility && radiance && inferno;

    return { strength, agility, radiance, inferno, wieldable };
}
function calculateAR(
    AR: WeaponDamageAR,
    upgLevel: number,
    playerStats: PlayerStats,
    wieldable: boolean,
    twoHanding: boolean,
    gradeRanges: readonly StatScalarGradeRange[]
): {
    calcAR: CalculatedWeaponAR;
    calcScaling: CalculatedWeaponScaling;
} {
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

    const calcAR: CalculatedWeaponAR = {
        physical,
        holy,
        fire,
        wither,
        spellPower,
        totalDamage: physical.total + holy.total + fire.total + wither.total,
    };
    const calcScaling: CalculatedWeaponScaling = {
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

function calculateExtras(wde: WeaponDamageExtras, upgLevel: number, twoHanding: boolean): CalculatedWeaponExtras {
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

function calculateStatus(wds: WeaponDamageStatus, upgLevel: number): CalculatedWeaponStatus {
    const bleed = getValue(wds.dmgStatusBleed, upgLevel);
    const burn = getValue(wds.dmgStatusBurn, upgLevel);
    const poison = getValue(wds.dmgStatusPoison, upgLevel);
    const smite = getValue(wds.dmgStatusSmite, upgLevel);
    const ignite = getValue(wds.dmgStatusIgnite, upgLevel);
    const frost = getValue(wds.dmgStatusFrost, upgLevel);

    return { bleed, burn, poison, smite, ignite, frost };
}

function calculateOffense(
    wo: WeaponOffense,
    upgLevel: number,
    playerStats: PlayerStats,
    wieldability: CalculatedCanWield,
    twoHanding: boolean,
    gradeRanges: readonly StatScalarGradeRange[]
): CalculatedWeaponOffense {
    const calcAR = calculateAR(wo.damageAR, upgLevel, playerStats, wieldability.wieldable, twoHanding, gradeRanges);
    const AR = calcAR.calcAR;
    const scaling = calcAR.calcScaling;
    const extras = calculateExtras(wo.damageExtras, upgLevel, twoHanding);
    const status = calculateStatus(wo.damageStatus, upgLevel);

    return { ar: AR, extras, status, scaling };
}

function calculateDefense(wd: WeaponDefense, upgLevel: number, wieldable: boolean): CalculatedWeaponDefense {
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

export function calculateWeaponStats(
    weapon: Weapon,
    upgLevel: number,
    playerStats: PlayerStats,
    twoHanding: boolean,
    gradeRanges: readonly StatScalarGradeRange[],
    pinnedWeapons: Set<string>
): CalculatedWeaponStats {
    upgLevel = Math.max(0, Math.min(weapon.maxUpgLevel, upgLevel));
    const wieldability = canWield(playerStats, weapon.wieldReqs);
    const offense = calculateOffense(weapon.offense, upgLevel, playerStats, wieldability, twoHanding, gradeRanges);
    const defense = calculateDefense(weapon.defense, upgLevel, wieldability.wieldable);
    const runeSockets = getRunes(weapon.runeSockets, upgLevel);
    const pinned = pinnedWeapons.has(weapon.key);

    return { weapon, offense, defense, runeSockets, upgLevel, playerStats, wieldability, pinned };
}
