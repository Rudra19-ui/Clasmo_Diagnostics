from decimal import Decimal
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from api.models import RateMaster, Test, TestCategory
from api.ratnagiri_rate_parser import load_ratnagiri_rates_json, parse_ratnagiri_pdf

DEFAULT_JSON = Path(__file__).resolve().parents[1] / 'data' / 'ratnagiri_rates.json'
DEFAULT_CATEGORY = 'Ratnagiri Rates'
DEFAULT_RATE_MASTER = 'RATNAGIRI'


class Command(BaseCommand):
    help = 'Import Ratnagiri test catalogue with MRP and price from JSON or PDF.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--pdf',
            dest='pdf_path',
            default='',
            help='Optional path to RATNAGIRI RATE IMP PDF.',
        )
        parser.add_argument(
            '--json',
            dest='json_path',
            default=str(DEFAULT_JSON),
            help='Path to parsed Ratnagiri rates JSON.',
        )
        parser.add_argument(
            '--replace-existing',
            action='store_true',
            help='Update tests that already exist with the same name.',
        )

    def handle(self, *args, **options):
        pdf_path = (options.get('pdf_path') or '').strip()
        json_path = Path(options.get('json_path') or DEFAULT_JSON)

        if pdf_path:
            rows = parse_ratnagiri_pdf(pdf_path)
            json_path.parent.mkdir(parents=True, exist_ok=True)
            json_path.write_text(
                '{"source":"ratnagiri","tests":' + __import__('json').dumps(rows, indent=2) + '}',
                encoding='utf-8',
            )
            self.stdout.write(self.style.SUCCESS(f'Parsed {len(rows)} tests from PDF into {json_path}'))
        elif json_path.is_file():
            rows = load_ratnagiri_rates_json(json_path)
        else:
            raise CommandError(f'Ratnagiri rates file not found: {json_path}. Pass --pdf to generate it.')

        if not rows:
            raise CommandError('No tests found to import.')

        category, _ = TestCategory.objects.get_or_create(name=DEFAULT_CATEGORY)
        RateMaster.objects.get_or_create(name=DEFAULT_RATE_MASTER)

        replace_existing = bool(options.get('replace_existing'))
        existing_by_name = {test.name.lower(): test for test in Test.objects.all()}

        to_create: list[Test] = []
        to_update: list[Test] = []
        skipped = 0

        for index, row in enumerate(rows, start=1):
            name = (row.get('name') or '').strip()
            if not name:
                skipped += 1
                continue

            mrp = Decimal(str(row.get('mrp') or 0))
            price = Decimal(str(row.get('price') or 0))
            sample_type = (row.get('sample_type') or '').strip()[:150]
            test_code = f'RAT-{index:04d}'
            key = name.lower()

            existing = existing_by_name.get(key)
            if existing:
                if not replace_existing:
                    skipped += 1
                    continue
                existing.mrp = mrp
                existing.price = price
                existing.sample_type = sample_type
                existing.category = category
                if not existing.test_code:
                    existing.test_code = test_code
                if not existing.short_name:
                    existing.short_name = name[:50]
                to_update.append(existing)
                continue

            test = Test(
                name=name,
                short_name=name[:50],
                test_code=test_code,
                mrp=mrp,
                price=price,
                sample_type=sample_type,
                category=category,
            )
            to_create.append(test)
            existing_by_name[key] = test

        with transaction.atomic():
            if to_create:
                Test.objects.bulk_create(to_create, batch_size=500)
            if to_update:
                Test.objects.bulk_update(
                    to_update,
                    ['mrp', 'price', 'sample_type', 'category', 'test_code', 'short_name'],
                    batch_size=500,
                )

        self.stdout.write(
            self.style.SUCCESS(
                'Ratnagiri import complete. '
                f'Created: {len(to_create)}, Updated: {len(to_update)}, Skipped: {skipped}.'
            )
        )
