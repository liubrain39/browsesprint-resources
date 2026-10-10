"""Offline regression cases; numbers are synthetic, not browser measurements."""
import csv
import io
import unittest
import check_worksheet as checker


def worksheet(changes=None):
    rows = []
    for approach in ('baseline', 'changed'):
        for run in (1, 2, 3):
            row = dict.fromkeys(checker.COLUMNS, '')
            row.update(approach=approach, run=str(run), public_page='https://example.com/',
                       outcome='Synthetic fixture only', session_state='cold',
                       total_seconds='10', success='true')
            rows.append(row)
    if changes:
        changes(rows)
    stream = io.StringIO()
    writer = csv.DictWriter(stream, fieldnames=checker.COLUMNS)
    writer.writeheader(); writer.writerows(rows); stream.seek(0)
    return stream


class WorksheetChecks(unittest.TestCase):
    def test_blank_values_are_unknown_not_zero(self):
        report = checker.summarize(worksheet(lambda rows: rows[0].update(total_seconds='', success='')))
        self.assertEqual(report['status'], 'incomplete')
        self.assertIsNone(report['rows'][0]['total_seconds'])
        self.assertEqual(report['groups']['baseline']['unchecked_outcomes'], 1)

    def test_fast_failure_is_not_a_successful_speedup(self):
        report = checker.summarize(worksheet(lambda rows: rows[3].update(total_seconds='0.1', success='false', notes='Synthetic failure')))
        strata = report['groups']['changed']['strata'][0]['timings']
        self.assertEqual(strata['reported_success']['individual_seconds'], [10, 10])
        self.assertEqual(strata['reported_failure']['individual_seconds'], [0.1])
        self.assertIsNone(report['automatic_speedup_claim'])

    def test_mixed_session_states_are_kept_separate(self):
        report = checker.summarize(worksheet(lambda rows: rows[3].update(session_state='reused')))
        self.assertEqual(len(report['groups']['changed']['strata']), 2)
        self.assertFalse(report['one_recorded_context_matches'])

    def test_page_change_does_not_match_context(self):
        report = checker.summarize(worksheet(lambda rows: rows[3].update(public_page='https://example.com/different')))
        self.assertFalse(report['one_recorded_context_matches'])

    def test_stage_times_are_not_manufactured_into_total(self):
        report = checker.summarize(worksheet(lambda rows: rows[0].update(navigation_seconds='9', extraction_seconds='8')))
        self.assertEqual(report['rows'][0]['total_seconds'], 10)

    def test_nan_infinity_and_negative_timings_are_invalid(self):
        for value in ('NaN', 'inf', '-1'):
            with self.subTest(value=value), self.assertRaises(checker.WorksheetError):
                checker.summarize(worksheet(lambda rows: rows[0].update(total_seconds=value)))

    def test_fractional_count_is_invalid(self):
        with self.assertRaises(checker.WorksheetError):
            checker.summarize(worksheet(lambda rows: rows[0].update(tool_calls='1.5')))

    def test_large_whole_count_is_preserved_without_float_rounding(self):
        value = '9007199254740993'
        report = checker.summarize(worksheet(lambda rows: rows[0].update(tool_calls=value)))
        self.assertEqual(report['rows'][0]['tool_calls'], int(value))

    def test_success_flag_does_not_verify_the_underlying_page(self):
        report = checker.summarize(worksheet())
        self.assertEqual(report['groups']['baseline']['reported_successes'], 3)
        self.assertIn('Whether each success value was checked', report['manual_checks_still_required'][0])

    def test_duplicate_run_is_invalid(self):
        with self.assertRaises(checker.WorksheetError):
            checker.summarize(worksheet(lambda rows: rows[1].update(run='1')))

    def test_unchecked_success_spelling_is_invalid(self):
        with self.assertRaises(checker.WorksheetError):
            checker.summarize(worksheet(lambda rows: rows[0].update(success='yes')))

    def test_complete_synthetic_rows_still_require_manual_checks(self):
        report = checker.summarize(worksheet())
        self.assertEqual(report['status'], 'recorded')
        self.assertTrue(report['one_recorded_context_matches'])
        self.assertEqual(len(report['manual_checks_still_required']), 3)
        self.assertIsNone(report['automatic_speedup_claim'])


if __name__ == '__main__':
    unittest.main()
