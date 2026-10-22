"""Generated, non-personal offline fixtures; no private raw datasets are exported."""
import copy
import csv
import io
import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

import public_occupations as parser
import update_runtime as updater
import runtime_catalog


def csv_bytes(headers, rows):
    output = io.StringIO(newline='')
    writer = csv.writer(output, lineterminator='\n')
    writer.writerow(headers)
    writer.writerows(rows)
    return output.getvalue().encode('utf-8-sig')


def zip_bytes(files):
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for name, raw in files.items():
            # Source identity in these fixtures describes payload changes, not
            # the wall clock of the test run. ZIP's implicit current timestamp
            # otherwise creates false updates across a two-second boundary.
            info = zipfile.ZipInfo(name, date_time=(2023, 8, 18, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, raw)
    return output.getvalue()


def source_fixture(*, wage_delta=0, grade_delta=0, changed_name=False, wage_reassigned=False):
    classes, education = [], []
    for index in range(537):
        group, position = index % 35, index // 35
        parts = [str(group // 10), str(group % 10), str(position // 10), str(position % 10), '0']
        code = ''.join(parts[:4]) + '00'
        name = f'검증직업{index:03d}' + ('변경' if changed_name and index == 0 else '')
        classes.append(parts + [name])
        education.append([code, '', '', '', 1 + (grade_delta if index == 0 else 0), 2, 3, 4, 5, 6, ''])
    class_raw = csv_bytes(parser.CLASS_COLUMNS, classes)
    group_raw = csv_bytes(parser.GROUP_COLUMNS, [[str(g // 10), str(g % 10), f'검증분류{g}'] for g in range(35)])
    wage_rows = [[f'검증직업{(i + 1 if wage_reassigned else i):03d}', 5000 + wage_delta, 4000 + wage_delta, 3000 + wage_delta]
                 for i in range(10)]
    return {
        '15119096': zip_bytes({'직업세세분류.CSV': class_raw, '직업중분류.CSV': group_raw}),
        '15119098': zip_bytes({'직업세세분류.CSV': class_raw, '직업중분류.CSV': group_raw,
                              '교육훈련및학력,전공분포.CSV': csv_bytes(
                                  ['KNOW직업코드', '교육1코드', '교육2코드', '교육3코드', *parser.EDUCATION_LABELS], education)}),
        '15122500': csv_bytes(parser.WAGE_COLUMNS, wage_rows),
    }


class FakePortal:
    def __init__(self, payloads, *, page_license='이용허락범위 제한 없음', catalog_license=None, free=True):
        self.payloads = payloads
        self.page_license = page_license
        self.catalog_license = page_license if catalog_license is None else catalog_license
        self.free = free
        self.calls = []

    def __call__(self, url, form=None):
        self.calls.append(url)
        source_id = next((key for key in updater.SOURCE_IDS if key in url), None)
        if source_id is None:
            raise AssertionError('Unexpected source URL: ' + url)
        if '/fake/' in url:
            return self.payloads[source_id], {}
        catalog = {'@type': 'Dataset', 'name': source_id + ' 검증 자료',
                   'alternateName': source_id + ' 검증 자료', 'dateModified': '2026-10-22',
                   'creator': {'name': '검증 공공기관'}, 'license': self.catalog_license,
                   'distribution': {'contentUrl': f'https://www.data.go.kr/fake/{source_id}.bin', 'encodingFormat': 'CSV'}}
        if '/catalog/' in url:
            return updater.blob(catalog), {}
        fields = [('이용허락범위', self.page_license), ('비용부과유무', '무료' if self.free else '유료'),
                  ('업데이트 주기', '수시'), ('차기 등록 예정일', '미정')]
        html = '<script type="application/ld+json">' + json.dumps(catalog, ensure_ascii=False) + '</script>'
        html += ''.join(f'<strong class="key">{name}</strong><div class="value">{value}</div>' for name, value in fields)
        return html.encode('utf-8'), {}


def collect_all(root, fixture, checked='2026-10-22T00:00:00+00:00'):
    fetcher = FakePortal(fixture)
    for source in updater.SOURCE_CONFIG:
        updater.collect_source(source, root, checked, fetcher)
    return fetcher


class RuntimeUpdaterTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.site = self.root / 'site'
        self.site.mkdir()
        self.marker = self.root / '.koreanlife-pages-export.json'
        self.original_data = self.root / 'original-data'
        collect_all(self.original_data, source_fixture())
        self.catalog = parser.build_catalog(self.original_data)
        for index, row in enumerate(self.catalog['occupations']):
            row['modeled'] = {'protected': {'profession': index, 'salary': 1234, 'risk': ['reviewed']},
                              'status': 'model_estimate', 'modelVersion': 'offline-reviewed-v1',
                              'groupId': 'know-middle-01', 'sourceIds': ['reviewed-model'],
                              'salary': {'averageAnnualWan': 1234},
                              'careerWage': {'stages': [{'minYears': 0, 'annualWan': 1000, 'label': '초기 경력'},
                                                       {'minYears': 5, 'annualWan': 1500, 'label': '숙련 경력'}]},
                              'employmentType': {'types': [{'label': '정규직'}]},
                              'workingTime': {'weeklyHours': 40, 'shift': {'likelihood': 'low'}},
                              'workAbilities': {'levels': {'analytical': 50, 'communication': 50,
                                                          'physical': 50, 'precision': 50, 'digital': 50}},
                              'occupationalRisks': {'level': 1, 'tags': ['reviewed']}}
            row['education']['required'] = {'protectedProfessionalRoute': index}
            row['professionalRequirements'] = {'license': 'reviewed-' + str(index)}
            row['salary']['average'] = 1234
            row['salary']['protectedProfessionalNote'] = 'preserve'
        self.catalog['constraintRules'] = [{'id': 'reviewed-statutory-rule'}]
        self.catalog['modelSources'] = [{'id': 'reviewed-model'}]
        self.catalog['modelMethodology'] = {'protected': True}
        self.catalog['coverage']['protectedProfessionalCount'] = 12
        (self.site / 'occupations.json').write_bytes(updater.blob(self.catalog))
        (self.site / updater.RUNTIME_CATALOG_FILE).write_bytes(runtime_catalog.render(updater.blob(self.catalog)))
        (self.site / updater.STATUS_FILE).write_bytes(updater.blob(updater.initial_status(self.catalog)))
        (self.site / 'game-data.json').write_bytes(b'{"birthGeography":2025}')
        (self.site / 'mortality.json').write_bytes(b'{"approvedSnapshot":true}')
        self.mark()

    def tearDown(self):
        self.temporary.cleanup()

    def mark(self):
        self.marker.write_bytes(updater.blob({'scope': 'browser game deployment only',
            'files': {path.name: updater.digest(path.read_bytes()) for path in self.site.iterdir()}}))

    def stage(self, fixture, checked='2026-10-23T00:00:00+00:00'):
        data = self.root / ('data-' + str(len(list(self.root.glob('data-*')))))
        collect_all(data, fixture, checked)
        return updater.prepare_update(self.site, self.marker, data, checked)

    def test_network_checks_both_rights_pages_and_collects_only_three_approved_ids(self):
        fetcher = FakePortal(source_fixture())
        destination = self.root / 'checked'
        for source in updater.SOURCE_CONFIG:
            updater.collect_source(source, destination, '2026-10-22T01:00:00Z', fetcher)
        self.assertEqual(len(fetcher.calls), 9)
        self.assertEqual({path.name for path in (destination / 'datasets').iterdir()}, set(updater.SOURCE_IDS))
        self.assertEqual(len(parser.build_catalog(destination)['occupations']), 537)

    def test_restrictive_license_and_license_disagreement_fail_before_file_download(self):
        for license_text, catalog_license in [('공공누리 제2유형 출처표시+상업적 이용금지', None),
                                               ('이용허락범위 제한 없음', '공공누리 제1유형 출처표시')]:
            fetcher = FakePortal(source_fixture(), page_license=license_text, catalog_license=catalog_license)
            with self.assertRaises(ValueError):
                updater.collect_source(updater.SOURCE_CONFIG[0], self.root / 'rejected', '2026-10-22T01:00:00Z', fetcher)
            self.assertEqual(len(fetcher.calls), 2)

    def test_nonfree_source_and_unknown_allowlist_id_fail(self):
        fetcher = FakePortal(source_fixture(), free=False)
        with self.assertRaises(ValueError):
            updater.collect_source(updater.SOURCE_CONFIG[0], self.root / 'rejected', 'now', fetcher)
        self.assertEqual(len(fetcher.calls), 2)
        with self.assertRaises(ValueError):
            updater.collect_source({'id': '15097972'}, self.root / 'rejected', 'now', fetcher)

    def test_unchanged_run_keeps_exact_catalog_and_does_not_claim_an_update(self):
        for raw in (source_fixture()['15119096'], source_fixture()['15119098']):
            with zipfile.ZipFile(io.BytesIO(raw)) as archive:
                self.assertTrue(all(info.date_time == (2023, 8, 18, 0, 0, 0) for info in archive.infolist()))
        catalog_before = (self.site / 'occupations.json').read_bytes()
        updates, marker, status = self.stage(source_fixture())
        self.assertEqual(set(updates), {updater.STATUS_FILE})
        self.assertEqual(status['result'], 'unchanged')
        self.assertIsNone(status['lastUpdatedAt'])
        updater.commit_update(self.site, self.marker, updates, marker)
        self.assertEqual((self.site / 'occupations.json').read_bytes(), catalog_before)
        updater.verify_export_marker(self.site, self.marker)

    def test_changed_observations_preserve_every_professional_model_and_birth_death_file(self):
        preserved = {name: (self.site / name).read_bytes() for name in ('game-data.json', 'mortality.json')}
        updates, marker, status = self.stage(source_fixture(wage_delta=500, grade_delta=2))
        self.assertEqual(set(updates), {'occupations.json', updater.RUNTIME_CATALOG_FILE, updater.STATUS_FILE})
        self.assertEqual(status['result'], 'updated')
        self.assertEqual(status['lastUpdatedAt'], '2026-10-23T00:00:00+00:00')
        updated = json.loads(updates['occupations.json'])
        old_rows = {row['id']: row for row in self.catalog['occupations']}
        changed_values = False
        for row in updated['occupations']:
            old = old_rows[row['id']]
            self.assertEqual(row['modeled'], old['modeled'])
            self.assertEqual(row['professionalRequirements'], old['professionalRequirements'])
            self.assertEqual(row['education']['required'], old['education']['required'])
            self.assertEqual(row['salary']['average'], 1234)
            self.assertEqual(row['salary']['protectedProfessionalNote'], 'preserve')
            self.assertEqual(row['evidence'], old['evidence'])
            allowed_old, allowed_new = copy.deepcopy(old), copy.deepcopy(row)
            allowed_old['education'].pop('attainmentDistribution')
            allowed_new['education'].pop('attainmentDistribution')
            for key in ('median', 'lowerQuartile', 'upperQuartile'):
                changed_values |= allowed_old['salary'].pop(key) != allowed_new['salary'].pop(key)
            self.assertEqual(allowed_old, allowed_new)
        self.assertTrue(changed_values)
        for key in ('constraintRules', 'modelSources', 'modelMethodology', 'coverage'):
            self.assertEqual(updated[key], self.catalog[key])
        updater.commit_update(self.site, self.marker, updates, marker)
        updater.verify_export_marker(self.site, self.marker)
        runtime = json.loads((self.site / updater.RUNTIME_CATALOG_FILE).read_bytes())
        self.assertEqual(runtime['sourceCatalog']['sha256'], updater.digest((self.site / 'occupations.json').read_bytes()))
        self.assertEqual(len(runtime['occupations']), 537)
        for source_row, compact in zip(updated['occupations'], runtime['occupations']):
            self.assertEqual(runtime_catalog.model_snapshot(source_row), runtime_catalog.model_snapshot(compact))
        for name, raw in preserved.items():
            self.assertEqual((self.site / name).read_bytes(), raw)
        self.assertEqual({path.name for path in self.site.iterdir()},
                         {'occupations.json', updater.RUNTIME_CATALOG_FILE, updater.STATUS_FILE, 'game-data.json', 'mortality.json'})
        self.assertNotIn('rawPath', next(source for source in updated['sources'] if source['id'] == '15122500'))

    def test_same_updated_source_on_later_check_preserves_last_updated_time(self):
        fixture = source_fixture(wage_delta=500)
        updates, marker, _ = self.stage(fixture)
        updater.commit_update(self.site, self.marker, updates, marker)
        updates, _, status = self.stage(fixture, '2026-10-30T00:00:00+00:00')
        self.assertEqual(set(updates), {updater.STATUS_FILE})
        self.assertEqual(status['lastUpdatedAt'], '2026-10-23T00:00:00+00:00')
        self.assertEqual(status['lastCheckedAt'], '2026-10-30T00:00:00+00:00')

    def test_name_classification_and_wage_coverage_changes_require_manual_review(self):
        for fixture in [source_fixture(changed_name=True), source_fixture(wage_reassigned=True)]:
            before = {path: path.read_bytes() for path in self.site.iterdir()}
            with self.assertRaises(ValueError):
                self.stage(fixture)
            self.assertEqual({path: path.read_bytes() for path in self.site.iterdir()}, before)

    def test_tampered_or_missing_runtime_file_rejected_before_publish(self):
        (self.site / 'game-data.json').write_text('modified', encoding='utf-8')
        with self.assertRaises(ValueError):
            self.stage(source_fixture())

    def test_unapproved_write_path_and_partial_write_failure_roll_back_all_bytes(self):
        with self.assertRaises(ValueError):
            updater.commit_update(self.site, self.marker, {'game-data.json': b'not allowed'}, b'{}')
        updates, marker, _ = self.stage(source_fixture(wage_delta=500))
        before = {path: path.read_bytes() for path in [*self.site.iterdir(), self.marker]}
        original_replace = updater.os.replace
        for failure_at in (2, 3, 4):
            calls = []

            def fail_write(source, target):
                calls.append(target)
                if len(calls) == failure_at:
                    raise OSError('simulated disk failure')
                return original_replace(source, target)

            with patch.object(updater.os, 'replace', side_effect=fail_write), self.assertRaises(OSError):
                updater.commit_update(self.site, self.marker, updates, marker)
            self.assertEqual({path: path.read_bytes() for path in before}, before)
            self.assertFalse(list(self.site.glob('*.update-tmp')))

    def test_missing_or_stale_compact_is_repaired_without_claiming_new_observations(self):
        source_before = (self.site / 'occupations.json').read_bytes()
        for damaged in (None, b'{"sourceCatalog":{"sha256":"stale"}}'):
            if damaged is None:
                (self.site / updater.RUNTIME_CATALOG_FILE).unlink()
            else:
                (self.site / updater.RUNTIME_CATALOG_FILE).write_bytes(damaged)
            updates, marker, status = self.stage(source_fixture())
            self.assertEqual(set(updates), {updater.RUNTIME_CATALOG_FILE, updater.STATUS_FILE})
            self.assertEqual(status['result'], 'unchanged')
            self.assertIsNone(status['lastUpdatedAt'])
            self.assertTrue(status['derivedRuntime']['refreshed'])
            self.assertEqual(updates[updater.RUNTIME_CATALOG_FILE], runtime_catalog.render(source_before))
            updater.commit_update(self.site, self.marker, updates, marker)
            updater.verify_export_marker(self.site, self.marker)
            self.assertEqual((self.site / 'occupations.json').read_bytes(), source_before)

    def test_legacy_export_without_compact_can_add_only_the_derived_file(self):
        (self.site / updater.RUNTIME_CATALOG_FILE).unlink()
        self.mark()
        updates, marker, _ = self.stage(source_fixture())
        self.assertEqual(set(updates), {updater.RUNTIME_CATALOG_FILE, updater.STATUS_FILE})
        updater.commit_update(self.site, self.marker, updates, marker)
        updater.verify_export_marker(self.site, self.marker)

    def test_source_cannot_commit_without_matching_compact_or_with_wrong_source_sha(self):
        updates, marker, _ = self.stage(source_fixture(wage_delta=500))
        before = {path: path.read_bytes() for path in [*self.site.iterdir(), self.marker]}
        missing = dict(updates)
        missing.pop(updater.RUNTIME_CATALOG_FILE)
        with self.assertRaises(ValueError):
            updater.commit_update(self.site, self.marker, missing, marker)
        wrong = dict(updates)
        wrong[updater.RUNTIME_CATALOG_FILE] = runtime_catalog.render(before[self.site / 'occupations.json'])
        with self.assertRaises(ValueError):
            updater.commit_update(self.site, self.marker, wrong, marker)
        self.assertEqual({path: path.read_bytes() for path in before}, before)

    def test_new_derived_file_is_removed_if_marker_commit_fails(self):
        (self.site / updater.RUNTIME_CATALOG_FILE).unlink()
        self.mark()
        updates, marker, _ = self.stage(source_fixture(wage_delta=500))
        before = {path: path.read_bytes() for path in [*self.site.iterdir(), self.marker]}
        original_replace = updater.os.replace

        def fail_marker(source, target):
            if target == self.marker:
                raise OSError('simulated marker failure')
            return original_replace(source, target)

        with patch.object(updater.os, 'replace', side_effect=fail_marker), self.assertRaises(OSError):
            updater.commit_update(self.site, self.marker, updates, marker)
        self.assertFalse((self.site / updater.RUNTIME_CATALOG_FILE).exists())
        self.assertEqual({path: path.read_bytes() for path in before}, before)

    def test_initial_status_reports_frozen_snapshots_and_no_invented_check_time(self):
        status = updater.initial_status(self.catalog)
        self.assertIsNone(status['lastCheckedAt'])
        self.assertIsNone(status['lastUpdatedAt'])
        self.assertEqual(status['result'], 'not-yet-run')
        self.assertEqual(status['schedule']['cron'], '0 0 * * 2')
        self.assertFalse(status['preservedSnapshots']['birth']['automatic'])
        self.assertFalse(status['preservedSnapshots']['mortality']['automatic'])


if __name__ == '__main__':
    unittest.main()
