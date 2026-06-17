/**
 * Returns the scalar applied to incoming damage to determine damage inflicted
 * @param defense_value
 * @returns
 */
export function getDefenseScalar(defense_value: number): number {
    return 600 / (600 + defense_value);
}
