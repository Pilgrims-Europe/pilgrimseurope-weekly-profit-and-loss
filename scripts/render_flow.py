"""Render the data flow diagram from docs/data-flow/flow.yml.

Outputs (do not edit them by hand):
  docs/data-flow/flow.svg    static summary, shown in the README
  docs/data-flow/index.html  interactive diagram, open it from a local clone

Usage:
  python scripts/render_flow.py               render, then mark pending log lines as rendered
  python scripts/render_flow.py --if-pending  render only if docs/data-flow/CHANGELOG.md has pending lines
  python scripts/render_flow.py --check       check flow.yml and the log, write nothing
  python scripts/render_flow.py --preview     render to a temp folder, do not change the repo

Needs PyYAML (pip install pyyaml).
"""

import argparse
import datetime as dt
import html
import json
import os
import re
import sys
import tempfile
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
FLOW_DIR = ROOT / "docs" / "data-flow"
FLOW_FILE = FLOW_DIR / "flow.yml"
LOG_FILE = FLOW_DIR / "CHANGELOG.md"
SVG_FILE = FLOW_DIR / "flow.svg"
HTML_FILE = FLOW_DIR / "index.html"

ID_RE = re.compile(r"^[a-z0-9_]+$")
LOG_ROW_RE = re.compile(r"^\|\s*(\d{4}-\d{2}-\d{2})\s*\|(.*)\|(.*)\|\s*(pending|rendered \d{4}-\d{2}-\d{2})\s*\|\s*$")
STATUSES = {"live", "planned"}

# Stripe colour of each node class (light, dark), from the house style tokens
# (.cortex/skills/pilgrims-reporting/SKILL.md).
STRIPES = {
    "bronze": ("#976611", "#C9973B"),
    "silver": ("#9CA3AF", "#9CA3AF"),
    "gold": ("#FF9D00", "#FF9D00"),
    "other": ("#025895", "#9CC5EA"),
    "manual": ("#E11F20", "#F26B6C"),
    "own": ("#00406E", "#7FB3E0"),
    "consumer": ("#5B6C43", "#A3B88A"),
}
MEDALLIONS = ("bronze", "silver", "gold", "other", "manual")
LEGEND = [("bronze", "Bronze"), ("silver", "Silver"), ("gold", "Gold"), ("other", "Other"),
          ("manual", "Manual"), ("own", "Weekly P&L object"), ("consumer", "Consumer")]


def stripe_css():
    """Stripe CSS for the static SVG: (light rules, dark rules), one .s-<class> rule each."""
    light = " ".join(f".s-{k} {{ fill: {v[0]}; }}" for k, v in STRIPES.items())
    dark = " ".join(f".s-{k} {{ fill: {v[1]}; }}" for k, v in STRIPES.items())
    return light, dark


def stripe_css_html():
    """Stripe and legend CSS for index.html, with light-dark() colours."""
    return "\n  ".join(f"#flow-svg .s-{k} {{ fill: light-dark({v[0]}, {v[1]}); }} "
                       f".legend .s-{k} {{ background: light-dark({v[0]}, {v[1]}); }}" for k, v in STRIPES.items())


# ---------------------------------------------------------------- load and check


def load_flow():
    with FLOW_FILE.open(encoding="utf-8") as f:
        flow = yaml.safe_load(f)
    errors = []
    layers = flow.get("layers") or []
    nodes = flow.get("nodes") or []
    layer_ids = [layer.get("id") for layer in layers]
    if len(set(layer_ids)) != len(layer_ids):
        errors.append("Layer ids are not unique.")
    layer_index = {lid: i for i, lid in enumerate(layer_ids)}
    by_id = {}
    for n in nodes:
        nid = n.get("id", "")
        if not ID_RE.match(nid):
            errors.append(f"Node id '{nid}' must use a-z, 0-9 and _ only.")
        if nid in by_id:
            errors.append(f"Node id '{nid}' is used more than once.")
        by_id[nid] = n
        n.setdefault("status", "live")
        n.setdefault("inputs", [])
        if not n.get("label"):
            errors.append(f"Node '{nid}' has no label.")
        if n.get("layer") not in layer_index:
            errors.append(f"Node '{nid}' has unknown layer '{n.get('layer')}'.")
        if n["status"] not in STATUSES:
            errors.append(f"Node '{nid}' has status '{n['status']}'. Use live or planned.")
        if n.get("layer") == "upstream":
            if n.get("medallion") not in MEDALLIONS:
                errors.append(f"Upstream node '{nid}' needs medallion: {', '.join(MEDALLIONS)}.")
        elif "medallion" in n:
            errors.append(f"Node '{nid}' is not upstream, so it cannot have a medallion.")
        if n.get("sql") and not (ROOT / n["sql"]).exists():
            errors.append(f"Node '{nid}': file '{n['sql']}' does not exist.")
    for n in nodes:
        for i in n["inputs"]:
            if i not in by_id:
                errors.append(f"Node '{n['id']}' reads unknown node '{i}'.")
            elif layer_index.get(by_id[i].get("layer"), 0) > layer_index.get(n.get("layer"), 0):
                errors.append(f"Node '{n['id']}' reads '{i}', which is in a later layer.")
    if not errors:
        errors += find_cycles(nodes, by_id)
    return flow, errors


