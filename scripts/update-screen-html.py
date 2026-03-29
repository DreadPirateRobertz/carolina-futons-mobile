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
    "onboarding":       ["01-onboarding-welcome", "02-onboarding-slides", "03-onboarding-signup"],
    "home":             ["04-home", "05-home-quests"],
    "shop":             ["06-shop"],
    "cart":             ["07-cart-empty", "48-cart-items"],
    "account":          ["08-account-signedout", "49-account-signedin"],
    "pdp":              ["10-pdp-gallery", "11-pdp-bnpl", "12-pdp-features-ar"],
    "search":           ["13-search-empty", "14-search-results"],
    "category":         ["09-category-futons"],
    "collections":      ["15-collections"],
    "collection-detail":["16-collection-detail"],
    "compare":          ["17-compare"],
    "wishlist":         ["18-wishlist"],
    "checkout":         ["22-checkout"],
    "payment":          ["23-payment-confirmation"],
    "order-success":    ["24-order-success"],
    "order-confirm":    ["25-order-confirmation"],
    "order-history":    ["26-order-history"],
    "order-detail":     ["27-order-detail"],
    "ar":               ["34-ar-camera", "35-ar-permission-denied"],
    "ar-web":           ["36-ar-web-viewer"],
    "room-gallery":     ["37-room-gallery"],
    "login":            ["19-login"],
    "signup":           ["20-signup"],
    "forgot-password":  ["21-forgot-password"],
    "premium":          ["32-premium"],
    "style-quiz":       ["33-style-quiz"],
    "loyalty":          ["38-loyalty"],
    "leaderboard":      ["41-leaderboard"],
    "challenges":       ["40-challenges"],
    "achievements":     ["42-achievements"],
    "points-history":   ["43-points-history"],
    "avatar":           ["44-avatar-equip"],
    "referral":         ["45-referral-landing"],
    "notifications":    ["30-notifications-inbox"],
    "notif-prefs":      ["31-notification-preferences"],
    "store-locator":    ["28-store-locator"],
    "store-detail":     ["29-store-detail"],
    "privacy":          ["47-privacy-policy"],
    "rewards":          ["46-rewards"],
    "notif-prompt":     [],  # nav hookup pending
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
        candidates = sorted([
            d for d in docs_screenshots.iterdir()
            if d.is_dir() and d.name.startswith("s29-")
        ], reverse=True)
        if not candidates:
            print("❌ No s29-* screenshot directories found")
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
