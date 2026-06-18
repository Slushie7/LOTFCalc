export class View {
    ctx;
    constructor(ctx) {
        this.ctx = ctx;
    }
    isActiveMode() {
        return this.ctx.shared.activeMode === this.mode;
    }
}
//# sourceMappingURL=view.js.map