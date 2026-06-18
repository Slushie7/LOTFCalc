export class View {
    ctx;
    constructor(ctx) {
        this.ctx = ctx;
    }
    isActiveMode() {
        return this.ctx.shared.activeMode === this.mode;
    }
}
export function getTypedElem(id, elemType) {
    const el = document.getElementById(id);
    if (el === null)
        throw new Error(`Missing element: ${id}`);
    if (!(el instanceof elemType))
        throw new Error(`Element ${id} is not an ${elemType.name}`);
    return el;
}
export function getElem(id) {
    return getTypedElem(id, HTMLElement);
}
export function addTypedElemListener(id, elemType, type, listener) {
    getTypedElem(id, elemType).addEventListener(type, listener);
}
export function addElemListener(id, type, listener) {
    getElem(id).addEventListener(type, listener);
}
export function addClassListeners(classNames, elemT, type, listener) {
    for (const el of document.getElementsByClassName(classNames)) {
        if (el instanceof elemT)
            el.addEventListener(type, listener);
    }
}
//# sourceMappingURL=view.js.map