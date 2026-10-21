#!/usr/bin/env python3
"""Build an evidence-preserving career catalog with separately labeled models.

Offline and stdlib only. Source values remain evidence, never game entry gates.
Reviewed MOEL aggregate proxies are added under modeled, not observed fields.
Use --check for a read-only byte comparison. A failed validation leaves output
untouched. The released 537-job classification boundary is reviewed explicitly.
"""
from __future__ import annotations

import argparse
import csv
import copy
from decimal import Decimal, ROUND_HALF_UP
import hashlib
import io
import json
import math
import os
import re
import tempfile
import zipfile
from pathlib import Path, PurePosixPath

COLLECTOR_ROOT = Path(__file__).resolve().parents[2]
SOURCE_IDS = ("15119096", "15122500", "15119098")
MODEL_SOURCE_IDS = ("15137965", "15040937")
MAX_BYTES = 95 * 1024 * 1024
MAX_SAFE_INTEGER = (1 << 53) - 1
CLASS_COLUMNS = ["KNOW직업대분류", "KNOW직업중분류", "KNOW직업소분류", "KNOW직업세분류", "KNOW직업세세분류", "KNOW직업명"]
GROUP_COLUMNS = ["KNOW직업대분류", "KNOW직업중분류", "KNOW직업중분류명"]
WAGE_COLUMNS = ["직업명", "임금 (상위25퍼센트)", "임금 중위값", "임금 (하위25퍼센트)"]
EDUCATION_LABELS = {
    "학력-중졸이하": "중졸이하", "학력-고졸": "고졸", "학력-전문대졸": "전문대졸",
    "학력-대졸": "대졸", "학력-대학원졸": "대학원졸", "학력-박사졸": "박사졸",
    "학력-고졸_이후_직업교육(6개월 이상)_이수": "고졸 이후 직업교육(6개월 이상) 이수",
}
FIELDS = ("occupation", "education", "salary", "regionRestriction", "ageRestriction", "sexRestriction", "workAbilities", "qualifications", "occupationalRisks")
EDUCATION_NOTE = "재직자 학력분포 원값입니다. 원본에 단위·직업별 조사연도 설명이 없어 인원·백분율로 단정하지 않으며, 법적 최소학력이나 취업 가능 확률로 사용하지 않습니다."
MISSING = {
    "education.required": "수집한 원본은 재직자 학력분포이며 법적 최소학력을 제공하지 않습니다.",
    "education.training": "원본 교육1·2·3코드는 모든 행이 빈칸이며 교육·훈련 경로 본문은 없습니다.",
    "salary.average": "허용된 임금 CSV에 산술평균 연봉이 없습니다. 중위값을 평균으로 대체하지 않습니다.",
    "salary": "허용된 임금 CSV는 10개 직업만 제공하며 이 직업은 포함되지 않았습니다.",
    "regionRestriction": "이 직업에 적용되는 개별 법적 지역 제한은 확인하지 못했습니다. 일반 상황규칙은 constraintRules를 참조합니다.",
    "ageRestriction": "이 직업에 적용되는 개별 법적 연령 제한은 확인하지 못했습니다. 일반 상황규칙은 constraintRules를 참조합니다.",
    "sexRestriction": "이 직업에 적용되는 개별 법적 성별 제한은 확인하지 못했습니다. 종사자 성별분포에서 추정하지 않습니다.",
    "workAbilities": "상업적 가공·재배포가 허용된 직업별 업무능력 원문을 아직 확보하지 못했습니다.",
    "qualifications": "상업적 가공·재배포가 허용된 직업별 관련자격 목록 및 개별 법정 필수자격을 아직 확보하지 못했습니다.",
    "occupationalRisks": "허용된 직업별 위험 원문·위험률을 아직 확보하지 못했습니다. 직업명에서 위험을 추정하지 않습니다.",
}


