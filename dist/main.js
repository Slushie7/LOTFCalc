import { clampStat, calculatePlayerStats } from './calc/sharedCalc.js';
import { loadAppData } from './loadJSONData.js';
import { isMode, loadAppState, saveAppState, } from './state.js';
import { addClassListeners, addElemListener, getElem } from './sharedDOM.js';
import { View } from './views/view.js';
import { createWeaponsView } from './views/weaponsView.js';
import { createArmorsView } from './views/armorsView.js';
import { createRunesView } from './views/runesView.js';
import { createClassesView } from './views/classesView.js';
const SHARED_TOGGLE_KEYS = ['saveSettings'];
function isSharedToggleKey(k) {
    return SHARED_TOGGLE_KEYS.includes(k);
}
// ===================================
// BOOTSTRAP
// ===================================
const data = await loadAppData();
const state = loadAppState();
const ctx = {
    shared: state.shared,
    data,
    save: () => saveAppState(state),
};
const views = {
    weapons: createWeaponsView(state.weapons, ctx),
    armors: createArmorsView(state.armors, ctx),
    runes: createRunesView(state.runes, ctx),
    classes: createClassesView(state.classes, ctx),
};
// ===================================
// SHARED EVENT HANDLERS
// ===================================
function onToggleSidebar() {
    document.body.classList.toggle('sidebar-hidden');
}
function onSwitchMode(e) {
    const el = e.target;
    if (!(el instanceof HTMLButtonElement) || !isMode(el.dataset.mode))
        return;
    const next = el.dataset.mode;
    if (next === state.shared.activeMode)
        return;
    views[state.shared.activeMode].hide();
    state.shared.activeMode = next;
    views[next].show();
    syncModeButtons();
    saveAppState(state);
}
function onSetSharedSetting(e) {
    if (!(e.target instanceof HTMLInputElement))
        return;
    const el = e.target;
    const setting = el.dataset.setting;
    if (typeof setting !== 'string' || !isSharedToggleKey(setting))
        return;
    state.shared[setting] = el.checked;
    views[state.shared.activeMode].refresh();
    ctx.save();
}
/** Input handler for player stats - read the value, clamp it, update shared PlayerStats, and update calculations */
function onSetPlayerStat(e) {
    if (!(e.target instanceof HTMLInputElement))
        return;
    const el = e.target;
    const input = el.valueAsNumber;
    if (Number.isNaN(input))
        return;
    const value = clampStat(input);
    // update the stat
    const field = el.dataset.stat;
    ctx.shared.playerStats = { ...ctx.shared.playerStats, [field]: value };
    updateDerivedStats();
    views[state.shared.activeMode].onPlayerStatsChanged();
    ctx.save();
}
/** Called when player stat input value is committed (element loses focus or user presses 'enter' key) */
function clampPlayerStatInput(e) {
    if (!(e.target instanceof HTMLInputElement))
        return;
    const el = e.target;
    const input = el.valueAsNumber;
    if (Number.isNaN(input))
        return;
    const value = clampStat(input);
    if (input !== value) {
        // update the user's input to reflect the clamped value
        el.value = String(value);
    }
}
// ===================================
// SHARED RENDERING
// ===================================
function renderSharedElements() {
    const modeBtns = [];
    for (const view of Object.values(views))
        modeBtns.push(`<button type="button" class="mode-btn" data-mode="${view.mode}">${view.modeBtnText}</button>`);
    getElem('mode-buttons').innerHTML = modeBtns.join('');
}
function syncModeButtons() {
    for (const el of document.getElementsByClassName('mode-btn')) {
        if (el instanceof HTMLButtonElement) {
            const isActive = el.dataset.mode === state.shared.activeMode;
            el.classList.toggle('active', isActive);
        }
    }
}
function syncSharedElements() {
    // sync shared settings toggles
    for (const el of document.getElementsByClassName('shared-setting-toggle')) {
        if (el instanceof HTMLInputElement &&
            typeof el.dataset.setting === 'string' &&
            isSharedToggleKey(el.dataset.setting)) {
            // map element's 'data-setting' value to relevant current AppState value
            const setting = el.dataset.setting;
            const settingValue = state.shared[setting];
            if (typeof settingValue === 'boolean')
                el.checked = settingValue;
        }
    }
    // initialize player stat <input> element values
    for (const el of document.getElementsByClassName('stat-input')) {
        if (el instanceof HTMLInputElement && typeof el.dataset.stat === 'string') {
            const ps = ctx.shared.playerStats;
            if (Object.hasOwn(ps, el.dataset.stat)) {
                const stat = el.dataset.stat;
                if (typeof ps[stat] !== 'number')
                    throw new Error(`Tried to set player-stat input element's value to "${ps[stat]}", but value is not a number (key="${stat}")`);
                el.value = String(ps[stat]);
            }
        }
    }
}
function updateDerivedStats() {
    // update the player's derived stats
    const derivedStats = calculatePlayerStats(ctx.shared.playerStats, ctx.data.curves);
    for (const el of document.getElementsByClassName('derived-val')) {
        if (el instanceof HTMLSpanElement && typeof el.dataset.stat === 'string') {
            const stat = el.dataset.stat;
            const val = derivedStats[stat];
            if (typeof val === 'string')
                el.textContent = val;
            else if (typeof val === 'number')
                el.textContent = String(val);
        }
    }
}
// ===================================
// WIRING AND INIT
// ===================================
function wireShared() {
    // hamburger button
    addElemListener('hamburger', 'click', onToggleSidebar);
    // mode toggles
    addElemListener('mode-buttons', 'click', onSwitchMode);
    // shared settings toggles
    addClassListeners('shared-setting-toggle', HTMLInputElement, 'input', onSetSharedSetting);
    // player stats inputs
    addClassListeners('stat-input', HTMLInputElement, 'input', onSetPlayerStat);
    addClassListeners('stat-input', HTMLInputElement, 'change', clampPlayerStatInput);
}
function init() {
    for (const view of Object.values(views))
        view.mount();
    renderSharedElements();
    wireShared();
    syncSharedElements();
    updateDerivedStats();
    // ensure all mode-specific elements are hidden
    for (const view of Object.values(views))
        view.hide();
    views[state.shared.activeMode].show();
    syncModeButtons();
}
init();
//# sourceMappingURL=main.js.map