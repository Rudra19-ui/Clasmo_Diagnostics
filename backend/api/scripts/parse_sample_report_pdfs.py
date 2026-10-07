#!/usr/bin/env python3
"""Parse merged CLASMO/HY sample report PDFs into batch import JSON."""

from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path

import fitz

WORKSPACE = Path(__file__).resolve().parents[3]
DEFAULT_PDF1 = Path(
    '/Users/harshadambekar/.cursor/projects/Users-harshadambekar-DATA-Original-Project-Files-Project-CLASMO-DIAGNOSTICS/attachments/33ffff46-337a-4e3a-ab1c-f242dcc753d0/ilovepdf_merged__2__1.pdf'
)
DEFAULT_PDF2 = Path(
    '/Users/harshadambekar/.cursor/projects/Users-harshadambekar-DATA-Original-Project-Files-Project-CLASMO-DIAGNOSTICS/attachments/33ffff46-337a-4e3a-ab1c-f242dcc753d0/ilovepdf_merged__3__-_Copy_1.pdf'
)
OUT_JSON = WORKSPACE / 'backend/api/data/report_formats/sample_reports_batch_import.json'
PDF_DEST1 = WORKSPACE / 'backend/api/data/report_formats/sample_reports_batch_part1.pdf'
PDF_DEST2 = WORKSPACE / 'backend/api/data/report_formats/sample_reports_batch_part2.pdf'
SUMMARY_JSON = Path(
    '/Users/harshadambekar/.cursor/projects/Users-harshadambekar-DATA-Original-Project-Files-Project-CLASMO-DIAGNOSTICS/assets/import_parse_summary.json'
)

END_MARK = '~~End of report~~'
PANEL_INV_NAMES = {
    'hy fitness smart 3',
    'basic fever panel',
    'health check extended male',
}
TABLE_HEADER_MARKERS = {
    'TEST DESCRIPTION',
    'RESULT',
    'UNITS',
    'BIOLOGICAL REFERENCE RANGE',
    'RANGE',
    'METHOD',
}

SECTION_HEADINGS = [
    (re.compile(r'^INTERPRETATION\b', re.I), 'INTERPRETATION'),
    (re.compile(r'^Interpretation\b', re.I), 'Interpretation'),
    (re.compile(r'^interpretation\b', re.I), 'Interpretation'),
    (re.compile(r'^Clinical significance\s*:?\s*$', re.I), 'CLINICAL_SIGNIFICANCE'),
    (re.compile(r'^Clinical significance\s*:', re.I), 'CLINICAL_SIGNIFICANCE_INLINE'),
    (re.compile(r'^Comments\b', re.I), 'Comments'),
    (re.compile(r'^NOTE-?\b', re.I), 'NOTE'),
    (re.compile(r'^Reference Range\b', re.I), 'Reference Range'),
    (re.compile(r'^BIOLOGICAL REFERENCE RANGES\b', re.I), 'BIOLOGICAL REFERENCE RANGES'),
    (re.compile(r'^REFERENCE\b', re.I), 'REFERENCE'),
    (re.compile(r'^Clinical Information\b', re.I), 'Clinical Information'),
    (re.compile(r'^Clinical Utility\b', re.I), 'Clinical Utility'),
    (re.compile(r'^Guidance For Known Diabetics\b', re.I), 'Guidance For Known Diabetics'),
    (re.compile(r'^Abnormal Partial Thromboplastin Time\b', re.I), 'Abnormal Partial Thromboplastin Time'),
    (re.compile(r'^USES\b', re.I), 'USES'),
    (re.compile(r'^IMPRESSION\b', re.I), 'IMPRESSION'),
    (re.compile(r'^COMMENTS\b', re.I), 'COMMENTS'),
]


