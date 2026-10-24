"""Public deployment portal validators; no private collector state."""

import csv, hashlib, html, io, json, re, time, urllib.error, urllib.parse, urllib.request, zipfile

from pathlib import Path

VERSION = "1.1.0-public-runtime"

MAX_BYTES = 95 * 1024 * 1024

def member_name(entry):
    if not entry.flag_bits & 0x800:
        try:
            return entry.filename.encode("cp437").decode("cp949")
        except (UnicodeEncodeError, UnicodeDecodeError):
            pass
    return entry.filename

def plain(value):
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", value)).split())

def field(page, label):
    pattern = (r'<strong\b[^>]*class=["\'][^"\']*\bkey\b[^"\']*["\'][^>]*>\s*'
               + re.escape(label) + r'\s*</strong>\s*<div\b[^>]*class=["\']value["\'][^>]*>(.*?)</div>')
    match = re.search(pattern, page, re.S | re.I)
    if not match:
        raise ValueError("Required page field missing: " + label)
    return plain(match.group(1))

def assess_license(license_text):
    text = " ".join(license_text.split())
    if text == "이용허락범위 제한 없음":
        return "unrestricted"
    # Full match prevents accepting '제1유형' inside a restrictive mixed statement.
    if re.fullmatch(r"공공누리\s*제?1\s*유형\s*[:：-]?\s*출처표시", text):
        return "KOGL-1"
    if re.fullmatch(r"공공저작물\s*[:：]\s*출처표시\s*\(제\s*1\s*유형\)", text):
        return "KOGL-1"
    raise ValueError("License is not explicitly approved: " + text)

def safe_url(url):
    parsed = urllib.parse.urlsplit(url)
    if (parsed.scheme != "https" or parsed.hostname not in {"www.data.go.kr", "data.go.kr", "mods.go.kr", "www.mods.go.kr"}
            or parsed.username or parsed.password or parsed.port not in {None, 443}):
        raise ValueError("URL outside approved HTTPS portal: " + url)
    return url

class PortalRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        safe_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)

def fetch(url, form=None):
    safe_url(url)
    opener = urllib.request.build_opener(PortalRedirect())
    for attempt in range(3):
        try:
            request = urllib.request.Request(url, data=urllib.parse.urlencode(form).encode() if form else None, headers={
                "User-Agent": "KoreaLifeDataCollector/" + VERSION,
                "Accept": "*/*",
            })
            with opener.open(request, timeout=60) as response:
                safe_url(response.geturl())
                if response.status != 200:
                    raise ValueError("Unexpected HTTP status " + str(response.status))
                data = response.read(MAX_BYTES + 1)
                if not data or len(data) > MAX_BYTES:
                    raise ValueError("Empty or oversized response")
                declared = response.headers.get("Content-Length")
                if declared and int(declared) != len(data):
                    raise ValueError("Truncated response: Content-Length mismatch")
                return data, {
                    "url": response.geturl(), "status": response.status,
                    "content_type": response.headers.get("Content-Type"),
                    "content_disposition": response.headers.get("Content-Disposition"),
                    "etag": response.headers.get("ETag"),
                    "last_modified": response.headers.get("Last-Modified"),
                }
        except (urllib.error.URLError, TimeoutError, ConnectionError) as exc:
            if isinstance(exc, urllib.error.HTTPError) and exc.code not in {429, 500, 502, 503, 504}:
                raise
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)

def parse_page(page, base_url, catalog=None):
    scripts = re.findall(r'<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
                         page, re.S | re.I)
    dataset = None
    for script in scripts:
        try:
            obj = json.loads(script)
        except json.JSONDecodeError:
            # Some official descriptions contain unescaped quotes. Decode only
            # independently valid, line-anchored JSON properties; never eval JS.
            obj = {"@type": "Dataset"}
            for key in ("name", "dateModified", "distribution"):
                match = re.search(r'^\s*"' + key + r'"\s*:\s*', script, re.M)
                if match:
                    obj[key] = json.JSONDecoder().raw_decode(script[match.end():])[0]
        candidates = obj if isinstance(obj, list) else obj.get("@graph", [obj])
        for candidate in candidates:
            if candidate.get("@type") == "Dataset" and candidate.get("distribution"):
                dataset = candidate
                break
    button = None
    if dataset is None and catalog:
        match = re.search(r"fileDetailObj\.fn_fileDataDown\('([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)'\)", page)
        if match:
            button = dict(zip(("publicDataPk", "publicDataDetailPk", "atchFileId", "fileDetailSn", "publicDataHistSn"), match.groups()))
            dataset = {"name": catalog["name"], "dateModified": catalog.get("dateModified"), "distribution": []}
    if dataset is None:
        raise ValueError("No public file distribution found")
    distributions = dataset["distribution"]
    if isinstance(distributions, dict):
        distributions = [distributions]
    # Never silently drop an additional attachment if the provider changes packaging.
    if not button and len(distributions) != 1:
        raise ValueError("Multiple attachments require source review")
    distribution = distributions[0] if distributions else {}
    return {
        "title": dataset["name"],
        "license": field(page, "이용허락범위"),
        "free": field(page, "비용부과유무") == "무료",
        "download_url": safe_url(urllib.parse.urljoin(base_url, distribution["contentUrl"])) if distribution else None,
        "public_button": button,
        "format": (distribution.get("encodingFormat") or catalog["encodingFormat"]).upper(),
        "date_modified": dataset.get("dateModified"),
        "cadence": field(page, "업데이트 주기"),
        "next_expected": field(page, "차기 등록 예정일"),
    }

