import contextlib
import importlib.util
import io
from pathlib import Path
import tempfile
import unittest
from unittest import mock
import xml.etree.ElementTree as ET

import osmium
from shapely.geometry import LineString, Polygon, box


spec = importlib.util.spec_from_file_location("generate_osm", Path(__file__).with_name("generate-osm.py"))
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)


class OsmGeneratorTests(unittest.TestCase):
    def setUp(self):
        self.grid = generator.Grid(47.59794, -122.32975, 3, 2, 100 / generator.METERS_PER_MILE)

    def test_clips_and_splits_building_floor_area_on_rectangular_grid(self):
        data = generator.build_map(self.grid, [
            (box(-200, -75, -100, -25), 2),
            (box(-25, -50, 25, 50), 3),
        ], [], [])
        scores = {n["id"]: n["residents"] for n in data["neighborhoods"]}
        self.assertEqual(scores, {"1-0": 7500, "1-1": 7500, "0-0": 5000})
        self.assertEqual(sum(scores.values()), 20000)
        self.assertEqual(len(data["tiles"]), 3)
        self.assertTrue(all(len(column) == 2 for column in data["tiles"]))
        for neighborhood in data["neighborhoods"]:
            self.assertEqual(neighborhood["proportionOfJobs"], neighborhood["residents"])
        self.assertEqual([n["id"] for n in data["neighborhoods"]], ["1-0", "1-1", "0-0"])
        self.assertEqual(data["neighborhoods"][0]["gravity"], 93750000)
        self.assertEqual(data["neighborhoods"][1]["gravity"], 75000000)
        self.assertEqual(data["neighborhoods"][2]["gravity"], 56250000)

    def test_water_threshold_and_built_up_shoreline(self):
        water = [box(-150, -100, -50, 100), box(-50, -100, 50, -49)]
        data = generator.build_map(self.grid, [(box(-145, 25, -135, 35), 1)], water, [])
        self.assertEqual(data["tiles"][0], ["w", "l"])
        self.assertEqual(data["tiles"][1], ["w", "l"])
        self.assertEqual(data["tiles"][2], ["l", "l"])
        self.assertEqual(data["neighborhoods"][0]["position"], {"x": 0, "y": 1})

    def test_coastline_direction_and_closed_island(self):
        bounds = box(0, 0, 10, 10)
        coast = LineString([(5, -1), (5, 11)]).intersection(bounds)
        water = generator.ocean_geometry(bounds, [coast], "land")
        self.assertAlmostEqual(water.area, 50)
        self.assertTrue(water.contains(box(6, 2, 8, 4).centroid))
        island = LineString([(2, 2), (4, 2), (4, 4), (2, 4), (2, 2)])
        water = generator.ocean_geometry(bounds, [island], "land")
        self.assertAlmostEqual(water.area, 96)
        self.assertFalse(water.contains(box(2, 2, 4, 4).centroid))
        self.assertEqual(len(list(generator.polygons(water))[0].interiors), 1)

    def test_incomplete_coastline_fails_and_background_is_explicit(self):
        bounds = box(0, 0, 10, 10)
        with self.assertRaisesRegex(ValueError, "complete|disconnected"):
            generator.ocean_geometry(bounds, [LineString([(5, 0), (5, 5)])], "land")
        self.assertEqual(generator.ocean_geometry(bounds, [], "water").area, 100)
        self.assertEqual(generator.ocean_geometry(bounds, [], "land").area, 0)

    def test_svg_north_up_coordinates_and_hole_winding(self):
        water = Polygon([(-150, 0), (-50, 0), (-50, 100), (-150, 100)],
                        [[(-125, 25), (-125, 75), (-75, 75), (-75, 25)]])
        paths = generator.svg_paths(water, self.grid)
        self.assertEqual(len(paths), 1)
        self.assertTrue(paths[0].startswith("M0.00000000 1.00000000"))
        self.assertEqual(paths[0].count(" Z"), 2)
        rings = []
        for subpath in paths[0].split(" Z")[:-1]:
            points = [tuple(map(float, point.split())) for point in subpath.strip()[1:].split(" L")]
            rings.append(Polygon(points).exterior.is_ccw)
        self.assertNotEqual(*rings)

    def test_xml_and_pbf_multipolygons_floors_and_no_double_counting(self):
        root = ET.Element("osm", version="0.6")
        next_node = 1
        ways = []

        def add_way(identifier, ring, tags):
            nonlocal next_node
            refs = []
            for x, y in ring:
                lon, lat = self.grid.project(x, y, direction="INVERSE")
                ET.SubElement(root, "node", id=str(next_node), version="1",
                              lat=str(lat), lon=str(lon))
                refs.append(next_node)
                next_node += 1
            way = ET.Element("way", id=str(identifier), version="1")
            for ref in [*refs, refs[0]]:
                ET.SubElement(way, "nd", ref=str(ref))
            for key, value in tags.items():
                ET.SubElement(way, "tag", k=key, v=value)
            ways.append(way)

        add_way(1, [(-140, -90), (-120, -90), (-120, -70), (-140, -70)],
                {"building": "yes", "building:levels": "3"})
        add_way(2, [(-40, 10), (40, 10), (40, 90), (-40, 90)],
                {"building": "yes"})
        add_way(3, [(-20, 30), (20, 30), (20, 70), (-20, 70)], {})
        add_way(4, [(50, -100), (150, -100), (150, 0), (50, 0)],
                {"natural": "water"})
        add_way(5, [(70, -80), (130, -80), (130, -20), (70, -20)], {})
        root.extend(ways)
        for identifier, outer, inner, tags in (
            (1, 2, 3, {"building": "yes", "building:levels": "2"}),
            (2, 4, 5, {"natural": "water"}),
        ):
            relation = ET.SubElement(root, "relation", id=str(identifier), version="1")
            ET.SubElement(relation, "member", type="way", ref=str(outer), role="outer")
            ET.SubElement(relation, "member", type="way", ref=str(inner), role="inner")
            for key, value in {"type": "multipolygon", **tags}.items():
                ET.SubElement(relation, "tag", k=key, v=value)
        with tempfile.TemporaryDirectory() as directory:
            xml = Path(directory) / "fixture.osm"
            ET.ElementTree(root).write(xml, encoding="utf-8", xml_declaration=True)
            osm_xml = Path(directory) / "fixture.osm.xml"
            ET.ElementTree(root).write(osm_xml, encoding="utf-8", xml_declaration=True)
            pbf = Path(directory) / "fixture.osm.pbf"
            with osmium.SimpleWriter(str(pbf)) as writer:
                for obj in osmium.FileProcessor(str(xml)):
                    writer.add(obj)
            for source in (xml, osm_xml, pbf):
                with self.subTest(format=source.suffix):
                    buildings, waters, coasts = generator.read_osm(source, self.grid)
                    self.assertEqual(len(buildings), 2)
                    self.assertEqual(len(waters), 1)
                    self.assertEqual(coasts, [])
                    self.assertAlmostEqual(sum(shape.area * floors for shape, floors in buildings),
                                           10800, delta=3)  # OSM rounds coordinates to 1e-7 degrees.
                    self.assertAlmostEqual(waters[0].area, 6400, delta=3)
                    data = generator.build_map(self.grid, buildings, waters, coasts)
                    self.assertAlmostEqual(sum(n["residents"] for n in data["neighborhoods"]),
                                           sum(shape.area * floors for shape, floors in buildings), places=3)
                    self.assertEqual(data["tiles"][2][0], "w")
                    output = Path(directory) / "generated.ts"
                    generator.write_outputs(output, data, self.grid)
                    self.assertIn("satisfies Pick<CityConfig", output.read_text(encoding="utf-8"))
                    svg = ET.parse(output.with_suffix(".svg")).getroot()
                    self.assertEqual(svg.attrib["viewBox"], "0 0 3 2")
            factory = osmium.geom.WKBFactory()

            def invalid_relation(area):
                if not area.from_way() and area.orig_id() == 1:
                    raise RuntimeError("invalid area (area_id=3)")
                return factory.create_multipolygon(area)

            with mock.patch.object(generator.osmium.geom, "WKBFactory") as constructor:
                constructor.return_value.create_multipolygon.side_effect = invalid_relation
                with contextlib.redirect_stderr(io.StringIO()) as log:
                    buildings, _, _ = generator.read_osm(xml, self.grid)
                self.assertIn("Warning: skipping relation 1", log.getvalue())
                self.assertAlmostEqual(sum(shape.area * floors for shape, floors in buildings),
                                       7600, delta=3)
                constructor.return_value.create_multipolygon.side_effect = RuntimeError("unexpected failure")
                with self.assertRaisesRegex(RuntimeError, "unexpected failure"):
                    generator.read_osm(xml, self.grid)
            incomplete = ET.SubElement(root, "relation", id="3", version="1")
            ET.SubElement(incomplete, "member", type="way", ref="999", role="outer")
            ET.SubElement(incomplete, "tag", k="type", v="multipolygon")
            ET.SubElement(incomplete, "tag", k="building", v="yes")
            ET.ElementTree(root).write(xml, encoding="utf-8", xml_declaration=True)
            with contextlib.redirect_stderr(io.StringIO()) as log:
                generator.read_osm(xml, self.grid)
            self.assertIn("1 building multipolygon relations could not be assembled", log.getvalue())

    def test_invalid_levels_warn_and_invalid_grid_fails(self):
        for value in ("bad", "0", "-1", "nan", "inf"):
            with self.subTest(value=value), contextlib.redirect_stderr(io.StringIO()) as log:
                self.assertEqual(generator.floors_for({"building:levels": value}, "way 1"), 1)
                self.assertIn("Warning", log.getvalue())
        self.assertEqual(generator.floors_for({}, "way 1"), 1)
        self.assertEqual(generator.floors_for({"building:levels": "2.5"}, "way 1"), 2.5)
        with self.assertRaises(ValueError):
            generator.Grid(47, -122, 0, 2, 0.5)
        with self.assertRaises(ValueError):
            generator.Grid(47, -122, 2, 2, float("nan"))


if __name__ == "__main__":
    unittest.main()
