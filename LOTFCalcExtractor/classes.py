import bisect
import math
import re
from dataclasses import dataclass, field
from typing import Any, Literal, Self

STAT = Literal["S", "A", "R", "I"]
RUNE_SOCKET_TYPE = Literal["S", "A", "R", "I", "*"]
RUNE_TYPE = Literal["Strength", "Agility", "Radiance", "Inferno"]
SCALING_TYPE = Literal["Additive", "Multiplicative"]

WEAP_CLASS_MAP: dict[str, str] = {
    # maps the game's internal weapon classes to user-displayed classes
    "CrossBows": "Crossbows",
    "FistWeapons": "Fists",
    "GreatAxes": "Grand Axes",
    "GreatHammers": "Grand Hammers",
    "GreatSwords": "Long Swords",
    "Magic": "Catalysts",
    "ShortSwords": "Short Swords",
    "UltraGreatSwords": "Grand Swords",
    "crossbows": "Crossbows",
}

RUNE_SOCKET_MAP: dict[str, RUNE_SOCKET_TYPE] = {
    "Circle": "S",
    "Triangle": "A",
    "Square": "R",
    "Star": "I",
    "Meta": "*",
}
RUNE_TYPE_MAP: dict[str, RUNE_TYPE] = {
    "Circle": "Strength",
    "Triangle": "Agility",
    "Square": "Radiance",
    "Star": "Inferno",
}
ARMOR_SLOT = Literal["Torso", "Arms", "Head", "Legs"]
ARMOR_SLOT_MAP: dict[str, ARMOR_SLOT] = {
    "Body": "Torso",
    "Arms": "Arms",
    "Head": "Head",
    "Legs": "Legs",
}
ARMOR_WEIGHT_CLASSES = Literal["Light", "Medium", "Heavy"]
ARMOR_INFO_PAT = re.compile(r"Inventory\.Category\.Equipment\.Armor\.(.*?)\.(.*?)\..*")

BUFF_TARGET = Literal["Player", "Equipment", "Enemy"]
BE_TARGET_MAP: dict[str, str] = {
    "Character": "Player",
}

