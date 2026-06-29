import { PLAYER_STATS_KEYS } from '../model.js';
import { getPlayerLevel } from './sharedCalc.js';
export function calculateClassStats(cls, pinnedClasses, playerStats) {
    const weaponNames = cls.weapons.map((w) => w.name);
    const armorNames = cls.armor.map((a) => a.name);
    const finalStats = { ...cls.stats };
    for (const sk of PLAYER_STATS_KEYS) {
        if (cls.stats[sk] < playerStats[sk])
            // StartingClass's stat must be raised up to the desired stat level
            finalStats[sk] = playerStats[sk];
    }
    const playerLevel = getPlayerLevel(playerStats);
    const finalLevel = getPlayerLevel(finalStats);
    const compatScore = playerLevel / finalLevel;
    const levelsNeeded = finalLevel - getPlayerLevel(cls.stats);
    return {
        item: cls,
        pinned: pinnedClasses.has(cls.key),
        weaponNames,
        armorNames,
        finalStats,
        compatScore,
        levelsNeeded,
    };
}
//# sourceMappingURL=classesCalc.js.map