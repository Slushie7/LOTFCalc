import math
import re
from dataclasses import dataclass, field
from typing import Any, Literal, Self

STAT = Literal['S', 'A', 'R', 'I']
RUNE_SOCKET_TYPE = Literal['S', 'A', 'R', 'I', '*']
RUNE_TYPE = Literal['Strength', 'Agility', 'Radiance', 'Inferno']
SCALING_TYPE = Literal['Additive', 'Multiplicative']

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
    'crossbows': 'Crossbows',
}

RUNE_SOCKET_MAP: dict[str, RUNE_SOCKET_TYPE] = {
    'Circle': 'S',
    'Triangle': 'A',
    'Square': 'R',
    'Star': 'I',
    'Meta': '*',
}
RUNE_TYPE_MAP: dict[str, RUNE_TYPE] = {
    'Circle': 'Strength',
    'Triangle': 'Agility',
    'Square': 'Radiance',
    'Star': 'Inferno',
}
ARMOR_SLOT = Literal['Torso', 'Arms', 'Head', 'Legs']
ARMOR_SLOT_MAP: dict[str, ARMOR_SLOT] = {
    'Body': 'Torso',
    'Arms': 'Arms',
    'Head': 'Head',
    'Legs': 'Legs',
}
ARMOR_WEIGHT_CLASSES = Literal['Light', 'Medium', 'Heavy']
ARMOR_INFO_PAT = re.compile(r'Inventory\.Category\.Equipment\.Armor\.(.*?)\.(.*?)\..*')

BUFF_TARGET = Literal['Player', 'Equipment', 'Enemy']
BE_TARGET_MAP: dict[str, str] = {
    'Character': 'Player',
}

BUFF_ATTR_MAP: dict[str, str] = {
    'Faith': 'Radiance',
    'Chaos': 'Inferno',
    'ScalingOrder': 'ScalingRadiance',
    'ScalingChaos': 'ScalingInferno',
    'DamageDark': 'DamageWither',
    'DefenseDark': 'DefenseWither',
    'MaxBuildupSmite': 'ResistSmite',
    'MaxBuildupBleed': 'ResistBleed',
    'MaxBuildupBurn': 'ResistBurn',
    'MaxBuildupIgnite': 'ResistIgnite',
    'MaxBuildupFrostbite': 'ResistFrostbite',
    'MaxBuildupPoison': 'ResistPoison',
    'MagicRegenRate': 'ManaRegen',
    'Magic': 'Mana',
    'GlobalStaminaBlockingProtection': 'Stability',
}


def epsilon_floor(x: float) -> int:
    return math.floor(x + 1e-9)


# ================================
# Storable Primitives
# ================================


@dataclass(frozen=True)
class Curve:
    key: str
    _interp_mode: str
    _points: tuple[tuple[float, float], ...] = field(repr=False)

    def to_dict(self) -> dict[str, Any]:
        return {
            'key': self.key,
            '_interp_mode': self._interp_mode,
            '_points': self._points,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> Self:
        points = tuple(tuple(pt) for pt in d['_points'])
        return cls(d['key'], d['_interp_mode'], points)


@dataclass(frozen=True)
class LeveledValue:
    base: float
    curve: Curve | None
    scaling_type: SCALING_TYPE

    def to_dict(self) -> dict[str, Any]:
        return {
            'base': self.base,
            'curve_key': self.curve.key if self.curve else None,
            'scaling_type': self.scaling_type,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any], curves_d: dict[str, Curve]) -> Self:
        curve_key = d['curve_key']
        curve = curves_d[curve_key] if curve_key else None
        return cls(d['base'], curve, d['scaling_type'])


@dataclass(frozen=True)
class BaseDamage:
    """Collection of LeveledValues for physical, holy, fire, wither, and spell_power damage types."""

    dmg_physical: LeveledValue
    dmg_holy: LeveledValue
    dmg_fire: LeveledValue
    dmg_wither: LeveledValue
    dmg_spell: LeveledValue
    key: str = field(default='', compare=False)

    def __post_init__(self) -> None:
        if not self.key:
            object.__setattr__(self, 'key', str(id(self)))

    def to_dict(self) -> dict[str, Any]:
        return {
            'dmg_physical': self.dmg_physical.to_dict(),
            'dmg_holy': self.dmg_holy.to_dict(),
            'dmg_fire': self.dmg_fire.to_dict(),
            'dmg_wither': self.dmg_wither.to_dict(),
            'dmg_spell': self.dmg_spell.to_dict(),
            'key': self.key,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any], curves_d: dict[str, Curve]) -> Self:
        physical = LeveledValue.from_dict(d['dmg_physical'], curves_d)
        holy = LeveledValue.from_dict(d['dmg_holy'], curves_d)
        fire = LeveledValue.from_dict(d['dmg_fire'], curves_d)
        wither = LeveledValue.from_dict(d['dmg_wither'], curves_d)
        spell = LeveledValue.from_dict(d['dmg_spell'], curves_d)
        key = d['key']

        return cls(physical, holy, fire, wither, spell, key)


