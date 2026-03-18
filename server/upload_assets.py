"""
Uploads team logos and country flags to Supabase Storage.

Usage:
  python upload_assets.py

Expects your assets to be in:
  ../src/assets/TeamLogos/   (any .png/.svg files)
  ../src/assets/Flags/       (any .png/.svg files)
"""

import os
import mimetypes
from pathlib import Path
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

ASSETS = [
    {
        "bucket":    "team-logos",
        "local_dir": Path(__file__).parent.parent / "client"/ "src" / "assets" / "TeamLogos",
    },
    {
        "bucket":    "country-flags",
        "local_dir": Path(__file__).parent.parent / "client" / "src" / "assets" / "flags",
    },
]


def upload_folder(bucket: str, local_dir: Path):
    if not local_dir.exists():
        print(f"  ⚠️  Directory not found: {local_dir}, skipping.")
        return

    files = [f for f in local_dir.iterdir() if f.suffix.lower() in (".png", ".svg", ".jpg", ".jpeg", ".webp")]
    print(f"  Uploading {len(files)} files to '{bucket}'...")

    for f in files:
        mime, _ = mimetypes.guess_type(f.name)
        mime = mime or "application/octet-stream"

        with open(f, "rb") as fh:
            data = fh.read()

        try:
            supabase.storage.from_(bucket).upload(
                path=f.name,
                file=data,
                file_options={"content-type": mime, "upsert": "true"},
            )
            print(f"    ✅ {f.name}")
        except Exception as e:
            print(f"    ❌ {f.name}: {e}")


if __name__ == "__main__":
    for asset in ASSETS:
        print(f"\nBucket: {asset['bucket']}")
        upload_folder(asset["bucket"], asset["local_dir"])

    print("\nDone. Your public URL base is:")
    print(f"  {os.environ['SUPABASE_URL']}/storage/v1/object/public/team-logos/<filename>")
    print(f"  {os.environ['SUPABASE_URL']}/storage/v1/object/public/country-flags/<filename>")