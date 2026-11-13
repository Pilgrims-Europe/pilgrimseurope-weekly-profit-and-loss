"""Pilgrim's Europe theme for Streamlit apps.

Colours and fonts follow pilgrimseurope.com. See .cortex/skills/pilgrims-reporting/SKILL.md.

Usage:
    import streamlit as st
    from pe_theme import apply_theme, hero, kpi_row, callout, PE_COLOURS

    st.set_page_config(page_title="Weekly P&L", layout="wide")
    apply_theme()
    hero("Weekly P&L", "Estimated result for each site.", eyebrow="Finance", meta={"Week": "2026-W46"})
    kpi_row([("Kill", "2,160,000", "+1.2%"), ("Margin", "£1.4m", "-0.3%")])
"""

from html import escape

import streamlit as st

BRAND = "#00406E"
BRAND_LIGHT = "#025895"
BRAND_NAVY = "#1A2B37"
RED = "#E11F20"
RED_DARK = "#CB1011"
YELLOW = "#FF9D00"
GREEN = "#5B6C43"
TEXT = "#374151"
MUTED = "#6B7280"
LINE = "#E5E7EB"
PAGE = "#F9FAFB"

# Chart colour order for all Pilgrim's Europe charts.
PE_COLOURS = [BRAND, RED, YELLOW, GREEN, BRAND_LIGHT, MUTED]

HEAD_FONT = "'Fjalla One', 'Arial Narrow', 'Segoe UI', sans-serif"
BODY_FONT = "Montserrat, 'Segoe UI', -apple-system, system-ui, sans-serif"
SERIF_FONT = "moret, Georgia, 'Times New Roman', serif"

_CSS = f"""
<style>
  #MainMenu, footer, header [data-testid="stToolbar"] {{ visibility: hidden; }}
  html, body, [class*="css"], .stMarkdown, .stText {{ font-family: {BODY_FONT}; color: {TEXT}; }}
  .block-container {{ max-width: 1400px; padding-top: 1.5rem; }}
  h1, h2, h3, h4 {{ font-family: {HEAD_FONT} !important; font-weight: 400 !important; color: {BRAND} !important; }}
  [data-testid="stSidebar"] {{ background: {BRAND_NAVY}; }}
  [data-testid="stSidebar"] * {{ color: #FFFFFF !important; }}
  .stButton > button, .stDownloadButton > button {{
    font-family: {HEAD_FONT}; text-transform: uppercase; letter-spacing: .05em;
    background: {RED}; color: #FFFFFF; border: 2px solid {RED}; border-radius: 9999px; padding: .4rem 1.2rem;
  }}
  .stButton > button:hover, .stDownloadButton > button:hover {{ background: {RED_DARK}; border-color: {RED_DARK}; color: #FFFFFF; }}
  [data-testid="stMetric"] {{ background: #FFFFFF; border: 1px solid {LINE}; border-top: 4px solid {BRAND}; border-radius: 1.25rem; padding: 14px 18px; }}
  [data-testid="stMetricLabel"] {{ font-family: {HEAD_FONT}; text-transform: uppercase; letter-spacing: .06em; color: {MUTED}; }}
  [data-testid="stMetricValue"] {{ font-family: {HEAD_FONT}; color: {BRAND}; }}
  [data-testid="stDataFrame"] {{ border: 1px solid {LINE}; border-radius: .5rem; }}
  .pe-hero {{ background: {BRAND_NAVY}; color: #FFFFFF; border-bottom: 6px solid {RED}; border-radius: 1.25rem; padding: 24px 28px; margin-bottom: 18px; }}
  .pe-hero .eyebrow {{ font-family: {HEAD_FONT}; text-transform: uppercase; letter-spacing: .08em; color: {YELLOW}; font-size: 14px; margin: 0 0 4px; }}
  .pe-hero h1 {{ font-family: {SERIF_FONT} !important; color: #FFFFFF !important; font-size: 38px; margin: 0 0 8px; padding: 0; }}
  .pe-hero p {{ margin: 0 0 10px; color: #E5E7EB; }}
  .pe-hero dl {{ display: flex; flex-wrap: wrap; gap: 8px 28px; margin: 0; font-size: 14px; }}
  .pe-hero dt {{ font-family: {HEAD_FONT}; text-transform: uppercase; letter-spacing: .06em; color: #9CC5EA; font-size: 12px; }}
  .pe-hero dd {{ margin: 0; }}
  .pe-callout {{ border-radius: .5rem; padding: 10px 14px; margin: 10px 0; border-left: 4px solid {BRAND}; background: #EEF4FA; }}
  .pe-callout.warn {{ border-color: {YELLOW}; background: #FFF7E6; }}
  .pe-callout.good {{ border-color: {GREEN}; background: #EFF3EA; }}
  .pe-callout.bad {{ border-color: {RED}; background: #FDECEC; }}
</style>
"""


def apply_theme() -> None:
    """Inject the house CSS. Call once, straight after st.set_page_config()."""
    st.markdown(_CSS, unsafe_allow_html=True)


def hero(title: str, lede: str = "", eyebrow: str = "Pilgrim's Europe", meta: dict | None = None) -> None:
    """Navy page header with a red bottom border."""
    items = "".join(f"<div><dt>{escape(k)}</dt><dd>{escape(str(v))}</dd></div>" for k, v in (meta or {}).items())
    st.markdown(
        f'<div class="pe-hero"><p class="eyebrow">{escape(eyebrow)}</p><h1>{escape(title)}</h1>'
        f'{"<p>" + escape(lede) + "</p>" if lede else ""}{"<dl>" + items + "</dl>" if items else ""}</div>',
        unsafe_allow_html=True,
    )


def kpi_row(kpis: list[tuple[str, str, str | None]]) -> None:
    """KPI tiles: a list of (label, value, delta). Delta may be None."""
    for col, (label, value, delta) in zip(st.columns(len(kpis)), kpis):
        col.metric(label, value, delta)


def callout(text: str, kind: str = "info") -> None:
    """Callout box. kind: info, warn, good or bad."""
    kind = kind if kind in {"info", "warn", "good", "bad"} else "info"
    st.markdown(f'<div class="pe-callout {kind}">{escape(text)}</div>', unsafe_allow_html=True)
