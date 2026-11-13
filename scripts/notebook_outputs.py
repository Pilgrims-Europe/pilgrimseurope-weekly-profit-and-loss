"""Check or clear outputs in Jupyter notebooks.

Usage:
    python scripts/notebook_outputs.py check <file.ipynb> ...   exit 1 if any notebook has outputs
    python scripts/notebook_outputs.py clear <file.ipynb> ...   remove outputs in place
"""

import json
import sys
from pathlib import Path


def has_outputs(nb: dict) -> bool:
    return any(
        c.get("cell_type") == "code" and (c.get("outputs") or c.get("execution_count"))
        for c in nb.get("cells", [])
    )


def clear(nb: dict) -> None:
    for c in nb.get("cells", []):
        if c.get("cell_type") == "code":
            c["outputs"] = []
            c["execution_count"] = None


def main(argv: list[str]) -> int:
    if len(argv) < 3 or argv[1] not in ("check", "clear"):
        print(__doc__)
        return 2
    mode, failed = argv[1], False
    for name in argv[2:]:
        path = Path(name)
        nb = json.loads(path.read_text(encoding="utf-8"))
        if mode == "check" and has_outputs(nb):
            print(
                f'Outputs found in {name}. Run: python scripts/notebook_outputs.py clear "{name}"'
            )
            failed = True
        elif mode == "clear":
            clear(nb)
            path.write_text(json.dumps(nb, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
            print(f"Cleared outputs in {name}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
