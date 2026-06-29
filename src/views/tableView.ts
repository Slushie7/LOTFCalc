import type { Item, TableData } from '../model.js';
import {
    getHeaderHtml,
    getItemTableBodyHtml,
    getSidebarHtml,
    getTogglesHtml,
    HEADER_STATUS_IMAGES,
    isToggleKey,
    type HeaderGroup,
    type Row,
    type SidebarSection,
    type ToggleGroup,
} from '../render/sharedRender.js';
import { addElemListener, convertHtmlDataAttrib, getElem, getTypedElem, syncSidebarToggles } from '../sharedDOM.js';
import type { TableState } from '../state.js';
import { View, type ViewContext } from './view.js';

export type SortFunction<T> = (a: T, b: T) => number;

export function compareStringArrays(a: readonly string[], b: readonly string[]): number {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
        const x = a[i]!;
        const y = b[i]!;
        const c = x.localeCompare(y);
        if (c !== 0) return c;
    }
    return a.length - b.length;
}

export abstract class TableView<
    S extends TableState<HK, SHK>, // state type (e.g. WeaponsState)
    HK extends string, // header key type (e.g. WeaponsHeaderKey)
    SHK extends string, // superheader key type (e.g. WeaponsSuperheaderKey)
    I extends Item,
    CST extends TableData<I>, // calculated stats type (e.g. CalculatedWeaponStats)
