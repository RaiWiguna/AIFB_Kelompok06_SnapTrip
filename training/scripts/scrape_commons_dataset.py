import argparse
import csv
import hashlib
import io
import json
import re
import time
from pathlib import Path
from urllib.parse import quote

import requests
from PIL import Image, ImageFilter, ImageStat


API = "https://commons.wikimedia.org/w/api.php"
COMMONS_PAGE = "https://commons.wikimedia.org/wiki/"
USER_AGENT = "SnapTripDatasetBuilder/1.0 (educational dataset; Wikimedia Commons API)"

PEOPLE_ANIMAL_NOISE_PATTERNS = [
    r"\bpeople\b", r"\bpersons?\b", r"\bhumans?\b", r"\bportraits?\b",
    r"\bselfie\b", r"\btourists?\b", r"\bcrowd\b", r"\bgroup photo\b",
    r"\bmen\b", r"\bman\b", r"\bwom[ae]n\b", r"\bchildren\b", r"\bchild\b",
    r"\bboys?\b", r"\bgirls?\b", r"\bfamily\b", r"\bwedding\b",
    r"\banimals?\b", r"\bbirds?\b", r"\bmonkeys?\b", r"\bmacaques?\b",
    r"\bdogs?\b", r"\bcats?\b", r"\bhorses?\b", r"\bcattle\b",
    r"\bgoats?\b", r"\bdeer\b", r"\bfish\b", r"\binsects?\b",
    r"\bbutterfl(?:y|ies)\b",
]

WATERFALL_QUERIES = [
    "waterfall landscape -people -portrait -tourists",
    "air terjun indonesia waterfall -people -portrait -tourists",
    "waterfalls Indonesia nature -people -portrait -tourists",
    "cascade waterfall forest -people -portrait -tourists",
    "waterfall river cliff -people -portrait -tourists",
    "waterfall long exposure nature -people -portrait -tourists",
    "Category:Waterfalls Indonesia",
]

LOCAL_TOURISM_QUERIES = [
    "Indonesia tourist attraction landmark -people -portrait -tourists",
    "Borobudur temple Indonesia -people -portrait -tourists",
    "Prambanan temple Indonesia -people -portrait -tourists",
    "Monas Jakarta Indonesia -people -portrait -tourists",
    "Taman Mini Indonesia Indah -people -portrait -tourists",
    "Candi Indonesia temple -people -portrait -tourists",
    "Bali temple Indonesia destination -people -portrait -tourists",
    "Indonesia beach tourism landscape -people -portrait -tourists",
    "Indonesia national park landscape -people -portrait -tourists",
    "Indonesia heritage site -people -portrait -tourists",
    "Category:Tourist attractions in Indonesia",
]


def clean_html(value):
    if not value:
        return ""
    value = re.sub(r"<[^>]+>", " ", str(value))
    return re.sub(r"\s+", " ", value).strip()


def ext_value(extmetadata, key):
    item = extmetadata.get(key) or {}
    return clean_html(item.get("value", ""))


def text_blob(page, categories):
    info = (page.get("imageinfo") or [{}])[0]
    ext = info.get("extmetadata") or {}
    parts = [
        page.get("title", ""),
        ext_value(ext, "ObjectName"),
        ext_value(ext, "ImageDescription"),
        ext_value(ext, "Categories"),
        " ".join(categories),
    ]
    return clean_html(" ".join(parts)).lower()


def request_json(session, params, retries=4):
    params = {"format": "json", "formatversion": "2", **params}
    for attempt in range(retries):
        response = session.get(API, params=params, timeout=30)
        if response.status_code == 429 or response.status_code >= 500:
            retry_after = response.headers.get("Retry-After")
            wait = int(retry_after) if retry_after and retry_after.isdigit() else (8 + attempt * 4)
            time.sleep(wait)
            continue
        response.raise_for_status()
        time.sleep(0.35)
        return response.json()
    response.raise_for_status()
    return response.json()


def iter_search_pages(session, query, max_pages):
    cont = {}
    fetched = 0
    while fetched < max_pages:
        params = {
            "action": "query",
            "generator": "search",
            "gsrnamespace": "6",
            "gsrlimit": "50",
            "gsrsearch": f"filetype:bitmap {query}",
            "prop": "imageinfo",
            "iiprop": "url|mime|size|extmetadata",
            "iiurlwidth": "900",
            **cont,
        }
        data = request_json(session, params)
        for page in data.get("query", {}).get("pages", []):
            yield page
        fetched += 1
        cont = data.get("continue")
        if not cont:
            break


def iter_category_pages(session, category, max_pages):
    cont = {}
    fetched = 0
    while fetched < max_pages:
        params = {
            "action": "query",
            "generator": "categorymembers",
            "gcmtitle": category,
            "gcmnamespace": "6",
            "gcmlimit": "50",
            "prop": "imageinfo",
            "iiprop": "url|mime|size|extmetadata",
            "iiurlwidth": "900",
            **cont,
        }
        data = request_json(session, params)
        for page in data.get("query", {}).get("pages", []):
            yield page
        fetched += 1
        cont = data.get("continue")
        if not cont:
            break


def iter_candidates(session, queries, max_pages_per_query):
    for query in queries:
        if query.startswith("Category:"):
            yield from ((page, query) for page in iter_category_pages(session, query, max_pages_per_query))
        else:
            yield from ((page, query) for page in iter_search_pages(session, query, max_pages_per_query))


