import sys
import zipfile

from config import RAW_DIR, ROOT

ARCHIVE_DIR = ROOT / "data" / "source_archives"
SOURCE_DIR = RAW_DIR / "source"


def unpack():
    archives = sorted(ARCHIVE_DIR.glob("*.zip"))
    if not archives:
        sys.exit(f"No .zip files found in {ARCHIVE_DIR}. See data/source_archives/README.md.")
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    for archive in archives:
        with zipfile.ZipFile(archive) as z:
            z.extractall(SOURCE_DIR)
            print(f"Unpacked {archive.name}: {', '.join(z.namelist())}")
    print(f"Source files are in {SOURCE_DIR}")


if __name__ == "__main__":
    unpack()