@dataclass(frozen=True)
class StatScalarGradeRange:
    grade: str
    min_incl: int
    max_excl: int

    def to_dict(self) -> dict[str, Any]:
        return {
            'grade': self.grade,
            'min_incl': self.min_incl,
            'max_excl': self.max_excl,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> Self:
        return cls(d['grade'], d['min_incl'], d['max_excl'])


@dataclass(frozen=True)
class StatScaledDamage:
    """Stat-scaled damage: base_damage (P,H,F,W), weapon's scaling with the stat, and the stat's generic power curve."""

    stat: STAT
    base_damage: BaseDamage
    stat_scaling: LeveledValue
    stat_curve: Curve | None

    def to_dict(self) -> dict[str, Any]:
        return {
            'stat': self.stat,
            'bd_key': self.base_damage.key,
            'stat_scaling': self.stat_scaling.to_dict(),
            'stat_curve_key': self.stat_curve.key if self.stat_curve else None,
        }

    @classmethod
    def from_dict(
        cls,
        d: dict[str, Any],
        curves_d: dict[str, Curve],
        base_damages_d: dict[str, BaseDamage],
    ) -> Self:
        base_damage = base_damages_d[d['bd_key']]
        stat_scaling = LeveledValue.from_dict(d['stat_scaling'], curves_d)
        curve_key = d['stat_curve_key']
        stat_curve = curves_d[curve_key] if curve_key else None

        return cls(d['stat'], base_damage, stat_scaling, stat_curve)


@dataclass(frozen=True)
class PlayerStats:
    strength: int
    agility: int
    endurance: int
    vitality: int
    radiance: int
    inferno: int

    def to_dict(self) -> dict[str, Any]:
        return {
            'strength': self.strength,
            'agility': self.agility,
            'endurance': self.endurance,
            'vitality': self.vitality,
            'radiance': self.radiance,
            'inferno': self.inferno,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> Self:
        return cls(
            d['strength'],
            d['agility'],
            d['endurance'],
            d['vitality'],
            d['radiance'],
            d['inferno'],
        )


@dataclass(frozen=True)
class StartingClass:
    name: str
    stats: PlayerStats

    def to_dict(self) -> dict[str, Any]:
        return {'name': self.name, 'stats': self.stats.to_dict()}

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> Self:
        return cls(d['name'], PlayerStats.from_dict(d['stats']))


@dataclass(frozen=True)
class Effect:
    attribute: str
    scaling_type: SCALING_TYPE
    value: float
    app_type: str

    def to_dict(self) -> dict[str, Any]:
        return {
            'attribute': self.attribute,
            'scaling_type': self.scaling_type,
            'value': self.value,
            'app_type': self.app_type,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> Self:
        return cls(d['attribute'], d['scaling_type'], d['value'], d['app_type'])


@dataclass(frozen=True)
class Buff:
    key: str
    effects: tuple[Effect, ...]

    def to_dict(self) -> dict[str, Any]:
        return {
            'key': self.key,
            'effects': [effect.to_dict() for effect in self.effects],
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> Self:
        return cls(d['key'], tuple(Effect.from_dict(ed) for ed in d['effects']))


@dataclass(frozen=True)
class Item:
    key: str
    name: str
    icon: str

    def to_dict(self) -> dict[str, Any]:
        return {'key': self.key, 'name': self.name, 'icon': self.icon}

    @classmethod
    def from_dict(cls, d: dict[str, Any], *args, **kwargs) -> Self:
        return cls(d['key'], d['name'], d['icon'])


@dataclass(frozen=True)
class Rune(Item):
    type: RUNE_TYPE
    weapon_buff: Buff
    weapon_buff_target: BUFF_TARGET
    armor_buff: Buff
    armor_buff_target: BUFF_TARGET

    def to_dict(self) -> dict[str, Any]:
        return super().to_dict() | {
            'type': self.type,
            'weapon_buff_key': self.weapon_buff.key,
            'weapon_buff_target': self.weapon_buff_target,
            'armor_buff_key': self.armor_buff.key,
            'armor_buff_target': self.armor_buff_target,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any], buffs_d: dict[str, Buff]) -> Self:
        return cls(
            d['key'],
            d['name'],
            d['icon'],
            d['type'],
            buffs_d[d['weapon_buff_key']],
            d['weapon_buff_target'],
            buffs_d[d['armor_buff_key']],
            d['armor_buff_target'],
        )


@dataclass(frozen=True)
class ArmorStats:
    weight: float
    def_physical: float
    def_fire: float
    def_holy: float
    def_wither: float
    res_smite: float
    res_bleed: float
    res_burn: float
    res_ignite: float
    res_frost: float
    res_poison: float
    poise: float
    kick_mult: float

    def to_dict(self) -> dict[str, Any]:
        return {
            'weight': self.weight,
            'def_physical': self.def_physical,
            'def_fire': self.def_fire,
            'def_holy': self.def_holy,
            'def_wither': self.def_wither,
            'res_smite': self.res_smite,
            'res_bleed': self.res_bleed,
            'res_burn': self.res_burn,
            'res_ignite': self.res_ignite,
            'res_frost': self.res_frost,
            'res_poison': self.res_poison,
            'poise': self.poise,
            'kick_mult': self.kick_mult,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> Self:
        return cls(
            d['weight'],
            d['def_physical'],
            d['def_fire'],
            d['def_holy'],
            d['def_wither'],
            d['res_smite'],
            d['res_bleed'],
            d['res_burn'],
            d['res_ignite'],
            d['res_frost'],
            d['res_poison'],
            d['poise'],
            d['kick_mult'],
        )


@dataclass(frozen=True)
class Armor(Item):
    slot: ARMOR_SLOT
    weight_class: ARMOR_WEIGHT_CLASSES
    set: str
    stats: ArmorStats

    def to_dict(self) -> dict[str, Any]:
        return super().to_dict() | {
            'slot': self.slot,
            'weight_class': self.weight_class,
            'set': self.set,
            'stats': self.stats.to_dict(),
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> Self:
        return cls(
            d['key'],
            d['name'],
            d['icon'],
            d['slot'],
            d['weight_class'],
            d['set'],
            ArmorStats.from_dict(d['stats']),
        )


# ================================
# Ephemeral Primitives
# ================================


@dataclass(frozen=True)
class WeaponRuneSockets:
    rune_sockets: tuple[RUNE_SOCKET_TYPE, ...]
    num_by_level: Curve | None

    def to_dict(self) -> dict[str, Any]:
        return {
            'rune_sockets': self.rune_sockets,
            'curve_key': self.num_by_level.key if self.num_by_level else None,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any], curves_d: dict[str, Curve]) -> Self:
        curve_key = d['curve_key']
        return cls(tuple(d['rune_sockets']), curves_d[curve_key] if curve_key else None)


@dataclass(frozen=True)
class WeaponDamageAR:
    base_damage: BaseDamage
    scaled_str: StatScaledDamage
    scaled_agi: StatScaledDamage
    scaled_rad: StatScaledDamage
    scaled_inf: StatScaledDamage
    two_hand_bonus: float

    def to_dict(self) -> dict[str, Any]:
        return {
            'bd_key': self.base_damage.key,
            'scaled_str': self.scaled_str.to_dict(),
            'scaled_agi': self.scaled_agi.to_dict(),
            'scaled_rad': self.scaled_rad.to_dict(),
            'scaled_inf': self.scaled_inf.to_dict(),
            'two_hand_bonus': self.two_hand_bonus,
        }

    @classmethod
    def from_dict(
        cls,
        d: dict[str, Any],
        curves_d: dict[str, Curve],
        base_damages_d: dict[str, BaseDamage],
    ) -> Self:
        base_damage = base_damages_d[d['bd_key']]
        strength = StatScaledDamage.from_dict(d['scaled_str'], curves_d, base_damages_d)
        agility = StatScaledDamage.from_dict(d['scaled_agi'], curves_d, base_damages_d)
        radiance = StatScaledDamage.from_dict(d['scaled_rad'], curves_d, base_damages_d)
        inferno = StatScaledDamage.from_dict(d['scaled_inf'], curves_d, base_damages_d)
        two_hand_bonus = d['two_hand_bonus']

        return cls(base_damage, strength, agility, radiance, inferno, two_hand_bonus)


@dataclass(frozen=True)
class WeaponDamageExtras:
    dmg_poise: LeveledValue
    dmg_stagger: LeveledValue
    dmg_stamina: LeveledValue
    pvp_multiplier: float
    spell_slots: int

    def to_dict(self) -> dict[str, Any]:
        return {
            'dmg_poise': self.dmg_poise.to_dict(),
            'dmg_stagger': self.dmg_stagger.to_dict(),
            'dmg_stamina': self.dmg_stamina.to_dict(),
            'pvp_multiplier': self.pvp_multiplier,
            'spell_slots': self.spell_slots,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any], curves_d: dict[str, Curve]) -> Self:
        return cls(
            LeveledValue.from_dict(d['dmg_poise'], curves_d),
            LeveledValue.from_dict(d['dmg_stagger'], curves_d),
            LeveledValue.from_dict(d['dmg_stamina'], curves_d),
            d['pvp_multiplier'],
            d['spell_slots'],
        )


@dataclass(frozen=True)
class WeaponDamageStatus:
    dmg_status_smite: LeveledValue
    dmg_status_bleed: LeveledValue
    dmg_status_burn: LeveledValue
    dmg_status_ignite: LeveledValue
    dmg_status_frost: LeveledValue
    dmg_status_poison: LeveledValue

    def to_dict(self) -> dict[str, Any]:
        return {
            'dmg_status_smite': self.dmg_status_smite.to_dict(),
            'dmg_status_bleed': self.dmg_status_bleed.to_dict(),
            'dmg_status_burn': self.dmg_status_burn.to_dict(),
            'dmg_status_ignite': self.dmg_status_ignite.to_dict(),
            'dmg_status_frost': self.dmg_status_frost.to_dict(),
            'dmg_status_poison': self.dmg_status_poison.to_dict(),
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any], curves_d: dict[str, Curve]) -> Self:
        return cls(
            LeveledValue.from_dict(d['dmg_status_smite'], curves_d),
            LeveledValue.from_dict(d['dmg_status_bleed'], curves_d),
            LeveledValue.from_dict(d['dmg_status_burn'], curves_d),
            LeveledValue.from_dict(d['dmg_status_ignite'], curves_d),
            LeveledValue.from_dict(d['dmg_status_frost'], curves_d),
            LeveledValue.from_dict(d['dmg_status_poison'], curves_d),
        )


@dataclass(frozen=True)
class WeaponOffense:
    damage_ar: WeaponDamageAR
    damage_extras: WeaponDamageExtras
    damage_status: WeaponDamageStatus

    def to_dict(self) -> dict[str, Any]:
        return {
            'damage_ar': self.damage_ar.to_dict(),
            'damage_extras': self.damage_extras.to_dict(),
            'damage_status': self.damage_status.to_dict(),
        }

    @classmethod
    def from_dict(
        cls,
        d: dict[str, Any],
        curves_d: dict[str, Curve],
        base_damages_d: dict[str, BaseDamage],
    ) -> Self:
        damage_ar = WeaponDamageAR.from_dict(d['damage_ar'], curves_d, base_damages_d)
        damage_extras = WeaponDamageExtras.from_dict(d['damage_extras'], curves_d)
        damage_status = WeaponDamageStatus.from_dict(d['damage_status'], curves_d)

        return cls(damage_ar, damage_extras, damage_status)


@dataclass(frozen=True)
class WeaponDefense:
    def_physical: LeveledValue
    def_holy: LeveledValue
    def_fire: LeveledValue
    def_wither: LeveledValue
    stability: LeveledValue

    def to_dict(self) -> dict[str, Any]:
        return {
            'def_physical': self.def_physical.to_dict(),
            'def_holy': self.def_holy.to_dict(),
            'def_fire': self.def_fire.to_dict(),
            'def_wither': self.def_wither.to_dict(),
            'stability': self.stability.to_dict(),
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any], curves_d: dict[str, Curve]) -> Self:
        return cls(
            LeveledValue.from_dict(d['def_physical'], curves_d),
            LeveledValue.from_dict(d['def_holy'], curves_d),
            LeveledValue.from_dict(d['def_fire'], curves_d),
            LeveledValue.from_dict(d['def_wither'], curves_d),
            LeveledValue.from_dict(d['stability'], curves_d),
        )


@dataclass(frozen=True)
class Weapon(Item):
    class_name: str
    weight: float
    max_upg_level: int
    wield_reqs: PlayerStats
    rune_sockets: WeaponRuneSockets
    offense: WeaponOffense
    defense: WeaponDefense
    _stat_grade_ranges: tuple[StatScalarGradeRange, ...] = field(repr=False)

    def to_dict(self) -> dict[str, Any]:
        return super().to_dict() | {
            'class_name': self.class_name,
            'weight': self.weight,
            'max_upg_level': self.max_upg_level,
            'wield_reqs': self.wield_reqs.to_dict(),
            'rune_sockets': self.rune_sockets.to_dict(),
            'offense': self.offense.to_dict(),
            'defense': self.defense.to_dict(),
        }

    @classmethod
    def from_dict(
        cls,
        d: dict[str, Any],
        curves_d: dict[str, Curve],
        base_damages_d: dict[str, BaseDamage],
        grade_ranges: tuple[StatScalarGradeRange, ...],
    ) -> Self:
        return cls(
            d['key'],
            d['name'],
            d['icon'],
            d['class_name'],
            d['weight'],
            d['max_upg_level'],
            PlayerStats.from_dict(d['wield_reqs']),
            WeaponRuneSockets.from_dict(d['rune_sockets'], curves_d),
            WeaponOffense.from_dict(d['offense'], curves_d, base_damages_d),
            WeaponDefense.from_dict(d['defense'], curves_d),
            grade_ranges,
        )
