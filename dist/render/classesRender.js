import { pushCell } from './sharedRender.js';
const CLASSES_HEADER_KEYS = [
    // INFO
    'CLASS',
    'TYPE',
    // STATS
    'STR',
    'AGI',
    'END',
    'VIT',
    'RAD',
    'INF',
    'LVL',
    // GEAR
    'WEAP',
    'ARMR',
];
export function isClassesHeaderKey(v) {
    return CLASSES_HEADER_KEYS.includes(v);
}
const CLASSES_SUPERHEADER_KEYS = ['INFO', 'STATS', 'GEAR'];
export function isClassesSuperheaderKey(v) {
    return CLASSES_SUPERHEADER_KEYS.includes(v);
}
export const CLASSES_HEADER_GROUPS = [
    {
        superKey: 'INFO',
        superText: '',
        columns: [
            { key: 'CLASS', text: 'Class Name', hover: 'Starting Class Name' },
            { key: 'TYPE', text: 'Type', hover: 'Starting Class Type' },
        ],
    },
    {
        superKey: 'STATS',
        superText: 'Starting Stats',
        columns: [
            { key: 'STR', text: 'Str', hover: 'Starting Strength' },
            { key: 'AGI', text: 'Agi', hover: 'Starting Agility' },
            { key: 'END', text: 'End', hover: 'Starting Endurance' },
            { key: 'VIT', text: 'Vit', hover: 'Starting Vitality' },
            { key: 'RAD', text: 'Rad', hover: 'Starting Radiance' },
            { key: 'INF', text: 'Inf', hover: 'Starting Inferno' },
            { key: 'LVL', text: 'Level', hover: 'Starting Level' },
        ],
    },
    {
        superKey: 'GEAR',
        superText: 'Starting Gear',
        columns: [
            { key: 'WEAP', text: 'Weapons', hover: 'Starting Weapons' },
            { key: 'ARMR', text: 'Armor', hover: 'Starting Armor' },
        ],
    },
];
export function getClassRow(crs, showColGroups) {
    const cells = [];
    const cls = crs.item;
    // INFO (RUNE, TYPE)
    if (showColGroups.has('INFO')) {
        pushCell(cells, cls.name, 'col-first', [{ src: `./img/Classes/${cls.icon}.webp`, size: 30 }]);
        pushCell(cells, cls.type, 'col-divider');
    }
    // WEAP (WEAPFX)
    if (showColGroups.has('STATS')) {
        const stats = cls.stats;
        pushCell(cells, stats.strength, 'col-starter');
        pushCell(cells, stats.agility);
        pushCell(cells, stats.endurance);
        pushCell(cells, stats.vitality);
        pushCell(cells, stats.radiance);
        pushCell(cells, stats.inferno);
        pushCell(cells, cls.level, 'col-divider');
    }
    // ARMR (ARMRFX)
    if (showColGroups.has('GEAR')) {
        pushCell(cells, crs.weapons, 'col-starter');
        pushCell(cells, crs.armor, 'col-divider');
    }
    return { itemName: cls.name, itemKey: cls.key, cells, pinned: crs.pinned };
}
//# sourceMappingURL=classesRender.js.map