BUFF_ATTR_MAP: dict[str, str] = {
    "Faith": "Radiance",
    "Chaos": "Inferno",
    "ScalingOrder": "ScalingRadiance",
    "ScalingChaos": "ScalingInferno",
    "DamageDark": "DamageWither",
    "DefenseDark": "DefenseWither",
    "MaxBuildupSmite": "ResistSmite",
    "MaxBuildupBleed": "ResistBleed",
    "MaxBuildupBurn": "ResistBurn",
    "MaxBuildupIgnite": "ResistIgnite",
    "MaxBuildupFrostbite": "ResistFrostbite",
    "MaxBuildupPoison": "ResistPoison",
    "MagicRegenRate": "ManaRegen",
    "Magic": "Mana",
    "GlobalStaminaBlockingProtection": "Stability",
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
    _x_coords: tuple[float, ...] = field(init=False, compare=False, repr=False)

    def __post_init__(self) -> None:
        object.__setattr__(self, "_x_coords", tuple(x for x, _ in self._points))

    # @lru_cache(maxsize=1024)
    def interpolate(self, input_val: int | float) -> float:
        if self._interp_mode != "RCIM_Linear":
            raise ValueError(f"Unhandled interpolation mode: {self._interp_mode}")

        x_coords = self._x_coords
        i = bisect.bisect_left(x_coords, input_val)

        # exact hit on a stored point
        if i < len(x_coords) and x_coords[i] == input_val:
            return self._points[i][1]

        # below the first point or above the last (preserves your raise-on-miss behavior)
        if i == 0 or i == len(x_coords):
            raise ValueError(f"Could not interpolate point for {input_val}")

        # input_val lies strictly between points i-1 and i
        x1, y1 = self._points[i - 1]
        x2, y2 = self._points[i]
        t = (input_val - x1) / (x2 - x1)
        return y1 + t * (y2 - y1)

    def to_dict(self) -> dict[str, Any]:
        return {
            "key": self.key,
            "_interp_mode": self._interp_mode,
            "_points": self._points,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> Self:
        points = tuple(tuple(pt) for pt in d["_points"])
        return cls(d["key"], d["_interp_mode"], points)


@dataclass(frozen=True)
class LeveledValue:
    base: float
    curve: Curve | None
    scaling_type: SCALING_TYPE

    # @lru_cache(maxsize=1024)
    def get_value(self, level: int | float) -> float:
        if self.curve is None:
            return self.base

        curve_val = self.curve.interpolate(level)
        if self.scaling_type == "Multiplicative":
            return self.base * (curve_val + 1)
        elif self.scaling_type == "Additive":
            return self.base + curve_val
        else:
            raise ValueError(f'Unhandled scaling type "{self.scaling_type}"')

    def to_dict(self) -> dict[str, Any]:
        return {
            "base": self.base,
            "curve_key": self.curve.key if self.curve else None,
            "scaling_type": self.scaling_type,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any], curves_d: dict[str, Curve]) -> Self:
        curve_key = d["curve_key"]
        curve = curves_d[curve_key] if curve_key else None
        return cls(d["base"], curve, d["scaling_type"])


@dataclass(frozen=True)
class BaseDamage:
    """Collection of LeveledValues for physical, holy, fire, wither, and spell_power damage types."""

    dmg_physical: LeveledValue
    dmg_holy: LeveledValue
    dmg_fire: LeveledValue
    dmg_wither: LeveledValue
    dmg_spell: LeveledValue
    key: str = field(default="", compare=False)

    def __post_init__(self) -> None:
        if not self.key:
            object.__setattr__(self, "key", str(id(self)))

    # @lru_cache(maxsize=1024)
    def calculate(self, upgrade_level: int) -> "AttackRating":
        """Calculate the base damage of the weapon, given the upgrade level."""

        physical = self.dmg_physical.get_value(upgrade_level)
        holy = self.dmg_holy.get_value(upgrade_level)
        fire = self.dmg_fire.get_value(upgrade_level)
        wither = self.dmg_wither.get_value(upgrade_level)
        spell = self.dmg_spell.get_value(upgrade_level)

        return AttackRating(physical, holy, fire, wither, spell)

    def to_dict(self) -> dict[str, Any]:
        return {
            "dmg_physical": self.dmg_physical.to_dict(),
            "dmg_holy": self.dmg_holy.to_dict(),
            "dmg_fire": self.dmg_fire.to_dict(),
            "dmg_wither": self.dmg_wither.to_dict(),
            "dmg_spell": self.dmg_spell.to_dict(),
            "key": self.key,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any], curves_d: dict[str, Curve]) -> Self:
        physical = LeveledValue.from_dict(d["dmg_physical"], curves_d)
        holy = LeveledValue.from_dict(d["dmg_holy"], curves_d)
        fire = LeveledValue.from_dict(d["dmg_fire"], curves_d)
        wither = LeveledValue.from_dict(d["dmg_wither"], curves_d)
        spell = LeveledValue.from_dict(d["dmg_spell"], curves_d)
        key = d["key"]

        return cls(physical, holy, fire, wither, spell, key)


@dataclass(frozen=True)
class StatScalarGradeRange:
    grade: str
    min_incl: int
    max_excl: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "grade": self.grade,
            "min_incl": self.min_incl,
            "max_excl": self.max_excl,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> Self:
        return cls(d["grade"], d["min_incl"], d["max_excl"])


