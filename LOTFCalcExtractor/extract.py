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
    Effect,
    Buff,
    RUNE_SOCKET_MAP,
    SCALING_TYPE,
    Rune,
    WEAP_CLASS_MAP,
    ARMOR_SLOT_MAP,
    ARMOR_INFO_PAT,
    ARMOR_WEIGHT_CLASSES,
    Armor,
    ArmorStats,
    BE_TARGET_MAP,
    BUFF_TARGET,
    RUNE_TYPE_MAP,
    RUNE_SOCKET_TYPE,
)
from .load_weapons import load_json_data


def prune(text: str, prefix: str) -> str:
    if not text.startswith(prefix):
        raise ValueError(f'{text} doesnt start with {prefix}')
    return text[len(prefix) :]


def swap_pre(text: str, prefix: str, repl: str) -> str:
    if text.startswith(prefix):
        return repl + text[len(prefix) :]
    return text


def clean_weapon_icon(icon_path: Path) -> str:
    cleaned = swap_pre(icon_path.name, 'thumb_', 'Thumb_')
    cleaned = swap_pre(cleaned, 'Thumb_', '')
    cleaned = prune(cleaned, 'ItemImg_WPN_PLA_')
    return cleaned


def clean_armor_icon(icon_path: Path) -> str:
    cleaned = prune(icon_path.name, 'thumb_ItemImg_ARM_')
    cleaned = swap_pre(cleaned, 'PLA_', 'Armor_')
    cleaned = prune(cleaned, 'Armor_')
    return cleaned


def clean_rune_icon(icon_path: Path) -> str:
    cleaned = prune(icon_path.name, 'thumb_ItemImg_ITM_RUN_')
    return cleaned


