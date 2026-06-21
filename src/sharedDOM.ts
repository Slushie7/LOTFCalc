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
    listener: (e: Event) => void,
    options?: boolean | AddEventListenerOptions
): void {
    getTypedElem(id, elemType).addEventListener(type, listener, options);
}

export function addElemListener(
    id: string,
    type: keyof HTMLElementEventMap,
    listener: (e: Event) => void,
    options?: boolean | AddEventListenerOptions
): void {
    getElem(id).addEventListener(type, listener, options);
}

export function addClassListeners<T extends HTMLElement>(
    classNames: string,
    elemT: new () => T,
    type: keyof HTMLElementEventMap,
    listener: (e: Event) => void,
    options?: boolean | AddEventListenerOptions
): void {
    for (const el of document.getElementsByClassName(classNames)) {
        if (el instanceof elemT) el.addEventListener(type, listener, options);
    }
}

/**
 * Converts an HTML tag's data attribute name to JS's camelCase representation. The 'data-' prefix is optional.
 * e.g. convertHtmlDataAttrib('data-some-attr-key') -> 'someAttrKey'
 * @param dataAttrib
 * @returns
 */
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
    // remove any 'data-' prefix
    if (htmlDataKey.startsWith('data-')) htmlDataKey = htmlDataKey.slice(5);

    const jsDataKey = convertHtmlDataAttrib(htmlDataKey); // convert to JS's camelCase representation
    const sidebar = getElem('sidebar-content');
    for (const el of sidebar.querySelectorAll(`[data-${htmlDataKey}]`)) {
        if (el instanceof HTMLInputElement) {
            const data = el.dataset[jsDataKey];
            // set the input's checked state
            if (data !== undefined && (!verifyFn || verifyFn(data))) el.checked = checkedSet.has(data);
        }
    }
}
