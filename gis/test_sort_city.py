import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from sort_city import sort_by_gravity, sort_generated_source


def neighborhood(x, area):
    return {"id": str(x), "position": {"x": x, "y": 0}, "residents": area,
            "proportionOfJobs": area, "icon": "test", "availableShifts": []}


class GravityTests(unittest.TestCase):
    def test_inverse_square_gravity_can_outrank_larger_isolated_building_area(self):
        neighborhoods = [neighborhood(10, 10), neighborhood(0, 6), neighborhood(1, 6)]
        before = {n["id"]: copy.deepcopy(n) for n in neighborhoods}
        sort_by_gravity(neighborhoods)
        self.assertEqual([n["id"] for n in neighborhoods], ["1", "0", "10"])
        expected = {"0": 36 + 60 / 100, "1": 36 + 60 / 81, "10": 60 / 100 + 60 / 81}
        for n in neighborhoods:
            self.assertAlmostEqual(n["gravity"], expected[n["id"]])
            self.assertEqual({key: value for key, value in n.items() if key != "gravity"},
                             before[n["id"]])

    def test_single_empty_and_tied_neighborhoods(self):
        neighborhoods = []
        sort_by_gravity(neighborhoods)
        self.assertEqual(neighborhoods, [])
        neighborhoods = [neighborhood(1, 5)]
        sort_by_gravity(neighborhoods)
        self.assertEqual(neighborhoods[0]["gravity"], 0)
        neighborhoods = [neighborhood(1, 5), neighborhood(0, 5)]
        sort_by_gravity(neighborhoods)
        self.assertEqual([n["id"] for n in neighborhoods], ["0", "1"])

    def test_invalid_scores_and_duplicate_positions_fail(self):
        for value in (-1, float("nan"), float("inf"), "100", True):
            with self.subTest(value=value), self.assertRaises(ValueError):
                sort_by_gravity([neighborhood(0, value)])
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            sort_by_gravity([neighborhood(0, 1), neighborhood(0, 2)])

    def test_cli_preserves_wrapper_and_other_data_and_is_idempotent(self):
        prefix = '// attribution\nimport { iconPaths } from "./iconPaths";\nconst data = '
        suffix = ';\nexport const cityMap = data;\n'
        data = {"tiles": [["l"]], "water": ["M0 0 Z"], "gridWidth": 11,
                "neighborhoods": [neighborhood(10, 10), neighborhood(0, 6), neighborhood(1, 6)]}
        source = prefix + json.dumps(data, indent=2) + suffix
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "city.ts"
            path.write_bytes(source.replace("\n", "\r\n").encode("utf-8"))
            command = [sys.executable, str(Path(__file__).with_name("sort_city.py")), str(path)]
            subprocess.run(command, check=True, capture_output=True, text=True)
            first = path.read_bytes()
            self.assertIn(b"\r\n", first)
            result = path.read_text(encoding="utf-8")
            self.assertTrue(result.startswith(prefix))
            self.assertTrue(result.endswith(suffix))
            updated = json.loads(result[len(prefix):-len(suffix)])
            for key in ("tiles", "water", "gridWidth"):
                self.assertEqual(updated[key], data[key])
            self.assertEqual([n["id"] for n in updated["neighborhoods"]], ["1", "0", "10"])
            subprocess.run(command, check=True, capture_output=True, text=True)
            self.assertEqual(path.read_bytes(), first)
            path.write_text("const data = {not: 'json'};", encoding="utf-8")
            invalid = path.read_bytes()
            result = subprocess.run(command, capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("Error:", result.stderr)
            self.assertEqual(path.read_bytes(), invalid)

    def test_rejects_non_generated_source(self):
        for source in ("export const neighborhoods = [];", "const data = {};"):
            with self.subTest(source=source), self.assertRaises(ValueError):
                sort_generated_source(source)


if __name__ == "__main__":
    unittest.main()
