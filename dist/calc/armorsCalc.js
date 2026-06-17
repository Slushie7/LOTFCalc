/**
 * Returns the scalar applied to incoming damage to determine damage inflicted
 * @param defense_value
 * @returns
 */
export function getDefenseScalar(defense_value) {
    return 600 / (600 + defense_value);
}
//# sourceMappingURL=armorsCalc.js.map