def decode_csv(data):
    for encoding in ("utf-8-sig", "cp949"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            pass
    raise ValueError("Unknown CSV encoding; replacement characters are not allowed")

def archive_files(data):
    archive = zipfile.ZipFile(io.BytesIO(data))
    entries = archive.infolist()
    if (not any(not e.is_dir() for e in entries) or len(entries) > 512
            or sum(e.file_size for e in entries) > 128 * 1024 * 1024):
        archive.close()
        raise ValueError("Archive limits exceeded")
    for entry in entries:
        name = entry.filename.replace("\\", "/")
        if (entry.flag_bits & 1 or name.startswith("/") or ":" in name
                or ".." in name.split("/") or entry.file_size / max(1, entry.compress_size) > 500):
            archive.close()
            raise ValueError("Unsafe archive member")
    if archive.testzip():
        archive.close()
        raise ValueError("Archive CRC error")
    return archive

def validate_payload(data, format):
    if not data or not data.strip():
        raise ValueError("Empty file")
    prefix = data[:1024].lstrip(b"\xef\xbb\xbf \t\r\n").lower()
    if prefix.startswith((b"<", b"{", b"[")):
        raise ValueError("HTML/XML/JSON error response is not a dataset")
    if format == "CSV":
        text = decode_csv(data)
        if "\x00" in text:
            raise ValueError("Binary data in CSV")
        rows = csv.reader(io.StringIO(text, newline=""), strict=True)
        header = next(rows, [])
        if len(header) < 2 or not all(cell.strip() for cell in header):
            raise ValueError("Missing CSV header")
        count = 0
        for row in rows:
            if not row:
                continue
            if len(row) != len(header):
                raise ValueError("CSV row width differs from header")
            count += 1
        if not count:
            raise ValueError("CSV has no data rows")
    elif format == "XLSX":
        with archive_files(data) as archive:
            if "xl/workbook.xml" not in archive.namelist():
                raise ValueError("ZIP is not an XLSX workbook")
    elif format == "HWPX":
        from mods_adapter import validate_hwpx
        validate_hwpx(data)
    elif format == "ZIP":
        with archive_files(data) as archive:
            for entry in archive.infolist():
                if entry.is_dir():
                    continue
                extension = Path(entry.filename).suffix.upper().lstrip(".")
                if extension not in {"CSV", "XLSX"}:
                    raise ValueError("Unapproved archive attachment: " + extension)
                validate_payload(archive.read(entry), extension)
    else:
        raise ValueError("Unapproved format: " + format)

def csv_info(data):
    text = decode_csv(data)
    reader = csv.reader(io.StringIO(text, newline=""), strict=True)
    encoding = "utf-8-sig"
    try:
        data.decode("utf-8-sig")
    except UnicodeDecodeError:
        encoding = "cp949"
    output = io.BytesIO()
    text_output = io.TextIOWrapper(output, encoding="utf-8-sig", newline="")
    writer = csv.writer(text_output, lineterminator="\n")
    try:
        columns = next(reader)
    except StopIteration:
        raise IndexError("list index out of range") from None
    writer.writerow(columns)
    row_count = 0
    for row in reader:
        writer.writerow(row)
        if row:
            row_count += 1
    text_output.flush()
    return output.getvalue(), {
        "rows": row_count, "columns": columns,
        "source_encoding": encoding, "normalized_encoding": "utf-8-sig",
        "transform": "Encoding and line endings only; values and header order preserved.",
    }