@dataclass(frozen=True)
class StatScaledDamage:
    """Stat-scaled damage: base_damage (P,H,F,W), weapon's scaling with the stat, and the stat's generic power curve."""

    stat: STAT
    base_damage: BaseDamage
    stat_scaling: LeveledValue
    stat_curve: Curve | None

    # @lru_cache(maxsize=1024)
    def calculate_damage_contribution(
        self, upgrade_level: int, player_stat_level: int
    ) -> tuple["AttackRating", float]:
        """Calculates the additional attack rating added to each of the four damage types given the weapon's upgrade
        level and the player's stat value in the pertinent stat."""

        # additional_AR = (base_damage × (weapon_scaling_stat / 100) × (player_scalar_stat / 100))

        weapon_scaling_stat = self.stat_scaling.get_value(upgrade_level)
        player_scalar_stat = (
            self.stat_curve.interpolate(player_stat_level) if self.stat_curve else 0.0
        )
        factor = (weapon_scaling_stat / 100) * (player_scalar_stat / 100)

        # contributions to physical can ONLY come from weapon's strength and agility scaling
        # contributions to holy, fire, and wither can ONLY come from weapon's radiance and inferno scaling
        additional_ar_physical = (
            self.base_damage.dmg_physical.get_value(upgrade_level) * factor
            if self.stat in ("S", "A")
            else 0.0
        )
        additional_ar_holy = (
            self.base_damage.dmg_holy.get_value(upgrade_level) * factor
            if self.stat in ("R", "I")
            else 0.0
        )
        additional_ar_fire = (
            self.base_damage.dmg_fire.get_value(upgrade_level) * factor
            if self.stat in ("R", "I")
            else 0.0
        )
        additional_ar_wither = (
            self.base_damage.dmg_wither.get_value(upgrade_level) * factor
            if self.stat in ("R", "I")
            else 0.0
        )
        additional_spellpower = (
            self.base_damage.dmg_spell.get_value(upgrade_level) * factor
            if self.stat in ("R", "I")
            else 0.0
        )

        return AttackRating(
            additional_ar_physical,
            additional_ar_holy,
            additional_ar_fire,
            additional_ar_wither,
            additional_spellpower,
        ), weapon_scaling_stat

    def to_dict(self) -> dict[str, Any]:
        return {
            "stat": self.stat,
            "bd_key": self.base_damage.key,
            "stat_scaling": self.stat_scaling.to_dict(),
            "stat_curve_key": self.stat_curve.key if self.stat_curve else None,
        }

    @classmethod
    def from_dict(
        cls,
        d: dict[str, Any],
        curves_d: dict[str, Curve],
        base_damages_d: dict[str, BaseDamage],
    ) -> Self:
        base_damage = base_damages_d[d["bd_key"]]
        stat_scaling = LeveledValue.from_dict(d["stat_scaling"], curves_d)
        curve_key = d["stat_curve_key"]
        stat_curve = curves_d[curve_key] if curve_key else None

        return cls(d["stat"], base_damage, stat_scaling, stat_curve)


