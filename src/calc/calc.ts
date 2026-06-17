import type {
    AttackRating,
    BaseDamage,
    Curve,
    DamageSplit,
    LeveledValue,
    PlayerStats,
    StatScalarGradeRange,
    StatScaledDamage,
    Weapon,
    CalculatedCanWield,
    WeaponRuneSockets,
    CalculatedWeaponAR,
    CalculatedWeaponDefense,
    CalculatedWeaponExtras,
    CalculatedWeaponOffense,
    CalculatedWeaponScaling,
    CalculatedWeaponStats,
    CalculatedWeaponStatus,
    WeaponDamageAR,
    WeaponDamageExtras,
    WeaponDamageStatus,
    WeaponOffense,
    WeaponDefense,
    CalculatedPlayerStats,
} from '../model.js';

/**
 * Truncates a float, accounting for floating-point representation issues (e.g. 2.999999999997 -> 3; 4.72 -> 4)
 * @param x
 * @returns
 */
export function epsilonFloor(x: number): number {
    return Math.floor(x + 1e-9);
}

/**
 * Floor and clamp the given number to the range [0, 99]
 * @param val
 * @returns
 */
export function clampStat(val: number): number {
    return Math.max(0, Math.min(Math.floor(val), 99));
}

/**
 * Interpolates the y-value for the given x-coord in the Curve
 * @param curve
 * @param x
 * @returns
 */
export function interpolate(curve: Curve, x: number): number {
    const pts = curve.points;

    if (!pts.length) throw new Error('Cannot interpolate Curve with no points');

    // fast track for dense curves (like upgrade levels)
    if (pts[x] !== undefined && pts[x][0] === x)
        // exact match for x-coord
        return pts[x][1];

    // pts are ordered - binary search to find highest point whose x-coord < x
    let lo = 0;
    let hi = pts.length - 1;

    while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const midPt = pts[mid]!;

        if (midPt[0] === x) return midPt[1];

        if (x < midPt[0]) {
            hi = mid - 1;
        } else {
            lo = mid + 1;
        }
    }

    // hi points to the closest point with x-coord < x
    if (hi < 0)
        // clamp to lowest possible value (shouldn't happen with valid dataset)
        return pts[0]![1];
    else if (hi + 1 >= pts.length)
        // clamp to highest possible value (shouldn't happen with valid dataset)
        return pts[pts.length - 1]![1];

    // interpolate (lerp)
    const [x1, y1] = pts[hi]!;
    const [x2, y2] = pts[hi + 1]!;
    const t = (x - x1) / (x2 - x1);

    return y1 + t * (y2 - y1);
}

/**
 * Calculates the value of a LeveledValue for a given input by applying its Curve value to its base value
 * @param lv
 * @param level
 * @returns
 */
export function getValue(lv: LeveledValue, level: number): number {
    if (lv.curve === null) return lv.base;

    const curveVal = interpolate(lv.curve, level);
    if (lv.scalingType === 'Multiplicative') {
        return lv.base * (curveVal + 1);
    } else if (lv.scalingType === 'Additive') {
        return lv.base + curveVal;
    } else {
        throw new Error(`Unhandled LeveledValue scalingType: ${lv.scalingType}`);
    }
}
