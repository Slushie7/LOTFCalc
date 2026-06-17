import { getElem } from './views/view.js';
export function syncSidebarContent(title, innerHTML, show = true) {
    if (show !== null)
        if (show)
            document.body.classList.remove('sidebar-hidden');
        else
            document.body.classList.add('sidebar-hidden');
    getElem('sidebar-title').textContent = title;
    const elContent = getElem('sidebar-content');
    elContent.innerHTML = innerHTML;
}
//# sourceMappingURL=shared.js.map