@dataclass(frozen=True)
class PlayerStats:
    strength: int
    agility: int
    endurance: int
    vitality: int
    radiance: int
    inferno: int

    def can_wield(self, weapon_reqs: "PlayerStats") -> bool:
        return (
            self.strength >= weapon_reqs.strength
            and self.agility >= weapon_reqs.agility
            and self.endurance >= weapon_reqs.endurance
            and self.vitality >= weapon_reqs.vitality
            and self.radiance >= weapon_reqs.radiance
            and self.inferno >= weapon_reqs.inferno
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "strength": self.strength,
            "agility": self.agility,
            "endurance": self.endurance,
            "vitality": self.vitality,
            "radiance": self.radiance,
            "inferno": self.inferno,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> Self:
        return cls(
            d["strength"],
            d["agility"],
            d["endurance"],
            d["vitality"],
            d["radiance"],
            d["inferno"],
        )


@dataclass(frozen=True)
class Effect:
    attribute: str
    scaling_type: SCALING_TYPE
    value: float
    app_type: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "attribute": self.attribute,
            "scaling_type": self.scaling_type,
            "value": self.value,
            "app_type": self.app_type,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> Self:
        return cls(d["attribute"], d["scaling_type"], d["value"], d["app_type"])


@dataclass(frozen=True)
class Buff:
    key: str
    effects: tuple[Effect, ...]

    def to_dict(self) -> dict[str, Any]:
        return {
            "key": self.key,
            "effects": [effect.to_dict() for effect in self.effects],
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> Self:
        return cls(d["key"], tuple(Effect.from_dict(ed) for ed in d["effects"]))


@dataclass(frozen=True)
class Rune:
    key: str
    name: str
    icon: str
    type: RUNE_TYPE
    weapon_buff: Buff
    weapon_buff_target: BUFF_TARGET
    armor_buff: Buff
    armor_buff_target: BUFF_TARGET

    def to_dict(self) -> dict[str, Any]:
        return {
            "key": self.key,
            "name": self.name,
            "icon": self.icon,
            "type": self.type,
            "weapon_buff_key": self.weapon_buff.key,
            "weapon_buff_target": self.weapon_buff_target,
            "armor_buff_key": self.armor_buff.key,
            "armor_buff_target": self.armor_buff_target,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any], buffs_d: dict[str, Buff]) -> Self:
        return cls(
            d["key"],
            d["name"],
            d["icon"],
            d["type"],
            buffs_d[d["weapon_buff_key"]],
            d["weapon_buff_target"],
            buffs_d[d["armor_buff_key"]],
            d["armor_buff_target"],
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
            "weight": self.weight,
            "def_physical": self.def_physical,
            "def_fire": self.def_fire,
            "def_holy": self.def_holy,
            "def_wither": self.def_wither,
            "res_smite": self.res_smite,
            "res_bleed": self.res_bleed,
            "res_burn": self.res_burn,
            "res_ignite": self.res_ignite,
            "res_frost": self.res_frost,
            "res_poison": self.res_poison,
            "poise": self.poise,
            "kick_mult": self.kick_mult,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> Self:
        return cls(
            d["weight"],
            d["def_physical"],
            d["def_fire"],
            d["def_holy"],
            d["def_wither"],
            d["res_smite"],
            d["res_bleed"],
            d["res_burn"],
            d["res_ignite"],
            d["res_frost"],
            d["res_poison"],
            d["poise"],
            d["kick_mult"],
        )


@dataclass(frozen=True)
class Armor:
    key: str
    name: str
    icon: str
    slot: ARMOR_SLOT
    weight_class: ARMOR_WEIGHT_CLASSES
    set: str
    stats: ArmorStats

    def to_dict(self) -> dict[str, Any]:
        return {
            "key": self.key,
            "name": self.name,
            "icon": self.icon,
            "slot": self.slot,
            "weight_class": self.weight_class,
            "set": self.set,
            "stats": self.stats.to_dict(),
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> Self:
        return cls(
            d["key"],
            d["name"],
            d["icon"],
            d["slot"],
            d["weight_class"],
            d["set"],
            ArmorStats.from_dict(d["stats"]),
        )


# ================================
# Ephemeral Primitives
# ================================


@dataclass(frozen=True)
class AttackRating:
    physical: float
    holy: float
    fire: float
    wither: float
    spellpower: float


@dataclass(frozen=True)
class DamageSplit:
    base: int
    from_stats: int
    _wieldable: bool
    _scalar: float
    total: int = field(init=False, compare=False)

    def __post_init__(self) -> None:
        base = self.base * self._scalar
        from_stats = self.from_stats * self._scalar
        if not self._wieldable:
            # apply a -80% penalty to all damage
            base //= 5
            from_stats //= 5
        object.__setattr__(self, "base", epsilon_floor(base))
        object.__setattr__(self, "from_stats", epsilon_floor(from_stats))
        object.__setattr__(self, "total", self.base + self.from_stats)


@dataclass(frozen=True)
class WeaponRuneSockets:
    rune_sockets: tuple[RUNE_SOCKET_TYPE, ...]
    num_by_level: Curve | None

    # @lru_cache(maxsize=1024)
    def get_sockets(self, upgrade_level: int) -> tuple[RUNE_SOCKET_TYPE, ...]:
        if not self.num_by_level:
            return ()
        num_runes = epsilon_floor(self.num_by_level.interpolate(upgrade_level))
        return tuple(self.rune_sockets[:num_runes])

    def to_dict(self) -> dict[str, Any]:
        return {
            "rune_sockets": self.rune_sockets,
            "curve_key": self.num_by_level.key if self.num_by_level else None,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any], curves_d: dict[str, Curve]) -> Self:
        curve_key = d["curve_key"]
        return cls(tuple(d["rune_sockets"]), curves_d[curve_key] if curve_key else None)


@dataclass(frozen=True)
class WeaponDamageAR:
    base_damage: BaseDamage
    scaled_str: StatScaledDamage
    scaled_agi: StatScaledDamage
    scaled_rad: StatScaledDamage
    scaled_inf: StatScaledDamage
    two_hand_bonus: float

    # @lru_cache(maxsize=1024)
    def calculate(
        self,
        upgrade_level: int,
        player_stats: PlayerStats,
        weapon_reqs: PlayerStats,
        two_handing: bool,
        stat_grade_ranges: tuple[StatScalarGradeRange, ...],
    ) -> tuple["CalculatedWeaponAR", "CalculatedWeaponScaling", bool]:
        """Calculate the attack rating for the four damage types, and spell power."""

        wieldable = player_stats.can_wield(weapon_reqs)

        base_damage = self.base_damage.calculate(upgrade_level)

        # calculate contributions to AR (physical, holy, fire, wither, and spellpower) from stats
        add_ar_str, scaling_str = self.scaled_str.calculate_damage_contribution(
            upgrade_level, player_stats.strength
        )
        add_ar_agi, scaling_agi = self.scaled_agi.calculate_damage_contribution(
            upgrade_level, player_stats.agility
        )
        add_ar_rad, scaling_rad = self.scaled_rad.calculate_damage_contribution(
            upgrade_level, player_stats.radiance
        )
        add_ar_inf, scaling_inf = self.scaled_inf.calculate_damage_contribution(
            upgrade_level, player_stats.inferno
        )

        # calculate how much is added to each damage type from all stats combined
        add_ar_physical = (
            add_ar_str.physical
            + add_ar_agi.physical
            + add_ar_rad.physical
            + add_ar_inf.physical
        )
        add_ar_holy = (
            add_ar_str.holy + add_ar_agi.holy + add_ar_rad.holy + add_ar_inf.holy
        )
        add_ar_fire = (
            add_ar_str.fire + add_ar_agi.fire + add_ar_rad.fire + add_ar_inf.fire
        )
        add_ar_wither = (
            add_ar_str.wither
            + add_ar_agi.wither
            + add_ar_rad.wither
            + add_ar_inf.wither
        )
        add_spellpower = (
            add_ar_str.spellpower
            + add_ar_agi.spellpower
            + add_ar_rad.spellpower
            + add_ar_inf.spellpower
        )

        scalar = (1.17 * self.two_hand_bonus) if two_handing else 1.0
        physical = DamageSplit(
            epsilon_floor(base_damage.physical),
            epsilon_floor(add_ar_physical),
            wieldable,
            scalar,
        )
        holy = DamageSplit(
            epsilon_floor(base_damage.holy),
            epsilon_floor(add_ar_holy),
            wieldable,
            scalar,
        )
        fire = DamageSplit(
            epsilon_floor(base_damage.fire),
            epsilon_floor(add_ar_fire),
            wieldable,
            scalar,
        )
        wither = DamageSplit(
            epsilon_floor(base_damage.wither),
            epsilon_floor(add_ar_wither),
            wieldable,
            scalar,
        )
        spellpower = DamageSplit(
            epsilon_floor(base_damage.spellpower),
            epsilon_floor(add_spellpower),
            wieldable,
            1.0,
        )

        return (
            CalculatedWeaponAR(physical, holy, fire, wither, spellpower),
            CalculatedWeaponScaling(
                scaling_str, scaling_agi, scaling_rad, scaling_inf, stat_grade_ranges
            ),
            wieldable,
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "bd_key": self.base_damage.key,
            "scaled_str": self.scaled_str.to_dict(),
            "scaled_agi": self.scaled_agi.to_dict(),
            "scaled_rad": self.scaled_rad.to_dict(),
            "scaled_inf": self.scaled_inf.to_dict(),
            "two_hand_bonus": self.two_hand_bonus,
        }

    @classmethod
    def from_dict(
        cls,
        d: dict[str, Any],
        curves_d: dict[str, Curve],
        base_damages_d: dict[str, BaseDamage],
    ) -> Self:
        base_damage = base_damages_d[d["bd_key"]]
        strength = StatScaledDamage.from_dict(d["scaled_str"], curves_d, base_damages_d)
        agility = StatScaledDamage.from_dict(d["scaled_agi"], curves_d, base_damages_d)
        radiance = StatScaledDamage.from_dict(d["scaled_rad"], curves_d, base_damages_d)
        inferno = StatScaledDamage.from_dict(d["scaled_inf"], curves_d, base_damages_d)
        two_hand_bonus = d["two_hand_bonus"]

        return cls(base_damage, strength, agility, radiance, inferno, two_hand_bonus)


@dataclass(frozen=True)
class WeaponDamageExtras:
    dmg_poise: LeveledValue
    dmg_stagger: LeveledValue
    dmg_stamina: LeveledValue
    pvp_multiplier: float
    spell_slots: int

    # @lru_cache(maxsize=1024)
    def calculate(
        self, upgrade_level: int, two_handing: bool
    ) -> "CalculatedWeaponExtras":
        """Calculate the strength of weapon 'extras' at the given upgrade level."""

        scalar = 1.4 if two_handing else 1.0
        poise = self.dmg_poise.get_value(upgrade_level) * scalar
        stagger = self.dmg_stagger.get_value(upgrade_level) * scalar
        stamina = self.dmg_stamina.get_value(upgrade_level)

        return CalculatedWeaponExtras(
            poise, stagger, stamina, self.pvp_multiplier, self.spell_slots
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "dmg_poise": self.dmg_poise.to_dict(),
            "dmg_stagger": self.dmg_stagger.to_dict(),
            "dmg_stamina": self.dmg_stamina.to_dict(),
            "pvp_multiplier": self.pvp_multiplier,
            "spell_slots": self.spell_slots,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any], curves_d: dict[str, Curve]) -> Self:
        return cls(
            LeveledValue.from_dict(d["dmg_poise"], curves_d),
            LeveledValue.from_dict(d["dmg_stagger"], curves_d),
            LeveledValue.from_dict(d["dmg_stamina"], curves_d),
            d["pvp_multiplier"],
            d["spell_slots"],
        )


@dataclass(frozen=True)
class WeaponDamageStatus:
    dmg_status_smite: LeveledValue
    dmg_status_bleed: LeveledValue
    dmg_status_burn: LeveledValue
    dmg_status_ignite: LeveledValue
    dmg_status_frost: LeveledValue
    dmg_status_poison: LeveledValue

    # @lru_cache(maxsize=1024)
    def calculate(self, upgrade_level: int) -> "CalculatedWeaponStatus":
        """Calculate the strength of status effects applied by the weapon at the given upgrade level."""

        smite = self.dmg_status_smite.get_value(upgrade_level)
        bleed = self.dmg_status_bleed.get_value(upgrade_level)
        burn = self.dmg_status_burn.get_value(upgrade_level)
        ignite = self.dmg_status_ignite.get_value(upgrade_level)
        frost = self.dmg_status_frost.get_value(upgrade_level)
        poison = self.dmg_status_poison.get_value(upgrade_level)

        return CalculatedWeaponStatus(smite, bleed, burn, ignite, frost, poison)

    def to_dict(self) -> dict[str, Any]:
        return {
            "dmg_status_smite": self.dmg_status_smite.to_dict(),
            "dmg_status_bleed": self.dmg_status_bleed.to_dict(),
            "dmg_status_burn": self.dmg_status_burn.to_dict(),
            "dmg_status_ignite": self.dmg_status_ignite.to_dict(),
            "dmg_status_frost": self.dmg_status_frost.to_dict(),
            "dmg_status_poison": self.dmg_status_poison.to_dict(),
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any], curves_d: dict[str, Curve]) -> Self:
        return cls(
            LeveledValue.from_dict(d["dmg_status_smite"], curves_d),
            LeveledValue.from_dict(d["dmg_status_bleed"], curves_d),
            LeveledValue.from_dict(d["dmg_status_burn"], curves_d),
            LeveledValue.from_dict(d["dmg_status_ignite"], curves_d),
            LeveledValue.from_dict(d["dmg_status_frost"], curves_d),
            LeveledValue.from_dict(d["dmg_status_poison"], curves_d),
        )


