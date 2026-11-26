"""Sort an existing generated city by distance-constrained gravity improvement."""

import argparse
import json
import math
from pathlib import Path
import re


def sort_by_gravity_improvement(neighborhoods, min_distance=0, max_distance=3):
    if (not math.isfinite(min_distance) or not math.isfinite(max_distance)
            or not 0 <= min_distance < max_distance):
        raise ValueError("Distances must be finite and satisfy 0 <= min distance < max distance.")
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
    if not ordered:
        return
    distances = [
        [math.hypot(n["position"]["x"] - other["position"]["x"],
                    n["position"]["y"] - other["position"]["y"]) for other in ordered]
        for n in ordered
    ]
    areas = [n["residents"] for n in ordered]
    remaining = sorted(range(len(ordered)), key=lambda i: (-areas[i], i))
    selected = [remaining.pop(0)]
    nearest = distances[selected[0]].copy()
    while remaining:
        best = None
        best_score = -math.inf
        for candidate in remaining:
            cost = nearest[candidate]
            if not min_distance < cost <= max_distance:
                continue
            improvement = math.fsum(
                areas[i] * areas[candidate]
                * (1 / (new_distance ** 2 + 1) - 1 / (nearest[i] ** 2 + 1))
                for i, new_distance in enumerate(distances[candidate])
                if new_distance < nearest[i]
            )
            score = improvement / cost
            if not math.isfinite(score):
                raise ValueError("Computed gravity improvement is not finite.")
            if score > best_score:
                best, best_score = candidate, score
        if best is None:
            # Start a new cluster when the distance-constrained frontier is exhausted.
            best = max(remaining, key=lambda candidate: math.fsum(
                areas[i] * (nearest[i] - new_distance)
                for i, new_distance in enumerate(distances[candidate])
                if new_distance < nearest[i]
            ))
        selected.append(best)
        remaining.remove(best)
        nearest = [min(current, new) for current, new in zip(nearest, distances[best])]
    neighborhoods[:] = [ordered[i] for i in selected]


def sort_generated_source(source, min_distance=0, max_distance=3):
    declaration = re.search(r"^const data =\s*", source, re.MULTILINE)
    if declaration is None:
        raise ValueError("Expected a generated city module containing 'const data = <JSON>'.")
    start = declaration.end()
    data, length = json.JSONDecoder().raw_decode(source[start:])
    if not isinstance(data, dict) or not isinstance(data.get("neighborhoods"), list):
        raise ValueError("Generated city data must contain a neighborhoods array.")
    sort_by_gravity_improvement(data["neighborhoods"], min_distance, max_distance)
    result = source[:start] + json.dumps(data, indent=2, allow_nan=False) + source[start + length:]
    return result, len(data["neighborhoods"])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("city", type=Path, help="Generated .ts module to update in place (no OSM needed)")
    parser.add_argument("--min-distance", type=float, default=0,
                        help="Exclusive minimum distance to selected cells (default: 0)")
    parser.add_argument("--max-distance", type=float, default=3,
                        help="Inclusive maximum distance to selected cells (default: 3)")
    args = parser.parse_args()
    try:
        if args.city.suffix != ".ts":
            raise ValueError("Input must be a generated .ts file.")
        with args.city.open(encoding="utf-8", newline="") as file:
            source = file.read()
        newline = "\r\n" if "\r\n" in source else "\n"
        result, count = sort_generated_source(
            source.replace("\r\n", "\n"), args.min_distance, args.max_distance
        )
        with args.city.open("w", encoding="utf-8", newline="") as file:
            file.write(result.replace("\n", newline))
        print(f"Sorted {count} neighborhoods by gravity improvement in {args.city}.")
    except (ValueError, OverflowError, OSError) as error:
        parser.exit(1, f"Error: {error}\n")


if __name__ == "__main__":
    main()
