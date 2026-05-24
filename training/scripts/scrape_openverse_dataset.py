import argparse
import csv
import hashlib
import io
import json
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests
from PIL import Image, ImageFilter, ImageStat


API = "https://api.openverse.org/v1/images/"
USER_AGENT = "SnapTripDatasetBuilder/1.0 (educational dataset; CC/open images)"

NOISE_PATTERNS = [
    r"\bpeople\b", r"\bpersons?\b", r"\bportraits?\b", r"\bselfie\b",
    r"\btourists?\b", r"\bcrowd\b", r"\bgroup photo\b", r"\bmen\b",
    r"\bman\b", r"\bwom[ae]n\b", r"\bchildren\b", r"\bchild\b",
    r"\bboys?\b", r"\bgirls?\b", r"\bfamily\b", r"\bwedding\b",
    r"\banimals?\b", r"\bbirds?\b", r"\bmonkeys?\b", r"\bmacaques?\b",
    r"\bdogs?\b", r"\bcats?\b", r"\bhorses?\b", r"\bcattle\b",
    r"\bgoats?\b", r"\bdeer\b", r"\bfish\b", r"\binsects?\b",
    r"\bbutterfl(?:y|ies)\b",
]

WATERFALL_QUERIES = [
    "waterfall landscape",
    "waterfalls nature",
    "forest waterfall",
    "river waterfall",
    "cascade waterfall",
    "mountain waterfall",
    "waterfall cliff",
    "waterfall stream",
    "waterfall long exposure",
    "tropical waterfall",
    "air terjun",
    "air terjun indonesia",
    "curug indonesia",
    "waterfall indonesia",
    "bali waterfall",
    "java waterfall",
]

LOCAL_TOURISM_QUERIES = [
    "Indonesia tourist attraction",
    "Indonesia destination",
    "Indonesia landmark",
    "Indonesia tourism",
    "Indonesia heritage site",
    "Borobudur",
    "Borobudur temple",
    "Prambanan",
    "Prambanan temple",
    "Monas Jakarta",
    "National Monument Jakarta",
    "Taman Mini Indonesia Indah",
    "Candi Indonesia",
    "Bali temple Indonesia",
    "Tanah Lot",
    "Uluwatu temple",
    "Besakih temple",
    "Jakarta old town",
    "Kota Tua Jakarta",
    "Raja Ampat",
    "Komodo National Park",
    "Mount Bromo",
    "Lake Toba",
    "Lombok beach",
    "Yogyakarta palace",
    "Kraton Yogyakarta",
    "Malioboro Yogyakarta",
    "Istiqlal Mosque Jakarta",
    "Gedung Sate Bandung",
    "Sewu Temple",
    "Ratu Boko",
    "Dieng temple",
    "Plaosan temple",
    "Muara Takus temple",
    "Lake Toba Indonesia",
    "Bromo Tengger Semeru",
    "Kawah Ijen",
    "Rinjani Indonesia",
    "Raja Ampat Indonesia",
    "Labuan Bajo Indonesia",
    "Komodo island Indonesia",
    "Lombok Indonesia tourism",
    "Bunaken Indonesia",
    "Tana Toraja",
    "Minangkabau palace",
    "Jam Gadang",
    "Fort Rotterdam Makassar",
    "Lawang Sewu Semarang",
    "Sam Poo Kong Semarang",
    "Kelimutu Indonesia",
    "Tanah Lot Bali",
    "Ubud Bali Indonesia",
    "Garuda Wisnu Kencana",
    "Bali rice terrace",
    "Way Kambas",
    "Ujung Kulon",
]

LOCAL_PLACE_TERMS = (
    "indonesia", "borobudur", "prambanan", "monas", "jakarta", "taman mini",
    "candi", "bali", "tanah lot", "uluwatu", "besakih", "kota tua",
    "raja ampat", "komodo", "bromo", "toba", "lombok", "yogyakarta",
    "jogja", "java", "sumatra", "sulawesi", "papua", "nusantara",
    "kraton", "malioboro", "istiqlal", "gedung sate", "sewu", "ratu boko",
    "dieng", "plaosan", "muara takus", "ijen", "rinjani", "labuan bajo",
    "bunaken", "toraja", "minangkabau", "jam gadang", "fort rotterdam",
    "lawang sewu", "sam poo kong", "kelimutu", "ubud", "garuda wisnu",
    "way kambas", "ujung kulon",
)


