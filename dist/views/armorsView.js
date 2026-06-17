import { getElem, View } from './view.js';
export function createArmorsView(state, ctx) {
    return new ArmorsView(state, ctx);
}
class ArmorsView extends View {
    state;
    mode = 'armors';
    constructor(state, ctx) {
        super(ctx);
        this.state = state;
    }
    mount() {
        void this.state;
        void this.ctx;
    }
    show() {
        getElem('view-armors').hidden = false;
        this.refresh();
    }
    hide() {
        getElem('view-armors').hidden = true;
    }
    refresh() { }
}
//# sourceMappingURL=armorsView.js.map