@dataclass(frozen=True)
class WeaponOffense:
    damage_ar: WeaponDamageAR
    damage_extras: WeaponDamageExtras
    damage_status: WeaponDamageStatus

    # @lru_cache(maxsize=1024)
    def calculate(
        self,
        upgrade_level: int,
        player_stats: PlayerStats,
        wield_reqs: PlayerStats,
        two_handing: bool,
        stat_grade_ranges: tuple[StatScalarGradeRange, ...],
    ) -> "CalculatedWeaponOffense":
        attack_rating, scaling, wieldable = self.damage_ar.calculate(
            upgrade_level, player_stats, wield_reqs, two_handing, stat_grade_ranges
        )
        extras = self.damage_extras.calculate(upgrade_level, two_handing)
        status = self.damage_status.calculate(upgrade_level)

        return CalculatedWeaponOffense(
            attack_rating, extras, status, scaling, wieldable
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "damage_ar": self.damage_ar.to_dict(),
            "damage_extras": self.damage_extras.to_dict(),
            "damage_status": self.damage_status.to_dict(),
        }

    @classmethod
    def from_dict(
        cls,
        d: dict[str, Any],
        curves_d: dict[str, Curve],
        base_damages_d: dict[str, BaseDamage],
    ) -> Self:
        damage_ar = WeaponDamageAR.from_dict(d["damage_ar"], curves_d, base_damages_d)
        damage_extras = WeaponDamageExtras.from_dict(d["damage_extras"], curves_d)
        damage_status = WeaponDamageStatus.from_dict(d["damage_status"], curves_d)

        return cls(damage_ar, damage_extras, damage_status)


