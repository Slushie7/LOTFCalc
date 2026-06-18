export function getTypedElem<T extends HTMLElement>(id: string, elemType: new () => T): T {
    const el = document.getElementById(id);
    if (el === null) throw new Error(`Missing element: ${id}`);
    if (!(el instanceof elemType)) throw new Error(`Element ${id} is not an ${elemType.name}`);
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
        if (el instanceof elemT) el.addEventListener(type, listener);
    }
}

export function setSidebarContent(innerHTML: string, show: boolean | null = true): void {
    if (show !== null)
        if (show) document.body.classList.remove('sidebar-hidden');
        else document.body.classList.add('sidebar-hidden');

    getElem('sidebar-content').innerHTML = innerHTML;
}

export function convertHtmlDataAttrib(dataAttrib: string): string {
    if (dataAttrib.startsWith('data-')) dataAttrib = dataAttrib.slice(5);

    const parts: string[] = [];
    dataAttrib.split('-').forEach((s, idx) => {
        if (idx === 0) parts.push(s);
        else parts.push(s.charAt(0).toUpperCase() + s.slice(1));
    });

    return parts.join('');
}

export function syncSidebarToggles(
    htmlDataKey: string,
    checkedSet: Set<string>,
    verifyFn?: (v: unknown) => boolean
): void {
    if (htmlDataKey.startsWith('data-')) htmlDataKey = htmlDataKey.slice(5);

    const jsDataKey = convertHtmlDataAttrib(htmlDataKey);
    const sidebar = getElem('sidebar-content');
    for (const el of sidebar.querySelectorAll(`[data-${htmlDataKey}]`)) {
        if (el instanceof HTMLInputElement) {
            const data = el.dataset[jsDataKey];
            if (data !== undefined && (!verifyFn || verifyFn(data))) el.checked = checkedSet.has(data);
        }
    }
}

export function handleMetaButtons(
    e: Event,
    sectionKey: string,
    onSelectAll: () => void,
    onSelectNone: () => void
): boolean {
    if (!(e.target instanceof HTMLElement) && !(e.target instanceof SVGElement)) return false;
    const el = e.target.closest<HTMLButtonElement>('button.meta-btn');
    if (el && el.dataset.sectionKey === sectionKey) {
        if (el.dataset.command === 'select-all') {
            onSelectAll();
            return true;
        } else if (el.dataset.command === 'select-none') {
            onSelectNone();
            return true;
        }
    }
    return false;
}
