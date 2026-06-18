import type { ViewContext } from './view.js';
import { addClassListeners, addElemListener, getElem, getTypedElem, View } from './view.js';
import type { ArmorsState } from '../state.js';
import { handleMetaButtons, syncSidebarContent } from '../sharedDOM.js';
import {
    ARMORS_HEADER_GROUPS,
    getArmorRow,
    getArmorsSidebarHtml,
    getArmorsHeaderHtml,
    getArmorsHtml,
    isArmorsHeaderKey,
    isArmorsSuperheaderKey,
    sortCalculatedArmors,
    type ArmorsSuperheaderKey,
} from '../render/armorsRender.js';
import { ARMOR_SLOTS, ARMOR_WEIGHT_CLASSES, isArmorSlot, isArmorWeightClass, type Armor } from '../model.js';
import { calculateArmorStats } from '../calc/armorsCalc.js';

export function createArmorsView(state: ArmorsState, ctx: ViewContext) {
    return new ArmorsView(state, ctx);
}

class ArmorsView extends View {
    readonly mode = 'armors' as const;

    constructor(
        private readonly state: ArmorsState,
        ctx: ViewContext
    ) {
        super(ctx);
    }

    mount(): void {
        // armor class toggles
        addElemListener('sidebar-content', 'click', (e) => this.onSidebarMetaClick(e));
        addElemListener('sidebar-content', 'change', (e) => this.onSetSidebarToggle(e));
        // header group toggles
        addClassListeners('armors-group-toggle', HTMLInputElement, 'change', (e) => this.onSetColGroup(e));
        // table header sorting
        addElemListener('armors-header', 'click', (e) => this.onTableHeaderClick(e));
        addElemListener('armors-body', 'click', (e) => this.onTableBodyClick(e));
    }

    show(): void {
        getElem('view-armors').hidden = false;
        this.renderSidebar();
        this.hideUpgInput();
        this.syncToggles();
        this.refresh();
    }

    hide(): void {
        getElem('view-armors').hidden = true;
    }

    refresh(): void {
        this.renderHeader();
        this.renderArmors();
    }

    // =========================================
    // EVENT HANDLERS
    // =========================================

    private onSidebarMetaClick(e: Event): void {
        if (!this.isActiveMode()) return;

        if (
            !handleMetaButtons(
                e,
                'armor-slots',
                () => {
                    ARMOR_SLOTS.forEach((v) => this.state.selectedSlots.add(v));
                },
                () => {
                    this.state.selectedSlots.clear();
                }
            ) &&
            !handleMetaButtons(
                e,
                'armor-weights',
                () => {
                    ARMOR_WEIGHT_CLASSES.forEach((v) => this.state.selectedWeights.add(v));
                },
                () => {
                    this.state.selectedWeights.clear();
                }
            )
        )
            return;

        this.syncSidebarToggles();
        this.refresh();
        this.ctx.save();
    }

    private onSetSidebarToggle(e: Event): void {
        if (!this.isActiveMode()) return;

        if (!(e.target instanceof HTMLInputElement)) return;

        const el = e.target;
        if (el.dataset.slot && isArmorSlot(el.dataset.slot)) {
            const slot = el.dataset.slot;
            if (el.checked) this.state.selectedSlots.add(slot);
            else this.state.selectedSlots.delete(slot);
        } else if (el.dataset.weightClass && isArmorWeightClass(el.dataset.weightClass)) {
            const wc = el.dataset.weightClass;
            if (el.checked) this.state.selectedWeights.add(wc);
            else this.state.selectedWeights.delete(wc);
        }

        this.renderArmors();
        this.ctx.save();
    }

    private onSetColGroup(e: Event): void {
        if (!this.isActiveMode()) return;
        if (!(e.target instanceof HTMLInputElement)) return;

        const el = e.target;
        if (!isArmorsSuperheaderKey(el.dataset.colGroup)) return;
        const superKey = el.dataset.colGroup;
        if (el.checked) this.state.showColGroups.add(superKey);
        else this.state.showColGroups.delete(superKey);

        this.renderHeader();
        this.renderArmors();
        this.ctx.save();
    }

