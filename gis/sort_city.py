"""Recalculate gravity and sort an existing generated city TypeScript file in place."""

import argparse
import json
import math
from pathlib import Path
import re


def sort_by_gravity(neighborhoods):
    positions = set()
    for neighborhood in neighborhoods:
        if not isinstance(neighborhood, dict):
            raise ValueError("Each neighborhood must be an object.")
        position = neighborhood.get("position")
        if not isinstance(position, dict):
            raise ValueError("Each neighborhood must have a position object.")
        values = [position.get("x"), position.get("y"), neighborhood.get("residents")]
        if any(isinstance(value, bool) or not isinstance(value, (int, float))
               or not math.isfinite(value) for value in values):
            raise ValueError("Neighborhood coordinates and residents must be finite numbers.")
        x, y, area = values
        if area < 0:
            raise ValueError("Neighborhood building floor area (residents) must be nonnegative.")
        if (x, y) in positions:
            raise ValueError(f"Duplicate neighborhood position: ({x}, {y}).")
        positions.add((x, y))

    ordered = sorted(neighborhoods, key=lambda n: (n["position"]["x"], n["position"]["y"]))
    for neighborhood in ordered:
        x, y = neighborhood["position"]["x"], neighborhood["position"]["y"]
        gravity = math.fsum(
            neighborhood["residents"] * other["residents"]
            / ((x - other["position"]["x"]) ** 2 + (y - other["position"]["y"]) ** 2)
            for other in ordered if other is not neighborhood
        )
        if not math.isfinite(gravity):
            raise ValueError("Computed gravity is not finite; check building floor-area scores.")
        neighborhood["gravity"] = gravity
    neighborhoods[:] = sorted(
        ordered,
        key=lambda n: (-n["gravity"], -n["residents"], n["position"]["x"], n["position"]["y"]),
    )


def sort_generated_source(source):
    declaration = re.search(r"^const data =\s*", source, re.MULTILINE)
    if declaration is None:
        raise ValueError("Expected a generated city module containing 'const data = <JSON>'.")
    start = declaration.end()
    data, length = json.JSONDecoder().raw_decode(source[start:])
    if not isinstance(data, dict) or not isinstance(data.get("neighborhoods"), list):
        raise ValueError("Generated city data must contain a neighborhoods array.")
    sort_by_gravity(data["neighborhoods"])
    result = source[:start] + json.dumps(data, indent=2, allow_nan=False) + source[start + length:]
    return result, len(data["neighborhoods"])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("city", type=Path, help="Generated .ts module to update in place (no OSM needed)")
    args = parser.parse_args()
    try:
        if args.city.suffix != ".ts":
            raise ValueError("Input must be a generated .ts file.")
        with args.city.open(encoding="utf-8", newline="") as file:
            source = file.read()
        newline = "\r\n" if "\r\n" in source else "\n"
        result, count = sort_generated_source(source.replace("\r\n", "\n"))
        with args.city.open("w", encoding="utf-8", newline="") as file:
            file.write(result.replace("\n", newline))
        print(f"Calculated gravity and sorted {count} neighborhoods in {args.city}.")
    except (ValueError, OverflowError, OSError) as error:
        parser.exit(1, f"Error: {error}\n")


if __name__ == "__main__":
    main()