def find_cycles(nodes, by_id):
    state = {}

    def visit(nid, path):
        if state.get(nid) == "done":
            return []
        if state.get(nid) == "open":
            return [f"Cycle: {' -> '.join(path + [nid])}"]
        state[nid] = "open"
        found = []
        for i in by_id[nid]["inputs"]:
            found += visit(i, path + [nid])
        state[nid] = "done"
        return found

    errors = []
    for n in nodes:
        errors += visit(n["id"], [])
    return errors[:1]


def load_log():
    rows, errors = [], []
    lines = LOG_FILE.read_text(encoding="utf-8").splitlines()
    for no, line in enumerate(lines, 1):
        if not line.startswith("|") or line.startswith("| Date") or line.startswith("| ---"):
            continue
        m = LOG_ROW_RE.match(line)
        if not m:
            errors.append(f"CHANGELOG.md line {no}: use | YYYY-MM-DD | change | ticket or PR | pending |")
            continue
        rows.append({"date": m.group(1), "change": m.group(2).strip(), "ref": m.group(3).strip(), "status": m.group(4)})
    return lines, rows, errors


def mark_rendered(lines, today):
    out = []
    for line in lines:
        if LOG_ROW_RE.match(line):
            line = re.sub(r"\|\s*pending\s*\|\s*$", f"| rendered {today} |", line)
        out.append(line)
    LOG_FILE.write_text("\n".join(out) + "\n", encoding="utf-8", newline="\n")


# ---------------------------------------------------------------- helpers


def esc(text):
    return html.escape(str(text), quote=True)


def inline_code(text):
    """Escape text, then show Markdown `code` spans as <code>."""
    return re.sub(r"`([^`]+)`", r"<code>\1</code>", esc(text))


def text_width(text, size):
    """Rough text width in px. Wide enough for Arial and Segoe UI (the fonts of the static SVG)."""
    em = 0.0
    for ch in text:
        if ch in "il.,:;'|! ":
            em += 0.3
        elif ch in "MW&@%":
            em += 0.86
        elif ch.isupper() or ch == "_":
            em += 0.7
        elif ch.isdigit():
            em += 0.58
        else:
            em += 0.57
    return em * size


def stripe_class(n):
    if n.get("layer") == "upstream":
        return n["medallion"]
    if n.get("layer") == "consumers":
        return "consumer"
    return "own"


def node_sublabel(n, layers_by_id):
    if n["status"] == "planned":
        return "Planned"
    if n.get("layer") == "upstream":
        db = (n.get("object") or "").split(".")[0]
        return f"{n['medallion'].capitalize()} · {db}" if db else n["medallion"].capitalize()
    kind = layers_by_id[n["layer"]].get("kind")
    return kind.capitalize() if kind else layers_by_id[n["layer"]]["label"]


def is_drawn(src, dst):
    return not src.get("hide_edges") and not dst.get("hide_inputs")


# ---------------------------------------------------------------- detailed layout (index.html)

NODE_W, NODE_H = 172, 44
COL_PITCH, ROW_PITCH = 214, 58
PAD_X, PAD_TOP, PAD_BOTTOM = 24, 64, 24


def layout(flow):
    layers, nodes = flow["layers"], flow["nodes"]
    by_id = {n["id"]: n for n in nodes}
    col, start, layer_cols = {}, 0, {}

    for layer in layers:
        members = [n for n in nodes if n["layer"] == layer["id"]]
        if not members:
            continue

        def place(n, members_ids=frozenset(m["id"] for m in members), first=start):
            if n["id"] in col:
                return col[n["id"]]
            same = [place(by_id[i]) + 1 for i in n["inputs"] if i in members_ids]
            col[n["id"]] = max([first] + same)
            return col[n["id"]]

        for n in members:
            place(n)
        end = max(col[n["id"]] for n in members)
        layer_cols[layer["id"]] = (start, end)
        start = end + 1

    columns = {}
    for n in nodes:
        columns.setdefault(col[n["id"]], []).append(n)
    row = {}
    for c in sorted(columns):
        members = columns[c]
        if c > 0:
            def key(item):
                idx, n = item
                ys = [row[i] for i in n["inputs"] if i in row and is_drawn(by_id[i], n)]
                return (sum(ys) / len(ys) if ys else 1e6 + idx, idx)
            members = [n for _, n in sorted(enumerate(members), key=key)]
            columns[c] = members
        for r, n in enumerate(members):
            row[n["id"]] = r

    max_rows = max(len(m) for m in columns.values())
    pos = {}
    for c in sorted(columns):
        members = columns[c]
        centred = (max_rows - len(members)) * ROW_PITCH / 2
        ys = []
        for r, n in enumerate(members):
            # Put each node level with the nodes it reads, and keep one row pitch between nodes.
            src = [pos[i][1] for i in n["inputs"] if i in pos and is_drawn(by_id[i], n)]
            want = sum(src) / len(src) - PAD_TOP if src else centred + r * ROW_PITCH
            ys.append(max(want, ys[-1] + ROW_PITCH) if ys else max(0, want))
        overflow = ys[-1] - (max_rows - 1) * ROW_PITCH
        if overflow > 0:
            ys = [max(y - overflow, r * ROW_PITCH) for r, y in enumerate(ys)]
        for n, y in zip(members, ys):
            pos[n["id"]] = (PAD_X + c * COL_PITCH, PAD_TOP + y)
    width = PAD_X * 2 + (max(columns) + 1) * COL_PITCH - (COL_PITCH - NODE_W)
    height = PAD_TOP + max_rows * ROW_PITCH - (ROW_PITCH - NODE_H) + PAD_BOTTOM
    return pos, layer_cols, width, height