@dataclass(frozen=True)
class WeaponDefense:
    def_physical: LeveledValue
    def_holy: LeveledValue
    def_fire: LeveledValue
    def_wither: LeveledValue
    stability: LeveledValue

    # @lru_cache(maxsize=1024)
    def calculate(self, upgrade_level: int) -> "CalculatedWeaponDefense":
        physical = self.def_physical.get_value(upgrade_level)
        holy = self.def_holy.get_value(upgrade_level)
        fire = self.def_fire.get_value(upgrade_level)
        wither = self.def_wither.get_value(upgrade_level)
        stability = self.stability.get_value(upgrade_level)

        return CalculatedWeaponDefense(physical, holy, fire, wither, stability)

    def to_dict(self) -> dict[str, Any]:
        return {
            "def_physical": self.def_physical.to_dict(),
            "def_holy": self.def_holy.to_dict(),
            "def_fire": self.def_fire.to_dict(),
            "def_wither": self.def_wither.to_dict(),
            "stability": self.stability.to_dict(),
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any], curves_d: dict[str, Curve]) -> Self:
        return cls(
            LeveledValue.from_dict(d["def_physical"], curves_d),
            LeveledValue.from_dict(d["def_holy"], curves_d),
            LeveledValue.from_dict(d["def_fire"], curves_d),
            LeveledValue.from_dict(d["def_wither"], curves_d),
            LeveledValue.from_dict(d["stability"], curves_d),
        )


