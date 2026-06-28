import { PLAYER_STATS_KEYS } from '../model.js';
export function calculateClassStats(cls, pinnedClasses) {
    const weapons = cls.weapons.map((w) => w.name);
    const armor = cls.armor.map((a) => a.name);
    return { item: cls, pinned: pinnedClasses.has(cls.key), weapons, armor };
}
export function rateStartingClasses(playerStats, startingClasses) {
    const rated = [];
    for (const sc of startingClasses) {
        let finalStats = { ...sc.stats };
        for (const sk of PLAYER_STATS_KEYS) {
            if (sc.stats[sk] < playerStats[sk])
                // StartingClass's stat must be raised up to the desired stat level
                finalStats[sk] = playerStats[sk];
        }
        const level = finalStats.strength +
            finalStats.agility +
            finalStats.endurance +
            finalStats.vitality +
            finalStats.radiance +
            finalStats.inferno -
            53;
        rated.push({ ...sc, stats: finalStats, level });
    }
    // sort by class's level, low-to-high
    return rated.sort((a, b) => a.level - b.level);
}
//# sourceMappingURL=classesCalc.js.map