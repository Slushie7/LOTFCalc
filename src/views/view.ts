import type { Curve, StatScalarGradeRange, Weapon, Rune, Armor } from '../model.js';
import type { Mode, SharedState } from '../state.js';

export type GameData = {
    readonly curves: Map<string, Curve>;
    readonly gradeRanges: readonly StatScalarGradeRange[];
    readonly weapons: readonly Weapon[];
    readonly runes: readonly Rune[];
    readonly armors: readonly Armor[];
};

export interface ViewContext {
    readonly shared: SharedState;
    readonly data: GameData;
    save(): void;
}

export abstract class View {
    abstract readonly mode: Mode;
    abstract readonly modeBtnText: string;

    constructor(protected readonly ctx: ViewContext) {}

    protected isActiveMode(): boolean {
        return this.ctx.shared.activeMode === this.mode;
    }

    abstract mount(): void;
    abstract show(): void;
    abstract hide(): void;
    abstract refresh(): void;

    protected sortCalculated<T extends { readonly pinned: boolean }, K extends string>(
        calculated: T[],
        sortKey: K,
        ascending: boolean,
        sortFns: Record<K, (a: T, b: T) => number>
    ): T[] {
        const pinned: T[] = [];
        const unpinned: T[] = [];

        // separate pinned weapons from unpinned weapons
        calculated.map((c) => (c.pinned ? pinned.push(c) : unpinned.push(c)));

        const fn = sortFns[sortKey];
        if (fn !== undefined) {
            if (ascending) {
                pinned.sort(fn);
                unpinned.sort(fn);
            } else {
                pinned.sort((a, b) => -fn(a, b));
                unpinned.sort((a, b) => -fn(a, b));
            }
        } else console.log(`Failed to retrieve sort function for sortKey "${sortKey}"`);

        return [...pinned, ...unpinned];
    }
}

export type SortFunction<T> = (a: T, b: T) => number;
