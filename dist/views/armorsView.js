import { View } from './view.js';
import { getElem, addElemListener, handleMetaButtons, setSidebarContent, syncSidebarToggles } from '../sharedDOM.js';
import { ARMORS_HEADER_GROUPS, getArmorRow, getArmorsSidebarHtml, getArmorsHeaderHtml, getArmorsHtml, isArmorsHeaderKey, isArmorsSuperheaderKey, sortCalculatedArmors, } from '../render/armorsRender.js';
import { ARMOR_SLOTS, ARMOR_WEIGHT_CLASSES, isArmorSlot, isArmorWeightClass } from '../model.js';
import { calculateArmorStats } from '../calc/armorsCalc.js';
import { getTogglesHtml } from '../render/sharedRender.js';
const GroupToggles = {
    htmlClass: 'armors-group-toggle',
    dataKey: { html: 'col-group', js: 'colGroup' },
    toggles: {
        DEF: { text: 'Defenses', hover: 'Armor defenses' },
        STATUS: { text: 'Resistances', hover: 'Show armor resistances' },
        MISC: {
            text: 'Misc',
            hover: 'Show armor weight class and kick-damage multiplier',
        },
    },
};
function isGroupToggleKey(k) {
    return typeof k === 'string' && Object.hasOwn(GroupToggles.toggles, k);
}
export function createArmorsView(state, ctx) {
    return new ArmorsView(state, ctx);
}
class ArmorsView extends View {
    state;
    mode = 'armors';
    modeBtnText = 'Armors';
    constructor(state, ctx) {
        super(ctx);
        this.state = state;
    }
    mount() {
        // armor class toggles
        addElemListener('sidebar-content', 'click', (e) => this.onSidebarMetaClick(e));
        addElemListener('sidebar-content', 'change', (e) => this.onSetSidebarToggle(e));
        // settings/column group toggles
        addElemListener('view-toggles', 'change', (e) => this.onSettingToggle(e));
        // table header sorting
        addElemListener('armors-header', 'click', (e) => this.onTableHeaderClick(e));
        addElemListener('armors-body', 'click', (e) => this.onTableBodyClick(e));
    }
    show() {
        getElem('view-armors').hidden = false;
        this.renderArmorsModeElements();
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
    onSidebarMetaClick(e) {
        if (!this.isActiveMode())
            return;
        if (!handleMetaButtons(e, 'armor-slots', () => {
            ARMOR_SLOTS.forEach((v) => this.state.selectedSlots.add(v));
        }, () => {
            this.state.selectedSlots.clear();
        }) &&
            !handleMetaButtons(e, 'armor-weights', () => {
                ARMOR_WEIGHT_CLASSES.forEach((v) => this.state.selectedWeights.add(v));
            }, () => {
                this.state.selectedWeights.clear();
            }))
            return;
        syncSidebarToggles('slot', this.state.selectedSlots, isArmorSlot);
        syncSidebarToggles('weight-class', this.state.selectedWeights, isArmorWeightClass);
        this.refresh();
        this.ctx.save();
    }
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
    onSettingToggle(e) {
        if (!this.isActiveMode())
            return;
        if (!(e.target instanceof HTMLInputElement))
            return;
        const el = e.target;
        if (el.classList.contains(GroupToggles.htmlClass)) {
            const group = el.dataset[GroupToggles.dataKey.js];
            if (isGroupToggleKey(group)) {
                if (el.checked)
                    this.state.showColGroups.add(group);
                else
                    this.state.showColGroups.delete(group);
                this.refresh();
            }
        }
        else
            return;
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
    renderArmorsModeElements() {
        if (!this.isActiveMode())
            return;
        // update the sidebar's content
        setSidebarContent(getArmorsSidebarHtml(this.state.selectedSlots, this.state.selectedWeights));
        // create the settings/col-group toggles
        getElem('view-toggles').innerHTML = getTogglesHtml(GroupToggles);
    }
    hideUpgInput() {
        if (!this.isActiveMode())
            return;
        getElem('weapon-level-div').hidden = true;
    }
    syncToggles() {
        if (!this.isActiveMode())
            return;
        for (const el of document.getElementsByClassName('armors-group-toggle')) {
            if (el instanceof HTMLInputElement)
                el.checked = this.state.showColGroups.has(el.dataset.colGroup);
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