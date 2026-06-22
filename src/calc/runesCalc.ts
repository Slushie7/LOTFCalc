import type { BuffTarget, CalculatedRuneStats, Effect, Rune } from '../model.js';

const substitutions: Map<string, string> = new Map([
    ['Faith', 'Radiance'],
    ['Chaos', 'Inferno'],
    ['ScalingOrder', 'ScalingRadiance'],
    ['ScalingChaos', 'ScalingInferno'],
    ['DamageDark', 'DamageWither'],
    ['DefenseDark', 'DefenseWither'],
    ['MaxBuildupBleed', 'ResistBleed'],
    ['MaxBuildupBurn', 'ResistBurn'],
    ['MaxBuildupPoison', 'ResistPoison'],
    ['MaxBuildupSmite', 'ResistSmite'],
    ['MaxBuildupIgnite', 'ResistIgnite'],
    ['MaxBuildupFrostbite', 'ResistFrostbite'],
    ['MagicRegenRate', 'ManaRegen'],
    ['Magic', 'Mana'],
    ['GlobalStaminaBlockingProtection', 'Stability'],
]);

export function calculateRuneStats(rune: Rune, pinnedRunes: Set<string>): CalculatedRuneStats {
    function effectToString(equipment: 'Weapon' | 'Shield', buffTarget: BuffTarget, effect: Effect): string {
        const target = buffTarget === 'Equipment' ? equipment : buffTarget;
        let attr = effect.attribute;
        let op = effect.scalingType === 'Additive' ? '+' : '*';
        let value: string | number = effect.value;
        if (op === '+') {
            if (value < 0)
                // hide '+' for negative numbers (no '+-')
                op = '';
            else if (value < 1.0)
                // convert these numbers to percentage increases
                value = `${value * 100}%`;
        } else if (op === '*' && value === 0)
            // 'x*0' -> 'x=0'
            op = '=';
        // attribute name substitutions
        const attrSubbed = substitutions.get(attr);
        if (attrSubbed !== undefined) attr = attrSubbed;
        const appType = effect.appType ? ` (${effect.appType})` : '';
        return `${target}.${attr}${op}${value}${appType}`;
    }

    const weaponEffects = rune.weaponBuff.effects.map((v) => effectToString('Weapon', rune.weaponBuffTarget, v));
    const armorEffects = rune.armorBuff.effects.map((v) => effectToString('Shield', rune.armorBuffTarget, v));

    return { rune, pinned: pinnedRunes.has(rune.key), weaponEffects, armorEffects };
}