class ValidationError(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise ValidationError(message)


def load_json(path):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            require(key not in result, f"JSON 중복 키: {key}")
            result[key] = value
        return result
    return json.loads(Path(path).read_text(encoding="utf-8-sig"), object_pairs_hook=unique,
                      parse_constant=lambda value: (_ for _ in ()).throw(ValidationError(f"비유한 JSON 값: {value}")))


def safe_relative(root, value):
    require(isinstance(value, str) and value and "\\" not in value and ":" not in value, "원본 상대경로 형식 오류")
    pure = PurePosixPath(value)
    require(not pure.is_absolute() and ".." not in pure.parts, "원본 상대경로 이탈")
    target = (root / value).resolve()
    require(target.is_relative_to(root.resolve()), "원본 경로가 data 폴더 밖으로 이탈")
    return target


def read_primary(data_dir, source_id, expected_format):
    folder = data_dir / "datasets" / source_id
    manifest = load_json(folder / "latest.json")
    require(isinstance(manifest, dict) and manifest.get("id") == source_id, "manifest ID 오류")
    require(manifest.get("format") == expected_format, f"{source_id}: 원본 형식 변경")
    require(manifest.get("free") is True and manifest.get("license") == "unrestricted", f"{source_id}: 무료·이용허락 확인 실패")
    require(manifest.get("page_url") == f"https://www.data.go.kr/data/{source_id}/fileData.do", "출처 URL 오류")
    health = load_json(folder / "health.json")
    require(isinstance(health, dict) and health.get("id") == source_id and health.get("status") in {"updated", "unchanged"}, f"{source_id}: 현재 수집 health 오류")
    require(health.get("sha256") == manifest.get("sha256"), "health/manifest 원본 해시 불일치")
    version_dir = safe_relative(data_dir, manifest.get("version_dir"))
    require(version_dir.parent == (folder / "versions").resolve(), "version_dir 범위 오류")
    raw_path = safe_relative(data_dir, manifest.get("raw_path"))
    require(raw_path.parent == version_dir and raw_path.name == f"source.{expected_format.lower()}", "현재 원본 경로 오류")
    raw = raw_path.read_bytes()
    require(0 < len(raw) <= MAX_BYTES and len(raw) == manifest.get("bytes"), "원본 파일 크기 불일치")
    require(hashlib.sha256(raw).hexdigest() == manifest.get("sha256"), "원본 파일 SHA256 불일치")
    return raw, manifest


def decode_csv(raw):
    for encoding in ("utf-8-sig", "cp949"):
        try:
            return raw.decode(encoding), encoding
        except UnicodeDecodeError:
            pass
    raise ValidationError("지원되지 않는 CSV 인코딩")


def parse_csv(raw, columns=None):
    text, encoding = decode_csv(raw)
    reader = csv.DictReader(io.StringIO(text, newline=""), strict=True)
    require(reader.fieldnames and len(reader.fieldnames) == len(set(reader.fieldnames)), "CSV 빈 헤더·중복 헤더")
    if columns is not None:
        require(reader.fieldnames == columns, "CSV 열·순서가 승인 스키마와 다름")
    rows = list(reader)
    require(rows and all(None not in row and all(v is not None for v in row.values()) for row in rows), "CSV 빈 자료·열 개수 오류")
    return rows, encoding


def archive_csvs(raw):
    require(zipfile.is_zipfile(io.BytesIO(raw)), "ZIP 서명 오류")
    result = {}
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        infos = archive.infolist()
        require(infos and sum(i.file_size for i in infos) <= MAX_BYTES, "ZIP 전체 해제 크기 초과")
        for info in infos:
            require(not info.is_dir() and not info.flag_bits & 1, "ZIP 디렉터리·암호 파일 불가")
            path = PurePosixPath(info.filename)
            require(not path.is_absolute() and len(path.parts) == 1 and "\\" not in info.filename and ":" not in info.filename and ".." not in path.parts, "ZIP 경로 이탈")
            require(info.file_size <= MAX_BYTES and info.file_size <= max(info.compress_size, 1) * 1000, "ZIP 크기·압축률 초과")
            name = info.filename
            if not info.flag_bits & 0x800:
                try:
                    name = name.encode("cp437").decode("cp949")
                except UnicodeError:
                    pass
            require(name not in result and name.lower().endswith(".csv"), "ZIP 중복·비CSV 파일")
            member_raw = archive.read(info)  # CRC is checked by zipfile.
            result[name] = {"raw": member_raw, "sha256": hashlib.sha256(member_raw).hexdigest(), "bytes": len(member_raw)}
    return result


def numeric(value, label):
    value = value.strip()
    if value == "":
        return None
    require(re.fullmatch(r"[0-9]+(?:\.[0-9]+)?", value) is not None, f"{label}: 숫자 형식 오류")
    result = float(value) if "." in value else int(value)
    require(math.isfinite(result) and 0 <= result <= MAX_SAFE_INTEGER, f"{label}: 음수·비유한·안전범위 초과")
    return result


def classification_code(row):
    parts = [row[c] for c in CLASS_COLUMNS[:-1]]
    require(all(re.fullmatch(r"[0-9]", v) for v in parts[:4]) and re.fullmatch(r"[0-9]{1,2}", parts[4]), "직업 분류코드 형식 변경")
    return "".join(parts[:4]) + parts[4].zfill(2)


def source_record(manifest, members=None):
    result = {"id": manifest["id"], "title": manifest["title"], "url": manifest["page_url"],
              "publisher": manifest.get("publisher"), "license": manifest["license"],
              "licenseLabel": manifest.get("license_label"), "free": True,
              "referenceDate": manifest.get("reference_period"), "sourceModified": manifest.get("source_modified"),
              "cadence": manifest.get("source_cadence"), "collectedAt": manifest.get("collected_at"),
              "sha256": manifest["sha256"], "bytes": manifest["bytes"], "format": manifest["format"],
              "rawPath": manifest["raw_path"], "licenseEvidence": manifest.get("license_evidence")}
    if members is not None:
        result["members"] = [{"name": k, "sha256": v["sha256"], "bytes": v["bytes"]} for k, v in members.items()]
    return result


def build_catalog(data_dir, constraint_rules=None):
    data_dir = Path(data_dir)
    class_raw, class_manifest = read_primary(data_dir, "15119096", "ZIP")
    wage_raw, wage_manifest = read_primary(data_dir, "15122500", "CSV")
    education_raw, education_manifest = read_primary(data_dir, "15119098", "ZIP")
    class_members = archive_csvs(class_raw)
    require(set(class_members) == {"직업세세분류.CSV", "직업중분류.CSV"}, "직업분류 ZIP 구성 변경")
    classes, _ = parse_csv(class_members["직업세세분류.CSV"]["raw"], CLASS_COLUMNS)
    groups, _ = parse_csv(class_members["직업중분류.CSV"]["raw"], GROUP_COLUMNS)
    require(len(classes) == 537 and len(groups) == 35, "승인된 직업 537개·중분류 35개 범위 변경: 수동 검토 필요")
    group_map = {(r[GROUP_COLUMNS[0]], r[GROUP_COLUMNS[1]]): r[GROUP_COLUMNS[2]] for r in groups}
    require(len(group_map) == 35, "중분류 중복")
    class_map = {classification_code(r): r for r in classes}
    require(len(class_map) == 537 and len({r["KNOW직업명"] for r in classes}) == 537, "직업 코드·이름 중복")
    require(all(r["KNOW직업명"].strip() and not any(ord(c) < 32 for c in r["KNOW직업명"]) for r in classes), "잘못된 직업명")
    wages, _ = parse_csv(wage_raw, WAGE_COLUMNS)
    require(len(wages) == wage_manifest.get("rows") == 10, "승인된 임금 10행 범위 변경")
    wage_map = {r["직업명"]: r for r in wages}
    require(len(wage_map) == 10 and set(wage_map) <= {r["KNOW직업명"] for r in classes}, "임금 직업명 중복·미매칭")
    education_members = archive_csvs(education_raw)
    for name in ("직업세세분류.CSV", "직업중분류.CSV"):
        require(name in education_members and education_members[name]["sha256"] == class_members[name]["sha256"],
                "학력 ZIP의 분류판과 독립 직업분류 원본 불일치: 코드 연결 재검토 필요")
    education_member = "교육훈련및학력,전공분포.CSV"
    require(education_member in education_members, "학력 원본 CSV를 찾지 못함")
    education_rows, _ = parse_csv(education_members[education_member]["raw"])
    require(all(k in education_rows[0] for k in ["KNOW직업코드", "교육1코드", "교육2코드", "교육3코드", *EDUCATION_LABELS]), "학력 필수 열 변경")
    require(all(re.fullmatch(r"[0-9]{5,6}", r["KNOW직업코드"]) for r in education_rows), "학력 직업코드 형식 오류")
    education_map = {r["KNOW직업코드"].zfill(6): r for r in education_rows}
    require(len(education_rows) == len(education_map) == 537 and set(education_map) == set(class_map), "학력/직업분류 코드 537개 정확 일치 실패")
    require(all(not r[k].strip() for r in education_rows for k in ["교육1코드", "교육2코드", "교육3코드"]), "교육 코드에 새 값 등장: 코드북 검토 필요")
    occupations = []
    for code, row in sorted(class_map.items()):
        name = row["KNOW직업명"]
        group_key = (row[CLASS_COLUMNS[0]], row[CLASS_COLUMNS[1]])
        require(group_key in group_map, "직업 중분류 미매칭")
        edu = education_map[code]
        values = [{"label": label, "value": numeric(edu[key], "학력분포")} for key, label in EDUCATION_LABELS.items()]
        total = sum(v["value"] for v in values if v["value"] is not None)
        require(0 < total <= MAX_SAFE_INTEGER, "학력 원값 합계 오류")
        salary = {"average": None, "median": None, "lowerQuartile": None, "upperQuartile": None,
                  "unit": "만원", "period": None, "referenceDate": None, "surveyYear": None, "sourceId": None,
                  "statistic": None}
        if name in wage_map:
            wage = wage_map[name]
            salary.update(median=numeric(wage[WAGE_COLUMNS[2]], "중위임금"),
                          lowerQuartile=numeric(wage[WAGE_COLUMNS[3]], "하위25%임금"),
                          upperQuartile=numeric(wage[WAGE_COLUMNS[1]], "상위25%임금"),
                          referenceDate=wage_manifest.get("reference_period"), sourceId="15122500",
                          statistic="median_and_quartiles")
            require(all(salary[key] is not None for key in ("lowerQuartile", "median", "upperQuartile")), "임금 사분위 값 결측: 수동 검토 필요")
            require(salary["lowerQuartile"] <= salary["median"] <= salary["upperQuartile"], "임금 사분위 순서 오류")
        education = {"required": None, "training": None, "attainmentDistribution": {
            "kind": "survey_raw_values", "unit": None, "surveyYear": None,
            "sourceSnapshotDate": education_manifest.get("reference_period"), "values": values, "total": total},
            "sourceId": "15119098", "note": EDUCATION_NOTE}
        evidence = {"occupation": {"sourceId": "15119096", "sourceCode": code},
                    "education": {"sourceId": "15119098", "sourceCode": edu["KNOW직업코드"], "member": education_member,
                                  "missingReason": {"required": MISSING["education.required"], "training": MISSING["education.training"]}},
                    "salary": {"sourceId": salary["sourceId"], "missingReason": {"average": MISSING["salary.average"]}}}
        if salary["sourceId"] is None:
            evidence["salary"]["missingReason"]["medianAndQuartiles"] = MISSING["salary"]
        for field in FIELDS[3:]:
            evidence[field] = {"sourceId": None, "missingReason": MISSING[field]}
        occupations.append({"id": "know-" + code, "occupation": {"name": name, "classification": {
            "system": "KNOW", "referenceDate": class_manifest.get("reference_period"), "code": code,
            "codes": dict(zip(("large", "middle", "small", "detail", "fine"), [row[k] for k in CLASS_COLUMNS[:-1]])),
            "middleGroupName": group_map[group_key]}}, "education": education, "salary": salary,
            **{field: None for field in FIELDS[3:]}, "evidence": evidence})
    rules = [] if constraint_rules is None else constraint_rules
    require(isinstance(rules, list) and all(isinstance(r, dict) for r in rules), "법적 상황규칙 배열 형식 오류")
    coverage = {"totalOccupations": len(occupations), "occupation": 537, "education": {
        "required": 0, "training": 0, "attainmentDistribution": 537, "confirmedUnit": 0, "confirmedSurveyYear": 0},
        "salary": {"average": 0, "median": 10, "lowerQuartile": 10, "upperQuartile": 10, "confirmedSurveyYear": 0},
        **{field: 0 for field in FIELDS[3:]}, "constraintRules": len(rules)}
    return {"schemaVersion": 1, "scope": {
        "label": "한국고용정보원 KNOW 공개 분류판 537개 직업",
        "note": "이 공개 분류판의 전체 목록이며 국내 모든 실재 직업을 망라한 전수총람은 아닙니다. null은 미확인이며 제한 없음·위험 없음·불필요를 뜻하지 않습니다.",
        "requestedFields": list(FIELDS), "latestDataClaim": False,
        "referenceNote": "2023 공개 스냅샷입니다. 포털 수정일·수집일은 직업별 통계 조사연도와 다릅니다."},
        "sources": [source_record(class_manifest, class_members), source_record(wage_manifest),
                    source_record(education_manifest, {education_member: education_members[education_member]})],
        "coverage": coverage, "occupations": occupations, "constraintRules": rules}
