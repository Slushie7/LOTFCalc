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
export function setSidebarContent(innerHTML, show = true) {
    if (show !== null)
        if (show)
            document.body.classList.remove('sidebar-hidden');
        else
            document.body.classList.add('sidebar-hidden');
    getElem('sidebar-content').innerHTML = innerHTML;
}
/**
 * Converts an HTML tag's data attribute name to JS's camelCase representation. The 'data-' prefix is optional.
 * e.g. convertHtmlDataAttrib('data-some-attr-key') -> 'someAttrKey'
 * @param dataAttrib
 * @returns
 */
export function convertHtmlDataAttrib(dataAttrib) {
    if (dataAttrib.startsWith('data-'))
        dataAttrib = dataAttrib.slice(5);
    const parts = [];
    dataAttrib.split('-').forEach((s, idx) => {
        if (idx === 0)
            parts.push(s);
        else
            parts.push(s.charAt(0).toUpperCase() + s.slice(1));
    });
    return parts.join('');
}
export function syncSidebarToggles(htmlDataKey, checkedSet, verifyFn) {
    if (htmlDataKey.startsWith('data-'))
        htmlDataKey = htmlDataKey.slice(5);
    const jsDataKey = convertHtmlDataAttrib(htmlDataKey);
    const sidebar = getElem('sidebar-content');
    for (const el of sidebar.querySelectorAll(`[data-${htmlDataKey}]`)) {
        if (el instanceof HTMLInputElement) {
            const data = el.dataset[jsDataKey];
            if (data !== undefined && (!verifyFn || verifyFn(data)))
                el.checked = checkedSet.has(data);
        }
    }
}
export function handleMetaButtons(e, sectionKey, onSelectAll, onSelectNone) {
    if (!(e.target instanceof HTMLElement) && !(e.target instanceof SVGElement))
        return false;
    const el = e.target.closest('button.meta-btn');
    if (el && el.dataset.sectionKey === sectionKey) {
        if (el.dataset.command === 'select-all') {
            onSelectAll();
            return true;
        }
        else if (el.dataset.command === 'select-none') {
            onSelectNone();
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=sharedDOM.js.map