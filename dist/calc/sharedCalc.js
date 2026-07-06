import {} from '../model.js';
/** Truncates a float, accounting for floating-point representation issues (e.g. 2.999999999997 -> 3; 4.72 -> 4) */
export function epsilonFloor(x) {
    return Math.floor(x + 1e-9);
}
/** Floor and clamp the given number to the range [0, 99] */
export function clampStat(val, min = 8) {
    return Math.max(min, Math.min(Math.floor(val), 99));
}
/** Interpolates the y-value for the given x-coord in the Curve */
export function interpolate(curve, x) {
    const pts = curve.points;
    if (!pts.length)
        throw new Error('Cannot interpolate Curve with no points');
    // fast track for dense curves (like upgrade levels)
    if (pts[x] !== undefined && pts[x][0] === x)
        // exact match for x-coord
        return pts[x][1];
    // pts are ordered - binary search to find highest point whose x-coord < x
    let lo = 0;
    let hi = pts.length - 1;
    while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const midPt = pts[mid];
        if (midPt[0] === x)
            return midPt[1];
        if (x < midPt[0]) {
            hi = mid - 1;
        }
        else {
            lo = mid + 1;
        }
    }
    // hi points to the closest point with x-coord < x
    if (hi < 0)
        // clamp to lowest possible value (shouldn't happen with valid dataset)
        return pts[0][1];
    else if (hi + 1 >= pts.length)
        // clamp to highest possible value (shouldn't happen with valid dataset)
        return pts[pts.length - 1][1];
    // interpolate (lerp)
    const [x1, y1] = pts[hi];
    const [x2, y2] = pts[hi + 1];
    const t = (x - x1) / (x2 - x1);
    return y1 + t * (y2 - y1);
}
/** Calculates the value of a LeveledValue for a given input by applying its Curve value to its base value */
export function getValue(lv, level) {
    if (lv.curve === null)
        return lv.base;
    const curveVal = interpolate(lv.curve, level);
    if (lv.scalingType === 'Multiplicative') {
        return lv.base * (curveVal + 1);
    }
    else if (lv.scalingType === 'Additive') {
        return lv.base + curveVal;
    }
    else {
        throw new Error(`Unhandled LeveledValue scalingType: ${lv.scalingType}`);
    }
}
export function calculatePlayerStats(playerStats, curves) {
    function getCurve(key) {
        const curve = curves.get(key);
        if (curve === undefined)
            throw new Error(`Failed to retrieve Curve with key: ${key}`);
        return curve;
    }
    const str = playerStats.strength;
    const agi = playerStats.agility;
    const end = playerStats.endurance;
    const vit = playerStats.vitality;
    const rad = playerStats.radiance;
    const inf = playerStats.inferno;
    const level = getPlayerLevel(playerStats);
    const hpCurve = getCurve('MaxHealth_Vitality');
    const hp = interpolate(hpCurve, vit);
    const manaCurve = getCurve('MaxMana_FaithChaos');
    const mana = interpolate(manaCurve, rad + inf);
    const stamCurve = getCurve('MaxStamina_Endurance');
    const stamina = interpolate(stamCurve, end);
    const wgtCurve = getCurve('MaxEquipLoad_VitalityEndurance');
    const weight = interpolate(wgtCurve, vit + end) + 10; // base max weight, minus all stats, is 10
    const defPhysical = str * 3 + agi + end + vit + rad + inf;
    const defFire = str + agi + end + vit + rad + inf * 3;
    const defHoly = str + agi + end + vit + rad * 3 + inf;
    const defWither = str + agi + end + vit + rad * 3 + inf;
    const resBleed = 100 + Math.floor(level / 2);
    const resBurn = resBleed;
    const resPoison = resBleed;
    const resSmite = resBleed;
    const resIgnite = resBleed;
    const resFrost = resBleed;
    return {
        level: level,
        hp,
        mana,
        stamina,
        weight,
        defPhysical,
        defFire,
        defHoly,
        defWither,
        resBleed,
        resBurn,
        resPoison,
        resSmite,
        resIgnite,
        resFrost,
    };
}
export function getPlayerLevel(playerStats) {
    return (playerStats.strength +
        playerStats.agility +
        playerStats.endurance +
        playerStats.vitality +
        playerStats.radiance +
        playerStats.inferno -
        53);
}
//# sourceMappingURL=sharedCalc.js.map