> extends View {
    private ac: AbortController | null = null;
    protected calculatedItems: CST[] = [];

    constructor(
        protected readonly state: S,
        ctx: ViewContext
    ) {
        super(ctx);
    }

    protected abstract readonly headerGroups: readonly HeaderGroup<HK, SHK>[];
    protected abstract readonly colGroupToggles: ToggleGroup<SHK>;
    protected abstract readonly sortFns: Record<HK, SortFunction<CST>>;
    protected abstract readonly ascendingByDefault: ReadonlySet<HK>;
    protected abstract isHeaderKey(v: unknown): v is HK;
    protected readonly visibleElements: string[] = [];
    protected abstract collectItems(): readonly CST[];
    protected abstract buildRow(item: CST): Row;

    // optional things
    protected onHide(): void {}
    protected readonly sidebarSections: SidebarSection<string>[] = [];
    // /** Fired any time a toggle in the sidebar is changed, prior to renderItems() being called */
    protected processSidebarSelection(): void {}
    /** Runs at the end of show() - show/hide upgrade-level, sync toggles, etc */
    protected onShow(): void {}
    /** Mode-specific listeners (upgrade-level, etc) */
    protected bindExtra(_signal: AbortSignal): void {}
    /** Handle any #view-toggles change events that aren't for column groups (settings, etc) */
    protected handleExtraToggle(_el: HTMLInputElement): boolean {
        return false;
    }
    protected handleExtraBodyClick(_e: Event): boolean {
        return false;
    }
    /** Additional matching function for search text */
    protected additionalSearchFilter(_text: string, _cst: CST): boolean {
        return false;
    }

    // lifecycle
    mount(): void {}

    show(): void {
        getElem(`view-${this.mode}`).hidden = false;
        getElem('search-input').hidden = false;
        getElem('download-btn').hidden = false;

        // bind event listeners
        this.ac?.abort(); // guard against a double show()
        this.ac = new AbortController();
        const { signal } = this.ac;

        addElemListener('sidebar-content', 'change', (e) => this.onSidebarChange(e), { signal });
        addElemListener('sidebar-content', 'click', (e) => this.onSidebarClick(e), { signal });
        addElemListener(`${this.mode}-header`, 'click', (e) => this.onHeaderClick(e), { signal });
        addElemListener(`${this.mode}-body`, 'click', (e) => this.onBodyClick(e), { signal });
        addElemListener('view-toggles', 'change', (e) => this.onToggleChange(e), { signal });
        addElemListener('search-input', 'input', () => this.renderItems(), { signal });
        addElemListener('download-btn', 'click', () => this.downloadAsCSV(), { signal });

        this.bindExtra(signal);

        // render the initial table
        this.renderSidebar();
        this.renderGroupToggles();
        this.syncGroupToggles();
        for (const id of this.visibleElements) getElem(id).hidden = false;
        this.onShow();
        this.fetchAndRender();
        this.renderHeader();
    }

    hide(): void {
        this.ac?.abort(); // removed any attached event listeners
        this.ac = null;

        getElem(`view-${this.mode}`).hidden = true;
        getElem('search-input').hidden = true;
        getElem('download-btn').hidden = true;

        for (const id of this.visibleElements) getElem(id).hidden = true;
        this.onHide();
    }

    refresh(): void {
        this.renderHeader();
        this.renderItems();
    }

    // ====================================
    // SHARED EVENT HANDLERS
    // ====================================

    protected onSidebarChange(e: Event): void {
        if (e.target instanceof HTMLInputElement) {
            // regular set-inclusion toggles
            const el = e.target;
            for (const section of this.sidebarSections) {
                const sectionKey = convertHtmlDataAttrib(section.sectionKey);
                const val = el.dataset[sectionKey];
                if (val !== undefined && section.itemVerifyFn(val)) {
                    const checkedSet = section.checkedItemsGetter();
                    if (el.checked) checkedSet.add(val);
                    else checkedSet.delete(val);

                    this.processSidebarSelection();
                    this.fetchAndRender();
                    this.ctx.save();
                    return;
                }
            }
        }
    }

    protected onSidebarClick(e: Event): void {
        let handled = false;

        if (e.target instanceof HTMLElement || e.target instanceof SVGElement) {
            // select-all / select-none buttons
            const el = e.target.closest<HTMLButtonElement>('button.meta-btn');
            if (!el) return;
            for (const section of this.sidebarSections) {
                if (el.dataset.sectionKey === section.sectionKey) {
                    const checkedSet = section.checkedItemsGetter();
                    if (el.dataset.command === 'select-all') {
                        section.items.forEach((v) => checkedSet.add(v));
                        handled = true;
                    } else if (el.dataset.command === 'select-none') {
                        checkedSet.clear();
                        handled = true;
                    }
                    if (handled) {
                        syncSidebarToggles(section.sectionKey, checkedSet, section.itemVerifyFn);
                        this.processSidebarSelection();
                        this.fetchAndRender();
                        this.ctx.save();
                        return;
                    }
                }
            }
        }
    }

    protected onHeaderClick(e: Event): void {
        if (!(e.target instanceof Element)) return;
        const el = e.target.closest<HTMLElement>('th.sortable');
        if (!el || !this.isHeaderKey(el.dataset.colKey)) return;
        const colKey = el.dataset.colKey;

        if (colKey === this.state.sortKey) this.state.ascending = !this.state.ascending;
        else {
            this.state.sortKey = colKey;
            this.state.ascending = this.ascendingByDefault.has(colKey);
        }

        this.sort();
        this.refresh();
        this.ctx.save();
    }

    protected onBodyClick(e: Event): void {
        if (this.handleExtraBodyClick(e)) return;

        if (!(e.target instanceof Element)) return;

        const el = e.target.closest<HTMLButtonElement>('button.lock');
        if (!el || !(typeof el.dataset.item === 'string')) return;
        const itemKey = el.dataset.item;

        if (this.state.pinnedItems.has(itemKey)) this.state.pinnedItems.delete(itemKey);
        else this.state.pinnedItems.add(itemKey);

        this.renderItems(itemKey); // render items with the pinned/unpinned item transitioning into view
        this.ctx.save();
    }

    protected onToggleChange(e: Event): void {
        if (!(e.target instanceof HTMLInputElement)) return;
        const el = e.target;
        if (el.classList.contains(this.colGroupToggles.htmlClass)) {
            const group = el.dataset[convertHtmlDataAttrib(this.colGroupToggles.htmlDataKey)];
            if (isToggleKey(group, this.colGroupToggles)) {
                if (el.checked) this.state.showColGroups.add(group);
                else this.state.showColGroups.delete(group);
                this.refresh();
                this.ctx.save();
            }
            return;
        } else if (this.handleExtraToggle(el)) this.ctx.save();
    }

    // ====================================
    // DATA MANIPULATION
    // ====================================

    protected sort(): void {
        // sort items by current sortKey
        const pinned: CST[] = [];
        const unpinned: CST[] = [];

        // separate pinned items from unpinned items
        for (const c of this.calculatedItems)
            if (c.pinned) pinned.push(c);
            else unpinned.push(c);

        const fn = this.sortFns[this.state.sortKey];
        if (this.state.ascending) {
            pinned.sort(fn);
            unpinned.sort(fn);
        } else {
            pinned.sort((a, b) => -fn(a, b));
            unpinned.sort((a, b) => -fn(a, b));
        }

        this.calculatedItems.length = 0;
        this.calculatedItems.push(...pinned, ...unpinned);
    }

    /** Filter applied when search-input changes */
    protected searchFilter(_text: string, _cst: CST): boolean {
        if (
            !_text ||
            _cst.item.name.toLowerCase().includes(_text.toLowerCase()) ||
            this.additionalSearchFilter(_text, _cst)
        )
            return true;
        return false;
    }

    protected fetchCalculated(): void {
        this.calculatedItems.length = 0;
        this.calculatedItems.push(...this.collectItems());
        this.sort();
    }

    protected fetchAndRender(): void {
        this.fetchCalculated();
        this.renderItems();
    }

    protected downloadAsCSV(): void {
        function escapeCsvField(field: string): string {
            // Quote only when the field contains a delimiter, quote, or newline.
            if (/[",\r\n]/.test(field)) {
                return `"${field.replace(/"/g, '""')}"`;
            }
            return field;
        }

        const visibleGroups = this.headerGroups.filter((group) => this.state.showColGroups.has(group.superKey));
        const csvHeaders: string[] = [];
        visibleGroups.forEach((g) => g.columns.forEach((c) => csvHeaders.push(c.rawText)));

        const tableRows = this.calculatedItems.map((cst) => this.buildRow(cst));
        const csvRows: string[][] = [csvHeaders];
        for (const r of tableRows) {
            const row: string[] = [];
            for (const c of r.cells) row.push(c.rawText);
            csvRows.push(row);
        }

        const csvText = csvRows.map((r) => r.map(escapeCsvField).join(',')).join('\r\n');
        const blob = new Blob(['\uFEFF' + csvText], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.mode + '.csv';
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
    }

    // ====================================
    // SHARED RENDERING
    // ====================================

    protected renderSidebar(): void {
        if (this.sidebarSections.length) document.body.classList.remove('sidebar-hidden');
        else
            // no sidebar sections - hide the sidebar
            document.body.classList.add('sidebar-hidden');
        getElem('sidebar-content').innerHTML = getSidebarHtml(this.sidebarSections);
    }

    protected renderGroupToggles(): void {
        getElem('view-toggles').innerHTML = getTogglesHtml(this.colGroupToggles);
    }

    protected renderHeader(): void {
        // temporarily remove the search input element from the DOM
        const searchInput = getTypedElem('search-input', HTMLInputElement);
        searchInput.remove();

        const header = getElem(`${this.mode}-header`);
        const groups = this.headerGroups.filter((group) => this.state.showColGroups.has(group.superKey));

        // rebuild the header
        header.innerHTML = getHeaderHtml(groups, this.state.sortKey, this.state.ascending, HEADER_STATUS_IMAGES);

        // insert the search input element into the first cell of the superheader
        header.firstChild?.firstChild?.appendChild(searchInput);
    }

    protected renderItems(itemKeyFadeIn: string | null = null): void {
        // filter items by current search input
        const searchText = getTypedElem('search-input', HTMLInputElement).value.trim();
        const displayItems = this.calculatedItems.filter((v) => this.searchFilter(searchText, v));

        // display the items in the table
        const rows = displayItems.map((cst) => this.buildRow(cst));
        getElem(`${this.mode}-body`).innerHTML = getItemTableBodyHtml(rows, itemKeyFadeIn);
    }

    /** Sync the displayed DOM group toggle elements to their state values */
    protected syncGroupToggles(): void {
        const datasetKey = convertHtmlDataAttrib(this.colGroupToggles.htmlDataKey);
        for (const el of document.getElementsByClassName(this.colGroupToggles.htmlClass)) {
            if (!(el instanceof HTMLInputElement)) continue;
            const elDataKey = el.dataset[datasetKey];
            if (isToggleKey(elDataKey, this.colGroupToggles)) el.checked = this.state.showColGroups.has(elDataKey);
        }
    }
}
