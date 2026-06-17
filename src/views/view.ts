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

    constructor(protected readonly ctx: ViewContext) {}

    protected isActiveMode(): boolean {
        return this.ctx.shared.activeMode === this.mode;
    }

    abstract mount(): void;
    abstract show(): void;
    abstract hide(): void;
    abstract refresh(): void;
}

export function getTypedElem<T extends HTMLElement>(id: string, elemType: new () => T): T {
    const el = document.getElementById(id);
    if (el === null) throw new Error(`Missing element: ${id}`);
    if (!(el instanceof elemType)) throw new Error();
    return el;
}

export function getElem(id: string): HTMLElement {
    return getTypedElem(id, HTMLElement);
}

export function addTypedElemListener<T extends HTMLElement>(
    id: string,
    elemType: new () => T,
    type: keyof HTMLElementEventMap,
    listener: (e: Event) => void
): void {
    getTypedElem(id, elemType).addEventListener(type, listener);
}

export function addElemListener(id: string, type: keyof HTMLElementEventMap, listener: (e: Event) => void): void {
    getElem(id).addEventListener(type, listener);
}

export function addClassListeners<T extends HTMLElement>(
    classNames: string,
    elemT: new () => T,
    type: keyof HTMLElementEventMap,
    listener: (e: Event) => void
): void {
    for (const el of document.getElementsByClassName(classNames)) {
        if (el instanceof elemT) el.addEventListener(type, (e) => listener(e));
    }
}
