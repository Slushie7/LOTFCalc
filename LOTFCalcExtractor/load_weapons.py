import json
from pathlib import Path

from .classes import BaseDamage, Curve, StatScalarGradeRange, Weapon


def load_weapons() -> tuple[Weapon, ...]:
    """Read the weapons data from JSON into a tuple of Weapons usable by LOTFCalc."""

    json_path = (Path(__file__).parent / '../data/weapons.json').resolve()

    with open(json_path, encoding='utf-8') as f:
        data_d = json.load(f)

    curves_d: dict[str, Curve] = {}
    for curve_d in data_d['curves']:
        curve = Curve.from_dict(curve_d)
        curves_d[curve.key] = curve

    base_damages: dict[str, BaseDamage] = {}
    for base_damage_d in data_d['base_damages']:
        base_damage = BaseDamage.from_dict(base_damage_d, curves_d)
        base_damages[base_damage.key] = base_damage

    grade_ranges: list[StatScalarGradeRange] = []
    for grade_range_d in data_d['stat_grade_ranges']:
        grade_range = StatScalarGradeRange.from_dict(grade_range_d)
        grade_ranges.append(grade_range)

    weapons: list[Weapon] = []
    for weapon_d in data_d['weapons']:
        weapon = Weapon.from_dict(weapon_d, curves_d, base_damages, tuple(grade_ranges))
        weapons.append(weapon)

    return tuple(weapons)
