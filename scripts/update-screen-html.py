#!/usr/bin/env python3
"""
update-screen-html.py — Replace screenshot placeholders in screen-reference.html
with actual <img> tags after a screenshot capture run.

Usage:
    python3 scripts/update-screen-html.py [--screenshots-dir docs/screenshots/s29-YYYYMMDD]

The script:
1. Scans the screenshots directory for PNG files
2. Uses a section-id → screenshot-file mapping
3. Replaces placeholder divs with <img> tags in-place
"""

import argparse
import os
import re
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# Mapping: section id → list of screenshot filenames (in card order)
# Each entry maps an HTML section to the screenshot(s) for its cards.
# If a screenshot file exists, the placeholder is replaced. Otherwise skipped.
# ---------------------------------------------------------------------------
SECTION_SCREENSHOTS = {
    # Keys match <div class="section" id="..."> in screen-reference.html
    # Values are stem names (without .png) that capture-screenshots.sh outputs.
    # Multiple entries fill multiple placeholder cards in section order.
    # --- s30 filenames (2026-03-29) ---
    "onboarding":        ["01_onboarding", "01_onboarding_slide2", "01_onboarding_slide3"],
    "home":              ["02_home_top", "02_home_mid", "02_home_collections", "02_home_bottom"],
    "shop":              ["03_shop_top", "03_shop_scrolled"],
    "cart":              ["05_cart_with_items", "05_cart_scrolled"],
    "account":           ["06_account_top", "06_account_bottom"],
    "pdp":               ["04_pdp_top", "04_pdp_mid", "04_pdp_bottom", "04_pdp_gallery_fullscreen"],
    "search":            ["08_search_empty", "08_search_results"],
    "category":          [],  # no deep link — navigate from Shop filter
    "collections":       ["09_collections", "09_collections_scrolled"],
    "collection-detail": ["10_collection_detail_top", "10_collection_detail_products"],
    "compare":           [],  # needs productSlugs params — navigate from PDP
    "wishlist":          ["11_wishlist"],
    "checkout":          ["12_checkout"],
    "payment":           [],  # requires completed order
    "order-success":     [],  # requires completed order
    "order-confirm":     [],  # requires completed order
    "order-history":     ["13_order_history"],
    "order-detail":      [],  # requires orderId
    "ar":                ["14_ar"],
    "ar-web":            [],  # launched from PDP via ARViewer
    "room-gallery":      ["21_room_gallery_attempt"],
    "login":             ["07_login"],
    "signup":            ["07_signup"],
    "forgot-password":   ["07_forgot_password"],
    "premium":           [],  # navigate from Account
    "style-quiz":        ["15_style_quiz_q1", "15_style_quiz_q2"],
    "loyalty":           [],  # navigate from Account
    "leaderboard":       ["16_leaderboard"],
    "challenges":        ["16_challenges"],
    "achievements":      ["16_achievements_top", "16_achievements_scrolled"],
    "points-history":    [],  # navigate from Account
    "avatar":            [],  # deep link added — recapture next run
    "referral":          [],  # needs referral code
    "notifications":     ["17_notifications_inbox"],
    "notif-prefs":       ["18_notification_prefs"],
    "store-locator":     ["19_store_locator"],
    "store-detail":      ["20_store_detail"],
    "privacy":           [],  # navigate from Account → Settings
    "rewards":           [],  # navigate from Account
    "notif-prompt":      [],  # OS permission dialog — not ADB-capturable
}

PLACEHOLDER_RE = re.compile(
    r'<div class="placeholder">.*?</div>',
    re.DOTALL
)


def load_html(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def save_html(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")


def find_section_positions(html: str) -> dict:
    """Return {section_id: start_char_pos} sorted by position."""
    positions = {}
    for m in re.finditer(r'<div class="section" id="([^"]+)"', html):
        positions[m.group(1)] = m.start()
    return positions


def replace_placeholders(html: str, section_id: str, screenshot_files: list[str],
                          screenshots_dir: Path) -> tuple[str, int]:
    """
    For the given section, replace placeholders in order with img tags.
    Returns (updated_html, count_replaced).
    """
    section_screenshots = [
        f for f in screenshot_files
        if (screenshots_dir / f"{f}.png").exists()
    ]

    if not section_screenshots:
        return html, 0

    # Find section boundaries: from <div class="section" id="SECTION_ID"> to next </div></div> block
    section_start = html.find(f'<div class="section" id="{section_id}"')
    if section_start == -1:
        print(f"  ⚠ Section not found: #{section_id}")
        return html, 0

    # Find the end of this section (next section div or end of known sections block)
    next_section = html.find('<div class="section"', section_start + 1)
    section_end = next_section if next_section != -1 else len(html)

    section_html = html[section_start:section_end]
    replaced = 0

    for screenshot_name in section_screenshots:
        png_path = screenshots_dir / f"{screenshot_name}.png"
        if not png_path.exists():
            continue

        # Relative path from docs/ directory
        rel_path = f"screenshots/{screenshots_dir.name}/{screenshot_name}.png"

        img_tag = (
            f'<img src="{rel_path}" '
            f'alt="{screenshot_name.replace("-", " ").title()}" '
            f'style="width:100%;height:auto;display:block;">'
        )

        # Replace the next placeholder in the section
        m = PLACEHOLDER_RE.search(section_html)
        if m:
            section_html = section_html[:m.start()] + img_tag + section_html[m.end():]
            replaced += 1
            print(f"  ✅ {section_id}: {screenshot_name}.png")

    html = html[:section_start] + section_html + html[section_end:]
    return html, replaced


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--screenshots-dir",
        default=None,
        help="Path to screenshots directory (default: auto-detect latest s29-* dir)"
    )
    parser.add_argument(
        "--html",
        default="docs/screen-reference.html",
        help="Path to HTML file to update"
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    html_path = Path(args.html)
    if not html_path.exists():
        print(f"❌ HTML file not found: {html_path}")
        sys.exit(1)

    # Auto-detect screenshots dir
    if args.screenshots_dir:
        screenshots_dir = Path(args.screenshots_dir)
    else:
        docs_screenshots = Path("docs/screenshots")
        if not docs_screenshots.exists():
            print("❌ No docs/screenshots directory found")
            sys.exit(1)
        # Match any sNN-YYYYMMDD directory (e.g. s29-20260329, s30-20260329)
        session_re = re.compile(r'^s\d+-\d{8}$')
        candidates = sorted([
            d for d in docs_screenshots.iterdir()
            if d.is_dir() and session_re.match(d.name)
        ], reverse=True)
        if not candidates:
            print("❌ No sNN-YYYYMMDD screenshot directories found")
            sys.exit(1)
        screenshots_dir = candidates[0]

    print(f"📂 Screenshots: {screenshots_dir}")
    print(f"📄 HTML: {html_path}")
    print()

    png_files = list(screenshots_dir.glob("*.png"))
    if not png_files:
        print("⚠ No PNG files found in screenshots directory")
        sys.exit(1)

    print(f"📸 Found {len(png_files)} screenshot(s)")
    print()

    html = load_html(html_path)
    total_replaced = 0

    for section_id, screenshots in SECTION_SCREENSHOTS.items():
        html, count = replace_placeholders(html, section_id, screenshots, screenshots_dir)
        total_replaced += count

    print()
    print(f"══════════════════════════════════")
    print(f"  Replaced: {total_replaced} placeholder(s)")
    print(f"══════════════════════════════════")

    if not args.dry_run:
        save_html(html_path, html)
        print(f"  Saved: {html_path}")
    else:
        print("  (dry run — not saved)")


if __name__ == "__main__":
    main()
