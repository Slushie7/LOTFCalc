import { PLAYER_STATS_KEYS, type CalculatedClassStats, type PlayerStats, type StartingClass } from '../model.js';
import { getPlayerLevel } from './sharedCalc.js';

export function calculateClassStats(
    cls: StartingClass,
    pinnedClasses: Set<string>,
    playerStats: PlayerStats
): CalculatedClassStats {
    const weaponNames = cls.weapons.map((w) => w.name);
    const armorNames = cls.armor.map((a) => a.name);

    const finalStats = { ...cls.stats };
    for (const sk of PLAYER_STATS_KEYS) {
        if (cls.stats[sk] < playerStats[sk])
            // StartingClass's stat must be raised up to the desired stat level
            finalStats[sk] = playerStats[sk];
    }
    const levelsNeeded = getPlayerLevel(finalStats) - getPlayerLevel(cls.stats);

    return {
        item: cls,
        pinned: pinnedClasses.has(cls.key),
        weaponNames,
        armorNames,
        finalStats,
        levelsNeeded,
    };
}