@dataclass(frozen=True)
class Weapon:
    key: str
    name: str
    icon: str
    class_name: str
    weight: float
    max_upg_level: int
    wield_reqs: PlayerStats
    rune_sockets: WeaponRuneSockets
    offense: WeaponOffense
    defense: WeaponDefense
    _stat_grade_ranges: tuple[StatScalarGradeRange, ...] = field(repr=False)

    # @lru_cache(maxsize=1024)
    def calculate_stats(
        self, upgrade_level: int, player_stats: PlayerStats, two_handing: bool
    ) -> "CalculatedWeaponStats":
        upgrade_level = min(
            upgrade_level, self.max_upg_level
        )  # clamp upgrade level <= max upgrade level
        offense_values = self.offense.calculate(
            upgrade_level,
            player_stats,
            self.wield_reqs,
            two_handing,
            self._stat_grade_ranges,
        )
        defense_values = self.defense.calculate(upgrade_level)
        rune_sockets = self.rune_sockets.get_sockets(upgrade_level)

        return CalculatedWeaponStats(
            self,
            offense_values,
            defense_values,
            rune_sockets,
            upgrade_level,
            player_stats,
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "key": self.key,
            "name": self.name,
            "icon": self.icon,
            "class_name": self.class_name,
            "weight": self.weight,
            "max_upg_level": self.max_upg_level,
            "wield_reqs": self.wield_reqs.to_dict(),
            "rune_sockets": self.rune_sockets.to_dict(),
            "offense": self.offense.to_dict(),
            "defense": self.defense.to_dict(),
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
            d["key"],
            d["name"],
            d["icon"],
            d["class_name"],
            d["weight"],
            d["max_upg_level"],
            PlayerStats.from_dict(d["wield_reqs"]),
            WeaponRuneSockets.from_dict(d["rune_sockets"], curves_d),
            WeaponOffense.from_dict(d["offense"], curves_d, base_damages_d),
            WeaponDefense.from_dict(d["defense"], curves_d),
            grade_ranges,
        )