class LOTFExtractor:
    def __init__(self, lotf2_dir: str | Path, mode: str, *args) -> None:
        lotf2_dir = Path(lotf2_dir)
        content_dir = lotf2_dir / 'Content'
        blueprints_dir = content_dir / 'Blueprints'
        data_dir = blueprints_dir / 'Data'
        atk_defs_dir = blueprints_dir / 'Combat/AttackDefinitions'
        self.STATS_DIR = data_dir / 'Stats'
        localization_dir = content_dir / 'Localization/Game/en'

        # required paths
        self.GAME_DIR = content_dir.parent
        self.STAT_SC_DEFS_PATH = atk_defs_dir / 'DT_UI_StatScalarDefinition.json'
        self.BATTLE_EFFECTS_PATH = data_dir / 'BattleEffects/DT_BattleEffectsData.json'
        self.ENEMIES_DIR = data_dir / 'Character/Enemies'
        self.ATTACK_DEFS_PATH = data_dir / 'Combat/DT_GlobalAttackDamageDefinition.json'
        self.ARMOR_META_DIR = data_dir / 'Equipment/Armor/Player'
        self.SPELLS_META_DIR = data_dir / 'Equipment/Items/Magic'
        self.WEAPONS_META_DIR = data_dir / 'Equipment/Weapons/Player'
        self.RUNES_DT_PATH = data_dir / 'Runes/DT_RunesDataTable.json'
        self.RUNES_RELEASE_PATH = data_dir / 'Runes/Release'
        self.CURVE_LIB_PATH = self.STATS_DIR / 'DT_CurveLibrary.json'
        self.RANGED_STATS_PATH = self.STATS_DIR / 'DT_RangedWeaponStats.json'
        self.SC_CURVE_LIB_PATH = self.STATS_DIR / 'DT_ScalingCurveLibrary.json'
        self.SPELLS_STATS_PATH = self.STATS_DIR / 'DT_SpellStats.json'
        self.WEAPON_STATS_PATH = self.STATS_DIR / 'DT_WeaponStats.json'
        self.GAME_LOC_PATH = localization_dir / 'Game.json'
        self.ITEM_ART_PATH = content_dir / 'Art/UI/Items'

        if not mode:
            print('LOTFCalcExtractor: Export Mode')
            curves = self._extract_curves()
            stat_grade_ranges = self._extract_stat_scalar_grades()
            buffs = self._extract_buffs()
            runes = self._extract_runes(buffs)
            ranged_ammo = self._extract_ranged_ammo()
            weapons, base_damages = self._extract_weapons(curves, stat_grade_ranges, ranged_ammo, buffs)
            armor = self._extract_armor()
            self._export_json(curves, stat_grade_ranges, weapons, base_damages, buffs, runes, armor)

        elif mode == 'runes-test':
            print('LOTFCalcExtractor: Runes Test')
            buffs = self._extract_buffs()
            runes = self._extract_runes(buffs)
            self._runes_test(runes)

        elif mode == 'compare':
            self._compare_json(*args)

        elif mode == 'images':
            self._extract_images()

        else:
            print(f'Unknown mode: "{mode}"')

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
                effect_type = param.get('EffectType')
                app_type = ''
                if effect_type == 'ApplyBattleEffectOnKill':
                    app_type = 'On Kill'
                elif effect_type == 'ApplyBattleEffectOnHitToOwner':
                    app_type = 'On Hit'
                elif effect_type == 'ApplyBattleEffectOnHitToTarget':
                    app_type = 'To Target'
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
                if attr == 'MagicRegenRate':
                    app_type = 'Per Second'
                effects.append(Effect(attr, operation, value, app_type))
            if buff_key == 'RUNE_SparkyRune':
                effects.append(Effect('WieldRequirements', 'Multiplicative', 0, ''))
            buffs[buff_key] = Buff(buff_key, tuple(effects))

        # hand-jam rune buffs that couldn't be processed
        buffs['RUNE_WeatheredWeapon'] = Buff(
            'RUNE_WeatheredWeapon', (Effect('DefensePhysical', 'Additive', -20.0, 'On Hit, 10s, 5 Stacks'),)
        )
        buffs['RUNE_VampiricWeapon'] = Buff('RUNE_VampiricWeapon', (Effect('HealthRegen', 'Additive', 3.0, 'On Hit'),))
        buffs['RUNE_DjinnWeapon'] = Buff('RUNE_DjinnWeapon', (Effect('ManaRegen', 'Additive', 3.0, 'On Kill'),))
        buffs['RUNE_StrigaWeapon'] = Buff('RUNE_StrigaWeapon', (Effect('HealthRegen', 'Additive', 15.0, 'On Kill'),))
        buffs['RUNE_StrigaArmor'] = Buff('RUNE_StrigaArmor', (Effect('HealthRegen', 'Additive', 2.0, 'Per Second'),))

        print(f'Extracted {len(buffs)} buffs!')
        return buffs

    def _extract_runes(self, buffs: dict[str, Buff]) -> tuple[Rune, ...]:
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
            rune_name = properties['ItemName']['SourceString'].strip()
            rune_icon = clean_rune_icon(Path(properties['ItemIcon']['ObjectPath']))
            if not rune_icon.endswith('.0'):
                raise ValueError(f'Unhandled thumbnail suffix for "{rune_icon}"')
            rune_icon = rune_icon[:-2]

            # parse the data from the main runes datatable
            dt_entry: dict = dt[rune_key]
            rune_shape = dt_entry['Shape'].split('::')[1]
            rune_type = RUNE_TYPE_MAP[rune_shape]

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
                be_target: Literal['Character', 'Equipment'] = container['BattleEffectTarget'].split('::')[1]
                target = BE_TARGET_MAP.get(be_target, be_target)
                if rune_key == 'WeatheredRune':
                    # special case - re-assign target to 'Enemy'
                    target = 'Enemy'
                if target not in literal_args(BUFF_TARGET):
                    raise ValueError(f'Invalid buff target "{target}"')
                target = cast(BUFF_TARGET, target)
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
                Rune(
                    rune_key,
                    rune_name,
                    rune_icon,
                    rune_type,
                    weap_buff,
                    weap_buff_target,
                    armor_buff,
                    armor_buff_target,
                )
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
        curves: dict[str, Curve],
        stat_grade_ranges: tuple[StatScalarGradeRange, ...],
        ranged_ammo: dict[str, int],
        buffs: dict[str, Buff],
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

        for class_dir in self.WEAPONS_META_DIR.iterdir():
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
                weapon_name = defd['ItemName']['SourceString'].strip()

                # get the path to the armor's thumbnail and clean the path up
                icon = clean_weapon_icon(Path(defd['ItemIcon']['ObjectPath']))
                if not icon.endswith('.0'):
                    raise ValueError(f'Unhandled thumbnail suffix for "{icon}"')
                icon = icon[:-2]

                # check for StanceBattleEffects
                two_hand_bonus: float = 1.0
                if stance_data := defd.get('StanceMovesetData'):
                    assert isinstance(stance_data, list)
                    for stance_d in stance_data:
                        key = stance_d['Key'].split('::')[1]
                        if key == 'Secondary':
                            # two-handing
                            if stance_be := stance_d['Value'].get('StanceBattleEffects'):
                                battle_effects: list = stance_be['BattleEffects']
                                for be in battle_effects:
                                    be_id = be['BattleEffectID']
                                    if buff := buffs.get(be_id):
                                        for effect in buff.effects:
                                            if (
                                                effect.attribute == 'PrimaryWeaponDamageMultiplier'
                                                and effect.scaling_type == 'Additive'
                                            ):
                                                two_hand_bonus = 1 + effect.value
                                            else:
                                                print(
                                                    f'Unhandled BattleEffect for weapon {weapon_name}: {effect.attribute} - skipping BattleEffect'
                                                )

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
                rune_sockets: list[RUNE_SOCKET_TYPE] = []
                for rune_shape in stats_d['RuneSocketShapes']:
                    if not isinstance(rune_shape, str):
                        raise TypeError(f'Expected str value from key "RuneSocketShapes" but got {type(rune_shape)}')
                    rune_shape = rune_shape.split('::')[1]  # strip everything before '::'
                    rune_type: RUNE_SOCKET_TYPE = RUNE_SOCKET_MAP[rune_shape]
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
                weapon_dmg_ar = WeaponDamageAR(
                    base_damage, str_scaled, agi_scaled, rad_scaled, inf_scaled, two_hand_bonus
                )

                # status effects
                dmg_status_bleed = read_leveled_val('DamageStatusEffectBleed')
                dmg_status_burn = read_leveled_val('DamageStatusEffectBurn')
                dmg_status_poison = read_leveled_val('DamageStatusEffectPoison')
                dmg_status_smite = read_leveled_val('DamageStatusEffectSmite')
                dmg_status_ignite = read_leveled_val('DamageStatusEffectIgnite')
                dmg_status_frost = read_leveled_val('DamageStatusEffectFrostbite')
                weapon_dmg_status = WeaponDamageStatus(
                    dmg_status_bleed,
                    dmg_status_burn,
                    dmg_status_poison,
                    dmg_status_smite,
                    dmg_status_ignite,
                    dmg_status_frost,
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
                    icon,
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

    def _extract_armor(self) -> tuple[Armor, ...]:
        print('Extracting armor stats')

        armor: list[Armor] = []

        # load all of the armor stats data tables
        master_stats_d: dict[str, Any] = {}
        for stats_file in (
            'DT_ArmorBootsStats.json',
            'DT_ArmorChestStats.json',
            'DT_ArmorGauntletsStats.json',
            'DT_ArmorHelmetStats.json',
        ):
            stats_path = self.STATS_DIR / stats_file
            with open(stats_path, encoding='utf-8') as f:
                d = json.load(f)[0]['Rows']
                master_stats_d.update(d)

        # scan through the armor definitions subdirs
        for class_dir in self.ARMOR_META_DIR.iterdir():
            if not class_dir.is_dir():
                continue

            for file in class_dir.iterdir():
                if not file.is_file() or file.suffix.lower() != '.json':
                    continue

                with open(file, encoding='utf-8') as f:
                    d = json.load(f)[0]['Properties']

                key = d['StatsRow']['RowName']
                name = d['ItemName']['SourceString'].strip()

                # get the path to the armor's thumbnail and clean the path up
                icon = clean_armor_icon(Path(d['ItemIcon']['ObjectPath']))
                if not icon.endswith('.0'):
                    raise ValueError(f'Unhandled thumbnail suffix for "{icon}"')
                icon = icon[:-2]

                # extract slot and weight class from armor's TagName
                _info_str = d['itemCategory']['TagName']
                m = ARMOR_INFO_PAT.match(_info_str)
                if m is None:
                    raise ValueError(f'Failed to parse armor info string for {key}')
                slot, weight_class = m.groups()
                armor_set = ''

                stats_d = master_stats_d[key]

                stats = ArmorStats(
                    stats_d['Weight'],
                    stats_d['DefensePhysical'],
                    stats_d['DefenseFire'],
                    stats_d['DefenseHoly'],
                    stats_d['DefenseDark'],
                    stats_d['ResistanceBleed'],
                    stats_d['ResistanceBurn'],
                    stats_d['ResistancePoison'],
                    stats_d['ResistanceSmite'],
                    stats_d['ResistanceIgnite'],
                    stats_d['ResistanceFrostbite'],
                    stats_d['Poise'],
                    stats_d['KickPoiseDamageMultiplier'],
                )
                slot = ARMOR_SLOT_MAP[slot]
                if weight_class not in literal_args(ARMOR_WEIGHT_CLASSES):
                    raise ValueError
                weight_class = cast(ARMOR_WEIGHT_CLASSES, weight_class)
                armor.append(Armor(key, name, icon, slot, weight_class, armor_set, stats))

        print(f'Extracted data for {len(armor)} armor pieces')
        return tuple(armor)

    def _export_json(
        self,
        curves: dict[str, Curve],
        stat_grade_ranges: tuple[StatScalarGradeRange, ...],
        weapons: tuple[Weapon, ...],
        base_damages: tuple[BaseDamage, ...],
        buffs: dict[str, Buff],
        runes: tuple[Rune, ...],
        armor: tuple[Armor, ...],
        verify=True,
    ) -> None:
        out_path = (Path(__file__).parent / '../data/data.json').resolve()

        print(f'Exporting weapons data to {out_path}')

        curves_export = [curve.to_dict() for curve in curves.values() if curve._points]

        base_damages_export = [base_damage.to_dict() for base_damage in base_damages]

        stat_grade_ranges_export = [grade.to_dict() for grade in stat_grade_ranges]

        weapons_export = [weapon.to_dict() for weapon in weapons]

        buffs_export = [buff.to_dict() for buff in buffs.values()]

        runes_export = [rune.to_dict() for rune in runes]

        armor_export = [armor_piece.to_dict() for armor_piece in armor]

        output: dict[str, Any] = {
            'curves': curves_export,
            'base_damages': base_damages_export,
            'stat_grade_ranges': stat_grade_ranges_export,
            'weapons': weapons_export,
            'buffs': buffs_export,
            'runes': runes_export,
            'armor': armor_export,
        }

        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(output, f)

        print(f'Exported weapons data to {out_path}!')

        if verify:
            print('Verifying accuracy of export')

            loaded_weaps, loaded_curves, loaded_runes, loaded_armor = load_json_data()
            if loaded_weaps == weapons and loaded_curves == curves and loaded_runes == runes and loaded_armor == armor:
                print('Weapons export passed validation!')
            else:
                print('Weapons export failed validation!')

    def _runes_test(self, runes: tuple[Rune, ...]) -> None:
        print('Weapon Rune Buffs:')
        wrb: list[tuple[str, str, str, str]] = []
        for rune in runes:
            for eff in rune.weapon_buff.effects:
                op = '+' if eff.scaling_type == 'Additive' else '*'
                val = str(int(eff.value)) if float.is_integer(eff.value) else str(eff.value)
                wrb.append((eff.attribute, op, val, rune.weapon_buff_target))

        wrb.sort(key=lambda i: i[0])
        for eff, op, val, wbt in wrb:
            if op == '+' and val.startswith('-'):
                op = ''
            print(f'{eff}{op}{val} -> {wbt}')

        print('\nArmor Rune Buffs:')
        arb: list[tuple[str, str, str, str]] = []
        for rune in runes:
            for eff in rune.armor_buff.effects:
                op = '+' if eff.scaling_type == 'Additive' else '*'
                val = str(int(eff.value)) if float.is_integer(eff.value) else str(eff.value)
                arb.append((eff.attribute, op, val, rune.weapon_buff_target))

        arb.sort(key=lambda i: i[0])
        for eff, op, val, wbt in arb:
            if op == '+' and val.startswith('-'):
                op = ''
            print(f'{eff}{op}{val} -> {wbt}')

    def _compare_json(self, file1: Path | str, file2: Path | str) -> None:
        def compare_dicts(
            d1: dict[str, Any] | tuple, d2: dict[str, Any] | tuple, n1: str, n2: str, type_name: str
        ) -> bool:
            def _compare_dicts(
                d1: dict[str, Any], d2: dict[str, Any], n1: str, n2: str, checked_set: set[str], type_name: str
            ) -> bool:
                _mismatch = False
                for key, v1 in d1.items():
                    if key not in checked_set:
                        v2 = d2.get(key)
                        if v2 is None:
                            _mismatch = True
                            print(f'{type_name} "{key}" in {n1} does not exist in {n2}')
                        else:
                            if v1 != v2:
                                _mismatch = True
                                print(f'{type_name} value mismatch for {type_name} "{key}":')
                                print(f'    {n1} has: {v1}')
                                print(f'    {n2} has: {v2}')
                        checked_set.add(key)
                return _mismatch

            if not isinstance(d1, dict):
                d1 = {x.key: x for x in d1}
            if not isinstance(d2, dict):
                d2 = {x.key: x for x in d2}
            checked_set: set[str] = set()
            mismatch = False
            print(f'Comparing {type_name}s')
            if len(d1) != len(d2):
                mismatch = True
                print(f'{type_name} count mismatch:')
                print(f'{n1} has {len(d1)}')
                print(f'{n2} has {len(d2)}')
            mm1 = _compare_dicts(d1, d2, n1, n2, checked_set, type_name)
            mm2 = _compare_dicts(d2, d1, n2, n1, checked_set, type_name)
            mismatch = mismatch or mm1 or mm2
            if not mismatch:
                print(f'All {type_name}s match')
            else:
                print(f'At least one {type_name} mismatch was present')
            return mismatch

        # Method start
        file1 = (Path(__file__).parent / f'../data/{file1}').resolve()
        file2 = (Path(__file__).parent / f'../data/{file2}').resolve()

        name1 = file1.name
        name2 = file2.name

        print(f'Comparing extracted data in {file1} against data in {file2}')

        weaps1, curves1, runes1, armor1 = load_json_data(file1)
        weaps2, curves2, runes2, armor2 = load_json_data(file2)

        compare_dicts(curves1, curves2, name1, name2, 'Curve')
        compare_dicts(runes1, runes2, name1, name2, 'Rune')
        compare_dicts(weaps1, weaps2, name1, name2, 'Weapon')
        compare_dicts(armor1, armor2, name1, name2, 'Armor')

    def _extract_images(self) -> None:
        pass  # TODO
