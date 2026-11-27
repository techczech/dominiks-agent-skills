"""Regression check using counts from the ten benchmark PDFs' text layers."""

import runpy
import unittest
from pathlib import Path

detector = runpy.run_path(str(Path(__file__).with_name("detect-engine.py")))


class EngineDetectionTests(unittest.TestCase):
    def test_benchmark_routes(self):
        # Sample order, pages, words, maths symbols, wide numbered tables, engine.
        samples = [
            (1, 6, 5163, 36, 0, "fast"),
            (2, 11, 9501, 148, 0, "docling"),
            (3, 8, 4133, 15, 0, "fast"),
            (4, 24, 19233, 365, 3, "math"),
            (5, 13, 13844, 474, 2, "math"),
            (6, 15, 6141, 160, 1, "math"),
            (7, 14, 8143, 324, 0, "math"),
            (8, 10, 0, 0, 0, "docling"),
            (9, 66, 10185, 4, 0, "docling"),
            (10, 7, 3800, 13, 0, "fast"),
        ]
        for sample, pages, words, maths, tables, expected in samples:
            with self.subTest(sample=sample):
                engine, _ = detector["select_engine"](pages, words, maths, tables)
                self.assertEqual(engine, expected)

    def test_wide_tables_are_distinct_and_on_caption_page(self):
        row = "Example  1  2  3  4  5"
        text = f"Table 1\n{row}\fTable 1 (continued)\n{row}\fTabla 2. Example\n{row}\fTable 3\f{row}"
        self.assertEqual(detector["count_wide_tables"](text), 2)


if __name__ == "__main__":
    unittest.main()
