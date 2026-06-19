export class View {
    ctx;
    constructor(ctx) {
        this.ctx = ctx;
    }
    isActiveMode() {
        return this.ctx.shared.activeMode === this.mode;
    }
    sortCalculated(calculated, sortKey, ascending, sortFns) {
        const pinned = [];
        const unpinned = [];
        // separate pinned weapons from unpinned weapons
        calculated.map((c) => (c.pinned ? pinned.push(c) : unpinned.push(c)));
        const fn = sortFns[sortKey];
        if (fn !== undefined) {
            if (ascending) {
                pinned.sort(fn);
                unpinned.sort(fn);
            }
            else {
                pinned.sort((a, b) => -fn(a, b));
                unpinned.sort((a, b) => -fn(a, b));
            }
        }
        else
            console.log(`Failed to retrieve sort function for sortKey "${sortKey}"`);
        return [...pinned, ...unpinned];
    }
}
//# sourceMappingURL=view.js.map