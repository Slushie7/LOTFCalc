import type { Curve, StatScalarGradeRange, Weapon, Rune, Armor, StartingClass } from '../model.js';
import type { Mode, SharedState } from '../state.js';

export type GameData = {
    readonly curves: Map<string, Curve>;
    readonly gradeRanges: readonly StatScalarGradeRange[];
    readonly weapons: readonly Weapon[];
    readonly runes: readonly Rune[];
    readonly armors: readonly Armor[];
    readonly startingClasses: readonly StartingClass[];
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
    onPlayerStatsChanged(): void {}
}
