"""Parse POR test catalog PDFs (sample types + prices) into structured rows."""

from __future__ import annotations

import json
import re
from pathlib import Path

from pypdf import PdfReader

SAMPLE_PAGE_MARKER = re.compile(
    r'^(-- \d+ of \d+ --|SL TEST NAME SAMPLE TYPE\s*)$',
    re.I,
)
PRICE_PAGE_MARKER = re.compile(
    r'^(-- \d+ of \d+ --|SL TEST NAME TEST MRP TEST PRICE\s*)$',
    re.I,
)
SL_LINE = re.compile(r'^(\d+)\s+(.+)$')
PRICE_TAIL = re.compile(r'Rs\.\s*([\d,]+)\s+Rs\.\s*([\d,]+)\s*$')


def _normalize_name(value: str) -> str:
    return ' '.join((value or '').split())


def _normalize_sample(value: str) -> str:
    parts = [part.strip(' ,') for part in re.split(r'[,/|]', value or '') if part.strip(' ,')]
    return ', '.join(parts)


def _extract_pdf_lines(path: str | Path) -> list[str]:
    reader = PdfReader(str(path))
    lines: list[str] = []
    for page in reader.pages:
        text = page.extract_text() or ''
        lines.extend(text.splitlines())
    return lines


def parse_por_price_lines(lines: list[str]) -> dict[int, dict]:
    """Return price rows keyed by SL number."""
    records: dict[int, dict] = {}
    pending_sl: int | None = None
    pending_name_parts: list[str] = []

    def store_price_row(sl: int, name_parts: list[str], mrp: int, price: int) -> None:
        records[sl] = {
            'sl': sl,
            'name': _normalize_name(' '.join(name_parts)),
            'mrp': mrp,
            'price': price,
        }

    for raw in lines:
        line = (raw or '').strip()
        if not line or PRICE_PAGE_MARKER.match(line):
            continue

        price_match = PRICE_TAIL.search(line)
        if price_match:
            mrp = int(price_match.group(1).replace(',', ''))
            price = int(price_match.group(2).replace(',', ''))
            before_price = line[: price_match.start()].strip()
            sl_match = SL_LINE.match(before_price)

            if sl_match:
                store_price_row(int(sl_match.group(1)), [sl_match.group(2).strip()], mrp, price)
                pending_sl = None
                pending_name_parts = []
                continue

            if pending_sl is not None:
                name_parts = [*pending_name_parts]
                if before_price:
                    name_parts.append(before_price)
                store_price_row(pending_sl, name_parts, mrp, price)
                pending_sl = None
                pending_name_parts = []
            continue

        sl_match = SL_LINE.match(line)
        if sl_match:
            pending_sl = int(sl_match.group(1))
            pending_name_parts = [sl_match.group(2).strip()]
            continue

        if pending_sl is not None:
            pending_name_parts.append(line)

    return records


def parse_por_sample_lines(lines: list[str], price_by_sl: dict[int, dict]) -> dict[int, dict]:
    """Return sample rows keyed by SL number."""
    records: dict[int, dict] = {}
    pending_sl: int | None = None
    content_lines: list[str] = []

    def flush() -> None:
        nonlocal pending_sl, content_lines
        if pending_sl is None:
            return

        full_text = _normalize_name(' '.join(content_lines))
        expected_name = (price_by_sl.get(pending_sl) or {}).get('name', '')

        sample_type = ''
        if expected_name:
            name = expected_name
            if full_text.startswith(expected_name):
                sample_type = full_text[len(expected_name) :].strip(' ,')
            elif expected_name in full_text:
                sample_type = full_text.replace(expected_name, '', 1).strip(' ,')
        else:
            name = full_text
            if len(content_lines) > 1:
                sample_type = ', '.join(part.strip(' ,') for part in content_lines[1:] if part.strip(' ,'))
            elif content_lines:
                parts = content_lines[0].rsplit(' ', 1)
                if len(parts) == 2:
                    name, sample_type = parts[0].strip(), parts[1].strip(' ,')

        records[pending_sl] = {
            'sl': pending_sl,
            'name': _normalize_name(name),
            'sample_type': _normalize_sample(sample_type),
        }
        pending_sl = None
        content_lines = []

    for raw in lines:
        line = (raw or '').strip()
        if not line or SAMPLE_PAGE_MARKER.match(line):
            continue

        sl_match = SL_LINE.match(line)
        if sl_match:
            flush()
            pending_sl = int(sl_match.group(1))
            content_lines = [sl_match.group(2).strip()]
            continue

        if pending_sl is not None:
            content_lines.append(line)

    flush()
    return records


def merge_por_catalog(price_by_sl: dict[int, dict], sample_by_sl: dict[int, dict]) -> list[dict]:
    merged: list[dict] = []
    for sl in sorted(price_by_sl):
        price_row = price_by_sl[sl]
        sample_row = sample_by_sl.get(sl, {})
        merged.append(
            {
                'sl': sl,
                'name': price_row.get('name') or sample_row.get('name') or '',
                'mrp': price_row.get('mrp', 0),
                'price': price_row.get('price', 0),
                'sample_type': sample_row.get('sample_type') or '',
            }
        )
    return merged


def parse_por_catalog(sample_pdf: str | Path, price_pdf: str | Path) -> list[dict]:
    price_by_sl = parse_por_price_lines(_extract_pdf_lines(price_pdf))
    sample_by_sl = parse_por_sample_lines(_extract_pdf_lines(sample_pdf), price_by_sl)
    return merge_por_catalog(price_by_sl, sample_by_sl)


def load_por_catalog_json(path: str | Path) -> list[dict]:
    payload = json.loads(Path(path).read_text(encoding='utf-8'))
    if isinstance(payload, dict):
        return payload.get('tests') or []
    return payload


def write_por_catalog_json(rows: list[dict], path: str | Path) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        json.dumps({'source': 'por_catalog', 'tests': rows}, indent=2),
        encoding='utf-8',
    )