def normalize(text):
    text = re.sub(r"<[^>]+>", " ", str(text or ""))
    return re.sub(r"\s+", " ", text).strip()


def result_blob(item, seed_query):
    tags = " ".join(tag.get("name", "") for tag in item.get("tags", []) if isinstance(tag, dict))
    fields = [
        item.get("title") or "",
        item.get("creator") or "",
        item.get("source") or "",
        item.get("category") or "",
        tags,
        seed_query,
    ]
    return normalize(" ".join(fields)).lower()


def is_relevant(label, blob):
    if label == "waterfall":
        return any(term in blob for term in ("waterfall", "waterfalls", "air terjun", "cascade", "cascades", "curug"))
    return any(term in blob for term in LOCAL_PLACE_TERMS) and any(
        term in blob for term in (
            "tourist", "tourism", "destination", "landmark", "heritage",
            "temple", "candi", "monument", "national park", "beach",
            "palace", "old town", "borobudur", "prambanan", "monas",
            "taman mini", "tanah lot", "uluwatu", "besakih", "raja ampat",
            "komodo", "bromo", "toba",
        )
    )


def looks_noisy(blob):
    return any(re.search(pattern, blob) for pattern in NOISE_PATTERNS)


def request_json(session, params, retries=5):
    for attempt in range(retries):
        response = session.get(API, params=params, timeout=30)
        if response.status_code == 429 or response.status_code >= 500:
            retry_after = response.headers.get("Retry-After")
            wait = int(retry_after) if retry_after and retry_after.isdigit() else (3 + attempt * 3)
            time.sleep(wait)
            continue
        response.raise_for_status()
        return response.json()
    response.raise_for_status()
    return response.json()


def iter_results(session, query, max_pages):
    for page in range(1, max_pages + 1):
        data = request_json(session, {
            "q": query,
            "page": page,
            "page_size": 20,
            "license_type": "commercial,modification",
        })
        results = data.get("results", [])
        if not results:
            break
        for item in results:
            yield item
        if page >= data.get("page_count", 0):
            break
        time.sleep(0.15)


def download(session, url, retries=2):
    for attempt in range(retries):
        try:
            response = session.get(url, timeout=15, allow_redirects=True)
            if response.status_code == 429 or response.status_code >= 500:
                time.sleep(2 + attempt * 2)
                continue
            response.raise_for_status()
            ctype = response.headers.get("content-type", "")
            if "image" not in ctype and not url.lower().split("?")[0].endswith((".jpg", ".jpeg", ".png", ".webp")):
                return None
            return response.content
        except requests.RequestException:
            time.sleep(1 + attempt)
    return None


def save_medium_jpg(raw, dest, max_side=768, quality=72):
    try:
        with Image.open(io.BytesIO(raw)) as img:
            img = img.convert("RGB")
            source_size = img.size
            if source_size[0] < 320 or source_size[1] < 240:
                return None
            img.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
            edge = img.convert("L").filter(ImageFilter.FIND_EDGES)
            clarity = float(ImageStat.Stat(edge).stddev[0])
            if clarity < 7.0:
                return None
            img.save(dest, "JPEG", quality=quality, optimize=True, progressive=True)
            return {
                "source_width": source_size[0],
                "source_height": source_size[1],
                "saved_width": img.size[0],
                "saved_height": img.size[1],
                "clarity_score": round(clarity, 3),
            }
    except Exception:
        return None


