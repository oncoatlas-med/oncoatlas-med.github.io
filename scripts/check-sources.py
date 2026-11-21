"""Print a CSV inventory of public URLs and their retrieval results."""
import concurrent.futures
import csv
import html
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
FILES = ("app.js", "cards.json", "regimens.json", "index.html", "learning-library.html", "learning.html")
URL = re.compile(r'https?://[^"\x27\s<)>]+')
TITLE = re.compile(r'<title[^>]*>(.*?)</title>', re.IGNORECASE | re.DOTALL)
FIELDS = ("url", "http_status", "final_url", "title", "content_type", "error")


def fetch(url):
    result = subprocess.run(
        ["curl", "--location", "--silent", "--show-error", "--proto", "=https",
         "--max-time", "25", "--max-redirs", "10",
         "--write-out", "\n%{http_code}\t%{url_effective}\t%{content_type}", url],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
    )
    body, _, metadata = result.stdout.decode("utf-8", errors="replace").rpartition("\n")
    status, final_url, content_type = metadata.split("\t", 2)
    match = TITLE.search(body) if content_type.startswith("text/html") else None
    title = html.unescape(" ".join(match[1].split())) if match else ""
    return url, status, final_url, title, content_type, result.stderr.decode().strip()


def main():
    urls = sorted({html.unescape(url) for name in FILES
                   for url in URL.findall((ROOT / name).read_text(encoding="utf-8"))})
    writer = csv.writer(sys.stdout, lineterminator="\n")
    writer.writerow(FIELDS)
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        for row in pool.map(fetch, urls):
            writer.writerow(row)
            sys.stdout.flush()


if __name__ == "__main__":
    main()
