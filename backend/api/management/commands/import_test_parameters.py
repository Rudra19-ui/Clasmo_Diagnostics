from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from api.parameter_import import import_parameters_from_csv_text


class Command(BaseCommand):
    help = 'Import TestParameter rows from a CSV file (bulk sample-report setup).'

    def add_arguments(self, parser):
        parser.add_argument('csv_path', type=str, help='Path to UTF-8 CSV file')
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Validate and preview without writing',
        )

    def handle(self, *args, **options):
        path = Path(options['csv_path'])
        if not path.exists():
            raise CommandError(f'File not found: {path}')
        text = path.read_text(encoding='utf-8-sig')
        try:
            result = import_parameters_from_csv_text(text, dry_run=options['dry_run'])
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(
            self.style.SUCCESS(
                f"OK rows={result['rows_ok']} errors={result['rows_error']} "
                f"created={result['created']} updated={result['updated']} "
                f"dry_run={result['dry_run']}"
            )
        )
        for err in result.get('errors') or []:
            self.stdout.write(self.style.WARNING(f"  line {err['line']}: {err['error']}"))
