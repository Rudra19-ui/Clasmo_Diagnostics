"""Import test profiles into TestPackage (skips WELLNESS / HY in the JSON)."""
from __future__ import annotations

import json
import os
import re
import sys
from decimal import Decimal
from pathlib import Path

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'clasmo_backend.settings')

import django

django.setup()

from api.models import Test, TestPackage  # noqa: E402


def norm(value: str) -> str:
    text = (value or '').lower().replace('&', ' and ')
    text = re.sub(r'[^a-z0-9]+', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


def main() -> int:
    path = Path(__file__).resolve().parents[1] / 'data' / 'test_profiles.json'
    data = json.loads(path.read_text())
    profiles = data.get('profiles') or []
    print(f'profiles={len(profiles)}', flush=True)

    tests = list(Test.objects.all().only('id', 'name'))
    by_exact: dict[str, Test] = {}
    by_norm: dict[str, Test] = {}
    for test in tests:
        by_exact.setdefault(test.name.strip().lower(), test)
        by_norm.setdefault(norm(test.name), test)
    print(f'catalog_tests={len(tests)}', flush=True)

    packages = list(TestPackage.objects.all())
    pkg_by_exact = {pkg.name.strip().lower(): pkg for pkg in packages}
    pkg_by_norm = {norm(pkg.name): pkg for pkg in packages}

    aliases = {
            'homocysteine': 'Homocysteine, Serum',
            'phosphorous': 'Phosphorous , serum',
            'phosphorous, serum': 'Phosphorous , serum',
            'alpha fetoprotein (afp)': 'Alpha Fetoprotein (AFP), SERUM',
            'alpha fetoprotein (afp), serum': 'Alpha Fetoprotein (AFP), SERUM',
            'lh,fsh,prl': 'LH,FSH,PRL',
            'rheumatoid factor': 'Rheumatoid Factor (RA test) Quantitative',
            'ra test': 'Rheumatoid Factor (RA test) Quantitative',
            'u1rnp antibodies': 'U1RNP ANTIBODIES, SERUM',
            'centromere antibodies': 'Centromere Antibodies, IgG',
            'centromere antibodies, igg': 'Centromere Antibodies, IgG',
            'dengue igg,igm,ns1 rapid': 'DENGUE IgG,IgM,NS1 RAPID',
            'ketone (acetone,hydroxybutyrate)': 'Ketone (Acetone,Hydroxybutyrate), serum',
            'ketone (acetone, hydroxybutyrate)': 'Ketone (Acetone,Hydroxybutyrate), serum',
        }

    def find_test(name: str) -> Test | None:
        key = name.strip().lower()
        alias = aliases.get(key) or aliases.get(norm(name))
        if alias:
            name = alias
            key = name.strip().lower()
        if key in by_exact:
            return by_exact[key]
        nkey = norm(name)
        if nkey in by_norm:
            return by_norm[nkey]
        # LH / FSH / PRL listed separately in some profiles
        if key in {'lh', 'fsh', 'prl'}:
            return by_exact.get('lh,fsh,prl') or by_norm.get('lh fsh prl')
        return None

    created = updated = linked = 0
    unmatched: dict[str, int] = {}

    for index, row in enumerate(profiles, start=1):
        name = (row.get('name') or '').strip()[:200]
        if not name:
            continue
        test_ids: list[int] = []
        for test_name in row.get('tests') or []:
            test = find_test(test_name)
            if test:
                if test.id not in test_ids:
                    test_ids.append(test.id)
                    linked += 1
            else:
                unmatched[test_name] = unmatched.get(test_name, 0) + 1

        pkg = pkg_by_exact.get(name.lower()) or pkg_by_norm.get(norm(name))
        if pkg:
            pkg.name = name
            pkg.is_active = True
            pkg.save(update_fields=['name', 'is_active'])
            updated += 1
            action = 'updated'
        else:
            pkg = TestPackage.objects.create(
                name=name,
                mrp=Decimal('0'),
                rate=Decimal('0'),
                is_active=True,
            )
            pkg_by_exact[name.lower()] = pkg
            pkg_by_norm[norm(name)] = pkg
            created += 1
            action = 'created'

        pkg.tests.set(test_ids)
        if index % 25 == 0 or index == len(profiles):
            print(
                f'progress={index}/{len(profiles)} last={action}:{name} linked={len(test_ids)}',
                flush=True,
            )

    top = sorted(unmatched.items(), key=lambda item: -item[1])[:20]
    print(
        json.dumps(
            {
                'created': created,
                'updated': updated,
                'links': linked,
                'unique_unmatched': len(unmatched),
                'top_unmatched': top,
                'active_packages': TestPackage.objects.filter(is_active=True).count(),
            },
            indent=2,
        ),
        flush=True,
    )
    return 0


if __name__ == '__main__':
    sys.exit(main())