def _norm(name: str) -> str:
    text = (name or '').lower()
    text = text.replace('&', ' and ')
    text = re.sub(r'[^a-z0-9]+', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


def format_from_caps(raw: str) -> str:
    s = clean_line(raw)
    if not s:
        return s
    titled = s.lower().title()
    fixes = (
        (r'\bHiv\b', 'HIV'),
        (r'\bHcv\b', 'HCV'),
        (r'\bHbv\b', 'HBV'),
        (r'\bHav\b', 'HAV'),
        (r'\bHbsag\b', 'HBsAg'),
        (r'\bHbs Ag\b', 'HBs Ag'),
        (r'\bHbA1c\b', 'HbA1c'),
        (r'\bCbc\b', 'CBC'),
        (r'\bEsr\b', 'ESR'),
        (r'\bIge\b', 'IgE'),
        (r'\bIgg\b', 'IgG'),
        (r'\bIgm\b', 'IgM'),
        (r'\bFt3\b', 'FT3'),
        (r'\bFt4\b', 'FT4'),
        (r'\bCrp\b', 'CRP'),
        (r'\bGgt\b', 'GGT'),
        (r'\bLdl\b', 'LDL'),
        (r'\bBun\b', 'BUN'),
        (r'\bPt\b', 'PT'),
        (r'\bInr\b', 'INR'),
        (r'\bPrl\b', 'PRL'),
        (r'\bLh\b', 'LH'),
        (r'\bFnac\b', 'FNAC'),
        (r'\bPap\b', 'PAP'),
        (r'\bPbs\b', 'PBS'),
        (r'\bPbf\b', 'PBF'),
        (r'\bElisa\b', 'ELISA'),
        (r'\bClia\b', 'CLIA'),
        (r'\bAnti Ccp\b', 'Anti-CCP'),
        (r'\bAnti-Ccp\b', 'Anti-CCP'),
        (r'\b25 Oh\b', '25 OH'),
        (r'\bOh\b', 'OH'),
        (r'\bD 3\b', 'D 3'),
        (r'\bOd\b', 'OD'),
        (r'\bUrea\b', 'Urea'),
        (r'\bRh\b', 'Rh'),
    )
    for pattern, repl in fixes:
        titled = re.sub(pattern, repl, titled, flags=re.I)
    return titled


def choose_test_name(inv: str, title: str) -> str:
    inv_c = clean_line(inv)
    title_c = clean_line(title)
    inv_norm = _norm(inv_c)
    title_norm = _norm(title_c)

    if inv_norm in PANEL_INV_NAMES:
        return format_from_caps(title_c) if title_c else inv_c
    if title_c and inv_c and title_norm != inv_norm:
        return format_from_caps(title_c)
    if inv_c and not inv_c.isupper():
        return inv_c
    if title_c and not title_c.isupper():
        return title_c
    return format_from_caps(title_c or inv_c)


def clean_line(line: str) -> str:
    return re.sub(r'\s+', ' ', (line or '').replace('\xa0', ' ')).strip()


def extract_field(text: str, label: str) -> str:
    m = re.search(rf'{re.escape(label)}\s*:\s*(.+?)(?:\n|$)', text, re.I)
    return clean_line(m.group(1)) if m else ''


def split_report_body(text: str) -> str:
    if END_MARK in text:
        text = text.split(END_MARK)[0]
    # Drop letterhead / patient header through SAMPLE line
    m = re.search(r'SAMPLE\s*:\s*.+\n', text, re.I)
    if m:
        text = text[m.end() :]
    return text


def detect_section_start(line: str) -> str | None:
    stripped = clean_line(line)
    if not stripped:
        return None
    for pattern, key in SECTION_HEADINGS:
        if pattern.match(stripped):
            return key
    if stripped.upper().startswith('INTERPRETATION'):
        return 'INTERPRETATION'
    return None


def parse_method_from_name(line: str) -> tuple[str, str]:
    line = clean_line(line)
    m = re.search(r'\sMethod:\s*(.+)$', line, re.I)
    if m:
        return clean_line(line[: m.start()]), clean_line(m.group(1))
    return line, ''


def is_table_header(line: str) -> bool:
    u = clean_line(line).upper().replace('  ', ' ')
    if u in TABLE_HEADER_MARKERS:
        return True
    if u.startswith('BIOLOGICAL REFERENCE'):
        return True
    return False


def skip_table_headers(lines: list[str], start: int) -> tuple[int, bool]:
    i = start
    has_method_col = False
    while i < len(lines):
        line = clean_line(lines[i])
        if not line:
            i += 1
            continue
        upper = line.upper()
        if upper in TABLE_HEADER_MARKERS or upper.startswith('BIOLOGICAL REFERENCE'):
            if upper == 'METHOD':
                has_method_col = True
            i += 1
            continue
        break
    return i, has_method_col


def is_result_token(line: str) -> bool:
    s = clean_line(line)
    if not s:
        return False
    if re.match(r'^Method:', s, re.I):
        return False
    if detect_section_start(s):
        return False
    if is_table_header(s):
        return False
    return True


def consume_parameter_name(lines: list[str], i: int) -> tuple[str, str, int, bool]:
    """Return name, method, next index, hit_section."""
    parts: list[str] = []
    method = ''
    while i < len(lines):
        line = clean_line(lines[i])
        if not line:
            i += 1
            continue
        if detect_section_start(line):
            return ' '.join(parts).strip(), method, i, True
        if is_table_header(line):
            i += 1
            continue
        if re.match(r'^Method:', line, re.I):
            method = clean_line(re.sub(r'^Method:\s*', '', line, flags=re.I))
            i += 1
            continue
        inline_name, inline_method = parse_method_from_name(line)
        if inline_method:
            method = inline_method
        if parts and is_result_token(line):
            # Continuation of name vs start of result — names rarely start with digits.
            if re.match(r'^[\d<>=]', line) or line.upper() in {
                'NON REACTIVE',
                'REACTIVE',
                'NEGATIVE',
                'POSITIVE',
                'NO MICRO-ORGANISM SEEN',
            }:
                break
        if ':' in inline_name and not parts:
            key, _, val = inline_name.partition(':')
            if val.strip():
                return clean_line(key), method, i, False
        if parts and is_result_token(line) and not re.search(r'[a-z]', line) is None:
            if re.match(r'^[\d.+-]', line) or line in {'.', '-'}:
                break
        parts.append(inline_name)
        i += 1
        if i < len(lines) and re.match(r'^Method:', clean_line(lines[i]), re.I):
            method = clean_line(re.sub(r'^Method:\s*', '', clean_line(lines[i]), flags=re.I))
            i += 1
    return ' '.join(parts).strip(), method, i, False


def parse_table_rows(lines: list[str]) -> tuple[list[dict], int]:
    """Return parameters and index where footer sections begin."""
    params: list[dict] = []
    i, has_method_col = skip_table_headers(lines, 0)

    while i < len(lines):
        line = clean_line(lines[i])
        if not line:
            i += 1
            continue
        if detect_section_start(line):
            break

        # Key-value descriptive row (PAP smear etc.)
        if ':' in line and not re.match(r'^Method:', line, re.I):
            key, _, val = line.partition(':')
            if val.strip() and not is_table_header(key):
                params.append(
                    {
                        'parameter_name': clean_line(key),
                        'unit': '',
                        'method': '',
                        'reference_range_male': '',
                        'sample_value': clean_line(val),
                        'sort_order': len(params) + 1,
                    }
                )
                i += 1
                continue

        name, method, i, hit_section = consume_parameter_name(lines, i)
        if hit_section:
            break
        if not name:
            i += 1
            continue

        if i >= len(lines):
            params.append(
                {
                    'parameter_name': name,
                    'unit': '',
                    'method': method,
                    'reference_range_male': '',
                    'sample_value': '',
                    'sort_order': len(params) + 1,
                }
            )
            break

        if detect_section_start(lines[i]):
            params.append(
                {
                    'parameter_name': name,
                    'unit': '',
                    'method': method,
                    'reference_range_male': '',
                    'sample_value': '',
                    'sort_order': len(params) + 1,
                }
            )
            break

        result = clean_line(lines[i])
        i += 1
        unit = ref = method_col = ''
        if i < len(lines) and is_result_token(lines[i]):
            unit = clean_line(lines[i])
            i += 1
        if i < len(lines) and is_result_token(lines[i]):
            ref = clean_line(lines[i])
            i += 1
        if has_method_col and i < len(lines) and is_result_token(lines[i]):
            method_col = clean_line(lines[i])
            i += 1
        if not method and method_col:
            method = method_col

        # Text-only results (PBS lines)
        if result and not unit and not ref:
            params.append(
                {
                    'parameter_name': name,
                    'unit': '',
                    'method': method,
                    'reference_range_male': '',
                    'sample_value': result,
                    'sort_order': len(params) + 1,
                }
            )
            continue

        params.append(
            {
                'parameter_name': name,
                'unit': unit,
                'method': method,
                'reference_range_male': ref,
                'reference_range_female': '',
                'reference_range_child': '',
                'sample_value': result if result not in {'.', '-'} else '',
                'sort_order': len(params) + 1,
            }
        )

    return params, i


def parse_sections(lines: list[str], start: int) -> dict[str, str]:
    sections: dict[str, str] = {}
    current_key: str | None = None
    buf: list[str] = []

    def flush():
        nonlocal buf, current_key
        if current_key and buf:
            text = clean_line(' '.join(buf))
            if text:
                if current_key in sections:
                    sections[current_key] = clean_line(sections[current_key] + '\n' + text)
                else:
                    sections[current_key] = text
        buf = []

    i = start
    while i < len(lines):
        line = lines[i]
        stripped = clean_line(line)
        if not stripped:
            i += 1
            continue
        sec = detect_section_start(stripped)
        if sec == 'CLINICAL_SIGNIFICANCE_INLINE':
            flush()
            current_key = 'clinical_significance'
            rest = re.sub(r'^Clinical significance\s*:\s*', '', stripped, flags=re.I)
            buf = [rest] if rest else []
            i += 1
            continue
        if sec:
            flush()
            if sec == 'CLINICAL_SIGNIFICANCE':
                current_key = 'clinical_significance'
            elif sec == 'NOTE':
                current_key = 'report_note'
            elif sec == 'Comments':
                current_key = 'report_comments'
            elif sec in {'INTERPRETATION', 'Interpretation'}:
                current_key = 'INTERPRETATION'
            else:
                current_key = sec
            # Inline content after heading on same line
            inline = re.sub(r'^[A-Za-z /]+:?\s*', '', stripped, count=1)
            if sec == 'Comments' and stripped.lower().startswith('comments'):
                inline = clean_line(stripped[len('Comments') :].lstrip(' :'))
            elif sec == 'NOTE':
                inline = clean_line(re.sub(r'^NOTE-?\s*', '', stripped, flags=re.I))
            buf = [inline] if inline and inline != stripped else []
            i += 1
            continue
        if current_key:
            buf.append(stripped)
        i += 1
    flush()
    return sections


def parse_page_text(text: str, *, source: str, page: int) -> dict | None:
    try:
        inv = extract_field(text, 'INV')
        sample_type = extract_field(text, 'SAMPLE')
        body = split_report_body(text)
        lines = [clean_line(x) for x in body.splitlines()]
        lines = [x for x in lines if x]

        title = ''
        for idx, line in enumerate(lines):
            if line.upper() == 'TEST DESCRIPTION':
                # title is previous non-empty line(s)
                j = idx - 1
                while j >= 0 and not lines[j]:
                    j -= 1
                if j >= 0:
                    title = lines[j]
                break

        test_name = choose_test_name(inv, title)
        if not test_name:
            return None

        # Table + sections
        try:
            td_idx = next(i for i, l in enumerate(lines) if l.upper() == 'TEST DESCRIPTION')
        except StopIteration:
            td_idx = 0
        table_lines = lines[td_idx + 1 :]
        params, sec_start = parse_table_rows(table_lines)
        sections = parse_sections(table_lines, sec_start)

        report_note = sections.pop('report_note', '')
        report_comments = sections.pop('report_comments', '')
        clinical_significance = sections.pop('clinical_significance', '')
        extra = {k: v for k, v in sections.items() if k not in {'report_note', 'report_comments', 'clinical_significance'}}

        if not params:
            # Fallback: capture free-text under table header
            for line in table_lines:
                if line and not is_table_header(line) and not detect_section_start(line):
                    params.append(
                        {
                            'parameter_name': test_name,
                            'unit': '',
                            'method': '',
                            'reference_range_male': '',
                            'sample_value': line,
                            'sort_order': 1,
                        }
                    )
                    break

        match_names = []
        for candidate in (test_name, inv, title):
            c = clean_line(candidate)
            if c and c not in match_names:
                match_names.append(c)

        row = {
            'test_name': test_name,
            'match_names': match_names,
            'sample_type': sample_type,
            'parameters': params,
        }
        if report_note:
            row['report_note'] = report_note
        if report_comments:
            row['report_comments'] = report_comments
        if clinical_significance:
            row['clinical_significance'] = clinical_significance
        if extra:
            row['report_extra_sections'] = extra
        row['_meta'] = {'source': source, 'page': page, 'inv': inv}
        return row
    except Exception as exc:  # noqa: BLE001
        return {'_error': str(exc), '_meta': {'source': source, 'page': page}}


def param_quality_score(params: list[dict]) -> int:
    score = 0
    for p in params or []:
        name = (p.get('parameter_name') or '').strip()
        if not name or name.upper() in TABLE_HEADER_MARKERS:
            score -= 5
            continue
        if name.isdigit() or name in {'g/dL', '%', 'METHOD', 'RANGE'}:
            score -= 3
            continue
        score += 2
        if p.get('sample_value'):
            score += 1
        if p.get('unit'):
            score += 1
    return score


def richness_score(row: dict) -> int:
    if '_error' in row:
        return -1
    params = row.get('parameters') or []
    score = param_quality_score(params)
    for key in ('report_note', 'report_comments', 'clinical_significance'):
        score += len(row.get(key) or '') // 40
    extra = row.get('report_extra_sections') or {}
    score += sum(len(v) for v in extra.values()) // 40
    return score


def merge_rows(existing: list[dict], new_rows: list[dict]) -> tuple[list[dict], list[str]]:
    by_norm: dict[str, dict] = {}
    order: list[str] = []
    failures: list[str] = []

    for row in existing:
        name = row.get('test_name') or ''
        key = _norm(name)
        if key:
            by_norm[key] = row
            order.append(key)

    for row in new_rows:
        if row.get('_error'):
            meta = row.get('_meta') or {}
            failures.append(f"{meta.get('source')} p{meta.get('page')}: {row['_error']}")
            continue
        meta = row.pop('_meta', {})
        inv = meta.get('inv', '')
        key = _norm(row.get('test_name') or '')
        if not key:
            failures.append(f"{meta.get('source')} p{meta.get('page')}: missing test_name (inv={inv})")
            continue
        incoming = {k: v for k, v in row.items() if not k.startswith('_')}
        if key in by_norm:
            if richness_score(incoming) >= richness_score(by_norm[key]):
                # preserve match_names union
                old_names = list(by_norm[key].get('match_names') or [])
                new_names = list(incoming.get('match_names') or [])
                merged_names = old_names[:]
                for n in new_names:
                    if n not in merged_names:
                        merged_names.append(n)
                incoming['match_names'] = merged_names
                by_norm[key] = incoming
        else:
            by_norm[key] = incoming
            order.append(key)

    merged = [by_norm[k] for k in order if k in by_norm]
    return merged, failures


def extract_pdf(path: Path) -> tuple[list[dict], int, list[str]]:
    doc = fitz.open(path)
    rows = []
    failures = []
    for i in range(doc.page_count):
        text = doc[i].get_text()
        parsed = parse_page_text(text, source=path.name, page=i + 1)
        if parsed is None:
            failures.append(f'{path.name} p{i + 1}: empty parse')
        elif parsed.get('_error'):
            failures.append(f"{path.name} p{i + 1}: {parsed['_error']}")
        else:
            rows.append(parsed)
    count = doc.page_count
    doc.close()
    return rows, count, failures


def main() -> int:
    pdf1 = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PDF1
    pdf2 = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_PDF2

    existing: list[dict] = []
    if OUT_JSON.is_file():
        existing = json.loads(OUT_JSON.read_text(encoding='utf-8'))

    rows1, pages1, fail1 = extract_pdf(pdf1)
    rows2, pages2, fail2 = extract_pdf(pdf2)
    all_new = rows1 + rows2
    merged, merge_failures = merge_rows(existing, all_new)
    failures = fail1 + fail2 + merge_failures

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(merged, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

    shutil.copy2(pdf1, PDF_DEST1)
    shutil.copy2(pdf2, PDF_DEST2)

    test_names = [r['test_name'] for r in merged if r.get('test_name')]
    new_test_names = sorted({_norm(r.get('test_name', '')) for r in all_new if r.get('test_name')})

    summary = {
        'pdf_part1': str(PDF_DEST1.relative_to(WORKSPACE)),
        'pdf_part2': str(PDF_DEST2.relative_to(WORKSPACE)),
        'page_counts': {'part1': pages1, 'part2': pages2, 'total': pages1 + pages2},
        'pages_parsed': len(all_new),
        'tests_in_final_json': len(merged),
        'tests_extracted_from_pdfs': len({ _norm(r.get('test_name','')) for r in all_new }),
        'test_names': test_names,
        'parse_failures': failures,
    }
    SUMMARY_JSON.parent.mkdir(parents=True, exist_ok=True)
    SUMMARY_JSON.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

    print(json.dumps({
        'tests_in_final_json': len(merged),
        'pages': summary['page_counts'],
        'failures': len(failures),
        'sample_tests': [
            {'test_name': merged[i]['test_name'], 'params': len(merged[i].get('parameters') or [])}
            for i in range(min(2, len(merged)))
        ],
    }, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
