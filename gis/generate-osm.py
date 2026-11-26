"""Generate game map data from a complete OSM XML or PBF export."""

import argparse
import json
import math
import os
from pathlib import Path
import sys

import osmium
from pyproj import CRS, Transformer
from shapely import from_wkb, transform
from shapely.geometry import Point, Polygon, box
from shapely.geometry.polygon import orient
from shapely.ops import polygonize, unary_union
from shapely.validation import explain_validity

from sort_city import sort_by_gravity_improvement


METERS_PER_MILE = 1609.344


def polygons(geometry):
    if geometry.geom_type == "Polygon":
        yield geometry
    elif hasattr(geometry, "geoms"):
        for part in geometry.geoms:
            yield from polygons(part)


def lines(geometry):
    if geometry.geom_type == "LineString":
        yield geometry
    elif hasattr(geometry, "geoms"):
        for part in geometry.geoms:
            yield from lines(part)


class Grid:
    def __init__(self, latitude, longitude, width, height, resolution_miles):
        if not (-85 <= latitude <= 85 and -180 <= longitude <= 180):
            raise ValueError("Center must have latitude in [-85, 85] and longitude in [-180, 180].")
        if width <= 0 or height <= 0 or not math.isfinite(resolution_miles) or resolution_miles <= 0:
            raise ValueError("Grid dimensions and resolution must be positive.")
        self.width = width
        self.height = height
        self.cell = resolution_miles * METERS_PER_MILE
        self.latitude = latitude
        self.longitude = longitude
        self.resolution_miles = resolution_miles
        self.left = -width * self.cell / 2
        self.bottom = -height * self.cell / 2
        self.bounds = box(self.left, self.bottom, -self.left, -self.bottom)
        local_crs = CRS.from_proj4(
            f"+proj=aeqd +lat_0={latitude} +lon_0={longitude} +datum=WGS84 +units=m"
        )
        self.project = Transformer.from_crs("EPSG:4326", local_crs, always_xy=True).transform
        geographic_bounds = Transformer.from_crs(local_crs, "EPSG:4326", always_xy=True).transform_bounds(
            self.left, self.bottom, -self.left, -self.bottom, densify_pts=21
        )
        self.geographic_bounds = (
            box(*geographic_bounds).buffer(0.00001)
            if geographic_bounds[0] <= geographic_bounds[2] else None
        )

    def cell_polygon(self, x, y):
        left = self.left + x * self.cell
        bottom = self.bottom + y * self.cell
        return box(left, bottom, left + self.cell, bottom + self.cell)

    def cells_intersecting(self, geometry):
        if geometry.is_empty:
            return
        left, bottom, right, top = geometry.bounds
        for x in range(max(0, math.floor((left - self.left) / self.cell)),
                       min(self.width, math.floor((right - self.left) / self.cell) + 1)):
            for y in range(max(0, math.floor((bottom - self.bottom) / self.cell)),
                           min(self.height, math.floor((top - self.bottom) / self.cell) + 1)):
                yield x, y, self.cell_polygon(x, y)


def is_building(tags):
    return tags.get("building") not in (None, "no")


def is_water(tags):
    return (
        tags.get("natural") in ("water", "bay", "strait")
        or tags.get("waterway") in ("riverbank", "dock")
        or tags.get("landuse") in ("reservoir", "basin")
        or ("water" in tags and tags.get("water") != "no")
    )


def floors_for(tags, identifier):
    value = tags.get("building:levels")
    if value is None:
        return 1.0
    try:
        floors = float(value)
    except ValueError:
        floors = math.nan
    if not math.isfinite(floors) or floors <= 0:
        print(f"Warning: {identifier} has invalid building:levels={value!r}; using one floor.",
              file=sys.stderr)
        return 1.0
    return floors


