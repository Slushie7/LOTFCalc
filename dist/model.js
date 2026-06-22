const STAT_KEYS = ['S', 'A', 'R', 'I'];
export const RUNE_TYPES = ['Strength', 'Agility', 'Radiance', 'Inferno'];
export function isRuneType(v) {
    return RUNE_TYPES.includes(v);
}
const RUNE_SOCKET_TYPES = [...STAT_KEYS, '*'];
export function isRuneSocketType(v) {
    return RUNE_SOCKET_TYPES.includes(v);
}
export const WEAPON_CLASSES = [
    'Axes',
    'Bows',
    'Catalysts',
    'Crossbows',
    'Daggers',
    'Fists',
    'Flails',
    'Grand Axes',
    'Grand Hammers',
    'Grand Swords',
    'Hammers',
    'Long Swords',
    'Polearms',
    'Shields',
    'Short Swords',
    'Spears',
];
export function isWeaponClass(v) {
    return WEAPON_CLASSES.includes(v);
}
// stored types
const INTERP_MODES = ['RCIM_Linear'];
const SCALING_TYPES = ['Additive', 'Multiplicative'];
const BUFF_TARGETS = ['Player', 'Equipment', 'Enemy'];
export const ARMOR_SLOTS = ['Head', 'Torso', 'Arms', 'Legs'];
export function isArmorSlot(v) {
    return ARMOR_SLOTS.includes(v);
}
export const ARMOR_WEIGHT_CLASSES = ['Light', 'Medium', 'Heavy'];
export function isArmorWeightClass(v) {
    return ARMOR_WEIGHT_CLASSES.includes(v);
}
//# sourceMappingURL=model.js.map