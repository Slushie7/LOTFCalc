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
export function addElemListener(id, type, listener, options) {
    getElem(id).addEventListener(type, listener, options);
}
export function addClassListeners(classNames, elemT, type, listener, options) {
    for (const el of document.getElementsByClassName(classNames)) {
        if (el instanceof elemT)
            el.addEventListener(type, listener, options);
    }
}
/** Converts an HTML tag's data attribute name to JS's camelCase representation. The 'data-' prefix is optional.
 * e.g. convertHtmlDataAttrib('data-some-attr-key') -> 'someAttrKey' */
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
    // remove any 'data-' prefix
    if (htmlDataKey.startsWith('data-'))
        htmlDataKey = htmlDataKey.slice(5);
    const jsDataKey = convertHtmlDataAttrib(htmlDataKey); // convert to JS's camelCase representation
    const sidebar = getElem('sidebar-content');
    for (const el of sidebar.querySelectorAll(`[data-${htmlDataKey}]`)) {
        if (el instanceof HTMLInputElement) {
            const data = el.dataset[jsDataKey];
            // set the input's checked state
            if (data !== undefined && (!verifyFn || verifyFn(data)))
                el.checked = checkedSet.has(data);
        }
    }
}
//# sourceMappingURL=sharedDOM.js.map