from decimal import Decimal
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from api.models import RateMaster, Test, TestCategory
from api.por_catalog_parser import load_por_catalog_json, parse_por_catalog, write_por_catalog_json

DEFAULT_JSON = Path(__file__).resolve().parents[2] / 'data' / 'por_catalog.json'
DEFAULT_CATEGORY = 'POR Catalog'
DEFAULT_RATE_MASTER = 'POR'


class Command(BaseCommand):
    help = 'Import POR test catalogue with sample types, MRP, and price from paired PDFs.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--sample-pdf',
            dest='sample_pdf',
            default='',
            help='Path to test_por.pdf (test names + sample types).',
        )
        parser.add_argument(
            '--price-pdf',
            dest='price_pdf',
            default='',
            help='Path to test_por1.pdf (test names + MRP + price).',
        )
        parser.add_argument(
            '--json',
            dest='json_path',
            default=str(DEFAULT_JSON),
            help='Path to parsed POR catalog JSON.',
        )
        parser.add_argument(
            '--replace-existing',
            action='store_true',
            help='Update tests that already exist with the same name.',
        )
        parser.add_argument(
            '--clear-old',
            action='store_true',
            help='Delete all tests that are not in this POR catalog import.',
        )

    def handle(self, *args, **options):
        sample_pdf = (options.get('sample_pdf') or '').strip()
        price_pdf = (options.get('price_pdf') or '').strip()
        json_path = Path(options.get('json_path') or DEFAULT_JSON)

        if sample_pdf and price_pdf:
            rows = parse_por_catalog(sample_pdf, price_pdf)
            write_por_catalog_json(rows, json_path)
            self.stdout.write(
                self.style.SUCCESS(f'Parsed {len(rows)} tests from PDFs into {json_path}')
            )
        elif json_path.is_file():
            rows = load_por_catalog_json(json_path)
        else:
            raise CommandError(
                f'POR catalog file not found: {json_path}. Pass --sample-pdf and --price-pdf to generate it.'
            )

        if not rows:
            raise CommandError('No tests found to import.')

        category, _ = TestCategory.objects.get_or_create(name=DEFAULT_CATEGORY)
        RateMaster.objects.get_or_create(name=DEFAULT_RATE_MASTER)

        replace_existing = bool(options.get('replace_existing'))
        clear_old = bool(options.get('clear_old'))
        existing_by_name = {test.name.lower(): test for test in Test.objects.all()}

        import_names: set[str] = set()
        to_create: list[Test] = []
        to_update: list[Test] = []
        skipped = 0
        truncated_names = 0

        for row in rows:
            name = (row.get('name') or '').strip()
            if not name:
                skipped += 1
                continue

            if len(name) > 200:
                truncated_names += 1
                name = name[:200]

            import_names.add(name.lower())
            mrp = Decimal(str(row.get('mrp') or 0))
            price = Decimal(str(row.get('price') or 0))
            sample_type = (row.get('sample_type') or '').strip()[:150]
            test_code = f"POR-{int(row.get('sl') or 0):04d}"
            key = name.lower()

            existing = existing_by_name.get(key)
            if existing:
                if not replace_existing and not clear_old:
                    skipped += 1
                    continue
                existing.name = name
                existing.mrp = mrp
                existing.price = price
                existing.sample_type = sample_type
                existing.category = category
                existing.test_code = test_code
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
            if clear_old:
                stale_ids = [
                    test.id
                    for test in Test.objects.all()
                    if test.name.lower() not in import_names
                ]
                if stale_ids:
                    deleted_count, _ = Test.objects.filter(id__in=stale_ids).delete()
                    self.stdout.write(
                        self.style.WARNING(f'Removed {deleted_count} old tests not in POR catalog.')
                    )

            if to_create:
                Test.objects.bulk_create(to_create, batch_size=500)
            if to_update:
                Test.objects.bulk_update(
                    to_update,
                    ['name', 'mrp', 'price', 'sample_type', 'category', 'test_code', 'short_name'],
                    batch_size=500,
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'Import complete: created {len(to_create)}, updated {len(to_update)}, skipped {skipped}.'
            )
        )
        if truncated_names:
            self.stdout.write(
                self.style.WARNING(f'{truncated_names} test names were truncated to 200 characters.')
            )
