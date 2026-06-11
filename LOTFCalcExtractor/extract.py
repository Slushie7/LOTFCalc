import json
from pathlib import Path
from typing import Any, Iterable, Literal, get_args as literal_args, cast

from .classes import (
    STAT,
    BaseDamage,
    Curve,
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
    WeaponRuneSockets,
    RUNE_TYPE,
    Effect,
    Buff,
    SCALING_TYPE,
    Rune,
)
from .load_weapons import load_json_data


WEAP_CLASS_MAP: dict[str, str] = {
    # maps the game's internal weapon classes to user-displayed classes
    'CrossBows': 'Crossbows',
    'FistWeapons': 'Fists',
    'GreatAxes': 'Grand Axes',
    'GreatHammers': 'Grand Hammers',
    'GreatSwords': 'Long Swords',
    'Magic': 'Catalysts',
    'ShortSwords': 'Short Swords',
    'UltraGreatSwords': 'Grand Swords',
}

RUNE_SHAPE_MAP: dict[str, RUNE_TYPE] = {'Circle': 'S', 'Triangle': 'A', 'Square': 'R', 'Star': 'I', 'Meta': '*'}


class LOTFExtractor:
    def __init__(self, lotf2_dir: str | Path, mode: str) -> None:
        lotf2_dir = Path(lotf2_dir)
        content_dir = lotf2_dir / 'Content'
        blueprints_dir = content_dir / 'Blueprints'
        atk_defs_dir = blueprints_dir / 'Combat/AttackDefinitions'
        stats_dir = blueprints_dir / 'Data/Stats'
        localization_dir = content_dir / 'Localization/Game/en'

        # required paths
        self.STAT_SC_DEFS_PATH = atk_defs_dir / 'DT_UI_StatScalarDefinition.json'
        self.BATTLE_EFFECTS_PATH = blueprints_dir / 'Data/BattleEffects/DT_BattleEffectsData.json'
        self.PLAYER_WEAPONS_DIR = blueprints_dir / 'Data/Equipment/Weapons/Player'
        self.RUNES_DT_PATH = blueprints_dir / 'Data/Runes/DT_RunesDataTable.json'
        self.RUNES_RELEASE_PATH = blueprints_dir / 'Data/Runes/Release'
        self.CURVE_LIB_PATH = stats_dir / 'DT_CurveLibrary.json'
        self.RANGED_STATS_PATH = stats_dir / 'DT_RangedWeaponStats.json'
        self.SC_CURVE_LIB_PATH = stats_dir / 'DT_ScalingCurveLibrary.json'
        self.WEAPON_STATS_PATH = stats_dir / 'DT_WeaponStats.json'
        self.GAME_LOC_PATH = localization_dir / 'Game.json'
        self.REQUIRED_PATHS = (
            self.STAT_SC_DEFS_PATH,
            self.BATTLE_EFFECTS_PATH,
            self.PLAYER_WEAPONS_DIR,
            self.RUNES_DT_PATH,
            self.RUNES_RELEASE_PATH,
            self.CURVE_LIB_PATH,
            self.RANGED_STATS_PATH,
            self.SC_CURVE_LIB_PATH,
            self.WEAPON_STATS_PATH,
            self.GAME_LOC_PATH,
        )

        self._verify_paths()

        if not mode:
            print('LOTFCalcExtractor: Export Mode')
            local_names = self._extract_item_strings()
            curves = self._extract_curves()
            stat_grade_ranges = self._extract_stat_scalar_grades()
            buffs = self._extract_buffs()
            runes = self._extract_runes(local_names, buffs)
            ranged_ammo = self._extract_ranged_ammo()
            weapons, base_damages = self._extract_weapons(local_names, curves, stat_grade_ranges, ranged_ammo)
            self.export_json(curves, stat_grade_ranges, weapons, base_damages, buffs, runes)

        elif mode == 'runes-test':
            print('LOTFCalcExtractor: Runes Test')
            local_names = self._extract_item_strings()
            buffs = self._extract_buffs()
            runes = self._extract_runes(local_names, buffs)
            self._runes_test(runes)

        else:
            print(f'Unknown mode: "{mode}"')

    def _verify_paths(self) -> None:
        """Verifies that all of the required exported game files are present."""

        error: bool = False

        for path in self.REQUIRED_PATHS:
            if not path.exists():
                error = True
                ptype = 'file' if path.suffix else 'folder'
                print(f'Failed to find {ptype} "{path.name}" at {path.resolve()}')

        if error:
            raise FileNotFoundError(
                'One or more necessary files/folders could not be located. Ensure LOTFCalcExtractor is pointed at the main "LOTF2" folder exported from FModel.'
            )
        else:
            print('All necessary files appear to be present.')

    def _extract_item_strings(self) -> dict[str, str]:
        """Reads the game's localization file, extracting item names.

        Returns a dict mapping loc_key -> item_name"""

        print(f'Extracting localized item strings from {self.GAME_LOC_PATH}')

        with open(self.GAME_LOC_PATH, encoding='utf-8') as f:
            game_d = json.load(f)

        item_strings: dict[str, str] = {}
        for loc_key, item_name in game_d['Items'].items():
            assert isinstance(loc_key, str)
            assert isinstance(item_name, str)
            item_strings[loc_key] = item_name

        print(f'Extracted {len(item_strings)} localized item strings')

        return item_strings

    # def _extract_weapon_item_metas(self) -> dict[str, ItemGameMeta]:
    #     """Read the weapon definition files, extracting weapon class names and localization reference keys.

    #     Returns a dict mapping weapon_key -> class_name and a dict mapping weapon_key -> loc_key"""

    #     def extract_meta(file_path: Path, weap_class: str, is_base_class: bool) -> None:
    #         with open(file_path, encoding='utf-8') as f:
    #             weapon_d = json.load(f)[1]['Properties']

    #         weap_key = weapon_d['StatsRow']['RowName']
    #         loc_key = weapon_d['ItemName']['Key'] if not is_base_class else ''
    #         weapon_meta[weap_key] = ItemGameMeta(weap_class, loc_key, is_base_class)

    #     print(f'Extracting weapon metadata from {self.PLAYER_WEAPONS_DIR}')

    #     weapon_meta: dict[str, ItemGameMeta] = {}

    #     for class_dir in self.PLAYER_WEAPONS_DIR.iterdir():
    #         if class_dir.is_dir():
    #             weapon_class = class_dir.stem
    #             for file in class_dir.iterdir():
    #                 if file.suffix.lower() == '.json':
    #                     extract_meta(file, weapon_class, False)

    #             base_dir = class_dir / 'Base'
    #             if base_dir.exists() and base_dir.is_dir():
    #                 for file in base_dir.iterdir():
    #                     # read the Base weapon metas
    #                     if file.suffix.lower() == '.json':
    #                         # extract Base weapon metas but flag them
    #                         extract_meta(file, weapon_class, True)

    #     print(f'Extracted metadata for {len(weapon_meta)} weapons (including base classes and deprecated assets)')

    #     return weapon_meta

    def _extract_curves(self) -> dict[str, Curve]:
        """Reads the scaling curves used by the game for numerical calculations.

        Returns a dict mapping curve_key -> ScalingCurve"""

        scaling_curves: dict[str, Curve] = {}

        for file_path in (self.SC_CURVE_LIB_PATH, self.CURVE_LIB_PATH):
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
                    if points:  # skip empty Curves
                        scaling_curves[curve_key] = Curve(curve_key, interp_mode, tuple(points))

        print(f'Extracted {len(scaling_curves)} scalar curves')

        return scaling_curves

    def _extract_stat_scalar_grades(self) -> tuple[StatScalarGradeRange, ...]:
        with open(self.STAT_SC_DEFS_PATH, encoding='utf-8') as f:
            defs_d = json.load(f)[0]['Rows']

        grades: list[StatScalarGradeRange] = []
        for grade_d in defs_d.values():
            min_val = grade_d['MinValue']
            max_val = grade_d['MaxValue']
            grade = grade_d['GradeName']['LocalizedString']
            grades.append(StatScalarGradeRange(grade, min_val, max_val))

        return tuple(grades)

    def _extract_buffs(self) -> dict[str, Buff]:
        print('Extracting buffs')

        with open(self.BATTLE_EFFECTS_PATH, encoding='utf-8') as f:
            d = json.load(f)[0]['Rows']

        buffs: dict[str, Buff] = {}
        for buff_key, ed in d.items():
            duration = ed.get('DurationPolicy', '::').split('::')[1]
            if duration != 'Infinite':
                continue
            # EffectParamsContainer -> NumericEffectParams[]
            if not (params_cont := ed.get('EffectParamsContainer')):
                continue

            effects: list[Effect] = []
            effect_params: Iterable[dict] = params_cont.get('NumericEffectParams', ())
            for param in effect_params:
                value = param.get('Value', 0.0)
                mod_type = param.get('ModType', '')
                if not mod_type:
                    continue

                # parse the buff's operation
                operation = mod_type.split('::')[1]
                if operation == 'Max':
                    # 'Max' ops don't seem to apply to runes - skip
                    continue
                if operation == 'Override':
                    # 'Override' ops only apply to status effects - skip
                    continue
                if isinstance(operation, str) and operation == 'HexMultiplicitive':
                    # a HexMultiplicitive is equivalent to a Multiplicative with value+1
                    value += 1.0
                    operation = 'Multiplicative'
                if operation == 'Multiplicitive':
                    # fix devs' typo
                    operation = 'Multiplicative'
                if operation not in literal_args(SCALING_TYPE):
                    raise ValueError(f'Unexpected ModType value "{operation}" (expected {SCALING_TYPE})')
                operation = cast(SCALING_TYPE, operation)

                attr = param.get('Attribute', {}).get('AttributeName', '')
                if not attr:
                    continue
                effects.append(Effect(attr, operation, value))
            buffs[buff_key] = Buff(buff_key, tuple(effects))

        print(f'Extracted {len(buffs)} buffs!')
        return buffs

    def _extract_runes(self, local_names: dict[str, str], buffs: dict[str, Buff]) -> tuple[Rune, ...]:
        print('Extracting runes')

        runes: list[Rune] = []

        with open(self.RUNES_DT_PATH, encoding='utf-8') as f:
            dt: dict[str, dict] = json.load(f)[0]['Rows']

        for rune_file in self.RUNES_RELEASE_PATH.iterdir():
            if not rune_file.is_file() or not rune_file.suffix.lower() == '.json':
                continue

            with open(rune_file, encoding='utf-8') as f:
                properties: dict[str, Any] = json.load(f)[1]['Properties']

            # get the rune's localized name
            rune_key = properties['RuneDefinionRow']['RowName']
            loc_key = properties['ItemName']['Key']
            rune_name = local_names[loc_key]

            # parse the data from the main runes datatable
            dt_entry: dict = dt[rune_key]
            rune_shape = dt_entry['Shape'].split('::')[1]
            rune_type = RUNE_SHAPE_MAP[rune_shape]

            weap_buff: Buff | None = None
            weap_buff_target: str | None = None
            armor_buff: Buff | None = None
            armor_buff_target: str | None = None
            for bed in dt_entry['BattleEffects']:
                effect_type: Literal['Weapon', 'Armor'] = bed['Key'].split('::')[1]
                containers = bed['Value']['ContainerArray']
                if not containers:
                    continue
                if len(containers) > 1:
                    raise ValueError('Too many containers')
                container = containers[0]
                target: Literal['Character', 'Equipment'] = container['BattleEffectTarget'].split('::')[1]
                buff_id = container['BattleEffect']['BattleEffectID']
                if effect_type == 'Weapon':
                    weap_buff, weap_buff_target = buffs[buff_id], target
                elif effect_type == 'Armor':
                    armor_buff, armor_buff_target = buffs[buff_id], target
                else:
                    raise ValueError(f'Unhandled effect type: "{effect_type}"')
            if weap_buff is None or weap_buff_target is None:
                raise ValueError(f'Failed to retrieve weapon buff for rune {rune_key}')
            if armor_buff is None or armor_buff_target is None:
                raise ValueError(f'Failed to retrieve armor buff for rune {rune_key}')
            runes.append(
                Rune(rune_key, rune_name, rune_type, weap_buff, weap_buff_target, armor_buff, armor_buff_target)
            )

        print(f'Extracted {len(runes)} runes!')
        return tuple(runes)

    def _extract_ranged_ammo(self) -> dict[str, int]:
        with open(self.RANGED_STATS_PATH, encoding='utf-8') as f:
            rweapons_d = json.load(f)[0]['Rows']

        ammo_d: dict[str, int] = {}
        for weapon_key, stats_d in rweapons_d.items():
            ammo_num = stats_d['NumberOfAmmoAvailable']
            ammo_d[weapon_key] = ammo_num

        return ammo_d

    def _extract_weapons(
        self,
        local_names: dict[str, str],
        curves: dict[str, Curve],
        stat_grade_ranges: tuple[StatScalarGradeRange, ...],
        ranged_ammo: dict[str, int],
    ) -> tuple[tuple[Weapon, ...], tuple[BaseDamage, ...]]:
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
            if scaling_type not in literal_args(SCALING_TYPE):
                raise TypeError(f'Unexpected ApplicationType value "{scaling_type}" (expected {SCALING_TYPE})')
            scaling_type: SCALING_TYPE
            curve_key = scaling_d['Curve']['RowName']
            curve = curves[curve_key] if curve_key != 'None' else None
            return LeveledValue(base_val, curve, scaling_type)

        def read_stat_scaled_dmg_val(stat: STAT, key: str, curve_key: str) -> StatScaledDamage:
            scaling = read_leveled_val(key)
            stat_curve = curves[curve_key]
            return StatScaledDamage(stat, base_damage, scaling, stat_curve)

        def read_curve(key: str) -> Curve | None:
            curve_d = stats_d[key]
            curve_key = curve_d['Curve']['RowName']
            if not isinstance(curve_key, str):
                raise TypeError(f'Expected str value from key "RowName" but got {type(curve_key)}')
            return curves[curve_key] if curve_key != 'None' else None

        # Method Start
        weapons: list[Weapon] = []
        base_damages: list[BaseDamage] = []

        print('Extracting weapon stats')

        with open(self.WEAPON_STATS_PATH, encoding='utf-8') as f:
            weapons_dt: dict[str, Any] = json.load(f)[0]['Rows']

        for class_dir in self.PLAYER_WEAPONS_DIR.iterdir():
            if not class_dir.is_dir():
                continue

            wc = class_dir.stem
            weapon_class = WEAP_CLASS_MAP.get(wc, wc)
            if weapon_class in ('DEV', 'Lantern', 'Throwables'):
                continue

            for file in class_dir.iterdir():
                if not file.is_file() or file.suffix.lower() != '.json':
                    continue

                # get weapon metadata
                with open(file, encoding='utf-8') as f:
                    defd = json.load(f)[1]['Properties']
                weapon_key = defd['StatsRow']['RowName']
                loc_key = defd['ItemName']['Key']
                if (weapon_name := local_names.get(loc_key)) is None:
                    print(f'Failed to retrieve localized name for weapon {weapon_key} - skipping')
                    continue
                weapon_name = local_names[loc_key]

                # get weapon stats from DT_WeaponStats
                stats_d: dict[str, Any]
                if (stats_d := weapons_dt.get(weapon_key)) is None:  # type: ignore
                    print(f'Weapon definition for {weapon_key} does not map to a DT_WeaponStats entry - skipping')
                    continue

                weight = read_float('Weight')
                max_upg_level = read_int('MaxEquipmentLevel')

                # stats needed to wield the weapon
                req_str = read_int('RequirementStrength')
                req_agi = read_int('RequirementAgility')
                req_end = read_int('RequirementEndurance')
                req_vit = read_int('RequirementVitality')
                req_rad = read_int('RequirementFaith')
                req_inf = read_int('RequirementChaos')
                wield_reqs = PlayerStats(req_str, req_agi, req_end, req_vit, req_rad, req_inf)

                # runes
                rune_sockets: list[RUNE_TYPE] = []
                for rune_shape in stats_d['RuneSocketShapes']:
                    if not isinstance(rune_shape, str):
                        raise TypeError(f'Expected str value from key "RuneSocketShapes" but got {type(rune_shape)}')
                    rune_shape = rune_shape.split('::')[1]  # strip everything before '::'
                    rune_type: RUNE_TYPE = RUNE_SHAPE_MAP[rune_shape]
                    rune_sockets.append(rune_type)
                rune_sockets_by_level = read_curve('RuneSocketsByLevel')
                weap_rune_sockets = WeaponRuneSockets(tuple(rune_sockets), rune_sockets_by_level)

                # --- offensive stats ---

                # 'extras'
                # stamina_cost = read_float('StaminaCost')
                pvp_mult = read_float('MultiplierForPVP')
                dmg_poise = read_leveled_val('DamagePoise')
                dmg_stagger = read_leveled_val('DamageStagger')
                dmg_stamina = read_leveled_val('DamageStamina')
                spell_slots = ranged_ammo.get(weapon_key, 0) if weapon_class in ('Catalysts', 'Magic') else 0
                weapon_dmg_extras = WeaponDamageExtras(dmg_poise, dmg_stagger, dmg_stamina, pvp_mult, spell_slots)

                dmg_physical = read_leveled_val('DamagePhysical')
                dmg_holy = read_leveled_val('DamageHoly')
                dmg_fire = read_leveled_val('DamageFire')
                dmg_wither = read_leveled_val('DamageDark')
                dmg_spell = read_leveled_val(
                    'SpellPower', base_scalar=100.0
                )  # SP's base value must be multiplied by 100
                base_damage = BaseDamage(dmg_physical, dmg_holy, dmg_fire, dmg_wither, dmg_spell)
                base_damages.append(base_damage)  # keep a reference for exporting

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
                    weap_rune_sockets,
                    weapon_offense,
                    weapon_defense,
                    stat_grade_ranges,
                )
                weapons.append(weapon)

        print(f'Extracted stats for {len(weapons)} weapons!')

        return tuple(weapons), tuple(base_damages)

    def export_json(
        self,
        curves: dict[str, Curve],
        stat_grade_ranges: tuple[StatScalarGradeRange, ...],
        weapons: tuple[Weapon, ...],
        base_damages: tuple[BaseDamage, ...],
        buffs: dict[str, Buff],
        runes: tuple[Rune, ...],
        verify=True,
    ) -> None:
        out_path = (Path(__file__).parent / '../data/weapons.json').resolve()

        print(f'Exporting weapons data to {out_path}')

        curves_export = [curve.to_dict() for curve in curves.values() if curve._points]

        base_damages_export = [base_damage.to_dict() for base_damage in base_damages]

        stat_grade_ranges_export = [grade.to_dict() for grade in stat_grade_ranges]

        weapons_export: list[dict[str, str]] = [weapon.to_dict() for weapon in weapons]

        buffs_export = [buff.to_dict() for buff in buffs.values()]

        runes_export = [rune.to_dict() for rune in runes]

        output: dict[str, Any] = {
            'curves': curves_export,
            'base_damages': base_damages_export,
            'stat_grade_ranges': stat_grade_ranges_export,
            'weapons': weapons_export,
            'buffs': buffs_export,
            'runes': runes_export,
        }

        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(output, f)

        print(f'Exported weapons data to {out_path}!')

        if verify:
            print('Verifying accuracy of export')

            loaded_weaps, loaded_curves, loaded_runes = load_json_data()
            if loaded_weaps == weapons and loaded_curves == curves and loaded_runes == runes:
                print('Weapons export passed validation!')
            else:
                print('Weapons export failed validation!')

    def _runes_test(self, runes: tuple[Rune, ...]) -> None:
        print('Weapon Rune Buffs:')
        for rune in runes:
            for eff in rune.weapon_buff.effects:
                eff.scaling_type
                print(f'{eff.attribute}')

        print('\nArmor Rune Buffs:')
