import type { CalculatedRuneStats } from '../model.js';
import { pushCell, type Cell, type HeaderGroup, type Row } from './sharedRender.js';

const RUNES_HEADER_KEYS = [
    // INFO
    'RUNE',
    'TYPE',
    // WEAP
    'WEAPFX',
    // ARMR
    'ARMRFX',
] as const;
export type RunesHeaderKey = (typeof RUNES_HEADER_KEYS)[number];
export function isRunesHeaderKey(v: unknown): v is RunesHeaderKey {
    return RUNES_HEADER_KEYS.includes(v as RunesHeaderKey);
}

const RUNES_SUPERHEADER_KEYS = ['INFO', 'WEAP', 'ARMR'] as const;
export type RunesSuperheaderKey = (typeof RUNES_SUPERHEADER_KEYS)[number];
export function isRunesSuperheaderKey(v: unknown): v is RunesSuperheaderKey {
    return RUNES_SUPERHEADER_KEYS.includes(v as RunesSuperheaderKey);
}

export const RUNES_HEADER_GROUPS: readonly HeaderGroup<RunesHeaderKey, RunesSuperheaderKey>[] = [
    {
        superKey: 'INFO',
        superHtmlText: '',
        columns: [
            { key: 'RUNE', rawText: 'Rune', hover: 'Rune Name' },
            { key: 'TYPE', rawText: 'Shape', hover: 'Rune Shape' },
        ],
    },
    {
        superKey: 'WEAP',
        superHtmlText: '',
        columns: [{ key: 'WEAPFX', rawText: 'Weapon Effects', hover: 'Effects When Slotted In Weapons' }],
    },
    {
        superKey: 'ARMR',
        superHtmlText: '',
        columns: [{ key: 'ARMRFX', rawText: 'Shield Effects', hover: 'Effects When Slotted In Shields' }],
    },
] as const;

export function getRuneRow(crs: CalculatedRuneStats, showColGroups: Set<RunesSuperheaderKey>): Row {
    const cells: Cell[] = [];
    const rune = crs.item;

    // INFO (RUNE, TYPE)
    if (showColGroups.has('INFO')) {
        pushCell(cells, rune.name, 'col-first', [{ src: `./img/Runes/${rune.icon}.webp`, size: 30 }]);
        pushCell(cells, rune.type, 'col-divider');
    }

    // WEAP (WEAPFX)
    if (showColGroups.has('WEAP')) pushCell(cells, crs.weaponEffects, 'col-starter col-divider');

    // ARMR (ARMRFX)
    if (showColGroups.has('ARMR')) pushCell(cells, crs.armorEffects, 'col-starter col-divider');

    return { itemName: rune.name, itemKey: rune.key, cells, pinned: crs.pinned };
}
