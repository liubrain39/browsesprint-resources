#!/usr/bin/env python3
"""Validate a BrowseSprint worksheet locally; never claim a measured speedup."""
import argparse
import csv
import json
import math
import statistics
import sys
from decimal import Decimal, InvalidOperation

COLUMNS = (
    'approach', 'run', 'public_page', 'outcome', 'session_state',
    'total_seconds', 'success', 'tool_calls', 'retries',
    'navigation_seconds', 'extraction_seconds', 'decision_seconds',
    'timeout_seconds', 'notes',
)
SECONDS = ('total_seconds', 'navigation_seconds', 'extraction_seconds',
           'decision_seconds', 'timeout_seconds')
COUNTS = ('tool_calls', 'retries')
CONTEXT = ('public_page', 'outcome', 'session_state')


class WorksheetError(ValueError):
    pass


def number(value, column, row_number):
    if not value:
        return None
    if column in COUNTS:
        try:
            count = Decimal(value)
        except InvalidOperation:
            raise WorksheetError('Row %s: %s must be a whole count or blank' % (row_number, column))
        if not count.is_finite() or count < 0 or count != count.to_integral_value():
            raise WorksheetError('Row %s: %s must be finite, nonnegative and whole' % (row_number, column))
        return int(count)
    try:
        result = float(value)
    except ValueError:
        raise WorksheetError('Row %s: %s must be a number or blank' % (row_number, column))
    if not math.isfinite(result) or result < 0:
        raise WorksheetError('Row %s: %s must be finite and nonnegative' % (row_number, column))
    return result


def summarize(stream):
    reader = csv.DictReader(stream, strict=True)
    if tuple(reader.fieldnames or ()) != COLUMNS:
        raise WorksheetError('Header must match the published worksheet, in order')
    rows, warnings, seen = [], [], set()
    for row_number, raw in enumerate(reader, 2):
        if None in raw or any(value is None for value in raw.values()):
            raise WorksheetError('Row %s has the wrong number of cells' % row_number)
        row = {key: value.strip() for key, value in raw.items()}
        if row['approach'] not in ('baseline', 'changed'):
            raise WorksheetError('Row %s: approach must be baseline or changed' % row_number)
        if not row['run'].isascii() or not row['run'].isdigit() or int(row['run']) < 1:
            raise WorksheetError('Row %s: run must be a positive integer' % row_number)
        row['run'] = int(row['run'])
        key = (row['approach'], row['run'])
        if key in seen:
            raise WorksheetError('Duplicate approach/run: %s/%s' % key)
        seen.add(key)
        if row['success'] not in ('true', 'false', ''):
            raise WorksheetError('Row %s: success must be true, false or blank' % row_number)
        row['success'] = {'true': True, 'false': False, '': None}[row['success']]
        for column in SECONDS + COUNTS:
            row[column] = number(row[column], column, row_number)
        missing = [column for column in CONTEXT if not row[column]]
        if row['session_state'] == 'cold_or_reused':
            missing.append('actual session_state (replace placeholder)')
        for column in ('success', 'total_seconds'):
            if row[column] is None:
                missing.append(column)
        if row['success'] is False and not row['notes']:
            missing.append('failure details in notes')
        if missing:
            warnings.append({'row': row_number, 'missing': missing})
        rows.append(row)
    if not rows:
        raise WorksheetError('Worksheet contains no rows')
    groups = {}
    for approach in ('baseline', 'changed'):
        attempts = [row for row in rows if row['approach'] == approach]
        strata = {}
        for row in attempts:
            context = tuple(row[column] for column in CONTEXT)
            strata.setdefault(context, []).append(row)
        sections = []
        for context, selected in strata.items():
            timings = {}
            for label, success in (('reported_success', True), ('reported_failure', False), ('unchecked', None)):
                values = [row['total_seconds'] for row in selected
                          if row['success'] is success and row['total_seconds'] is not None]
                timings[label] = {'individual_seconds': values,
                                  'median_seconds': statistics.median(values) if values else None}
            sections.append({'recorded_context': dict(zip(CONTEXT, context)),
                             'rows': [row['run'] for row in selected], 'timings': timings})
        groups[approach] = {
            'recorded_rows': len(attempts),
            'reported_successes': sum(row['success'] is True for row in attempts),
            'reported_failures': sum(row['success'] is False for row in attempts),
            'unchecked_outcomes': sum(row['success'] is None for row in attempts),
            'strata': sections,
        }
    contexts = [{tuple(row[column] for column in CONTEXT) for row in rows if row['approach'] == approach}
                for approach in ('baseline', 'changed')]
    single_match = len(contexts[0]) == len(contexts[1]) == 1 and contexts[0] == contexts[1]
    fewer_than_three = [approach for approach in groups if groups[approach]['recorded_rows'] < 3]
    incomplete = bool(warnings or fewer_than_three)
    return {
        'status': 'incomplete' if incomplete else 'recorded',
        'groups': groups, 'row_warnings': warnings,
        'approaches_with_fewer_than_three_rows': fewer_than_three,
        'one_recorded_context_matches': bool(single_match and not incomplete),
        'manual_checks_still_required': [
            'Whether each success value was checked against the written rule',
            'Same prompt, model, browser/tool version and one intentional change',
            'Page changes, cache warmth, network conditions and interruptions',
        ],
        'automatic_speedup_claim': None,
        'limits': 'Descriptive rows only. Blank is unknown, not zero. Failures are separate. '
                  'Stage intervals are never summed. Six attempts do not prove a general speedup.',
        'rows': rows,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('worksheet', help='Local CSV; no browser or network access')
    args = parser.parse_args()
    try:
        with open(args.worksheet, encoding='utf-8-sig', newline='') as stream:
            report = summarize(stream)
    except (OSError, UnicodeError, csv.Error, WorksheetError) as error:
        print(json.dumps({'status': 'invalid', 'error': str(error)}, allow_nan=False))
        return 2
    print(json.dumps(report, indent=2, allow_nan=False))
    return 1 if report['status'] == 'incomplete' else 0


if __name__ == '__main__':
    sys.exit(main())
