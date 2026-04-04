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
    # --- s31 filenames (2026-04-04) ---
    "onboarding":        ["01-onboarding-welcome", "02-onboarding-slide2", "03-onboarding-slide3"],
    "home":              ["04-home-hero", "05-home-quests", "06-home-collections", "07-home-bottom"],
    "shop":              ["08-shop-grid", "09-shop-scrolled"],
    "cart":              ["14-cart-with-items", "15-cart-scrolled"],
    "account":           ["16-account-signed-out", "17-account-bottom"],
    "pdp":               ["10-pdp-gallery", "11-pdp-bnpl", "12-pdp-features-ar", "13-pdp-gallery-fullscreen"],
    "search":            ["21-search-empty", "22-search-results"],
    "category":          ["46-category-filtered-grid", "47-category-scrolled"],
    "collections":       ["23-collections-grid", "24-collections-scrolled"],
    "collection-detail": ["25-collection-detail-hero", "26-collection-detail-products", "27-collection-detail-total"],
    "compare":           ["48-compare-side-by-side"],
    "wishlist":          ["28-wishlist"],
    "checkout":          ["29-checkout"],
    "payment":           ["49-payment-confirmation"],
    "order-success":     ["50-order-success"],
    "order-confirm":     ["51-order-confirmation"],
    "order-history":     ["30-order-history"],
    "order-detail":      ["52-order-detail"],
    "ar":                ["31-ar-camera"],
    "ar-web":            ["53-ar-web-viewer"],
    "room-gallery":      ["43-room-gallery", "44-room-gallery-scrolled"],
    "login":             ["18-login"],
    "signup":            ["19-signup"],
    "forgot-password":   ["20-forgot-password"],
    "premium":           ["54-cf-plus-premium"],
    "style-quiz":        ["32-style-quiz-q1", "33-style-quiz-q2"],
    "loyalty":           ["55-loyalty-program"],
    "leaderboard":       ["36-leaderboard"],
    "challenges":        ["37-challenges"],
    "achievements":      ["34-achievements-top", "35-achievements-scrolled"],
    "points-history":    ["56-points-history"],
    "avatar":            ["38-avatar-equip"],
    "referral":          ["45-referral-landing"],
    "notifications":     ["39-notifications-inbox"],
    "notif-prefs":       ["40-notification-prefs"],
    "store-locator":     ["41-store-locator"],
    "store-detail":      ["42-store-detail"],
    "privacy":           ["62-privacy-policy"],
    "rewards":           ["57-rewards-catalog"],
    "notif-prompt":      ["58-push-permission-prompt"],
    "checkout-promo":    ["60-checkout-promo-code"],
    "checkout-skeleton": ["59-checkout-form-skeleton"],
    "checkout-a11y":     ["61-checkout-keyboard-a11y"],
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
