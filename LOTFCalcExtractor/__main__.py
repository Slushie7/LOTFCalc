import sys
import traceback

from .extract import LOTFExtractor


def print_help() -> None:
    print('LOTFCalcExtractor for Lords of the Fallen (https://github.com/Slushie7/LOTFCalc)')
    print()
    print(
        'Please run LOTFCalcExtractor with the path to your FModel-exported "LOTF2" folder (yes, devs confusingly named the 2023 reboot of LOTF "LOTF2" internally).'
    )
    print('E.g.:')
    print('python -m LOTFCalcExtractor "C:\\Users\\slushie7\\Downloads\\FModel\\Output\\Exports\\LOTF2"')
    print()
    print(
        "LOTFCalcExtractor requires that the following files and folders have been extracted from the game's assets, as JSON, using FModel:"
    )
    print('LOTF2\\Content\\Blueprints\\Combat\\AttackDefinitions\\DT_UI_StatScalarDefinition.json')
    print('LOTF2\\Content\\Blueprints\\Data\\Equipment\\Weapons\\Player\\**')
    print('LOTF2\\Content\\Blueprints\\Data\\Stats\\DT_CurveLibrary.json')
    print('LOTF2\\Content\\Blueprints\\Data\\Stats\\DT_RangedWeaponStats.json')
    print('LOTF2\\Content\\Blueprints\\Data\\Stats\\DT_ScalingCurveLibrary.json')
    print('LOTF2\\Content\\Blueprints\\Data\\Stats\\DT_WeaponStats.json')
    print('LOTF2\\Content\\Localization\\Game\\en\\Game.json')


def main() -> None:
    if args := sys.argv[1:]:
        try:
            content_dir = args[0]
            mode = args[1] if len(args) > 1 else ''
            LOTFExtractor(content_dir, mode)
        except Exception as e:
            if isinstance(e, FileNotFoundError):
                print('\nLOTFCalcExtractor failed to extract weapons data from the given directory.')
            else:
                traceback.print_exc()
                print(
                    '\nLOTFCalcExtractor encountered an error while trying to extract weapons data. The full error trace is above.'
                )
    else:
        print_help()


if __name__ == '__main__':
    main()
