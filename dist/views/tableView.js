import { getHeaderHtml, getItemTableBodyHtml, getSidebarHtml, getTogglesHtml, HEADER_STATUS_IMAGES, isToggleKey, } from '../render/sharedRender.js';
import { addElemListener, convertHtmlDataAttrib, getElem, getTypedElem, syncSidebarToggles } from '../sharedDOM.js';
import { View } from './view.js';
export class TableView extends View {
    state;
    ac = null;
    calculatedItems = [];
    constructor(state, ctx) {
        super(ctx);
        this.state = state;
    }
    // optional things
    onHide() { }
    sidebarSections = [];
    // /** Fired any time a toggle in the sidebar is changed, prior to renderItems() being called */
    processSidebarSelection() { }
    /** Runs at the end of show() - show/hide upgrade-level, sync toggles, etc */
    onShow() { }
    /** Mode-specific listeners (upgrade-level, etc) */
    bindExtra(_signal) { }
    /** Handle any #view-toggles change events that aren't for column groups (settings, etc) */
    handleExtraToggle(_el) {
        return false;
    }
    handleExtraBodyClick(_e) {
        return false;
    }
    /** Additional matching function for search text */
    additionalSearchFilter(_text, _cst) {
        return false;
    }
    // lifecycle
    mount() { }
    show() {
        getElem(`view-${this.mode}`).hidden = false;
        getElem(`${this.mode}-search`).hidden = false;
        this.ac?.abort(); // guard against a double show()
        this.ac = new AbortController();
        const { signal } = this.ac;
        addElemListener('sidebar-content', 'change', (e) => this.onSidebarChange(e), { signal });
        addElemListener('sidebar-content', 'click', (e) => this.onSidebarClick(e), { signal });
        addElemListener(`${this.mode}-header`, 'click', (e) => this.onHeaderClick(e), { signal });
        addElemListener(`${this.mode}-body`, 'click', (e) => this.onBodyClick(e), { signal });
        addElemListener('view-toggles', 'change', (e) => this.onToggleChange(e), { signal });
        addElemListener(`${this.mode}-search`, 'input', () => this.renderItems(), { signal });
        this.bindExtra(signal);
        this.renderSidebar();
        this.renderGroupToggles();
        this.syncGroupToggles();
        this.onShow();
        this.fetchAndRender();
        this.renderHeader();
    }
    hide() {
        this.ac?.abort(); // removed any attached event listeners
        this.ac = null;
        getElem(`view-${this.mode}`).hidden = true;
        this.onHide();
    }
    refresh() {
        this.renderHeader();
        this.renderItems();
    }
    // ====================================
    // SHARED EVENT HANDLERS
    // ====================================
    onSidebarChange(e) {
        if (e.target instanceof HTMLInputElement) {
            // regular set-inclusion toggles
            const el = e.target;
            for (const section of this.sidebarSections) {
                const sectionKey = convertHtmlDataAttrib(section.sectionKey);
                const val = el.dataset[sectionKey];
                if (val !== undefined && section.itemVerifyFn(val)) {
                    const checkedSet = section.checkedItemsGetter();
                    if (el.checked)
                        checkedSet.add(val);
                    else
                        checkedSet.delete(val);
                    this.processSidebarSelection();
                    this.fetchAndRender();
                    this.ctx.save();
                    return;
                }
            }
        }
    }
    onSidebarClick(e) {
        let handled = false;
        if (e.target instanceof HTMLElement || e.target instanceof SVGElement) {
            // select-all / select-none buttons
            const el = e.target.closest('button.meta-btn');
            if (!el)
                return;
            for (const section of this.sidebarSections) {
                if (el.dataset.sectionKey === section.sectionKey) {
                    const checkedSet = section.checkedItemsGetter();
                    if (el.dataset.command === 'select-all') {
                        section.items.forEach((v) => checkedSet.add(v));
                        handled = true;
                    }
                    else if (el.dataset.command === 'select-none') {
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
    onHeaderClick(e) {
        if (!(e.target instanceof Element))
            return;
        const el = e.target.closest('th.sortable');
        if (!el || !this.isHeaderKey(el.dataset.colKey))
            return;
        const colKey = el.dataset.colKey;
        if (colKey === this.state.sortKey)
            this.state.ascending = !this.state.ascending;
        else {
            this.state.sortKey = colKey;
            this.state.ascending = this.ascendingByDefault.has(colKey);
        }
        this.sort();
        this.refresh();
        this.ctx.save();
    }
    onBodyClick(e) {
        if (this.handleExtraBodyClick(e))
            return;
        if (!(e.target instanceof Element))
            return;
        const el = e.target.closest('button.lock');
        if (!el || !(typeof el.dataset.item === 'string'))
            return;
        const itemKey = el.dataset.item;
        if (this.state.pinnedItems.has(itemKey))
            this.state.pinnedItems.delete(itemKey);
        else
            this.state.pinnedItems.add(itemKey);
        this.renderItems(itemKey); // render items with the pinned/unpinned item transitioning into view
        this.ctx.save();
    }
    onToggleChange(e) {
        if (!(e.target instanceof HTMLInputElement))
            return;
        const el = e.target;
        if (el.classList.contains(this.colGroupToggles.htmlClass)) {
            const group = el.dataset[convertHtmlDataAttrib(this.colGroupToggles.htmlDataKey)];
            if (isToggleKey(group, this.colGroupToggles)) {
                if (el.checked)
                    this.state.showColGroups.add(group);
                else
                    this.state.showColGroups.delete(group);
                this.refresh();
                this.ctx.save();
            }
            return;
        }
        else if (this.handleExtraToggle(el))
            this.ctx.save();
    }
    // ====================================
    // SHARED RENDERING
    // ====================================
    sort() {
        // sort items by current sortKey
        const sorted = this.sortCalculated(this.calculatedItems, this.state.sortKey, this.state.ascending, this.sortFns);
        this.calculatedItems.length = 0;
        this.calculatedItems.push(...sorted);
    }
    /** Filter applied when mode-search input changes */
    searchFilter(_text, _cst) {
        if (!_text ||
            _cst.item.name.toLowerCase().includes(_text.toLowerCase()) ||
            this.additionalSearchFilter(_text, _cst))
            return true;
        return false;
    }
    fetchCalculated() {
        this.calculatedItems.length = 0;
        this.calculatedItems.push(...this.collectItems());
        this.sort();
    }
    fetchAndRender() {
        this.fetchCalculated();
        this.renderItems();
    }
    renderSidebar() {
        if (this.sidebarSections.length)
            document.body.classList.remove('sidebar-hidden');
        else
            // no sidebar sections - hide the sidebar
            document.body.classList.add('sidebar-hidden');
        getElem('sidebar-content').innerHTML = getSidebarHtml(this.sidebarSections);
    }
    renderGroupToggles() {
        getElem('view-toggles').innerHTML = getTogglesHtml(this.colGroupToggles);
    }
    renderHeader() {
        // temporarily remove the search input element from the DOM
        const searchInput = getTypedElem(`${this.mode}-search`, HTMLInputElement);
        searchInput.remove();
        const header = getElem(`${this.mode}-header`);
        const groups = this.headerGroups.filter((group) => this.state.showColGroups.has(group.superKey));
        // rebuild the header
        header.innerHTML = getHeaderHtml(groups, this.state.sortKey, this.state.ascending, HEADER_STATUS_IMAGES);
        // insert the search input element into the first cell of the superheader
        header.firstChild?.firstChild?.appendChild(searchInput);
    }
    renderItems(itemKeyFadeIn = null) {
        // filter items by current search input
        const searchText = getTypedElem(`${this.mode}-search`, HTMLInputElement).value.trim();
        const displayItems = this.calculatedItems.filter((v) => this.searchFilter(searchText, v));
        // display the items in the table
        const rows = displayItems.map((cst) => this.buildRow(cst));
        getElem(`${this.mode}-body`).innerHTML = getItemTableBodyHtml(rows, itemKeyFadeIn);
    }
    /** Sync the displayed DOM group toggle elements to their state values */
    syncGroupToggles() {
        const datasetKey = convertHtmlDataAttrib(this.colGroupToggles.htmlDataKey);
        for (const el of document.getElementsByClassName(this.colGroupToggles.htmlClass)) {
            if (!(el instanceof HTMLInputElement))
                continue;
            const elDataKey = el.dataset[datasetKey];
            if (isToggleKey(elDataKey, this.colGroupToggles))
                el.checked = this.state.showColGroups.has(elDataKey);
        }
    }
    sortCalculated(calculated, sortKey, ascending, sortFns) {
        const pinned = [];
        const unpinned = [];
        // separate pinned items from unpinned items
        for (const c of calculated)
            if (c.pinned)
                pinned.push(c);
            else
                unpinned.push(c);
        const fn = sortFns[sortKey];
        if (ascending) {
            pinned.sort(fn);
            unpinned.sort(fn);
        }
        else {
            pinned.sort((a, b) => -fn(a, b));
            unpinned.sort((a, b) => -fn(a, b));
        }
        return [...pinned, ...unpinned];
    }
}
//# sourceMappingURL=tableView.js.map