def read_osm(input_path, grid):
    factory = osmium.geom.WKBFactory()
    buildings = {}
    water_areas = {}
    relation_members = {"building": {}, "water": {}}
    successful_relations = {"building": set(), "water": set()}
    assembled_relations = set()
    coastlines = []
    processor = (
        osmium.FileProcessor(str(input_path)).with_locations().with_areas()
        .with_filter(osmium.filter.KeyFilter("building", "natural", "water", "waterway", "landuse"))
    )
    for obj in processor:
        tags = dict(obj.tags)
        if obj.is_relation():
            for kind, matches in (("building", is_building(tags)), ("water", is_water(tags))):
                if matches and tags.get("type") == "multipolygon":
                    relation_members[kind][obj.id] = {m.ref for m in obj.members if m.type == "w"}
        elif obj.is_way() and tags.get("natural") == "coastline":
            # Preserve OSM direction: land is on the left, water on the right.
            geometry = from_wkb(factory.create_linestring(obj))
            if grid.geographic_bounds is not None and not geometry.intersects(grid.geographic_bounds):
                continue
            geometry = transform(geometry, grid.project, interleaved=False)
            if geometry.intersects(grid.bounds):
                coastlines.extend(lines(geometry.intersection(grid.bounds)))
        elif obj.is_area() and (is_building(tags) or is_water(tags)):
            key = ("way" if obj.from_way() else "relation", obj.orig_id())
            if key[0] == "relation":
                assembled_relations.add(key[1])
            try:
                wkb = factory.create_multipolygon(obj)
            except RuntimeError as error:
                if not str(error).startswith("invalid area"):
                    raise
                print(f"Warning: skipping {key[0]} {key[1]}: {error}", file=sys.stderr)
                continue
            geometry = from_wkb(wkb)
            if grid.geographic_bounds is not None and not geometry.intersects(grid.geographic_bounds):
                continue
            geometry = transform(geometry, grid.project, interleaved=False)
            if not geometry.is_valid:
                print(f"Warning: skipping {key[0]} {key[1]}: {explain_validity(geometry)}",
                      file=sys.stderr)
                continue
            if not geometry.intersects(grid.bounds):
                continue
            geometry = geometry.intersection(grid.bounds)
            if is_building(tags):
                buildings[key] = (geometry, floors_for(tags, f"{key[0]} {key[1]}"))
                if key[0] == "relation":
                    successful_relations["building"].add(key[1])
            if is_water(tags):
                water_areas[key] = geometry
                if key[0] == "relation":
                    successful_relations["water"].add(key[1])
    for kind, members in relation_members.items():
        missing = sorted(members.keys() - assembled_relations)
        if missing:
            print(f"Warning: {len(missing)} {kind} multipolygon relations could not be assembled; "
                  f"example IDs: {missing[:5]}. Check for missing members or invalid rings.",
                  file=sys.stderr)
    excluded = {
        kind: set().union(*(relation_members[kind].get(identifier, set())
                            for identifier in successful_relations[kind]))
        for kind in relation_members
    }
    buildings = [value for (kind, identifier), value in buildings.items()
                 if kind != "way" or identifier not in excluded["building"]]
    water_areas = [value for (kind, identifier), value in water_areas.items()
                   if kind != "way" or identifier not in excluded["water"]]
    print(f"Read {len(buildings)} building footprints, {len(water_areas)} water areas, "
          f"and {len(coastlines)} coastline fragments in the grid.", file=sys.stderr)
    return buildings, water_areas, coastlines