def is_relevant(label, blob):
    if label == "waterfall":
        return any(term in blob for term in ("waterfall", "waterfalls", "air terjun", "cascade", "cascades"))
    return (
        "indonesia" in blob
        and any(term in blob for term in (
            "tourist", "tourism", "attraction", "destination", "landmark", "heritage",
            "temple", "candi", "monas", "borobudur", "prambanan", "taman mini",
            "bali", "jakarta", "yogyakarta", "java", "sumatra", "sulawesi",
            "lombok", "raja ampat", "komodo", "beach", "national park",
        ))
    )


def looks_noisy(blob):
    return any(re.search(pattern, blob) for pattern in PEOPLE_ANIMAL_NOISE_PATTERNS)


def download_image(session, url):
    response = session.get(url, timeout=45)
    response.raise_for_status()
    return response.content


def image_score_and_save(raw, dest, max_side=768, quality=72):
    with Image.open(io.BytesIO(raw)) as img:
        img = img.convert("RGB")
        width, height = img.size
        if width < 320 or height < 240:
            return None
        img.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
        edge = img.convert("L").filter(ImageFilter.FIND_EDGES)
        clarity = float(ImageStat.Stat(edge).stddev[0])
        if clarity < 8.0:
            return None
        img.save(dest, "JPEG", quality=quality, optimize=True, progressive=True)
        return {
            "source_width": width,
            "source_height": height,
            "saved_width": img.size[0],
            "saved_height": img.size[1],
            "clarity_score": round(clarity, 3),
        }


def load_seen(metadata_path):
    if not metadata_path.exists():
        return set()
    seen = set()
    with metadata_path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            if row.get("commons_title"):
                seen.add(row["commons_title"])
    return seen


def next_index(out_dir):
    existing = []
    for path in out_dir.glob("*.jpg"):
        try:
            existing.append(int(path.stem))
        except ValueError:
            pass
    return max(existing, default=0) + 1


def append_metadata(metadata_path, row):
    exists = metadata_path.exists()
    with metadata_path.open("a", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(row.keys()))
        if not exists:
            writer.writeheader()
        writer.writerow(row)


def scrape_label(root, label, target, max_pages_per_query):
    out_dir = root / label
    out_dir.mkdir(parents=True, exist_ok=True)
    metadata_path = out_dir / "metadata.csv"
    jsonl_path = out_dir / "metadata.jsonl"
    seen = load_seen(metadata_path)
    current = len(list(out_dir.glob("*.jpg")))
    index = next_index(out_dir)
    queries = WATERFALL_QUERIES if label == "waterfall" else LOCAL_TOURISM_QUERIES

    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})
    skipped = {"duplicate": 0, "irrelevant": 0, "noise": 0, "download": 0, "image": 0}

    for page, seed_query in iter_candidates(session, queries, max_pages_per_query):
        if current >= target:
            break
        title = page.get("title", "")
        if not title or title in seen:
            skipped["duplicate"] += 1
            continue

        info = (page.get("imageinfo") or [{}])[0]
        categories = []
        blob = text_blob(page, categories)
        if not is_relevant(label, blob):
            skipped["irrelevant"] += 1
            continue
        if looks_noisy(blob):
            skipped["noise"] += 1
            continue

        url = info.get("thumburl") or info.get("url")
        if not url:
            skipped["download"] += 1
            continue

        dest = out_dir / f"{index:04d}.jpg"
        try:
            raw = download_image(session, url)
            image_meta = image_score_and_save(raw, dest)
        except Exception:
            skipped["download"] += 1
            continue
        if not image_meta:
            skipped["image"] += 1
            if dest.exists():
                dest.unlink()
            continue

        ext = info.get("extmetadata") or {}
        page_url = COMMONS_PAGE + quote(title.replace(" ", "_"), safe=":/_()")
        sha1 = hashlib.sha1(raw).hexdigest()
        row = {
            "filename": dest.name,
            "label": label,
            "commons_title": title,
            "source_page": page_url,
            "download_url": url,
            "seed_query_or_category": seed_query,
            "license_short": ext_value(ext, "LicenseShortName"),
            "license_url": ext_value(ext, "LicenseUrl"),
            "artist": ext_value(ext, "Artist"),
            "description": ext_value(ext, "ImageDescription")[:500],
            "categories": " | ".join(categories)[:1000],
            "source_width": image_meta["source_width"],
            "source_height": image_meta["source_height"],
            "saved_width": image_meta["saved_width"],
            "saved_height": image_meta["saved_height"],
            "clarity_score": image_meta["clarity_score"],
            "raw_sha1": sha1,
        }
        append_metadata(metadata_path, row)
        with jsonl_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")
        seen.add(title)
        current += 1
        index += 1
        if current % 50 == 0:
            print(f"{label}: {current}/{target} saved; skipped={skipped}", flush=True)

    print(f"{label}: finished {current}/{target}; skipped={skipped}", flush=True)
    return current


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument("--target", type=int, default=1500)
    parser.add_argument("--max-pages-per-query", type=int, default=80)
    parser.add_argument("--labels", nargs="+", default=["waterfall", "localtourism"])
    args = parser.parse_args()

    root = Path(args.root).resolve()
    results = {}
    for label in args.labels:
        if label not in {"waterfall", "localtourism"}:
            raise ValueError(f"Unsupported label: {label}")
        results[label] = scrape_label(root, label, args.target, args.max_pages_per_query)
    print(json.dumps(results, indent=2), flush=True)


if __name__ == "__main__":
    main()
