import sys

"""Check whether the app was run with command-line args. If so, try to run them."""


def print_commands() -> None:
    print('The only currently supported CLI command is:\n    -extract "<FModel-extracted LOTF Content dir>"')


if args := sys.argv[1:]:
    from .extract import LOTFExtractor

    command = args[0].lower()
    if command in ('extract', '-extract', '--extract'):
        cmd_args = args[1:]
        if len(cmd_args) != 1:
            print('Incorrect number of arguments supplied for "extract" command')
            print_commands()
        content_dir = cmd_args[0]
        LOTFExtractor.export_json(content_dir)
    else:
        print('Unknown command.')
        print_commands()
