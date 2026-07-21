"""Parse Ratnagiri rate PDF/text exports into structured test rows."""

from __future__ import annotations

import json
import re
from pathlib import Path

PAGE_MARKER = re.compile(r'^(-- \d+ of \d+ --|TEST NAME|TEST\s*$|MRP\s*$|PRICE\s*$|SAMPLE TYPE\s*$)$', re.I)
ROW_PATTERN = re.compile(
    r'^(?P<name>.+?)\s+(?P<mrp>\d{2,6})\s+(?P<price>\d{1,6})\s+(?P<sample>.+)$'
)
NUMBERS_PATTERN = re.compile(r'^(\d{2,6})\s+(\d{1,6})\s*(.*)$')


def _normalize_name(value: str) -> str:
    return ' '.join((value or '').split())


def parse_ratnagiri_lines(lines: list[str]) -> list[dict]:
    records: list[dict] = []
    pending: dict | None = None

    def flush_pending() -> None:
        nonlocal pending
        if pending and pending.get('name') and pending.get('mrp') and pending.get('price'):
            sample = ', '.join(pending.get('sample_parts', [])).strip(' ,')
            records.append(
                {
                    'name': _normalize_name(pending['name']),
                    'mrp': int(pending['mrp']),
                    'price': int(pending['price']),
                    'sample_type': sample,
                }
            )
        pending = None

    for raw in lines:
        line = (raw or '').strip()
        if not line or PAGE_MARKER.match(line):
            continue

        match = ROW_PATTERN.match(line)
        if match:
            flush_pending()
            records.append(
                {
                    'name': _normalize_name(match.group('name')),
                    'mrp': int(match.group('mrp')),
                    'price': int(match.group('price')),
                    'sample_type': match.group('sample').strip(' ,'),
                }
            )
            continue

        number_match = NUMBERS_PATTERN.match(line)
        if number_match and pending and pending.get('name') and not pending.get('mrp'):
            pending['mrp'] = number_match.group(1)
            pending['price'] = number_match.group(2)
            if number_match.group(3).strip():
                pending.setdefault('sample_parts', []).append(number_match.group(3).strip(' ,'))
            continue

        if pending:
            if pending.get('mrp') and pending.get('price'):
                pending.setdefault('sample_parts', []).append(line.strip(' ,'))
            else:
                pending['name'] = f"{pending.get('name', '')} {line}".strip()
            continue

        pending = {'name': line, 'sample_parts': []}

    flush_pending()

    deduped: dict[str, dict] = {}
    for row in records:
        deduped[row['name'].lower()] = row
    return list(deduped.values())


def parse_ratnagiri_text(text: str) -> list[dict]:
    return parse_ratnagiri_lines(text.splitlines())


def parse_ratnagiri_pdf(pdf_path: str | Path) -> list[dict]:
    from pypdf import PdfReader

    reader = PdfReader(str(pdf_path))
    lines: list[str] = []
    for page in reader.pages:
        lines.extend((page.extract_text() or '').splitlines())
    return parse_ratnagiri_lines(lines)


def load_ratnagiri_rates_json(json_path: str | Path) -> list[dict]:
    with Path(json_path).open(encoding='utf-8') as handle:
        payload = json.load(handle)
    if isinstance(payload, dict) and 'tests' in payload:
        return payload['tests']
    if isinstance(payload, list):
        return payload
    raise ValueError('Unsupported Ratnagiri rates JSON format.')
