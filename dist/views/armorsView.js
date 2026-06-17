import { addClassListeners, addElemListener, getElem, getTypedElem, View } from './view.js';
import { syncSidebarContent } from '../sharedDOM.js';
import { ARMORS_HEADER_GROUPS, getArmorRow, getArmorsClassesHtml, getArmorsHeaderHtml, getArmorsHtml, isArmorsHeaderKey, isArmorsSuperheaderKey, sortCalculatedArmors, } from '../render/armorsRender.js';
import { isArmorSlot, isArmorWeightClass } from '../model.js';
import { calculateArmorStats } from '../calc/armorsCalc.js';
export function createArmorsView(state, ctx) {
    return new ArmorsView(state, ctx);
}
class ArmorsView extends View {
    state;
    mode = 'armors';
    constructor(state, ctx) {
        super(ctx);
        this.state = state;
    }
    mount() {
        // armor class toggles
        addElemListener('sidebar-content', 'change', (e) => this.onSetSidebarToggle(e));
        // header group toggles
        addClassListeners('armors-group-toggle', HTMLInputElement, 'change', (e) => this.onSetColGroup(e));
        // table header sorting
        addElemListener('armors-header', 'click', (e) => this.onTableHeaderClick(e));
        addElemListener('armors-body', 'click', (e) => this.onTableBodyClick(e));
    }
    show() {
        getElem('view-armors').hidden = false;
        this.updateSidebar();
        this.hideUpgInput();
        this.syncToggles();
        this.refresh();
    }
    hide() {
        getElem('view-armors').hidden = true;
    }
    refresh() {
        this.renderHeader();
        this.renderArmors();
    }
    // =========================================
    // EVENT HANDLERS
    // =========================================
    onSetSidebarToggle(e) {
        if (!this.isActiveMode())
            return;
        if (!(e.target instanceof HTMLInputElement))
            return;
        const el = e.target;
        if (el.dataset.slot && isArmorSlot(el.dataset.slot)) {
            const slot = el.dataset.slot;
            if (el.checked)
                this.state.selectedSlots.add(slot);
            else
                this.state.selectedSlots.delete(slot);
        }
        else if (el.dataset.weightClass && isArmorWeightClass(el.dataset.weightClass)) {
            const wc = el.dataset.weightClass;
            if (el.checked)
                this.state.selectedWeights.add(wc);
            else
                this.state.selectedWeights.delete(wc);
        }
        this.renderArmors();
        this.ctx.save();
    }
    onSetColGroup(e) {
        if (!this.isActiveMode())
            return;
        if (!(e.target instanceof HTMLInputElement))
            return;
        const el = e.target;
        if (!isArmorsSuperheaderKey(el.dataset.group))
            return;
        const superKey = el.dataset.group;
        if (el.checked)
            this.state.showColGroups.add(superKey);
        else
            this.state.showColGroups.delete(superKey);
        this.renderHeader();
        this.renderArmors();
        this.ctx.save();
    }
    onTableHeaderClick(e) {
        if (!this.isActiveMode())
            return;
        if (!(e instanceof MouseEvent))
            return;
        if (!(e.target instanceof Element))
            return;
        const el = e.target.closest('th.sortable');
        if (!el)
            return;
        if (!isArmorsHeaderKey(el.dataset.colKey))
            return;
        const colKey = el.dataset.colKey;
        if (colKey === this.state.sortKey)
            this.state.ascending = !this.state.ascending;
        else {
            this.state.sortKey = colKey;
            if (colKey === 'ARMR' || colKey === 'SLOT' || colKey === 'WGT' || colKey === 'WGTC')
                // these columns default to ascending
                this.state.ascending = true;
            else
                this.state.ascending = false;
        }
        this.refresh();
        this.ctx.save();
    }
    onTableBodyClick(e) {
        if (!this.isActiveMode())
            return;
        if (!(e instanceof MouseEvent))
            return;
        if (!(e.target instanceof Element))
            return;
        const el = e.target.closest('button.lock');
        if (!el)
            return;
        if (!(typeof el.dataset.item === 'string'))
            return;
        const armorKey = el.dataset.item;
        if (this.state.pinnedArmors.has(armorKey))
            this.state.pinnedArmors.delete(armorKey);
        else
            this.state.pinnedArmors.add(armorKey);
        this.renderArmors(armorKey); // render armors with the pinned/unpinned armor transitioning into view
        this.ctx.save();
    }
    // =========================================
    // RENDERING - GENERATE/UPDATE HTML
    // =========================================
    updateSidebar() {
        if (!this.isActiveMode())
            return;
        syncSidebarContent('Armor Slots', getArmorsClassesHtml(this.state.selectedSlots, this.state.selectedWeights));
    }
    hideUpgInput() {
        if (!this.isActiveMode())
            return;
        getTypedElem('weapon-level', HTMLSelectElement).hidden = true;
    }
    syncToggles() {
        if (!this.isActiveMode())
            return;
        for (const el of document.getElementsByClassName('armors-group-toggle')) {
            if (el instanceof HTMLInputElement)
                el.checked = this.state.showColGroups.has(el.dataset.group);
        }
    }
    renderHeader() {
        if (!this.isActiveMode())
            return;
        const elHeader = getElem('armors-header');
        const groups = ARMORS_HEADER_GROUPS.filter((group) => this.state.showColGroups.has(group.superKey));
        elHeader.innerHTML = getArmorsHeaderHtml(groups, this.state.sortKey, this.state.ascending);
    }
    renderArmors(armorFadeIn = null) {
        if (!this.isActiveMode())
            return;
        // update the armors table
        const elBody = getElem('armors-body');
        const showArmors = this.ctx.data.armors.filter((arm) => (this.state.selectedSlots.has(arm.slot) && this.state.selectedWeights.has(arm.weightClass)) ||
            this.state.pinnedArmors.has(arm.key));
        let calcStats = showArmors.map((arm) => calculateArmorStats(arm, this.state.pinnedArmors));
        // sort calculated armor stats by current sortKey
        const { pinned, unpinned } = sortCalculatedArmors(calcStats, this.state.sortKey, this.state.ascending);
        calcStats = [...pinned, ...unpinned]; // pinned armors go at front of list
        // display the armor rows
        const rows = calcStats.map((cs) => getArmorRow(cs, this.state.showColGroups));
        elBody.innerHTML = getArmorsHtml(rows, armorFadeIn);
    }
}
//# sourceMappingURL=armorsView.js.map