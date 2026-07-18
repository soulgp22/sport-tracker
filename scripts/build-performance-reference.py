#!/usr/bin/env python3
"""Build compact strength-percentile thresholds from an OpenIPF bulk archive.

The generated reference intentionally uses each lifter's best recent raw,
drug-tested SBD result so frequent competitors do not dominate the sample.
It is a competition reference, not a general-population survey.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
import zipfile
from collections import defaultdict
from datetime import date
from pathlib import Path


LIFTS = {
    "bench_press": "Best3BenchKg",
    "back_squat": "Best3SquatKg",
    "deadlift": "Best3DeadliftKg",
}
TOP_PERCENTILES = (50, 25, 10, 5, 3, 1)


def parse_positive(value: str) -> float | None:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    return parsed if math.isfinite(parsed) and parsed > 0 else None


def quantile(sorted_values: list[float], probability: float) -> float:
    if not sorted_values:
        raise ValueError("Cannot calculate a quantile from an empty sample")
    position = (len(sorted_values) - 1) * probability
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return sorted_values[lower]
    fraction = position - lower
    return sorted_values[lower] * (1 - fraction) + sorted_values[upper] * fraction


def build_reference(archive_path: Path, minimum_year: int) -> dict[str, object]:
    best_by_lifter: dict[tuple[str, str, str], float] = {}

    with zipfile.ZipFile(archive_path) as archive:
        csv_names = [name for name in archive.namelist() if name.endswith(".csv")]
        if len(csv_names) != 1:
            raise ValueError("Expected exactly one CSV in the OpenIPF archive")
        csv_name = csv_names[0]

        with archive.open(csv_name) as raw:
            rows = csv.DictReader((line.decode("utf-8") for line in raw))
            for row in rows:
                if row.get("Equipment") != "Raw" or row.get("Tested") != "Yes":
                    continue
                if row.get("Event") != "SBD" or row.get("Sex") not in {"M", "F"}:
                    continue
                if not row.get("Date", "").startswith(tuple(str(year) for year in range(minimum_year, date.today().year + 1))):
                    continue

                bodyweight = parse_positive(row.get("BodyweightKg", ""))
                if bodyweight is None or bodyweight < 35 or bodyweight > 250:
                    continue

                lifter = re.sub(r"\s+", " ", row.get("Name", "").strip().casefold())
                if not lifter:
                    continue

                sex = "male" if row["Sex"] == "M" else "female"
                for lift_key, column in LIFTS.items():
                    lift = parse_positive(row.get(column, ""))
                    if lift is None:
                        continue
                    ratio = lift / bodyweight
                    key = (sex, lift_key, lifter)
                    best_by_lifter[key] = max(best_by_lifter.get(key, 0), ratio)

        grouped: dict[tuple[str, str], list[float]] = defaultdict(list)
        for (sex, lift_key, _), ratio in best_by_lifter.items():
            grouped[(sex, lift_key)].append(ratio)

        standards: dict[str, object] = {}
        for lift_key in LIFTS:
            standards[lift_key] = {}
            for sex in ("male", "female"):
                values = sorted(grouped[(sex, lift_key)])
                thresholds = {
                    f"top{top}": round(quantile(values, 1 - top / 100), 3)
                    for top in TOP_PERCENTILES
                }
                standards[lift_key][sex] = {
                    "sampleSize": len(values),
                    "ratioThresholds": thresholds,
                }

        directory = csv_name.split("/")[0]
        match = re.search(r"openipf-(\d{4}-\d{2}-\d{2})", directory)
        revision = Path(csv_name).stem.rsplit("-", 1)[-1]
        return {
            "version": 1,
            "generatedAt": date.today().isoformat(),
            "source": {
                "name": "OpenIPF",
                "url": "https://openpowerlifting.gitlab.io/opl-csv/bulk-csv.html",
                "datasetDate": match.group(1) if match else None,
                "revision": revision,
                "license": "Public domain dedication",
                "population": f"Best result per lifter; IPF affiliates; Raw; Tested; SBD; {minimum_year}+",
                "limitation": "Competition reference, not a percentile of all gym users.",
            },
            "normalization": "estimated_1rm_kg / bodyweight_kg",
            "standards": standards,
        }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("archive", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--minimum-year", type=int, default=2016)
    args = parser.parse_args()

    reference = build_reference(args.archive, args.minimum_year)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(reference, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
