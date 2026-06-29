import { getPlayerLevel } from '../calc/sharedCalc.js';
import { escapeHtml, fextraUrl, pushCell } from './sharedRender.js';
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
    // CMPT
    'SCORE',
    'NLVL',
    'FLVL',
    // GEAR
    'WEAP',
    'ARMR',
];
export function isClassesHeaderKey(v) {
    return CLASSES_HEADER_KEYS.includes(v);
}
const CLASSES_SUPERHEADER_KEYS = ['INFO', 'STATS', 'CMPT', 'GEAR'];
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
        superKey: 'CMPT',
        superText: 'Stat Compatbility',
        columns: [
            { key: 'SCORE', text: 'Score', hover: 'Compatibility Score' },
            { key: 'NLVL', text: 'Needed', hover: 'Additional levels needed to meet your entered stats' },
            { key: 'FLVL', text: 'FLevel', hover: 'The final level needed to meet your entered stats' },
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
    // INFO (CLASS, TYPE)
    if (showColGroups.has('INFO')) {
        pushCell(cells, cls.name, 'col-first', [{ src: `./img/Classes/${cls.icon}.webp`, size: 30 }]);
        pushCell(cells, cls.type, 'col-divider');
    }
    // STATS (STR, AGI, END, VIT, RAD, INF, LVL)
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
    // CMPT (SCORE, NLVL, FLVL)
    if (showColGroups.has('CMPT')) {
        pushCell(cells, `${(crs.compatScore * 100).toFixed(1)}%`, 'col-starter');
        pushCell(cells, crs.levelsNeeded);
        pushCell(cells, getPlayerLevel(crs.finalStats), 'col-divider');
    }
    // GEAR (WEAP, ARMR)
    if (showColGroups.has('GEAR')) {
        pushCell(cells, undefined, 'col-starter', undefined, undefined, cls.weapons.map((w) => w.name).join('\r\n'), cls.weapons
            .map((w) => `<a class="col-starter" href="${escapeHtml(fextraUrl(w.name))}" target="_blank" rel="noopener noreferrer">` +
            `<img class="image-first image-last" src="./img/Weapons/${w.icon}.webp" width="20" height="20">${w.name}</a>`)
            .join('<br>'));
        pushCell(cells, undefined, 'col-starter', undefined, undefined, cls.armor.map((a) => a.name).join('\r\n'), cls.armor
            .map((a) => `<a class="col-starter" href="${escapeHtml(fextraUrl(a.name))}" target="_blank" rel="noopener noreferrer">` +
            `<img class="image-first image-last" src="./img/Armors/${a.icon}.webp" width="20" height="20">${a.name}</a>`)
            .join('<br>'));
    }
    return { itemName: cls.name, itemKey: cls.key, cells, pinned: crs.pinned };
}
//# sourceMappingURL=classesRender.js.map