def detail_svg(flow):
    layers, nodes = flow["layers"], flow["nodes"]
    by_id = {n["id"]: n for n in nodes}
    layers_by_id = {layer["id"]: layer for layer in layers}
    pos, layer_cols, width, height = layout(flow)
    out = [f'<svg id="flow-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height:.0f}" '
           f'width="{width}" height="{height:.0f}" role="img" aria-labelledby="flow-svg-title">',
           '<title id="flow-svg-title">Data flow to the Weekly P&amp;L app</title>',
           '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" '
           'orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="arrow-head"/></marker></defs>']

    for layer in layers:
        if layer["id"] not in layer_cols:
            continue
        first, last = layer_cols[layer["id"]]
        x = PAD_X + first * COL_PITCH - 10
        w = (last - first) * COL_PITCH + NODE_W + 20
        out.append(f'<g class="band" data-layer="{esc(layer["id"])}"><rect x="{x}" y="8" width="{w}" '
                   f'height="{height - 16:.0f}" rx="14"/>'
                   f'<text x="{x + 12}" y="30" class="band-title">{esc(layer["label"])}</text>'
                   f'<text x="{x + 12}" y="46" class="band-where">{esc(short_where(layer, w))}</text></g>')

    out.append('<g class="edges">')
    for n in nodes:
        x2, y2 = pos[n["id"]]
        for i in n["inputs"]:
            src = by_id[i]
            if not is_drawn(src, n):
                continue
            x1, y1 = pos[i]
            sx, sy, ex, ey = x1 + NODE_W, y1 + NODE_H / 2, x2 - 2, y2 + NODE_H / 2
            dx = max(30, (ex - sx) / 2)
            dashed = " planned" if "planned" in (src["status"], n["status"]) else ""
            out.append(f'<path class="edge{dashed}" data-from="{esc(i)}" data-to="{esc(n["id"])}" '
                       f'd="M{sx:.0f},{sy:.0f} C{sx + dx:.0f},{sy:.0f} {ex - dx:.0f},{ey:.0f} {ex:.0f},{ey:.0f}" '
                       f'marker-end="url(#arrow)"/>')
    out.append("</g>")

    out.append('<g class="nodes">')
    for n in nodes:
        x, y = pos[n["id"]]
        label = n["label"]
        size = min(12.0, (NODE_W - 24) / max(1.0, text_width(label, 1)))
        planned = " planned" if n["status"] == "planned" else ""
        out.append(f'<g class="node{planned}" data-id="{esc(n["id"])}" tabindex="0" role="button" '
                   f'aria-label="{esc(label)}" transform="translate({x},{y:.0f})">'
                   f'<rect class="box" width="{NODE_W}" height="{NODE_H}" rx="9"/>'
                   f'<rect class="stripe s-{stripe_class(n)}" width="6" height="{NODE_H}" rx="3"/>'
                   f'<text x="15" y="19" class="label" style="font-size:{size:.1f}px">{esc(label)}</text>'
                   f'<text x="15" y="34" class="sub">{esc(node_sublabel(n, layers_by_id))}</text></g>')
    out.append("</g></svg>")
    return "\n".join(out)


def short_where(layer, width):
    where = layer.get("where", "")
    limit = int((width - 24) / 6.2)
    return where if len(where) <= limit else where[: limit - 1] + "…"


# ---------------------------------------------------------------- summary SVG (README)

SUM_W = 880
SUM_PAD = 24
CHIP_H, CHIP_GAP, CHIP_FONT = 26, 8, 12


