import json
from pathlib import Path
from typing import Any

from .classes import (
    STAT,
    BaseDamage,
    Curve,
    ItemGameMeta,
    LeveledValue,
    PlayerStats,
    StatScalarGradeRange,
    StatScaledDamage,
    Weapon,
    WeaponDamageAR,
    WeaponDamageExtras,
    WeaponDamageStatus,
    WeaponDefense,
    WeaponOffense,
    WeaponRunes,
)

WEAP_CLASS_MAP: dict[str, str] = {
    'CrossBows': 'Crossbows',
    'FistWeapons': 'Fists',
    'GreatAxes': 'Grand Axes',
    'GreatHammers': 'Grand Hammers',
    'GreatSwords': 'Long Swords',
    'Magic': 'Catalysts',
    'ShortSwords': 'Short Swords',
    'UltraGreatSwords': 'Grand Swords',
}


class LOTFExtractor:
    def __init__(self, lotf2_dir: str | Path) -> None:
        lotf2_dir = Path(lotf2_dir)
        content_dir = lotf2_dir / 'Content'
        blueprints_dir = content_dir / 'Blueprints'

        self.PLAYER_WEAPONS_DIR = blueprints_dir / 'Data/Equipment/Weapons/Player'
        self.STATS_DIR = blueprints_dir / 'Data/Stats'
        self.LOCALIZATION_DIR = content_dir / 'Localization/Game/en'
        self.ATTACK_DEFS_DIR = blueprints_dir / 'Combat/AttackDefinitions'

        self.item_loc_names = self._extract_item_strings()
        self.item_metas = self._extract_weapon_item_metas()
        self.curves = self._extract_curves()
        self.stat_grade_ranges = self._extract_stat_scalar_grades()
        self.ranged_ammo = self._extract_ranged_ammo()
        self.weapons, self.base_damages = self._extract_weapons()

    def _extract_item_strings(self) -> dict[str, str]:
        """Reads the game's localization file, extracting item names.

        Returns a dict mapping loc_key -> item_name"""

        game_loc_path = self.LOCALIZATION_DIR / 'Game.json'

        print(f'Extracting localized item strings from {game_loc_path}')

        with open(game_loc_path, encoding='utf-8') as f:
            game_d = json.load(f)

        item_strings: dict[str, str] = {}
        for loc_key, item_name in game_d['Items'].items():
            assert isinstance(loc_key, str)
            assert isinstance(item_name, str)
            item_strings[loc_key] = item_name

        print(f'Extracted {len(item_strings)} localized item strings')

        return item_strings

    def _extract_weapon_item_metas(self) -> dict[str, ItemGameMeta]:
        """Read the weapon definition files, extracting weapon class names and localization reference keys.

        Returns a dict mapping weapon_key -> class_name and a dict mapping weapon_key -> loc_key"""

        def extract_meta(file_path: Path, weap_class: str, is_base_class: bool) -> None:
            with open(file_path, encoding='utf-8') as f:
                weapon_d = json.load(f)[1]['Properties']

            weap_key = weapon_d['StatsRow']['RowName']
            loc_key = weapon_d['ItemName']['Key'] if not is_base_class else ''
            weapon_meta[weap_key] = ItemGameMeta(weap_class, loc_key, is_base_class)

        print(f'Extracting weapon metadata from {self.PLAYER_WEAPONS_DIR}')

        weapon_meta: dict[str, ItemGameMeta] = {}

        for class_dir in self.PLAYER_WEAPONS_DIR.iterdir():
            if class_dir.is_dir():
                weapon_class = class_dir.stem
                for file in class_dir.iterdir():
                    if file.suffix.lower() == '.json':
                        extract_meta(file, weapon_class, False)

                base_dir = class_dir / 'Base'
                if base_dir.exists() and base_dir.is_dir():
                    for file in base_dir.iterdir():
                        if file.suffix.lower() == '.json':
                            extract_meta(file, weapon_class, True)

        print(f'Extracted metadata for {len(weapon_meta)} weapons (including base classes and deprecated assets)')

        return weapon_meta

    def _extract_curves(self) -> dict[str, Curve]:
        """Reads the scaling curves used by the game for numerical calculations.

        Returns a dict mapping curve_key -> ScalingCurve"""

        scaling_curves: dict[str, Curve] = {}

        file_paths = (self.STATS_DIR / 'DT_ScalingCurveLibrary.json', self.STATS_DIR / 'DT_CurveLibrary.json')

        for file_path in file_paths:
            print(f'Extracting scalar curves from {file_path}')
            with open(file_path, encoding='utf-8') as f:
                scaling_d = json.load(f)[0]['Rows']  # skip FModel's metadata
                for curve_key, values_d in scaling_d.items():
                    interp_mode = values_d['InterpMode'].split('::')[1]  # interpolation mode
                    assert isinstance(interp_mode, str)
                    points: list[tuple[float, float]] = []
                    for point_d in values_d['Keys']:
                        # extract all of the (x,y) points for the stat's scaling
                        x = point_d['Time']
                        y = point_d['Value']
                        assert isinstance(x, float)
                        assert isinstance(y, float)
                        points.append((x, y))
                    scaling_curves[curve_key] = Curve(curve_key, interp_mode, tuple(points))

        print(f'Extracted {len(scaling_curves)} scalar curves')

        return scaling_curves

    def _extract_stat_scalar_grades(self) -> tuple[StatScalarGradeRange, ...]:
        with open(self.ATTACK_DEFS_DIR / 'DT_UI_StatScalarDefinition.json', encoding='utf-8') as f:
            defs_d = json.load(f)[0]['Rows']

        grades: list[StatScalarGradeRange] = []
        for grade_d in defs_d.values():
            min_val = grade_d['MinValue']
            max_val = grade_d['MaxValue']
            grade = grade_d['GradeName']['LocalizedString']
            grades.append(StatScalarGradeRange(grade, min_val, max_val))

        return tuple(grades)

    def _extract_ranged_ammo(self) -> dict[str, int]:
        with open(self.STATS_DIR / 'DT_RangedWeaponStats.json', encoding='utf-8') as f:
            rweapons_d = json.load(f)[0]['Rows']

        ammo_d: dict[str, int] = {}
        for weapon_key, stats_d in rweapons_d.items():
            ammo_num = stats_d['NumberOfAmmoAvailable']
            ammo_d[weapon_key] = ammo_num

        return ammo_d

    def _extract_weapons(self) -> tuple[tuple[Weapon, ...], tuple[BaseDamage, ...]]:
        def read_int(key: str) -> int:
            val = stats_d[key]
            if not isinstance(val, int):
                raise TypeError(f'Expected int value from key "{key}" but got {type(val)}')
            return val

        def read_float(key: str) -> float:
            val = stats_d[key]
            if not isinstance(val, float):
                raise TypeError(f'Expected float value from key "{key}" but got {type(val)}')
            return val

        def read_leveled_val(base_key: str, scaling_key: str | None = None, base_scalar: float = 1.0) -> LeveledValue:
            if scaling_key is None:
                scaling_key = base_key + 'ByLevel'
            base_val = stats_d[base_key]
            if not isinstance(base_val, (int, float)):
                raise TypeError(f'Expected int or float value from key "{base_key}" but got {type(base_val)}')
            base_val *= base_scalar
            scaling_d = stats_d[scaling_key]
            scaling_type = scaling_d['ApplicationType'].split('::')[1]
            if not isinstance(scaling_type, str):
                raise TypeError(f'Expected str value from key "ApplicationType" but got {type(scaling_type)}')
            curve_key = scaling_d['Curve']['RowName']
            curve = self.curves[curve_key] if curve_key != 'None' else None
            return LeveledValue(base_val, curve, scaling_type)

        def read_stat_scaled_dmg_val(stat: STAT, key: str, curve_key: str) -> StatScaledDamage:
            scaling = read_leveled_val(key)
            stat_curve = self.curves[curve_key]
            return StatScaledDamage(stat, base_damage, scaling, stat_curve)

        def read_curve(key: str) -> Curve | None:
            curve_d = stats_d[key]
            curve_key = curve_d['Curve']['RowName']
            if not isinstance(curve_key, str):
                raise TypeError(f'Expected str value from key "RowName" but got {type(curve_key)}')
            return self.curves[curve_key] if curve_key != 'None' else None

        # Method Start
        weapons: list[Weapon] = []
        base_damages: list[BaseDamage] = []

        stats_file = self.STATS_DIR / 'DT_WeaponStats.json'
        print(f'Extracting weapon stats from {stats_file}')

        with open(stats_file, encoding='utf-8') as f:
            weapons_d: dict[str, Any] = json.load(f)[0]['Rows']

        for weapon_key, stats_d in weapons_d.items():
            if (
                weapon_key != 'Default'
                and not weapon_key.endswith('_L')
                and weapon_key != 'WPN_PLA_LA_SoulsLantern'
                and weapon_key != 'WPN_PLA_TH_Hand'
            ):
                if weapon_key not in self.item_metas:
                    print(
                        f'WeaponStats entry for "{weapon_key}" does not correspond to a weapon definition - skipping'
                    )
                    continue

                item_meta = self.item_metas[weapon_key]

                if item_meta.is_base_class:
                    # skip base classes
                    continue

                if item_meta.localization_key not in self.item_loc_names:
                    print(
                        f'WeaponStats entry for "{weapon_key}" does not correspond to a localization string - skipping'
                    )
                    continue

                # --- weapon metadata ---
                weapon_name = self.item_loc_names[item_meta.localization_key]
                # map class names from internal to user-displayed values
                weapon_class = WEAP_CLASS_MAP.get(item_meta.class_name, item_meta.class_name)
                weight = read_float('Weight')
                max_upg_level = read_int('MaxEquipmentLevel')

                # stats needed to wield the weapon
                req_str = read_int('RequirementStrength')
                req_agi = read_int('RequirementAgility')
                req_rad = read_int('RequirementFaith')
                req_inf = read_int('RequirementChaos')
                wield_reqs = PlayerStats(req_str, req_agi, req_rad, req_inf)

                # runes
                rune_sockets: list[str] = []
                for rune_type in stats_d['RuneSocketShapes']:
                    if not isinstance(rune_type, str):
                        raise TypeError(f'Expected str value from key "RuneSocketShapes" but got {type(rune_type)}')
                    rune_type = rune_type.split('::')[1]  # strip everything before '::'
                    if rune_type == 'Circle':
                        rune_type = 'S'
                    elif rune_type == 'Triangle':
                        rune_type = 'A'
                    elif rune_type == 'Square':
                        rune_type = 'R'
                    elif rune_type == 'Star':
                        rune_type = 'I'
                    elif rune_type == 'Meta':
                        rune_type = '*'
                    else:
                        raise ValueError(f'Unhandled rune type: "{rune_type}"')
                    rune_sockets.append(rune_type)
                rune_sockets_by_level = read_curve('RuneSocketsByLevel')
                runes = WeaponRunes(tuple(rune_sockets), rune_sockets_by_level)

                # --- offensive stats ---

                # 'extras'
                # stamina_cost = read_float('StaminaCost')
                pvp_mult = read_float('MultiplierForPVP')
                dmg_poise = read_leveled_val('DamagePoise')
                dmg_stagger = read_leveled_val('DamageStagger')
                dmg_stamina = read_leveled_val('DamageStamina')
                spell_slots = self.ranged_ammo.get(weapon_key, 0) if weapon_class in ('Catalysts', 'Magic') else 0
                weapon_dmg_extras = WeaponDamageExtras(dmg_poise, dmg_stagger, dmg_stamina, pvp_mult, spell_slots)

                dmg_physical = read_leveled_val('DamagePhysical')
                dmg_holy = read_leveled_val('DamageHoly')
                dmg_fire = read_leveled_val('DamageFire')
                dmg_wither = read_leveled_val('DamageDark')
                dmg_spell = read_leveled_val(
                    'SpellPower', base_scalar=100.0
                )  # SP's base value must be multiplied by 100
                base_damage = BaseDamage(dmg_physical, dmg_holy, dmg_fire, dmg_wither, dmg_spell)
                base_damages.append(base_damage)  # keep a reference for easier exporting

                # damage from stat scaling
                str_scaled = read_stat_scaled_dmg_val('S', 'ScalingStrength', 'Scaling_Damage_Strength')
                agi_scaled = read_stat_scaled_dmg_val('A', 'ScalingAgility', 'Scaling_Damage_Agility')
                rad_scaled = read_stat_scaled_dmg_val('R', 'ScalingOrder', 'Scaling_Damage_Faith')
                inf_scaled = read_stat_scaled_dmg_val('I', 'ScalingChaos', 'Scaling_Damage_Chaos')
                weapon_dmg_ar = WeaponDamageAR(base_damage, str_scaled, agi_scaled, rad_scaled, inf_scaled)

                # status effects
                dmg_status_bleed = read_leveled_val('DamageStatusEffectBleed')
                dmg_status_poison = read_leveled_val('DamageStatusEffectPoison')
                dmg_status_frost = read_leveled_val('DamageStatusEffectFrostbite')
                dmg_status_smite = read_leveled_val('DamageStatusEffectSmite')
                dmg_status_burn = read_leveled_val('DamageStatusEffectBurn')
                dmg_status_ignite = read_leveled_val('DamageStatusEffectIgnite')
                weapon_dmg_status = WeaponDamageStatus(
                    dmg_status_bleed,
                    dmg_status_poison,
                    dmg_status_frost,
                    dmg_status_smite,
                    dmg_status_burn,
                    dmg_status_ignite,
                )

                weapon_offense = WeaponOffense(weapon_dmg_ar, weapon_dmg_extras, weapon_dmg_status)

                # --- defensive stats ---
                guard_physical = read_leveled_val('GuardProtectionPhysical')
                guard_holy = read_leveled_val('GuardProtectionHoly')
                guard_fire = read_leveled_val('GuardProtectionFire')
                guard_wither = read_leveled_val('GuardProtectionDark')
                guard_stability = read_leveled_val('Stability')
                weapon_defense = WeaponDefense(guard_physical, guard_holy, guard_fire, guard_wither, guard_stability)

                weapon = Weapon(
                    weapon_key,
                    weapon_name,
                    weapon_class,
                    weight,
                    max_upg_level,
                    wield_reqs,
                    runes,
                    weapon_offense,
                    weapon_defense,
                    self.stat_grade_ranges,
                )
                weapons.append(weapon)

        print(f'Extracted stats for {len(weapons)} weapons!')

        return tuple(weapons), tuple(base_damages)

    @staticmethod
    def export_json(content_dir: str | Path, verify=True) -> None:
        extractor = LOTFExtractor(content_dir)

        out_path = (Path(__file__).parent / '../data/weapons.json').resolve()

        print(f'Exporting weapons data to {out_path}')

        curves = [curve.to_dict() for curve in extractor.curves.values() if curve._points]

        base_damages = [base_damage.to_dict() for base_damage in extractor.base_damages]

        stat_grade_ranges = [grade.to_dict() for grade in extractor.stat_grade_ranges]

        weapon_dicts: list[dict[str, str]] = [weapon.to_dict() for weapon in extractor.weapons]

        output: dict[str, Any] = {
            'curves': curves,
            'base_damages': base_damages,
            'stat_grade_ranges': stat_grade_ranges,
            'weapons': weapon_dicts,
        }

        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(output, f)

        print(f'Exported weapons data to {out_path}!')

        if verify:
            print('Verifying accuracy of export')

            from .load_weapons import load_weapons

            loaded = load_weapons()
            if loaded == extractor.weapons:
                print('Weapons export passed validation!')
            else:
                print('Weapons export failed validation!')
