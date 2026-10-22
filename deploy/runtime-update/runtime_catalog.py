"""Deterministic gameplay catalog projection shared by private/public builds.

This module performs no network requests and changes no reviewed game models.
"""
from __future__ import annotations

import copy
import hashlib
import json

ROW_FIELDS = ("id", "occupation", "qualifications", "ageRestriction", "sexRestriction", "regionRestriction")
MODEL_FIELDS = ("status", "modelVersion", "groupId", "sourceIds")


def pick(value: dict, keys: tuple[str, ...]) -> dict:
    return {key: copy.deepcopy(value[key]) for key in keys if key in value}


def model_snapshot(row: dict) -> dict | None:
    model = row.get("modeled", {})
    if model.get("status") != "model_estimate":
        return None
    return {
        "modelVersion": model["modelVersion"], "occupationId": row["id"],
        "annualRepresentativeWan": model["salary"]["averageAnnualWan"],
        "stages": [pick(stage, ("minYears", "annualWan", "label")) for stage in model["careerWage"]["stages"]],
        "weeklyHours": model.get("workingTime", {}).get("weeklyHours"),
        "shiftLikelihood": model.get("workingTime", {}).get("shift", {}).get("likelihood"),
        "employmentTypes": [item["label"] for item in model.get("employmentType", {}).get("types", [])],
        "sourceIds": copy.deepcopy(model.get("sourceIds", [])),
    }


def compact_row(row: dict) -> dict:
    result = pick(row, ROW_FIELDS)
    result["education"] = pick(row.get("education", {}), ("required",))
    # Keep any explicitly collected task-risk/ability fields, even though most
    # source rows currently carry null. They are distinct from modeled levels.
    result.update(pick(row, ("workAbilities", "occupationalRisks")))
    model = row["modeled"]
    compact = pick(model, MODEL_FIELDS)
    compact["salary"] = pick(model["salary"], ("averageAnnualWan",))
    compact["careerWage"] = {"stages": [pick(stage, ("minYears", "annualWan", "label")) for stage in model["careerWage"]["stages"]]}
    compact["employmentType"] = {"types": [pick(item, ("label",)) for item in model.get("employmentType", {}).get("types", [])]}
    compact["workingTime"] = pick(model.get("workingTime", {}), ("weeklyHours",))
    compact["workingTime"]["shift"] = pick(model.get("workingTime", {}).get("shift", {}), ("likelihood",))
    compact["workAbilities"] = pick(model.get("workAbilities", {}), ("levels",))
    compact["occupationalRisks"] = pick(model.get("occupationalRisks", {}), ("level", "tags"))
    result["modeled"] = compact
    return result


def build(source_bytes: bytes) -> dict:
    source = json.loads(source_bytes)
    rows = source["occupations"]
    if len(rows) != 537 or len({row["id"] for row in rows}) != 537:
        raise ValueError("Expected exactly 537 distinct source occupations")
    result = pick(source, ("schemaVersion", "scope", "sources", "modelSources"))
    result["runtimeCatalogVersion"] = 1
    result["sourceCatalog"] = {"fileName": "occupations.json", "sha256": hashlib.sha256(source_bytes).hexdigest(), "bytes": len(source_bytes), "occupationCount": len(rows)}
    result["occupations"] = [compact_row(row) for row in rows]
    for original, compact in zip(rows, result["occupations"], strict=True):
        if model_snapshot(original) != model_snapshot(compact):
            raise ValueError(f"Career model changed while compacting {original['id']}")
        for key in ROW_FIELDS:
            if original.get(key) != compact.get(key):
                raise ValueError(f"Official field changed: {original['id']} {key}")
        if original.get("education", {}).get("required") != compact["education"].get("required"):
            raise ValueError(f"Education requirement changed: {original['id']}")
    return result



def encode(catalog: dict) -> bytes:
    return (json.dumps(catalog, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n").encode("utf-8")


def render(source_bytes: bytes) -> bytes:
    return encode(build(source_bytes))