def summary_svg(flow, today):
    layers, nodes = flow["layers"], flow["nodes"]
    parts, y = [], 0

    def chip(x, y, n):
        w = text_width(n["label"], CHIP_FONT) + 26
        planned = " planned" if n["status"] == "planned" else ""
        return w, (f'<g class="chip{planned}"><rect x="{x:.0f}" y="{y:.0f}" width="{w:.0f}" height="{CHIP_H}" rx="13"/>'
                   f'<rect x="{x + 6:.0f}" y="{y + 7:.0f}" width="5" height="{CHIP_H - 14}" rx="2.5" class="s-{stripe_class(n)}"/>'
                   f'<text x="{x + 17:.0f}" y="{y + 17.5:.0f}" class="t">{esc(n["label"])}</text></g>')

    # Header band, as the house style hero.
    parts.append(f'<rect x="0" y="0" width="{SUM_W}" height="64" fill="#1A2B37"/>'
                 f'<rect x="0" y="64" width="{SUM_W}" height="4" fill="#E11F20"/>'
                 f'<text x="{SUM_PAD}" y="26" class="eyebrow">WEEKLY P&amp;L · DATA FLOW</text>'
                 f'<text x="{SUM_PAD}" y="50" class="title">How data flows to the Weekly P&amp;L app</text>')
    y = 84

    # Legend.
    lx = SUM_PAD
    for cls, name in LEGEND:
        parts.append(f'<rect x="{lx:.0f}" y="{y}" width="5" height="12" rx="2.5" class="s-{cls}"/>'
                     f'<text x="{lx + 10:.0f}" y="{y + 10.5}" class="m small">{esc(name)}</text>')
        lx += 10 + text_width(name, 11) + 16
    parts.append(f'<rect x="{lx:.0f}" y="{y}" width="22" height="12" rx="6" class="legend-planned"/>'
                 f'<text x="{lx + 28:.0f}" y="{y + 10.5}" class="m small">Planned</text>')
    y += 28

    shown = [layer for layer in layers if any(n["layer"] == layer["id"] for n in nodes)]
    for li, layer in enumerate(shown):
        members = [n for n in nodes if n["layer"] == layer["id"]]
        band_top = y
        inner_x, inner_w = SUM_PAD + 14, SUM_W - 2 * SUM_PAD - 28
        cy = band_top + 50
        cx = inner_x
        chips = []
        for n in members:
            w = text_width(n["label"], CHIP_FONT) + 26
            if cx + w > inner_x + inner_w and cx > inner_x:
                cx, cy = inner_x, cy + CHIP_H + CHIP_GAP
            w, svg = chip(cx, cy, n)
            chips.append(svg)
            cx += w + CHIP_GAP
        band_h = cy + CHIP_H + 14 - band_top
        parts.append(f'<rect x="{SUM_PAD}" y="{band_top}" width="{SUM_W - 2 * SUM_PAD}" height="{band_h}" rx="14" class="band"/>'
                     f'<text x="{inner_x}" y="{band_top + 24}" class="h">{esc(layer["label"])}</text>'
                     f'<text x="{inner_x}" y="{band_top + 40}" class="m small">{esc(layer.get("where", ""))}</text>')
        parts += chips
        y = band_top + band_h
        if li < len(shown) - 1:
            mid = SUM_W / 2
            parts.append(f'<path d="M{mid},{y + 4} L{mid},{y + 22}" class="arrow"/>'
                         f'<path d="M{mid - 6},{y + 16} L{mid},{y + 23} L{mid + 6},{y + 16}" class="arrow"/>')
            y += 28

    y += 22
    parts.append(f'<text x="{SUM_PAD}" y="{y}" class="m small">Rendered {today} from docs/data-flow/flow.yml. '
                 f'For details, open docs/data-flow/index.html. Dashed = planned.</text>')
    height = y + 18

    light_stripes, dark_stripes = stripe_css()
    style = """
  """ + light_stripes + """
  .bg { fill: #FFFFFF; } .t { fill: #374151; font-size: 12px; } .m { fill: #6B7280; } .small { font-size: 11px; }
  .h { fill: #00406E; font-family: 'Fjalla One', 'Arial Narrow', 'Segoe UI', sans-serif; font-size: 16px; }
  .eyebrow { fill: #FF9D00; font-family: 'Fjalla One', 'Arial Narrow', 'Segoe UI', sans-serif; font-size: 12px; letter-spacing: .08em; }
  .title { fill: #FFFFFF; font-family: moret, Georgia, 'Times New Roman', serif; font-size: 22px; }
  .band { fill: #F9FAFB; stroke: #E5E7EB; }
  .chip rect:first-child { fill: #FFFFFF; stroke: #D1D5DB; }
  .chip.planned rect:first-child, .legend-planned { fill: none; stroke: #6B7280; stroke-dasharray: 4 3; }
  .chip.planned text { fill: #6B7280; font-style: italic; }
  .arrow { stroke: #00406E; stroke-width: 2; fill: none; }
  @media (prefers-color-scheme: dark) {
    .bg { fill: #111827; } .t { fill: #E5E7EB; } .m { fill: #9CA3AF; } .h { fill: #7FB3E0; }
    .band { fill: #1F2937; stroke: #374151; } .chip rect:first-child { fill: #111827; stroke: #4B5563; }
    .chip.planned rect:first-child, .legend-planned { fill: none; stroke: #9CA3AF; } .chip.planned text { fill: #9CA3AF; }
    .arrow { stroke: #7FB3E0; }
    """ + dark_stripes + """
  }"""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SUM_W} {height:.0f}" width="{SUM_W}" height="{height:.0f}" '
            f'role="img" aria-label="Data flow to the Weekly P&amp;L app" font-family="\'Segoe UI\', Arial, Helvetica, sans-serif">\n'
            f'<!-- Generated by scripts/render_flow.py from docs/data-flow/flow.yml. Do not edit by hand. -->\n'
            f'<style>{style}\n</style>\n<rect class="bg" x="0" y="0" width="{SUM_W}" height="{height:.0f}"/>\n'
            + "\n".join(parts) + "\n</svg>\n")


# ---------------------------------------------------------------- interactive HTML