# ===============================
# Calculated Values
# ===============================


@dataclass(frozen=True)
class CalculatedWeaponAR:
    physical: DamageSplit
    holy: DamageSplit
    fire: DamageSplit
    wither: DamageSplit
    spellpower: DamageSplit
    total_dmg: int = field(init=False, compare=False)

    def __post_init__(self) -> None:
        object.__setattr__(
            self,
            "total_dmg",
            self.physical.total + self.holy.total + self.fire.total + self.wither.total,
        )


@dataclass(frozen=True)
class CalculatedWeaponExtras:
    poise_dmg: float
    stagger_dmg: float
    stamina_dmg: float
    pvp_multiplier: float
    spell_slots: float


@dataclass(frozen=True)
class CalculatedWeaponStatus:
    smite: float
    bleed: float
    burn: float
    ignite: float
    frost: float
    poison: float


@dataclass(frozen=True)
class CalculatedWeaponScaling:
    str_val: float
    agi_val: float
    rad_val: float
    inf_val: float
    _stat_grade_ranges: tuple[StatScalarGradeRange, ...] = field(compare=False)

    str_grade: str = field(init=False, compare=False)
    agi_grade: str = field(init=False, compare=False)
    rad_grade: str = field(init=False, compare=False)
    inf_grade: str = field(init=False, compare=False)

    def __post_init__(self) -> None:
        object.__setattr__(self, "str_grade", self.get_grade(self.str_val))
        object.__setattr__(self, "agi_grade", self.get_grade(self.agi_val))
        object.__setattr__(self, "rad_grade", self.get_grade(self.rad_val))
        object.__setattr__(self, "inf_grade", self.get_grade(self.inf_val))

    # @lru_cache(maxsize=1024)
    def get_grade(self, scaling_val: float) -> str:
        if scaling_val < 0.0:
            raise ValueError("Scaling factor must be >= 0")
        for grade_range in self._stat_grade_ranges:
            if grade_range.min_incl <= scaling_val < grade_range.max_excl:
                return grade_range.grade
        # scaling value is greater than the max range - clamp to the highest grade
        return self._stat_grade_ranges[-1].grade


@dataclass(frozen=True)
class CalculatedWeaponOffense:
    attack_rating: CalculatedWeaponAR
    extras: CalculatedWeaponExtras
    status: CalculatedWeaponStatus
    scaling: CalculatedWeaponScaling
    wieldable: bool


@dataclass(frozen=True)
class CalculatedWeaponDefense:
    physical: float
    holy: float
    fire: float
    wither: float
    stability: float


@dataclass(frozen=True)
class CalculatedWeaponStats:
    weapon: Weapon
    offense: CalculatedWeaponOffense
    defense: CalculatedWeaponDefense
    runes: tuple[str, ...]
    upgrade_level: int
    player_stats: PlayerStats
