export const HEADER_GROUPS = [
    {
        superKey: 'INFO',
        superText: '',
        columns: [
            { key: 'WEAP', text: 'Weapon', hover: 'Weapon Name' },
            { key: 'CLS', text: 'Class', hover: 'Class Name' },
        ],
    },
    {
        superKey: 'AR',
        superText: 'Attack Rating',
        columns: [
            { key: 'ARP', text: 'Phys', hover: 'Physical Attack Rating' },
            { key: 'ARF', text: 'Fire', hover: 'Fire Attack Rating' },
            { key: 'ARH', text: 'Holy', hover: 'Holy Attack Rating' },
            { key: 'ARW', text: 'Wither', hover: 'Wither Attack Rating' },
            { key: 'TOT', text: 'Total', hover: 'Total Attack Rating' },
        ],
    },
    {
        superKey: 'MAGIC',
        superText: 'Magic',
        columns: [
            { key: 'SP', text: 'SpellP', hover: 'Spell Power' },
            { key: 'SLOTS', text: 'Slots', hover: 'Catalyst Spell Slots' },
        ],
    },
    {
        superKey: 'STATUS',
        superText: 'Status Effects',
        columns: [
            { key: 'SMI', text: 'Smi', hover: 'Smite Status Buildup' },
            { key: 'BLE', text: 'Ble', hover: 'Bleed Status Buildup' },
            { key: 'BRN', text: 'Brn', hover: 'Burn Status Buildup' },
            { key: 'FRO', text: 'Fro', hover: 'Frostbite Status Buildup' },
            { key: 'IGN', text: 'Ign', hover: 'Ignite Status Buildup' },
            { key: 'PSN', text: 'Psn', hover: 'Poison Status Buildup' },
        ],
    },
    {
        superKey: 'MISC',
        superText: 'Misc Stats',
        columns: [
            { key: 'WGT', text: 'Wgt', hover: 'Weight' },
            {
                key: 'PD',
                text: 'PoiseD',
                hover: 'Poise Damage (Enemy Attack Interruption)',
            },
            {
                key: 'STAG',
                text: 'Stagger',
                hover: 'Stagger Damage (For Grevious Strikes/Critical Hits)',
            },
            { key: 'STAD', text: 'StamD', hover: 'Stamina Damage Multiplier' },
            { key: 'PVP', text: 'PVP', hover: 'Multiplier For PVP' },
        ],
    },
    {
        superKey: 'RUNES',
        superText: 'Rune',
        columns: [{ key: 'RUN', text: 'Sockets', hover: 'Available Rune Sockets' }],
    },
    {
        superKey: 'DEF',
        superText: 'Defense',
        columns: [
            { key: 'DP', text: 'Phys', hover: 'Physical Defense' },
            { key: 'DF', text: 'Fire', hover: 'Fire Defense' },
            { key: 'DH', text: 'Holy', hover: 'Holy Defense' },
            { key: 'DW', text: 'Wither', hover: 'Wither Defense' },
            {
                key: 'DS',
                text: 'Stab',
                hover: 'Stability Rating (Stamina To Block)',
            },
        ],
    },
    {
        superKey: 'SCALING',
        superText: 'Attribute Scaling',
        columns: [
            { key: 'SS', text: 'Str', hover: 'Strength Scaling' },
            { key: 'SA', text: 'Agi', hover: 'Agility Scaling' },
            { key: 'SR', text: 'Rad', hover: 'Radiance Scaling' },
            { key: 'SI', text: 'Inf', hover: 'Inferno Scaling' },
        ],
    },
    {
        superKey: 'REQS',
        superText: 'Wield Reqs',
        columns: [
            { key: 'RS', text: 'Str', hover: 'Required Strength' },
            { key: 'RA', text: 'Agi', hover: 'Required Agility' },
            { key: 'RR', text: 'Rad', hover: 'Required Radiance' },
            { key: 'RI', text: 'Inf', hover: 'Required Inferno' },
        ],
    },
];
//# sourceMappingURL=header.js.map