def ocean_geometry(bounds, coastlines, background):
    if not coastlines:
        print(f"No coastline crosses the grid; treating background as {background}.",
              file=sys.stderr)
        return bounds if background == "water" else Polygon()
    network = unary_union([bounds.boundary, *coastlines])
    faces = list(polygonize(network))
    water_faces = []
    used = set()
    epsilon = min(bounds.bounds[2] - bounds.bounds[0],
                  bounds.bounds[3] - bounds.bounds[1]) * 1e-7
    for face in faces:
        sides = set()
        for index, coast in enumerate(coastlines):
            shared = face.boundary.intersection(coast)
            if shared.length <= epsilon:
                continue
            for segment in lines(shared):
                midpoint = segment.interpolate(0.5, normalized=True)
                distance = coast.project(midpoint)
                before = coast.interpolate(max(0, distance - epsilon))
                after = coast.interpolate(min(coast.length, distance + epsilon))
                dx, dy = after.x - before.x, after.y - before.y
                length = math.hypot(dx, dy)
                if length == 0:
                    continue
                left = Point(midpoint.x - dy / length * epsilon,
                             midpoint.y + dx / length * epsilon)
                right = Point(midpoint.x + dy / length * epsilon,
                              midpoint.y - dx / length * epsilon)
                if face.contains(left):
                    sides.add("land")
                    used.add(index)
                if face.contains(right):
                    sides.add("water")
                    used.add(index)
        if len(sides) > 1:
            raise ValueError("Inconsistent coastline direction or incomplete coastline topology.")
        if not sides:
            raise ValueError("Cannot determine land/water for a coastline face; use a complete export.")
        if "water" in sides:
            water_faces.append(face)
    if len(used) != len(coastlines):
        raise ValueError("Unclosed or disconnected coastline inside the grid; use a complete export.")
    return unary_union(water_faces).intersection(bounds)


def build_map(grid, buildings, water_areas, coastlines, background="land",
              min_distance=0, max_distance=3):
    ocean = ocean_geometry(grid.bounds, coastlines, background)
    water = unary_union([ocean, *water_areas]).intersection(grid.bounds)
    scores = [[0.0 for _ in range(grid.height)] for _ in range(grid.width)]
    for footprint, floors in buildings:
        for x, y, cell in grid.cells_intersecting(footprint):
            scores[x][y] += footprint.intersection(cell).area * floors
    tiles = [["l" for _ in range(grid.height)] for _ in range(grid.width)]
    for x, y, cell in grid.cells_intersecting(water):
        # A built-up shoreline cell remains usable even if mostly water.
        if scores[x][y] == 0 and water.intersection(cell).area >= cell.area / 2:
            tiles[x][y] = "w"
    neighborhoods = []
    for x in range(grid.width):
        for y in range(grid.height):
            if tiles[x][y] == "w" or scores[x][y] == 0:
                continue
            score = scores[x][y]
            neighborhoods.append({
                "id": f"{x}-{y}",
                "name": f"{x}-{y}",
                "position": {"x": x, "y": y},
                "icon": "",
                "color": "black",
                "residents": score,
                "proportionOfJobs": score,
                "availableShifts": [],
                "recreationalDemandCoefficient": 1,
            })
    if not neighborhoods:
        raise ValueError("No building demand found in the grid; check the export, center and resolution.")
    sort_by_gravity_improvement(neighborhoods, min_distance, max_distance)
    return {
        "gridWidth": grid.width,
        "gridHeight": grid.height,
        "tiles": tiles,
        "water": svg_paths(water, grid),
        "neighborhoods": neighborhoods,
    }


def svg_paths(water, grid):
    paths = []
    for polygon in polygons(water):
        # Opposite ring winding preserves islands with SVG's default nonzero fill rule.
        polygon = orient(polygon, sign=1.0)
        rings = []
        for ring in [polygon.exterior, *polygon.interiors]:
            coordinates = [
                ((x - grid.left) / grid.cell, grid.height - (y - grid.bottom) / grid.cell)
                for x, y in ring.coords
            ]
            rings.append("M" + " L".join(f"{x:.8f} {y:.8f}" for x, y in coordinates[:-1]) + " Z")
        paths.append(" ".join(rings))
    return paths


