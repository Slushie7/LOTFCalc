import { pushCell } from './sharedRender.js';
const RUNES_HEADER_KEYS = [
    // INFO
    'RUNE',
    'TYPE',
    // WEAP
    'WEAPFX',
    // ARMR
    'ARMRFX',
];
export function isRunesHeaderKey(v) {
    return RUNES_HEADER_KEYS.includes(v);
}
const RUNES_SUPERHEADER_KEYS = ['INFO', 'WEAP', 'ARMR'];
export function isRunesSuperheaderKey(v) {
    return RUNES_SUPERHEADER_KEYS.includes(v);
}
export const RUNES_HEADER_GROUPS = [
    {
        superKey: 'INFO',
        superText: '',
        columns: [
            { key: 'RUNE', text: 'Rune', hover: 'Rune Name' },
            { key: 'TYPE', text: 'Shape', hover: 'Rune Shape' },
        ],
    },
    {
        superKey: 'WEAP',
        superText: '',
        columns: [{ key: 'WEAPFX', text: 'Weapon Effects', hover: 'Effects When Slotted In Weapons' }],
    },
    {
        superKey: 'ARMR',
        superText: '',
        columns: [{ key: 'ARMRFX', text: 'Shield Effects', hover: 'Effects When Slotted In Shields' }],
    },
];
export function getRuneRow(crs, showColGroups) {
    const cells = [];
    const rune = crs.item;
    // INFO (RUNE, TYPE)
    if (showColGroups.has('INFO')) {
        pushCell(cells, rune.name, 'col-first', [{ src: `./img/Runes/${rune.icon}.webp`, size: 30 }]);
        pushCell(cells, rune.type, 'col-divider');
    }
    // WEAP (WEAPFX)
    if (showColGroups.has('WEAP'))
        pushCell(cells, crs.weaponEffects, 'col-starter col-divider');
    // ARMR (ARMRFX)
    if (showColGroups.has('ARMR'))
        pushCell(cells, crs.armorEffects, 'col-starter col-divider');
    return { itemName: rune.name, itemKey: rune.key, cells, pinned: crs.pinned };
}
//# sourceMappingURL=runesRender.js.map