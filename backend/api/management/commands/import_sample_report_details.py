from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from api.sample_report_import import DEFAULT_JSON, import_from_json_file


class Command(BaseCommand):
    help = (
        'Import TEST DESCRIPTION / units / ranges / NOTE / Comments / Clinical significance '
        'into Test + TestParameter rows, matched by test name.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            'json_path',
            nargs='?',
            default=str(DEFAULT_JSON),
            help='Path to report-detail JSON (default: bundled sample_reports_batch_import.json)',
        )
        parser.add_argument('--dry-run', action='store_true')
        parser.add_argument(
            '--no-create',
            action='store_true',
            help='Do not create catalog tests when name is missing',
        )

    def handle(self, *args, **options):
        path = Path(options['json_path'])
        if not path.exists():
            raise CommandError(f'File not found: {path}')
        result = import_from_json_file(
            path,
            create_missing=not options['no_create'],
            dry_run=options['dry_run'],
        )
        self.stdout.write(self.style.SUCCESS(
            f"rows={result['total_rows']} created_tests={result['created_tests']} "
            f"updated_tests={result['updated_tests']} "
            f"created_params={result['created_parameters']} "
            f"updated_params={result['updated_parameters']} dry_run={result['dry_run']}"
        ))
        for item in result['imported']:
            self.stdout.write(
                f"  - {item.get('test_name')} [{item.get('action')}] "
                f"parameters={item.get('parameters')}"
            )
        for name in result['unmatched']:
            self.stdout.write(self.style.WARNING(f'  unmatched: {name}'))
