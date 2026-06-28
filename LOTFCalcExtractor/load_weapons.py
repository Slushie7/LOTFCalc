import json
from pathlib import Path

from .classes import (
    BaseDamage,
    Curve,
    StatScalarGradeRange,
    Weapon,
    Buff,
    Rune,
    Armor,
    StartingClass,
)


def load_json_data(
    path: Path | str | None = None,
) -> tuple[
    tuple[Weapon, ...],
    dict[str, Curve],
    tuple[Rune, ...],
    tuple[Armor, ...],
    tuple[StartingClass, ...],
]:
    """Read the weapons data from JSON into a tuple of Weapons usable by LOTFCalc."""

    if path is not None:
        json_path = Path(path).resolve()
    else:
        json_path = (Path(__file__).parent / '../data/data.json').resolve()

    with open(json_path, encoding='utf-8') as f:
        data_d = json.load(f)

    curves_d: dict[str, Curve] = {}
    for curve_d in data_d['curves']:
        curve = Curve.from_dict(curve_d)
        curves_d[curve.key] = curve

    base_damages_d: dict[str, BaseDamage] = {}
    for base_damage_d in data_d['base_damages']:
        base_damage = BaseDamage.from_dict(base_damage_d, curves_d)
        base_damages_d[base_damage.key] = base_damage

    grade_ranges: list[StatScalarGradeRange] = []
    for grade_range_d in data_d['stat_grade_ranges']:
        grade_range = StatScalarGradeRange.from_dict(grade_range_d)
        grade_ranges.append(grade_range)

    weapons: list[Weapon] = []
    weapons_d: dict[str, Weapon] = {}
    for weapon_d in data_d['weapons']:
        weapon = Weapon.from_dict(
            weapon_d, curves_d, base_damages_d, tuple(grade_ranges)
        )
        weapons_d[weapon.key] = weapon
        weapons.append(weapon)

    buffs_d: dict[str, Buff] = {}
    for buff_d in data_d['buffs']:
        buff = Buff.from_dict(buff_d)
        buffs_d[buff.key] = buff

    runes: list[Rune] = []
    for rune_d in data_d['runes']:
        rune = Rune.from_dict(rune_d, buffs_d)
        runes.append(rune)

    armors: list[Armor] = []
    armors_d: dict[str, Armor] = {}
    for armor_d in data_d['armor']:
        armor_piece = Armor.from_dict(armor_d)
        armors_d[armor_piece.key] = armor_piece
        armors.append(armor_piece)

    starting_classes: list[StartingClass] = []
    for sc_d in data_d['starting_classes']:
        sc = StartingClass.from_dict(sc_d, weapons_d, armors_d)
        starting_classes.append(sc)

    return (
        tuple(weapons),
        curves_d,
        tuple(runes),
        tuple(armors),
        tuple(starting_classes),
    )
