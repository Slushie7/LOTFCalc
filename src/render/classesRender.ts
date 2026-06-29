import type { CalculatedClassStats } from '../model.js';
import { escapeHtml, fextraUrl, pushCell, type Cell, type HeaderGroup, type Row } from './sharedRender.js';

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
] as const;
export type ClassesHeaderKey = (typeof CLASSES_HEADER_KEYS)[number];
export function isClassesHeaderKey(v: unknown): v is ClassesHeaderKey {
    return CLASSES_HEADER_KEYS.includes(v as ClassesHeaderKey);
}

const CLASSES_SUPERHEADER_KEYS = ['INFO', 'STATS', 'GEAR'] as const;
export type ClassesSuperheaderKey = (typeof CLASSES_SUPERHEADER_KEYS)[number];
export function isClassesSuperheaderKey(v: unknown): v is ClassesSuperheaderKey {
    return CLASSES_SUPERHEADER_KEYS.includes(v as ClassesSuperheaderKey);
}

export const CLASSES_HEADER_GROUPS: readonly HeaderGroup<ClassesHeaderKey, ClassesSuperheaderKey>[] = [
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
] as const;

export function getClassRow(crs: CalculatedClassStats, showColGroups: Set<ClassesSuperheaderKey>): Row {
    const cells: Cell[] = [];
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
        pushCell(
            cells,
            undefined,
            'col-starter',
            undefined,
            undefined,
            cls.weapons.map((w) => w.name).join('\r\n'),
            cls.weapons
                .map(
                    (w) =>
                        `<a class="col-starter" href="${escapeHtml(fextraUrl(w.name))}" target="_blank" rel="noopener noreferrer">` +
                        `<img class="image-first image-last" src="./img/Weapons/${w.icon}.webp" width="20" height="20">${w.name}</a>`
                )
                .join('<br>')
        );
        pushCell(
            cells,
            undefined,
            'col-starter',
            undefined,
            undefined,
            cls.armor.map((a) => a.name).join('\r\n'),
            cls.armor
                .map(
                    (a) =>
                        `<a class="col-starter" href="${escapeHtml(fextraUrl(a.name))}" target="_blank" rel="noopener noreferrer">` +
                        `<img class="image-first image-last" src="./img/Armors/${a.icon}.webp" width="20" height="20">${a.name}</a>`
                )
                .join('<br>')
        );
    }

    return { itemName: cls.name, itemKey: cls.key, cells, pinned: crs.pinned };
}