def page_data(flow):
    nodes = flow["nodes"]
    layers_by_id = {layer["id"]: layer for layer in flow["layers"]}
    outputs = {n["id"]: [] for n in nodes}
    for n in nodes:
        for i in n["inputs"]:
            outputs[i].append(n["id"])
    repo = flow.get("repo_url", "").rstrip("/")
    return {
        "nodes": [{
            "id": n["id"], "label": n["label"], "layer": layers_by_id[n["layer"]]["label"],
            "where": layers_by_id[n["layer"]].get("where", ""), "medallion": n.get("medallion", ""),
            "status": n["status"], "object": " ".join(str(n.get("object", "")).split()),
            "description": n.get("description", ""), "sql": n.get("sql", ""),
            "sqlUrl": f"{repo}/blob/main/{n['sql']}" if repo and n.get("sql") else "",
            "inputs": n["inputs"], "outputs": outputs[n["id"]],
        } for n in nodes],
    }


def render_html(flow, log_rows, today):
    nodes = flow["nodes"]
    upstream_live = sum(1 for n in nodes if n["layer"] == "upstream" and n["status"] == "live")
    own = sum(1 for n in nodes if n["layer"] not in ("upstream", "consumers"))
    consumers_live = sum(1 for n in nodes if n["layer"] == "consumers" and n["status"] == "live")
    planned = sum(1 for n in nodes if n["status"] == "planned")
    data_json = json.dumps(page_data(flow), ensure_ascii=False).replace("</", "<\\/")
    metadata = json.dumps({
        "generated": today,
        "intent": "Interactive data flow diagram for the Weekly P&L app, rendered from docs/data-flow/flow.yml.",
        "dataSources": [{"type": "file", "path": "docs/data-flow/flow.yml"},
                        {"type": "file", "path": "docs/data-flow/CHANGELOG.md"}],
        "sections": [
            {"id": "diagram", "title": "Diagram", "dataSources": [{"type": "file", "path": "docs/data-flow/flow.yml"}],
             "producerNotes": "Generated by scripts/render_flow.py. Change flow.yml, then run the script."},
            {"id": "details", "title": "Details", "dataSources": [{"type": "file", "path": "docs/data-flow/flow.yml"}],
             "producerNotes": "Filled in the browser from the embedded flow-data block."},
            {"id": "changes", "title": "Changes", "dataSources": [{"type": "file", "path": "docs/data-flow/CHANGELOG.md"}],
             "producerNotes": "Rows of the change log table."},
        ],
    }, indent=2).replace("</", "<\\/")
    log_html = "\n".join(
        f'<tr><td>{esc(r["date"])}</td><td>{inline_code(r["change"])}</td><td>{inline_code(r["ref"])}</td>'
        f'<td><span class="badge{" warn" if r["status"] == "pending" else " good"}">{esc(r["status"])}</span></td></tr>'
        for r in reversed(log_rows))
    legend_html = "\n      ".join(f'<li><i class="s-{k}"></i>{esc(name)}</li>' for k, name in LEGEND)
    page = HTML_TEMPLATE
    for key, value in {
        "{{STRIPES}}": stripe_css_html(), "{{LEGEND}}": legend_html,
        "{{METADATA}}": metadata, "{{TODAY}}": today, "{{SVG}}": detail_svg(flow), "{{DATA}}": data_json,
        "{{LOG_ROWS}}": log_html, "{{K_UPSTREAM}}": str(upstream_live), "{{K_OWN}}": str(own),
        "{{K_CONSUMERS}}": str(consumers_live), "{{K_PLANNED}}": str(planned),
    }.items():
        page = page.replace(key, value)
    return page


