import type { Armor, CalculatedArmorStats, CalculatedPlayerDefenses, Curve, PlayerStats } from '../model.js';
import { calculatePlayerStats } from './sharedCalc.js';

/**
 * Returns the scalar applied to incoming damage to determine damage inflicted
 * @param defense_value
 * @returns
 */
export function getDefenseScalar(defense_value: number): number {
    return 600 / (600 + defense_value);
}

export function getMitigation(defense_value: number): number {
    return 1 - getDefenseScalar(defense_value);
}

export function calculateArmorStats(
    armor: Armor,
    pinnedArmors: Set<string>,
    equippedArmors: Set<string | null>
): CalculatedArmorStats {
    const stats = armor.stats;
    const defTotal = stats.defPhysical + stats.defFire + stats.defHoly + stats.defWither;
    const resTotal =
        stats.resBleed + stats.resBurn + stats.resFrost + stats.resIgnite + stats.resPoison + stats.resSmite;

    return {
        item: armor,
        defTotal,
        resTotal,
        pinned: pinnedArmors.has(armor.key),
        equipped: equippedArmors.has(armor.key),
    };
}

export function calculatePlayerDefenses(
    playerStats: PlayerStats,
    head: Armor | null,
    torso: Armor | null,
    arms: Armor | null,
    legs: Armor | null,
    curves: Map<string, Curve>
): CalculatedPlayerDefenses {
    const ps = calculatePlayerStats(playerStats, curves);
    const pieces = [head, torso, arms, legs].filter((a) => a !== null);

    const weight = pieces.reduce((acc, cur) => acc + cur.stats.weight, 0);
    const poise = pieces.reduce((acc, cur) => acc + cur.stats.poise, 0);

    const physical = pieces.reduce((acc, cur) => acc + cur.stats.defPhysical, ps.defPhysical);
    const fire = pieces.reduce((acc, cur) => acc + cur.stats.defFire, ps.defFire);
    const holy = pieces.reduce((acc, cur) => acc + cur.stats.defHoly, ps.defHoly);
    const wither = pieces.reduce((acc, cur) => acc + cur.stats.defWither, ps.defWither);

    const bleed = pieces.reduce((acc, cur) => acc + cur.stats.resBleed, ps.resBleed);
    const burn = pieces.reduce((acc, cur) => acc + cur.stats.resBurn, ps.resBurn);
    const poison = pieces.reduce((acc, cur) => acc + cur.stats.resPoison, ps.resPoison);
    const smite = pieces.reduce((acc, cur) => acc + cur.stats.resSmite, ps.resSmite);
    const ignite = pieces.reduce((acc, cur) => acc + cur.stats.resIgnite, ps.resIgnite);
    const frost = pieces.reduce((acc, cur) => acc + cur.stats.resFrost, ps.resFrost);

    const kickMult = pieces.reduce((acc, cur) => acc + cur.stats.kickMult, 0);

    return {
        playerStats: ps,
        weight,
        poise,
        physical,
        fire,
        holy,
        wither,
        bleed,
        burn,
        poison,
        smite,
        ignite,
        frost,
        kickMult,
    };
}