def load_seen(path):
    if not path.exists():
        return set()
    seen = set()
    with path.open("r", encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            key = row.get("openverse_id") or row.get("source_page") or row.get("download_url")
            if key:
                seen.add(key)
    return seen


def next_index(out_dir):
    nums = []
    for path in out_dir.glob("*.jpg"):
        try:
            nums.append(int(path.stem))
        except ValueError:
            pass
    return max(nums, default=0) + 1


def append_row(csv_path, row):
    exists = csv_path.exists()
    with csv_path.open("a", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(row.keys()))
        if not exists:
            writer.writeheader()
        writer.writerow(row)


def scrape_label(root, label, target, max_pages_per_query):
    out_dir = root / label
    out_dir.mkdir(parents=True, exist_ok=True)
    csv_path = out_dir / "openverse_metadata.csv"
    jsonl_path = out_dir / "openverse_metadata.jsonl"
    seen = load_seen(csv_path)
    current = len(list(out_dir.glob("*.jpg")))
    idx = next_index(out_dir)
    queries = WATERFALL_QUERIES if label == "waterfall" else LOCAL_TOURISM_QUERIES
    skipped = {"duplicate": 0, "irrelevant": 0, "noise": 0, "download": 0, "image": 0}

    api_session = requests.Session()
    api_session.headers.update({"User-Agent": USER_AGENT})
    candidates = []
    candidate_keys = set(seen)
    needed = max(target - current, 0)
    max_candidates = max(needed * 4, 1000)
    for query in queries:
        if current >= target or len(candidates) >= max_candidates:
            break
        for item in iter_results(api_session, query, max_pages_per_query):
            if len(candidates) >= max_candidates:
                break
            key = item.get("id") or item.get("foreign_landing_url") or item.get("url")
            if not key or key in candidate_keys:
                skipped["duplicate"] += 1
                continue
            blob = result_blob(item, query)
            if not is_relevant(label, blob):
                skipped["irrelevant"] += 1
                continue
            if looks_noisy(blob):
                skipped["noise"] += 1
                continue
            candidates.append((item, query, key))
            candidate_keys.add(key)

    def worker(item, query, key, file_index):
        local_session = requests.Session()
        local_session.headers.update({"User-Agent": USER_AGENT})
        raw = download(local_session, item.get("url", ""))
        if not raw:
            return "download", None
        dest = out_dir / f"{file_index:04d}.jpg"
        image_meta = save_medium_jpg(raw, dest)
        if not image_meta:
            if dest.exists():
                dest.unlink()
            return "image", None
        row = {
            "filename": dest.name,
            "label": label,
            "openverse_id": item.get("id", ""),
            "title": normalize(item.get("title", ""))[:500],
            "source": item.get("source", ""),
            "creator": normalize(item.get("creator", ""))[:300],
            "source_page": item.get("foreign_landing_url", ""),
            "download_url": item.get("url", ""),
            "license": item.get("license", ""),
            "license_version": item.get("license_version", ""),
            "license_url": item.get("license_url", ""),
            "seed_query": query,
            "source_width": image_meta["source_width"],
            "source_height": image_meta["source_height"],
            "saved_width": image_meta["saved_width"],
            "saved_height": image_meta["saved_height"],
            "clarity_score": image_meta["clarity_score"],
            "raw_sha1": hashlib.sha1(raw).hexdigest(),
        }
        return "ok", (row, key)

    print(f"{label}: {current}/{target} existing; {len(candidates)} vetted candidates queued", flush=True)
    with ThreadPoolExecutor(max_workers=16) as executor:
        futures = []
        file_index = idx
        for item, query, key in candidates:
            if len(futures) >= max_candidates:
                break
            futures.append(executor.submit(worker, item, query, key, file_index))
            file_index += 1

        for future in as_completed(futures):
            status, payload = future.result()
            if current >= target:
                if status == "ok" and payload:
                    row, _ = payload
                    extra_path = out_dir / row["filename"]
                    if extra_path.exists():
                        extra_path.unlink()
                continue
            if status != "ok":
                skipped[status] += 1
                continue
            row, key = payload
            append_row(csv_path, row)
            with jsonl_path.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(row, ensure_ascii=False) + "\n")
            seen.add(key)
            current += 1
            if current % 50 == 0:
                print(f"{label}: {current}/{target} saved; skipped={skipped}", flush=True)

    print(f"{label}: finished {current}/{target}; skipped={skipped}", flush=True)
    return current


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument("--target", type=int, default=1500)
    parser.add_argument("--max-pages-per-query", type=int, default=30)
    parser.add_argument("--labels", nargs="+", default=["waterfall", "localtourism"])
    args = parser.parse_args()

    root = Path(args.root).resolve()
    results = {}
    for label in args.labels:
        results[label] = scrape_label(root, label, args.target, args.max_pages_per_query)
    print(json.dumps(results, indent=2), flush=True)


if __name__ == "__main__":
    main()