    private onTableHeaderClick(e: Event): void {
        if (!this.isActiveMode()) return;
        if (!(e instanceof MouseEvent)) return;
        if (!(e.target instanceof Element)) return;

        const el = e.target.closest<HTMLElement>('th.sortable');
        if (!el) return;
        if (!isArmorsHeaderKey(el.dataset.colKey)) return;

        const colKey = el.dataset.colKey;

        if (colKey === this.state.sortKey) this.state.ascending = !this.state.ascending;
        else {
            this.state.sortKey = colKey;
            if (colKey === 'ARMR' || colKey === 'SLOT' || colKey === 'WGT' || colKey === 'WGTC')
                // these columns default to ascending
                this.state.ascending = true;
            else this.state.ascending = false;
        }

        this.refresh();
        this.ctx.save();
    }

    private onTableBodyClick(e: Event): void {
        if (!this.isActiveMode()) return;
        if (!(e instanceof MouseEvent)) return;
        if (!(e.target instanceof Element)) return;

        const el = e.target.closest<HTMLButtonElement>('button.lock');
        if (!el) return;
        if (!(typeof el.dataset.item === 'string')) return;
        const armorKey = el.dataset.item;

        if (this.state.pinnedArmors.has(armorKey)) this.state.pinnedArmors.delete(armorKey);
        else this.state.pinnedArmors.add(armorKey);

        this.renderArmors(armorKey); // render armors with the pinned/unpinned armor transitioning into view
        this.ctx.save();
    }

    // =========================================
    // RENDERING - GENERATE/UPDATE HTML
    // =========================================

    private renderSidebar(): void {
        if (!this.isActiveMode()) return;

        syncSidebarContent(getArmorsSidebarHtml(this.state.selectedSlots, this.state.selectedWeights));
    }

    private syncSidebarToggles(): void {
        const sidebar = getElem('sidebar-content');
        for (const elSlot of sidebar.querySelectorAll('[data-slot]'))
            if (elSlot instanceof HTMLInputElement && isArmorSlot(elSlot.dataset.slot))
                elSlot.checked = this.state.selectedSlots.has(elSlot.dataset.slot);
        for (const elWeight of sidebar.querySelectorAll('[data-slot]'))
            if (elWeight instanceof HTMLInputElement && isArmorWeightClass(elWeight.dataset.weightClass))
                elWeight.checked = this.state.selectedWeights.has(elWeight.dataset.weightClass);
    }

    private hideUpgInput(): void {
        if (!this.isActiveMode()) return;
        getElem('weapon-level-div').hidden = true;
    }

    private syncToggles(): void {
        if (!this.isActiveMode()) return;

        for (const el of document.getElementsByClassName('armors-group-toggle')) {
            if (el instanceof HTMLInputElement)
                el.checked = this.state.showColGroups.has(el.dataset.colGroup as ArmorsSuperheaderKey);
        }
    }

    private renderHeader(): void {
        if (!this.isActiveMode()) return;

        const elHeader = getElem('armors-header');
        const groups = ARMORS_HEADER_GROUPS.filter((group) => this.state.showColGroups.has(group.superKey));
        elHeader.innerHTML = getArmorsHeaderHtml(groups, this.state.sortKey, this.state.ascending);
    }

    private renderArmors(armorFadeIn: string | null = null): void {
        if (!this.isActiveMode()) return;

        // update the armors table
        const elBody = getElem('armors-body');
        const showArmors: Armor[] = this.ctx.data.armors.filter(
            (arm) =>
                (this.state.selectedSlots.has(arm.slot) && this.state.selectedWeights.has(arm.weightClass)) ||
                this.state.pinnedArmors.has(arm.key)
        );
        let calcStats = showArmors.map((arm) => calculateArmorStats(arm, this.state.pinnedArmors));
        // sort calculated armor stats by current sortKey
        const { pinned, unpinned } = sortCalculatedArmors(calcStats, this.state.sortKey, this.state.ascending);
        calcStats = [...pinned, ...unpinned]; // pinned armors go at front of list
        // display the armor rows
        const rows = calcStats.map((cs) => getArmorRow(cs, this.state.showColGroups));
        elBody.innerHTML = getArmorsHtml(rows, armorFadeIn);
    }
}