def write_outputs(output_path, data, grid):
    root = Path(__file__).resolve().parent.parent
    def import_path(target):
        relative = os.path.relpath(target, output_path.parent).replace(os.sep, "/")
        return relative if relative.startswith(".") else "./" + relative

    models = import_path(root / "src" / "models" / "index")
    icons = import_path(root / "src" / "iconPaths")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    metadata = {
        "center": {"latitude": grid.latitude, "longitude": grid.longitude},
        "resolutionMiles": grid.resolution_miles,
        "demandUnits": "square meters of building floor area (not census population)",
    }
    tile_data = data["tiles"]
    other_data = {key: value for key, value in data.items() if key != "tiles"}
    source = (
        "// Generated by gis/generate-osm.py. OSM data copyright OpenStreetMap contributors (ODbL).\n"
        f"import type {{ CityConfig }} from {json.dumps(models)};\n"
        f"import {{ iconPaths }} from {json.dumps(icons)};\n\n"
        f"export const mapMetadata = {json.dumps(metadata, indent=2)};\n\n"
        f"export const tiles: CityConfig['tiles'] = {json.dumps(tile_data, indent=2)};\n"
        f"const data = {json.dumps(other_data, indent=2, allow_nan=False)};\n"
        "const icons = Object.keys(iconPaths);\n"
        "export const neighborhoods = data.neighborhoods.map((neighborhood) => ({\n"
        "  ...neighborhood,\n"
        "  icon: icons[(neighborhood.position.x * data.gridHeight + neighborhood.position.y) % icons.length],\n"
        "}));\n"
        "export const water = data.water;\n"
        "export const cityMap = {\n"
        "  gridWidth: data.gridWidth, gridHeight: data.gridHeight, tiles, water, neighborhoods,\n"
        "} satisfies Pick<CityConfig, 'gridWidth' | 'gridHeight' | 'tiles' | 'water' | 'neighborhoods'>;\n"
        "export default cityMap;\n"
    )
    output_path.write_text(source, encoding="utf-8")
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {grid.width} {grid.height}">\n'
        "  <title>OSM water map - OpenStreetMap contributors (ODbL)</title>\n"
        f'  <rect width="{grid.width}" height="{grid.height}" fill="linen"/>\n'
        + "".join(f'  <path fill="paleturquoise" d="{path}"/>\n' for path in data["water"])
        + "</svg>\n"
    )
    output_path.with_suffix(".svg").write_text(svg, encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("osm", type=Path, help="Complete .osm, .osm.xml or .osm.pbf export")
    parser.add_argument("--center", nargs=2, type=float, required=True, metavar=("LAT", "LON"))
    parser.add_argument("--dimensions", nargs=2, type=int, required=True, metavar=("WIDTH", "HEIGHT"))
    parser.add_argument("--resolution", type=float, required=True, help="Cell side length in miles")
    parser.add_argument("--background", choices=("land", "water"), default="land",
                        help="Background when no coastline crosses the grid (default: land)")
    parser.add_argument("--output", type=Path, default=Path("src") / "generated-city.ts")
    parser.add_argument("--min-distance", type=float, default=0,
                        help="Exclusive minimum distance for neighborhood ordering (default: 0)")
    parser.add_argument("--max-distance", type=float, default=3,
                        help="Inclusive maximum distance for neighborhood ordering (default: 3)")
    args = parser.parse_args()
    try:
        if not args.osm.is_file():
            raise ValueError(f"Input file does not exist: {args.osm}")
        if args.output.suffix != ".ts":
            raise ValueError("--output must be a .ts file.")
        if args.output.resolve() == args.osm.resolve():
            raise ValueError("Output must not overwrite the input.")
        if (not math.isfinite(args.min_distance) or not math.isfinite(args.max_distance)
                or not 0 <= args.min_distance < args.max_distance):
            raise ValueError("Distances must be finite and satisfy 0 <= min distance < max distance.")
        grid = Grid(*args.center, *args.dimensions, args.resolution)
        print("Reading OSM export and assembling multipolygons...", file=sys.stderr)
        buildings, water_areas, coastlines = read_osm(args.osm, grid)
        data = build_map(grid, buildings, water_areas, coastlines, args.background,
                         args.min_distance, args.max_distance)
        write_outputs(args.output.resolve(), data, grid)
        print(f"Wrote {len(data['neighborhoods'])} neighborhoods and {len(data['water'])} water paths "
              f"to {args.output} and {args.output.with_suffix('.svg')}.")
    except (ValueError, RuntimeError, OSError) as error:
        parser.exit(1, f"Error: {error}\n")


if __name__ == "__main__":
    main()
