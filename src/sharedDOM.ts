import { getElem } from './views/view.js';

export function syncSidebarContent(innerHTML: string, show: boolean | null = true): void {
    if (show !== null)
        if (show) document.body.classList.remove('sidebar-hidden');
        else document.body.classList.add('sidebar-hidden');

    getElem('sidebar-content').innerHTML = innerHTML;
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
