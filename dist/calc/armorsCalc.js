import { calculatePlayerStats } from './sharedCalc.js';
/**
 * Returns the scalar applied to incoming damage to determine damage inflicted
 * @param defense_value
 * @returns
 */
export function getDefenseScalar(defense_value) {
    return 600 / (600 + defense_value);
}
export function calculateArmorStats(armor, pinnedArmors) {
    const stats = armor.stats;
    const defTotal = stats.defPhysical + stats.defFire + stats.defHoly + stats.defWither;
    const resTotal = stats.resBleed + stats.resBurn + stats.resFrost + stats.resIgnite + stats.resPoison + stats.resSmite;
    return { armor, defTotal, resTotal, pinned: pinnedArmors.has(armor.key) };
}
export function calculatePlayerDefenses(playerStats, head, torso, arms, legs, curves) {
    const ps = calculatePlayerStats(playerStats, curves);
    const armor = [head, torso, arms, legs].filter((a) => a !== null);
    const weight = armor.reduce((acc, cur) => acc + cur.stats.weight, 0);
    const poise = armor.reduce((acc, cur) => acc + cur.stats.poise, 0);
    const physical = armor.reduce((acc, cur) => acc + cur.stats.defPhysical, ps.defPhysical);
    const fire = armor.reduce((acc, cur) => acc + cur.stats.defFire, ps.defFire);
    const holy = armor.reduce((acc, cur) => acc + cur.stats.defHoly, ps.defHoly);
    const wither = armor.reduce((acc, cur) => acc + cur.stats.defWither, ps.defWither);
    const bleed = armor.reduce((acc, cur) => acc + cur.stats.resBleed, ps.resBleed);
    const burn = armor.reduce((acc, cur) => acc + cur.stats.resBurn, ps.resBurn);
    const poison = armor.reduce((acc, cur) => acc + cur.stats.resPoison, ps.resPoison);
    const smite = armor.reduce((acc, cur) => acc + cur.stats.resSmite, ps.resSmite);
    const ignite = armor.reduce((acc, cur) => acc + cur.stats.resIgnite, ps.resIgnite);
    const frost = armor.reduce((acc, cur) => acc + cur.stats.resFrost, ps.resFrost);
    const kickMult = armor.reduce((acc, cur) => acc + cur.stats.kickMult, 0);
    return { weight, poise, physical, fire, holy, wither, bleed, burn, poison, smite, ignite, frost, kickMult };
}
//# sourceMappingURL=armorsCalc.js.map