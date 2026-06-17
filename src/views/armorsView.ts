import type { ViewContext } from './view.js';
import { getElem, View } from './view.js';
import type { ArmorsState } from '../state.js';

export function createArmorsView(state: ArmorsState, ctx: ViewContext) {
    return new ArmorsView(state, ctx);
}

class ArmorsView extends View {
    readonly mode = 'armors' as const;

    constructor(
        private readonly state: ArmorsState,
        ctx: ViewContext
    ) {
        super(ctx);
    }

    mount(): void {
        void this.state;
        void this.ctx;
    }

    show(): void {
        getElem('view-armors').hidden = false;
        this.refresh();
    }

    hide(): void {
        getElem('view-armors').hidden = true;
    }

    refresh(): void {}
}
