"""Sube los rasters de Valencia al dataset de HuggingFace.

Uso:
    HF_TOKEN=hf_xxx python upload_to_hf.py
"""
import os
import sys
from pathlib import Path
from huggingface_hub import HfApi

TOKEN = os.environ.get("HF_TOKEN", "")
if not TOKEN:
    print("ERROR: define la variable de entorno HF_TOKEN con tu token de HuggingFace")
    sys.exit(1)

USERNAME = "alumnoal"
REPO_ID = f"{USERNAME}/valencia-sombra-data"
DATA_ROOT = Path(__file__).parent / "data"

FILES = [
    (DATA_ROOT / "raw" / "mds" / "MDS_Valencia_2m.tif",          "MDS_Valencia_2m.tif"),
    (DATA_ROOT / "raw" / "mdt" / "MDT_Valencia_2m.tif",          "MDT_Valencia_2m.tif"),
    (DATA_ROOT / "processed" / "osm_walk_graph_25830.pkl",        "osm_walk_graph_25830.pkl"),
    (DATA_ROOT / "processed" / "osm_walk_graph.graphml",          "osm_walk_graph.graphml"),
]

api = HfApi(token=TOKEN)

print(f"Creando/verificando repo: {REPO_ID}")
api.create_repo(repo_id=REPO_ID, repo_type="dataset", exist_ok=True, private=False)
print("Repo listo.")

for local_path, repo_filename in FILES:
    if not local_path.exists():
        print(f"\n[SKIP] {repo_filename} no encontrado localmente, omitiendo")
        continue
    size_mb = local_path.stat().st_size / 1e6
    print(f"\nSubiendo {repo_filename} ({size_mb:.0f} MB)...")
    api.upload_file(
        path_or_fileobj=str(local_path),
        path_in_repo=repo_filename,
        repo_id=REPO_ID,
        repo_type="dataset",
    )
    print(f"  OK: {repo_filename}")

print("\n=== UPLOAD COMPLETO ===")
print(f"URL base: https://huggingface.co/datasets/{REPO_ID}/resolve/main")
