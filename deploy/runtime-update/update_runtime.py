"""Update only approved observed career fields from three public official sources.

No credentials, private repository reads, or raw-source publishing. Source files
and rights pages live in a temporary directory and are removed after validation.
Changes to the reviewed 537-job identity/schema fail closed for manual review.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
import re
import tempfile
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

import public_occupations as occupations
import public_portal as portal
import runtime_catalog

SOURCE_IDS = ('15119096', '15119098', '15122500')
STATUS_FILE = 'runtime-update-status.json'
RUNTIME_CATALOG_FILE = 'occupations-runtime.json'
SOURCE_CONFIG = (
    {'id': '15119096', 'format': 'CSV', 'payload_format': 'ZIP', 'reference_period': '2023-08-18'},
    {'id': '15119098', 'format': 'CSV', 'payload_format': 'ZIP', 'reference_period': '2023-08-18'},
    {'id': '15122500', 'format': 'CSV', 'payload_format': 'CSV', 'reference_period': '2023-09-08'},
)


def blob(value):
    return (json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n').encode('utf-8')


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def source_hashes(catalog):
    rows = {row['id']: row for row in catalog['sources'] if row['id'] in SOURCE_IDS}
    require(set(rows) == set(SOURCE_IDS), 'Approved career source metadata missing')
    require(all(re.fullmatch(r'[0-9a-f]{64}', row.get('sha256', '')) for row in rows.values()),
            'Invalid approved source hash')
    return {key: rows[key]['sha256'] for key in SOURCE_IDS}


def initial_status(catalog):
    rows = {row['id']: row for row in catalog['sources'] if row['id'] in SOURCE_IDS}
    source_hashes(catalog)
    return {
        'schemaVersion': 1,
        'method': 'public-official-source-pull',
        'schedule': {'cron': '0 0 * * 2', 'timezone': 'Asia/Seoul', 'label': '매주 화요일 오전 9시'},
        'lastCheckedAt': None,
        'lastUpdatedAt': None,
        'result': 'not-yet-run',
        'observedScope': {
            'sourceIds': list(SOURCE_IDS),
            'fields': ['education.attainmentDistribution', 'salary.median', 'salary.lowerQuartile',
                       'salary.upperQuartile', 'sources.metadata'],
            'note': '직업 537개에 연결된 학력분포 원값, 제공되는 10개 직업 임금 중앙값·사분위와 출처 메타데이터만 자동 갱신합니다.',
        },
        'preservedSnapshots': {
            'birth': {'geographyYear': 2025, 'automatic': False},
            'mortality': {'automatic': False},
        },
        'sources': [{'id': key, 'sha256': rows[key]['sha256'],
                     'sourceModified': rows[key].get('sourceModified'), 'checkedAt': None} for key in SOURCE_IDS],
        'limitations': [
            '비공개 원본 저장소와 공개 게임은 같은 공식 원천을 독립적으로 점검합니다. 비공개 원본이나 전체 수집 파일을 공개하지 않습니다.',
            '법정 자격·전문직 경로·게임 임금·능력·위험 모형은 검토된 값을 보존합니다.',
            '출생 확률은 승인된 2025년 통계 구역을 유지하며 출생·사망 통계의 새 연도를 자동 편입하지 않습니다.',
            '직업 코드·이름·분류·자료 구조 또는 이용조건이 달라지면 자동 반영을 중단하고 수동 검토가 필요합니다.',
        ],
    }


def collect_source(config, root, checked_at, fetcher=portal.fetch):
    """Fresh page + catalog rights agreement is required before any file download."""
    source_id = config['id']
    require(source_id in SOURCE_IDS, 'Source is outside public runtime allowlist')
    page_url = f'https://www.data.go.kr/data/{source_id}/fileData.do'
    catalog_url = f'https://www.data.go.kr/catalog/{source_id}/fileData.json'
    page_raw, _ = fetcher(page_url)
    catalog_raw, _ = fetcher(catalog_url)
    catalog = json.loads(catalog_raw.decode('utf-8-sig'))
    page = portal.parse_page(page_raw.decode('utf-8-sig'), page_url, catalog)
    require(portal.assess_license(catalog.get('license', '')) == 'unrestricted'
            and portal.assess_license(page['license']) == 'unrestricted',
            'Public career source no longer permits unrestricted reuse')
    require(page['free'] is True, 'Public career source is no longer explicitly free')
    require(page['format'] == config['format'], 'Approved portal format changed')
    if page.get('public_button'):
        button = page['public_button']
        require(button['publicDataPk'] == source_id, 'Download resolver source mismatch')
        form = {key: value for key, value in button.items() if key != 'publicDataHistSn'}
        form.update(publicDataTyCode='PR0051', url='/tcs/dss/selectFileDataDownload.do')
        reply, _ = fetcher('https://www.data.go.kr/tcs/dss/selectFileDataDownload.do', form=form)
        info = json.loads(reply.decode('utf-8-sig'))
        if isinstance(info, str):
            info = json.loads(info)
        require(info.get('status') is True and re.fullmatch(r'FILE_[0-9]+', info.get('atchFileId', ''))
                and str(info.get('fileDetailSn', '')).isdigit(), 'Unapproved public attachment resolver')
        page['download_url'] = 'https://www.data.go.kr/cmm/cmm/fileDownload.do?' + urllib.parse.urlencode({
            'atchFileId': info['atchFileId'], 'fileDetailSn': info['fileDetailSn'], 'insertDataPrcus': 'N'})
    portal.safe_url(page['download_url'])
    raw, _ = fetcher(page['download_url'])
    require(0 < len(raw) <= portal.MAX_BYTES, 'Source file size exceeded')
    portal.validate_payload(raw, config['payload_format'])
    stamp = re.sub('[^0-9]', '', checked_at) + '_' + digest(raw)[:12]
    relative = f'datasets/{source_id}/versions/{stamp}'
    version = root / relative
    version.mkdir(parents=True)
    source_path = relative + '/source.' + config['payload_format'].lower()
    (root / source_path).write_bytes(raw)
    manifest = {
        'id': source_id, 'title': catalog.get('alternateName', page['title']),
        'publisher': catalog.get('creator', {}).get('name', ''), 'page_url': page_url,
        'format': config['payload_format'], 'free': True, 'license': 'unrestricted',
        'license_label': catalog['license'], 'source_modified': page['date_modified'],
        'source_cadence': page['cadence'], 'collected_at': checked_at,
        'reference_period': config['reference_period'], 'sha256': digest(raw), 'bytes': len(raw),
        'version_dir': relative, 'raw_path': source_path,
    }
    if config['payload_format'] == 'CSV':
        manifest['rows'] = portal.csv_info(raw)[1]['rows']
    folder = root / 'datasets' / source_id
    (folder / 'latest.json').write_bytes(blob(manifest))
    (folder / 'health.json').write_bytes(blob({'id': source_id, 'status': 'updated', 'sha256': digest(raw)}))


def merge_observed(current, fresh):
    """Do not replace reviewed statutory/professional or game-model fields."""
    require(len(current['occupations']) == len(fresh['occupations']) == 537, 'Reviewed occupation scope changed')
    current_rows = {row['id']: row for row in current['occupations']}
    fresh_rows = {row['id']: row for row in fresh['occupations']}
    require(len(current_rows) == 537 and set(current_rows) == set(fresh_rows), 'Occupation identity changed')
    require({key for key, row in current_rows.items() if row['salary'].get('sourceId') == '15122500'}
            == {key for key, row in fresh_rows.items() if row['salary'].get('sourceId') == '15122500'},
            'Observed wage coverage changed; manual review required')
    for key, old in current_rows.items():
        new = fresh_rows[key]
        old_identity = old['occupation']
        new_identity = new['occupation']
        require(old_identity['name'] == new_identity['name']
                and old_identity['classification']['code'] == new_identity['classification']['code']
                and old_identity['classification']['codes'] == new_identity['classification']['codes']
                and old_identity['classification']['middleGroupName'] == new_identity['classification']['middleGroupName'],
                'Occupation name/classification changed; manual model and legal review required')
    old_sources = {row['id']: row for row in current['sources'] if row['id'] in SOURCE_IDS}
    fresh_sources = {row['id']: row for row in fresh['sources']}
    source_hashes(current)
    require(set(fresh_sources) == set(SOURCE_IDS), 'Unapproved source in career rebuild')
    require(all(row.get('free') is True and row.get('license') == 'unrestricted' for row in fresh_sources.values()),
            'Fresh career source rights are not approved')
    for key in SOURCE_IDS:
        require(fresh_sources[key]['title'] == old_sources[key]['title'], 'Source edition/title changed; manual review required')
    changed = [key for key in SOURCE_IDS if old_sources[key]['sha256'] != fresh_sources[key]['sha256']]
    result = copy.deepcopy(current)
    if not changed:
        return result, changed
    for row in result['occupations']:
        new = fresh_rows[row['id']]
        row['education']['attainmentDistribution'] = copy.deepcopy(new['education']['attainmentDistribution'])
        if row['salary'].get('sourceId') == '15122500':
            for key in ('median', 'lowerQuartile', 'upperQuartile'):
                row['salary'][key] = new['salary'][key]
    safe_source_keys = {'id', 'title', 'url', 'publisher', 'license', 'licenseLabel', 'free',
                        'referenceDate', 'sourceModified', 'cadence', 'collectedAt', 'sha256', 'bytes', 'format', 'members'}
    for index, source in enumerate(result['sources']):
        if source['id'] in changed:
            result['sources'][index] = {key: copy.deepcopy(value) for key, value in fresh_sources[source['id']].items()
                                        if key in safe_source_keys}
    return result, changed


def verify_export_marker(site, marker, *, repair_derived=False):
    require(site.is_dir() and not site.is_symlink(), 'Missing or symlinked public site')
    require(marker.is_file() and not marker.is_symlink(), 'Missing public export marker')
    previous = occupations.load_json(marker)
    require(isinstance(previous.get('files'), dict) and 'occupations.json' in previous['files'], 'Unmanaged site export')
    for relative, previous_hash in previous['files'].items():
        path = occupations.safe_relative(site, relative)
        require(not path.is_symlink(), 'Symlinked public runtime file: ' + relative)
        if repair_derived and relative == RUNTIME_CATALOG_FILE:
            # Only this deterministic derivative may be repaired. Its source
            # remains subject to the complete released-file hash verification.
            continue
        require(not path.is_symlink() and path.is_file() and digest(path.read_bytes()) == previous_hash,
                'Public runtime differs from verified export marker: ' + relative)
    require(not (site / RUNTIME_CATALOG_FILE).is_symlink(), 'Symlinked derived runtime catalog')
    return previous


def prepare_update(site, marker, data_dir, checked_at):
    previous = verify_export_marker(site, marker, repair_derived=True)
    old = occupations.load_json(site / 'occupations.json')
    fresh = occupations.build_catalog(data_dir)
    new, changed = merge_observed(old, fresh)
    status_path = site / STATUS_FILE
    status = occupations.load_json(status_path) if status_path.exists() else initial_status(old)
    require(status.get('schemaVersion') == 1, 'Unsupported runtime update status')
    new_status = initial_status(new)
    new_status.update(lastCheckedAt=checked_at, lastUpdatedAt=checked_at if changed else status.get('lastUpdatedAt'),
                      result='updated' if changed else 'unchanged')
    records = {row['id']: row for row in fresh['sources']}
    for source in new_status['sources']:
        source.update(checkedAt=checked_at, sourceModified=records[source['id']].get('sourceModified'))
    # Preserve exact released catalog bytes on an unchanged run.
    updates = {STATUS_FILE: blob(new_status)}
    if changed:
        updates['occupations.json'] = blob(new)
    full_bytes = updates.get('occupations.json', (site / 'occupations.json').read_bytes())
    compact_bytes = runtime_catalog.render(full_bytes)
    compact_path = site / RUNTIME_CATALOG_FILE
    refreshed = not compact_path.is_file() or compact_path.read_bytes() != compact_bytes
    if refreshed:
        updates[RUNTIME_CATALOG_FILE] = compact_bytes
    new_status['derivedRuntime'] = {'fileName': RUNTIME_CATALOG_FILE,
                                    'sourceSha256': digest(full_bytes), 'refreshed': refreshed}
    updates[STATUS_FILE] = blob(new_status)
    for relative, raw in updates.items():
        previous['files'][relative] = digest(raw)
    return updates, blob(previous), new_status


def commit_update(site, marker, updates, marker_bytes):
    allowed = {'occupations.json', RUNTIME_CATALOG_FILE, STATUS_FILE}
    require(set(updates) <= allowed, 'Attempted to update unapproved runtime path')
    if 'occupations.json' in updates:
        require(RUNTIME_CATALOG_FILE in updates, 'Source catalog update requires its matching runtime catalog')
    if RUNTIME_CATALOG_FILE in updates:
        source_bytes = updates.get('occupations.json', (site / 'occupations.json').read_bytes())
        require(updates[RUNTIME_CATALOG_FILE] == runtime_catalog.render(source_bytes),
                'Derived runtime catalog does not match its verified source')
    writes = [(site / relative, raw) for relative, raw in updates.items()] + [(marker, marker_bytes)]
    before = [(path, path.read_bytes() if path.exists() else None) for path, _ in writes]
    try:
        for path, raw in writes:
            temporary = path.with_name(path.name + '.update-tmp')
            temporary.write_bytes(raw)
            os.replace(temporary, path)
    except Exception:
        for path, raw in before:
            if raw is None:
                path.unlink(missing_ok=True)
            else:
                path.write_bytes(raw)
        raise
    finally:
        for path, _ in writes:
            path.with_name(path.name + '.update-tmp').unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site', type=Path, default=Path('site'))
    parser.add_argument('--marker', type=Path, default=Path('.koreanlife-pages-export.json'))
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--offline-data-dir', type=Path, help='Read verified collector data; requires --dry-run')
    args = parser.parse_args()
    if args.offline_data_dir and not args.dry_run:
        parser.error('--offline-data-dir is restricted to a non-publishing --dry-run')
    checked_at = datetime.now(timezone.utc).isoformat(timespec='seconds')
    with tempfile.TemporaryDirectory(prefix='koreanlife-public-sources-') as temporary:
        data_dir = args.offline_data_dir or Path(temporary)
        if not args.offline_data_dir:
            for config in SOURCE_CONFIG:
                collect_source(config, data_dir, checked_at)
        updates, marker_bytes, status = prepare_update(args.site.resolve(), args.marker.resolve(), data_dir, checked_at)
        if not args.dry_run:
            commit_update(args.site.resolve(), args.marker.resolve(), updates, marker_bytes)
        print(json.dumps({'dryRun': args.dry_run, 'result': status['result'],
                          'changedRuntimePaths': list(updates), 'checkedSourceIds': list(SOURCE_IDS),
                          'birthAndMortalitySnapshotsPreserved': True}, ensure_ascii=False))


if __name__ == '__main__':
    main()
