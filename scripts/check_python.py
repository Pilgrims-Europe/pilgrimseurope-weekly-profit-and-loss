"""Check Python syntax in .py files and in code cells of .ipynb notebooks.

Usage:
    python scripts/check_python.py <file> ...

Exit 1 if any file has a syntax error. Uses only the standard library.
"""

import ast
import json
import sys
from pathlib import Path


def check_source(source: str, label: str) -> list[str]:
    try:
        ast.parse(source)
    except SyntaxError as e:
        return [f"{label}: line {e.lineno}: {e.msg}"]
    return []


def notebook_cells(path: Path):
    nb = json.loads(path.read_text(encoding="utf-8"))
    for i, cell in enumerate(nb.get("cells", [])):
        if cell.get("cell_type") != "code":
            continue
        src = cell.get("source", "")
        src = "".join(src) if isinstance(src, list) else src
        lines = ["" if ln.lstrip().startswith(("%", "!")) else ln for ln in src.splitlines()]
        yield i, "\n".join(lines)


def main(files: list[str]) -> int:
    if not files:
        print(__doc__)
        return 2
    errors: list[str] = []
    for name in files:
        path = Path(name)
        if path.suffix == ".py":
            errors += check_source(path.read_text(encoding="utf-8"), name)
        elif path.suffix == ".ipynb":
            for i, src in notebook_cells(path):
                errors += check_source(src, f"{name} cell {i}")
    for e in errors:
        print(e)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
