import { getPlayerLevel } from '../calc/sharedCalc.js';
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
    // CMPT
    'NLVL',
    'FLVL',
    // GEAR
    'WEAP',
    'ARMR',
] as const;
export type ClassesHeaderKey = (typeof CLASSES_HEADER_KEYS)[number];
export function isClassesHeaderKey(v: unknown): v is ClassesHeaderKey {
    return CLASSES_HEADER_KEYS.includes(v as ClassesHeaderKey);
}

const CLASSES_SUPERHEADER_KEYS = ['INFO', 'STATS', 'CMPT', 'GEAR'] as const;
export type ClassesSuperheaderKey = (typeof CLASSES_SUPERHEADER_KEYS)[number];
export function isClassesSuperheaderKey(v: unknown): v is ClassesSuperheaderKey {
    return CLASSES_SUPERHEADER_KEYS.includes(v as ClassesSuperheaderKey);
}

export const CLASSES_HEADER_GROUPS: readonly HeaderGroup<ClassesHeaderKey, ClassesSuperheaderKey>[] = [
    {
        superKey: 'INFO',
        superHtmlText: '',
        columns: [
            { key: 'CLASS', rawText: 'Class Name', hover: 'Starting Class Name' },
            { key: 'TYPE', rawText: 'Type', hover: 'Starting Class Type' },
        ],
    },
    {
        superKey: 'STATS',
        superHtmlText: 'Starting Stats',
        columns: [
            { key: 'STR', rawText: 'Str', hover: 'Starting Strength' },
            { key: 'AGI', rawText: 'Agi', hover: 'Starting Agility' },
            { key: 'END', rawText: 'End', hover: 'Starting Endurance' },
            { key: 'VIT', rawText: 'Vit', hover: 'Starting Vitality' },
            { key: 'RAD', rawText: 'Rad', hover: 'Starting Radiance' },
            { key: 'INF', rawText: 'Inf', hover: 'Starting Inferno' },
            { key: 'LVL', rawText: 'Level', hover: 'Starting Level' },
        ],
    },
    {
        superKey: 'CMPT',
        superHtmlText: 'Stat Compatbility',
        columns: [
            { key: 'NLVL', rawText: 'Lvls Needed', hover: 'Additional levels needed to meet your entered stats' },
            { key: 'FLVL', rawText: 'Fnl Level', hover: 'The final level needed to meet your entered stats' },
        ],
    },
    {
        superKey: 'GEAR',
        superHtmlText: 'Starting Gear',
        columns: [
            { key: 'WEAP', rawText: 'Weapons', hover: 'Starting Weapons' },
            { key: 'ARMR', rawText: 'Armor', hover: 'Starting Armor' },
        ],
    },
] as const;

export function getClassRow(crs: CalculatedClassStats, showColGroups: Set<ClassesSuperheaderKey>): Row {
    const cells: Cell[] = [];
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

    // CMPT (NLVL, FLVL)
    if (showColGroups.has('CMPT')) {
        pushCell(cells, crs.levelsNeeded, 'col-starter');
        pushCell(cells, getPlayerLevel(crs.finalStats), 'col-divider');
    }

    // GEAR (WEAP, ARMR)
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
                        `<img class="image-first image-last" src="./img/Weapons/${escapeHtml(w.icon)}.webp" width="20" height="20">${escapeHtml(w.name)}</a>`
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
