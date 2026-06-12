const STAT_KEYS = ['S', 'A', 'R', 'I'];
export function isStatKey(v) {
    return STAT_KEYS.includes(v);
}
const RUNE_TYPES = [...STAT_KEYS, '*'];
export function isRuneType(v) {
    return RUNE_TYPES.includes(v);
}
const SUPERHEADER_KEYS = ['INFO', 'AR', 'MAGIC', 'STATUS', 'MISC', 'RUNES', 'DEF', 'SCALING', 'REQS'];
export function isSuperheaderKey(v) {
    return SUPERHEADER_KEYS.includes(v);
}
const WEAPON_CLASSES = [
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
export function isInterpMode(v) {
    return INTERP_MODES.includes(v);
}
const SCALING_TYPES = ['Additive', 'Multiplicative'];
export function isScalingType(v) {
    return SCALING_TYPES.includes(v);
}
const BUFF_TARGETS = ['Character', 'Equipment'];
export function isBuffTarget(v) {
    return BUFF_TARGETS.includes(v);
}
//# sourceMappingURL=model.js.map