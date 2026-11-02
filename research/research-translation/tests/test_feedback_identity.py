"""Portable regression cases for returned feedback identity and extra fields."""
import csv
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('collate_feedback', ROOT / 'scripts/collate_feedback.py')
collate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collate)


class FeedbackIdentityTests(unittest.TestCase):
    def test_row_retains_package_identity_and_extra_ratings(self):
        row = collate.normalise_row(
            {'unit_id': 'Q1', 'package_id': '', 'naturalness': 0, 'unit_sha256': 'unit-hash',
             'custom_rating': {'scale': 'test', 'value': 2}},
            Path('returned.json'),
            {'package_id': 'test-package', 'package_version': '2',
             'candidate_sha256': 'candidate-hash', 'feedback': []})
        self.assertEqual(row['package_id'], 'test-package')
        self.assertEqual(row['package_version'], '2')
        self.assertEqual(row['candidate_sha256'], 'candidate-hash')
        self.assertEqual(row['naturalness'], '0')
        self.assertEqual(json.loads(row['custom_rating'])['value'], 2)
        self.assertNotIn('feedback', row)

    def test_csv_roundtrip_preserves_additional_columns(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as directory:
            path = Path(directory) / 'feedback.csv'
            row = collate.normalise_row({'unit_id': 'Q1', 'package_id': 'test-package',
                                        'naturalness': 4}, Path('original.json'))
            collate.write_csv(path, [row])
            with path.open(newline='') as handle:
                written = next(csv.DictReader(handle))
            self.assertEqual(written['naturalness'], '4')
            self.assertEqual(written['package_id'], 'test-package')

    def test_nested_export_retains_parent_identity_and_arm_fields(self):
        data = {'package_id': 'test-package', 'package_version': '1',
                'materials': [{'id': 'test', 'units': [{'id': 'Q1', 'arms': [{'label': 'A'}]}]}],
                'feedback': {'Q1': {'arms': {'A': {'score': 0, 'naturalness': 3}}}}}
        row = collate.flatten_review_export(data, Path('nested.json'))[0]
        self.assertEqual(row['score'], '0')
        self.assertEqual(row['naturalness'], '3')
        self.assertEqual(row['package_id'], 'test-package')

    def test_conflicting_package_identity_is_not_silently_overridden(self):
        with self.assertRaises(ValueError):
            collate.normalise_row({'package_version': '2'}, Path('conflict.json'),
                                  {'package_version': '1'})

    def test_summary_separates_versions_of_same_unit(self):
        rows = [collate.normalise_row({'package_id': 'test-package', 'package_version': v,
                 'unit_id': 'Q1', 'comment': 'Test comment'}, Path('returned.json'))
                for v in ['1', '2']]
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as directory:
            path = Path(directory) / 'summary.md'
            collate.write_markdown(path, rows, Path('inputs'))
            headings = [line for line in path.read_text().splitlines() if line.startswith('### ')]
            self.assertEqual(len(headings), 2)
            self.assertTrue(any('version 1' in line for line in headings))
            self.assertTrue(any('version 2' in line for line in headings))


if __name__ == '__main__':
    unittest.main()