HTML_TEMPLATE = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="snowflake-source" content="cortex-agent-authored" />
<title>Weekly P&amp;L data flow</title>
<!-- Generated by scripts/render_flow.py from docs/data-flow/flow.yml. Do not edit by hand. -->
<script type="application/json" id="snowflake-report-metadata">
{{METADATA}}
</script>
<style>
  :root {
    color-scheme: light dark;
    --brand: light-dark(#00406E, #7FB3E0);
    --brand-navy: #1A2B37;
    --red: #E11F20;
    --red-dark: #CB1011;
    --yellow: #FF9D00;
    --green: light-dark(#5B6C43, #A3B88A);
    --text: light-dark(#374151, #E5E7EB);
    --muted: light-dark(#6B7280, #9CA3AF);
    --line: light-dark(#E5E7EB, #374151);
    --page: light-dark(#F9FAFB, #111827);
    --card: light-dark(#FFFFFF, #1F2937);
    --field: light-dark(#FFFFFF, #111827);
    --tint-brand: light-dark(#EEF4FA, #16324A);
    --tint-yellow: light-dark(#FFF7E6, #3A2A0A);
    --tint-green: light-dark(#EFF3EA, #1F2A16);
    --head: 'Fjalla One', 'Arial Narrow', 'Segoe UI', sans-serif;
    --body: Montserrat, 'Segoe UI', -apple-system, system-ui, sans-serif;
    --serif: moret, Georgia, 'Times New Roman', serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--page); color: var(--text); font-family: var(--body); font-size: 15px; line-height: 1.6; }
  a { color: var(--brand); }
  .hero { background: var(--brand-navy); color: #fff; border-bottom: 6px solid var(--red); }
  .wrap { max-width: 880px; width: 100%; margin: 0 auto; padding: clamp(16px, 4vw, 32px); }
  .wide { max-width: 1400px; width: 100%; margin: 0 auto; padding: 0 clamp(16px, 4vw, 32px); }
  .eyebrow { font-family: var(--head); letter-spacing: .08em; text-transform: uppercase; color: var(--yellow); font-size: 14px; margin: 0 0 6px; }
  h1 { font-family: var(--serif); font-weight: 400; font-size: clamp(28px, 5vw, 42px); line-height: 1.15; margin: 0 0 14px; }
  .lede { margin: 0 0 16px; color: #E5E7EB; max-width: 65ch; }
  .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px 24px; margin: 0; font-size: 14px; }
  .meta dt { font-family: var(--head); text-transform: uppercase; letter-spacing: .06em; color: #9CC5EA; font-size: 12px; }
  .meta dd { margin: 0; }
  h2 { font-family: var(--head); font-weight: 400; color: var(--brand); font-size: 26px; line-height: 1.2; margin: 40px 0 12px; }
  h3 { font-family: var(--head); font-weight: 400; color: var(--brand); font-size: 20px; line-height: 1.3; margin: 0 0 8px; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 1.25rem; padding: clamp(16px, 3vw, 24px); margin: 0 0 18px; }
  .card.accent { border-left: 6px solid var(--brand); }
  .card > :last-child { margin-bottom: 0; }
  .kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 14px; margin: 0 0 18px; }
  .kpi { background: var(--card); border: 1px solid var(--line); border-top: 4px solid var(--brand); border-radius: 1.25rem; padding: 16px 18px; }
  .kpi .label { font-family: var(--head); text-transform: uppercase; letter-spacing: .06em; font-size: 12px; color: var(--muted); }
  .kpi .value { font-family: var(--head); font-size: 30px; line-height: 1.2; color: var(--brand); font-variant-numeric: tabular-nums; }
  .badge { display: inline-block; font-family: var(--head); letter-spacing: .04em; font-size: 12px; padding: 2px 10px; border-radius: 9999px; background: var(--tint-brand); color: var(--brand); }
  .badge.good { background: var(--tint-green); color: var(--green); }
  .badge.warn { background: var(--tint-yellow); color: light-dark(#976611, #FFC966); }
  .table-wrap { overflow-x: auto; margin: 12px 0; border: 1px solid var(--line); border-radius: .5rem; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th, td { padding: 7px 10px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
  th { background: var(--brand); color: #fff; font-family: var(--head); font-weight: 400; letter-spacing: .03em; }
  .btn { font-family: var(--head); letter-spacing: .05em; text-transform: uppercase; font-size: 13px; border: 2px solid var(--brand); background: transparent; color: var(--brand); border-radius: 9999px; padding: 6px 16px; cursor: pointer; }
  .btn:hover, .btn[aria-pressed="true"] { background: var(--brand); color: #fff; }
  .btn:focus-visible, input:focus-visible { outline: 3px solid var(--yellow); outline-offset: 2px; }
  .tools { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin: 0 0 12px; }
  .tools input { font: inherit; font-size: 14px; padding: 6px 12px; border: 1px solid var(--line); border-radius: .5rem; background: var(--field); color: var(--text); min-width: min(260px, 100%); }
  .legend { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 13px; color: var(--muted); margin: 8px 0 0; padding: 0; list-style: none; }
  .legend i { display: inline-block; width: 6px; height: 13px; border-radius: 3px; margin-right: 6px; vertical-align: -2px; }
  .legend i.dash { width: 22px; border: 1.5px dashed var(--muted); background: none; }
  .diagram { overflow: auto; border: 1px solid var(--line); border-radius: 1.25rem; background: var(--card); max-height: 78vh; }
  .diagram.fit svg { width: 100%; height: auto; }
  #flow-svg { display: block; font-family: var(--body); }
  #flow-svg .band rect { fill: light-dark(#F3F6F9, #172231); stroke: var(--line); }
  #flow-svg .band-title { fill: var(--brand); font-family: var(--head); font-size: 15px; }
  #flow-svg .band-where { fill: var(--muted); font-size: 10.5px; }
  #flow-svg .edge { fill: none; stroke: light-dark(#9CA3AF, #6B7280); stroke-width: 1.3; transition: opacity .15s; }
  #flow-svg .edge.planned { stroke-dasharray: 5 4; }
  #flow-svg .arrow-head { fill: light-dark(#9CA3AF, #6B7280); }
  #flow-svg .node { cursor: pointer; transition: opacity .15s; }
  #flow-svg .node .box { fill: var(--card); stroke: light-dark(#D1D5DB, #4B5563); stroke-width: 1.2; }
  #flow-svg .node.planned .box { stroke-dasharray: 5 4; fill: none; }
  #flow-svg .node .label { fill: var(--text); font-weight: 600; }
  #flow-svg .node .sub { fill: var(--muted); font-size: 10.5px; }
  #flow-svg .node:hover .box, #flow-svg .node:focus .box { stroke: var(--brand); stroke-width: 2; }
  #flow-svg .node:focus { outline: none; }
  #flow-svg.focus .node:not(.on) { opacity: .22; }
  #flow-svg.focus .edge:not(.on) { opacity: .07; }
  #flow-svg .edge.on { stroke: var(--brand); stroke-width: 2.2; }
  #flow-svg .node.sel .box { stroke: var(--red); stroke-width: 2.5; }
  #flow-svg .node.match .box { stroke: var(--yellow); stroke-width: 2.5; }
  .details dl { display: grid; grid-template-columns: minmax(110px, 160px) 1fr; gap: 6px 16px; margin: 0; font-size: 14px; }
  .details dt { font-family: var(--head); color: var(--muted); text-transform: uppercase; letter-spacing: .05em; font-size: 12px; padding-top: 2px; }
  .details dd { margin: 0; overflow-wrap: anywhere; }
  .details code { font-size: 12.5px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chips button { font: inherit; font-size: 13px; border: 1px solid var(--line); background: var(--tint-brand); color: var(--brand); border-radius: 9999px; padding: 1px 10px; cursor: pointer; }
  .chips button:hover { border-color: var(--brand); }
  .muted { color: var(--muted); }
  footer.src { color: var(--muted); font-size: 12px; margin-top: 32px; }
  {{STRIPES}}
  @media (max-width: 560px) { .details dl { grid-template-columns: 1fr; } }
</style>
</head>
<body>

<header class="hero">
  <div class="wrap">
    <p class="eyebrow">Weekly P&amp;L · Data flow</p>
    <h1>How data flows to the Weekly P&amp;L app</h1>
    <p class="lede">This page shows each source, each Snowflake object and each consumer of the Weekly P&amp;L app. Select an object to see what it reads and what reads it.</p>
    <dl class="meta">
      <div><dt>Rendered</dt><dd>{{TODAY}}</dd></div>
      <div><dt>Source</dt><dd>docs/data-flow/flow.yml</dd></div>
      <div><dt>Change log</dt><dd>docs/data-flow/CHANGELOG.md</dd></div>
    </dl>
  </div>
</header>

<main>
  <div class="wrap">
    <div class="kpi-row">
      <div class="kpi"><div class="label">Upstream sources</div><div class="value">{{K_UPSTREAM}}</div></div>
      <div class="kpi"><div class="label">Weekly P&amp;L objects</div><div class="value">{{K_OWN}}</div></div>
      <div class="kpi"><div class="label">Live consumers</div><div class="value">{{K_CONSUMERS}}</div></div>
      <div class="kpi"><div class="label">Planned</div><div class="value">{{K_PLANNED}}</div></div>
    </div>
    <h2 id="diagram">Diagram</h2>
    <div class="tools">
      <input type="search" id="find" placeholder="Find an object, for example KILL" aria-label="Find an object" />
      <button type="button" class="btn" id="fit" aria-pressed="false">Fit to width</button>
      <button type="button" class="btn" id="clear">Clear</button>
    </div>
    <ul class="legend">
      {{LEGEND}}
      <li><i class="dash"></i>Planned</li>
    </ul>
    <p class="muted" style="font-size:13px">Almost all objects read WPL_SITE and WPL_WEEK. The diagram does not draw these edges. The details list them.</p>
  </div>
  <div class="wide">
    <div class="diagram" id="diagram-box">
{{SVG}}
    </div>
  </div>
  <div class="wrap">
    <h2 id="details">Details</h2>
    <div class="card accent details" id="details-card" aria-live="polite">
      <p class="muted">Select an object in the diagram.</p>
    </div>

    <h2 id="changes">Changes</h2>
    <div class="card">
      <p>Each change to the flow of data is logged. The diagram is rendered once a day when the log has pending changes.</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Change</th><th>Ticket or PR</th><th>Status</th></tr></thead>
          <tbody>
{{LOG_ROWS}}
          </tbody>
        </table>
      </div>
    </div>
    <footer class="src">Pilgrim's Europe · Weekly P&amp;L · Generated {{TODAY}} by scripts/render_flow.py</footer>
  </div>
</main>

<script type="application/json" id="flow-data">{{DATA}}</script>
<script>
(function () {
  var data = JSON.parse(document.getElementById('flow-data').textContent);
  var byId = {};
  data.nodes.forEach(function (n) { byId[n.id] = n; });
  var svg = document.getElementById('flow-svg');
  var nodeEls = svg.querySelectorAll('.node');
  var edgeEls = svg.querySelectorAll('.edge');
  var card = document.getElementById('details-card');
  var selected = null;

  function reach(id, key) {
    var seen = {}, stack = [id];
    while (stack.length) {
      (byId[stack.pop()][key] || []).forEach(function (x) { if (!seen[x]) { seen[x] = true; stack.push(x); } });
    }
    return seen;
  }

  function highlight(id) {
    if (!id) {
      svg.classList.remove('focus');
      nodeEls.forEach(function (el) { el.classList.remove('on'); });
      edgeEls.forEach(function (el) { el.classList.remove('on'); });
      return;
    }
    var up = reach(id, 'inputs'), down = reach(id, 'outputs');
    up[id] = true;
    var downSelf = Object.assign({}, down); downSelf[id] = true;
    svg.classList.add('focus');
    nodeEls.forEach(function (el) { el.classList.toggle('on', !!(up[el.dataset.id] || down[el.dataset.id])); });
    edgeEls.forEach(function (el) {
      var a = el.dataset.from, b = el.dataset.to;
      el.classList.toggle('on', !!((up[a] && up[b]) || (downSelf[a] && downSelf[b])));
    });
  }

  function el(tag, text, cls) {
    var e = document.createElement(tag);
    if (text) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }

  function chips(ids) {
    var wrap = el('div', '', 'chips');
    if (!ids.length) { wrap.appendChild(el('span', 'None', 'muted')); return wrap; }
    ids.forEach(function (id) {
      var b = el('button', byId[id].label);
      b.type = 'button';
      b.addEventListener('click', function () { select(id, true); });
      wrap.appendChild(b);
    });
    return wrap;
  }

  function showDetails(n) {
    card.textContent = '';
    if (!n) { card.appendChild(el('p', 'Select an object in the diagram.', 'muted')); return; }
    card.appendChild(el('h3', n.label));
    if (n.description) card.appendChild(el('p', n.description));
    var dl = el('dl');
    function row(label, value) { dl.appendChild(el('dt', label)); var dd = el('dd'); dd.appendChild(value); dl.appendChild(dd); }
    row('Layer', document.createTextNode(n.layer + (n.where ? ' (' + n.where + ')' : '')));
    if (n.medallion) row('Medallion', document.createTextNode(n.medallion));
    row('Status', el('span', n.status, 'badge' + (n.status === 'planned' ? ' warn' : ' good')));
    if (n.object) row('Object', el('code', n.object));
    if (n.sql) {
      var a = el('a', n.sql);
      a.href = n.sqlUrl;
      a.rel = 'noopener';
      row('File', a);
    }
    row('Reads', chips(n.inputs));
    row('Read by', chips(n.outputs));
    card.appendChild(dl);
  }

  function select(id, scroll) {
    selected = id;
    nodeEls.forEach(function (e) { e.classList.toggle('sel', e.dataset.id === id); });
    highlight(id);
    showDetails(id ? byId[id] : null);
    if (id && scroll) {
      var target = svg.querySelector('.node[data-id="' + id + '"]');
      if (target && target.scrollIntoView) target.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
  }

  nodeEls.forEach(function (e) {
    e.addEventListener('mouseenter', function () { if (!selected) highlight(e.dataset.id); });
    e.addEventListener('mouseleave', function () { if (!selected) highlight(null); });
    e.addEventListener('click', function (ev) { ev.stopPropagation(); select(e.dataset.id === selected ? null : e.dataset.id); });
    e.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); select(e.dataset.id); }
    });
  });
  svg.addEventListener('click', function () { select(null); });

  var find = document.getElementById('find');
  find.addEventListener('input', function () {
    var q = find.value.trim().toLowerCase();
    nodeEls.forEach(function (e) {
      var n = byId[e.dataset.id];
      e.classList.toggle('match', !!q && (n.label + ' ' + n.object).toLowerCase().indexOf(q) !== -1);
    });
  });
  find.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter') return;
    var first = svg.querySelector('.node.match');
    if (first) select(first.dataset.id, true);
  });

  var fit = document.getElementById('fit');
  fit.addEventListener('click', function () {
    var on = document.getElementById('diagram-box').classList.toggle('fit');
    fit.setAttribute('aria-pressed', String(on));
  });
  document.getElementById('clear').addEventListener('click', function () {
    find.value = '';
    nodeEls.forEach(function (e) { e.classList.remove('match'); });
    select(null);
  });
})();
</script>
</body>
</html>
"""


# ---------------------------------------------------------------- main


def write_output(name, value):
    path = os.environ.get("GITHUB_OUTPUT")
    if path:
        with open(path, "a", encoding="utf-8") as f:
            f.write(f"{name}={value}\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", help="check flow.yml and the log, write nothing")
    parser.add_argument("--if-pending", action="store_true", help="render only if the log has pending lines")
    parser.add_argument("--preview", action="store_true", help="render to a temp folder, do not change the repo")
    args = parser.parse_args()

    flow, errors = load_flow()
    log_lines, log_rows, log_errors = load_log()
    errors += log_errors
    if errors:
        for e in errors:
            print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
    pending = [r for r in log_rows if r["status"] == "pending"]
    if args.check:
        print(f"OK: {len(flow['nodes'])} nodes, {len(log_rows)} log lines, {len(pending)} pending.")
        return
    if args.if_pending and not pending:
        print("No pending changes. Nothing to render.")
        write_output("changed", "false")
        return

    today = dt.datetime.now(dt.UTC).date().isoformat()
    if args.preview:
        out = Path(tempfile.gettempdir()) / "data-flow-preview"
        out.mkdir(exist_ok=True)
        (out / SVG_FILE.name).write_text(summary_svg(flow, today), encoding="utf-8", newline="\n")
        (out / HTML_FILE.name).write_text(render_html(flow, log_rows, today), encoding="utf-8", newline="\n")
        print(f"Preview: {out / HTML_FILE.name} and {out / SVG_FILE.name}")
        return
    for r in pending:
        r["status"] = f"rendered {today}"
    SVG_FILE.write_text(summary_svg(flow, today), encoding="utf-8", newline="\n")
    HTML_FILE.write_text(render_html(flow, log_rows, today), encoding="utf-8", newline="\n")
    mark_rendered(log_lines, today)
    print(f"Rendered {SVG_FILE.relative_to(ROOT)} and {HTML_FILE.relative_to(ROOT)} ({len(pending)} pending changes).")
    write_output("changed", "true")


if __name__ == "__main__":
    main()
