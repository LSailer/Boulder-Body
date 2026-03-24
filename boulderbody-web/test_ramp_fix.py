"""
Playwright test: Verify ramp-up ConfirmDialog closeOnBackdrop=false fix.

Scenario A: Backdrop click does NOT dismiss "Hit target?" dialog.
Scenario B: Yes → Yes → No flow yields exactly 3 working sets for hang.

The hang exercise requires 3 timer skips before the dialog appears:
  1. Prep timer (5s, first hang set only)
  2. Hang timer (7s)
  3. Rest timer (180s)
"""

import sys
import json
import time
from playwright.sync_api import sync_playwright, expect

SEED = {
    "version": 3,
    "sessions": [
        {
            "id": "playwright-ramp-test",
            "sessionType": "training",
            "date": "2026-03-24T10:00:00.000Z",
            "startTime": "2026-03-24T10:00:00.000Z",
            "isFinished": False,
            "trainingData": {
                "hangWeight": 0,
                "pullupWeight": 0,
                "benchWeight": 10,
                "trapBarWeight": 20,
                "rampUp": {
                    "preBreakWeights": {
                        "hang": 20,
                        "pullup": 10,
                        "bench": 30,
                        "trapbar": 50
                    },
                    "isManual": True,
                    "discoveredMax": {}
                },
                # 80% of 20kg = 16kg for the initial hang ramp set
                "hangSets": [
                    {
                        "id": "hang-ramp-set-1",
                        "order": 1,
                        "exercise": "hang",
                        "completed": False,
                        "setType": "rampup",
                        "weight": 16
                    }
                ],
                # 80% of 10kg = 8kg for pullup
                "pullupSets": [
                    {
                        "id": "pullup-ramp-set-1",
                        "order": 1,
                        "exercise": "pullup",
                        "completed": False,
                        "setType": "rampup",
                        "weight": 8
                    }
                ],
                # 80% of 30kg = 24kg for bench
                "benchSets": [
                    {
                        "id": "bench-ramp-set-1",
                        "order": 1,
                        "exercise": "bench",
                        "completed": False,
                        "setType": "rampup",
                        "weight": 24
                    }
                ],
                # 80% of 50kg = 40kg for trapbar
                "trapBarSets": [
                    {
                        "id": "trapbar-ramp-set-1",
                        "order": 1,
                        "exercise": "trapbar",
                        "completed": False,
                        "setType": "rampup",
                        "weight": 40
                    }
                ]
            }
        }
    ]
}

BASE_URL = "http://localhost:5173"
SESSION_URL = f"{BASE_URL}/training/playwright-ramp-test"


def skip_timer(page, label="Skip"):
    """Click the Skip button in any active timer modal."""
    skip_btn = page.locator(f"button:has-text('{label}')")
    skip_btn.wait_for(state="visible", timeout=5000)
    skip_btn.click()


def complete_hang_ramp_set(page):
    """
    Click a hang ramp set, skip prep + hang timers, then skip rest timer.
    Returns when the rest timer has been dismissed (dialog may now appear).
    """
    # Hang sets trigger prep timer on first set
    skip_timer(page, "Skip")   # prep timer
    time.sleep(0.3)
    skip_timer(page, "Skip")   # hang timer
    time.sleep(0.3)
    skip_timer(page, "Skip")   # rest timer


def assert_dialog_visible(page, context=""):
    """Assert the Hit Target dialog is still present in the DOM."""
    title = page.locator("text=Hit Target?")
    assert title.is_visible(), f"FAIL{': ' + context if context else ''}: 'Hit Target?' dialog was dismissed"
    print(f"  ✓ Dialog still visible{': ' + context if context else ''}")


def count_working_sets(page):
    """Count working-set buttons for hang (gray bg, not amber)."""
    # Working sets render with bg-gray-100 dark:bg-gray-700 (not completed)
    # or bg-blue-600 (completed). We count all set buttons in the Hang section.
    # Strategy: find the Hang section div and count buttons with setType=working.
    # The easiest DOM approach: count buttons that do NOT have amber classes
    # inside the Max Hangs card.
    hang_card = page.locator("div.bg-white, div.dark\\:bg-gray-800").filter(has_text="Max Hangs")
    # Count all buttons inside that card
    buttons = hang_card.locator("button[class*='aspect-square']")
    total = buttons.count()
    amber_count = 0
    for i in range(total):
        btn = buttons.nth(i)
        cls = btn.get_attribute("class") or ""
        if "amber" in cls:
            amber_count += 1
    working_count = total - amber_count
    return working_count, total


def main():
    failures = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # ── Setup ─────────────────────────────────────────────────────────────
        print("=== Setup ===")
        page.goto(BASE_URL)
        page.wait_for_load_state("networkidle")

        page.evaluate(
            "data => { localStorage.setItem('boulderbody_sessions', JSON.stringify(data)); }",
            json.dumps(SEED)
        )

        page.goto(SESSION_URL)
        page.wait_for_load_state("networkidle")
        page.screenshot(path="/tmp/ramp_01_initial.png", full_page=True)
        print("  Screenshot: /tmp/ramp_01_initial.png")

        # Verify we're on the training page
        heading = page.locator("h1")
        assert "Ramp" in heading.text_content(), f"Expected ramp-up heading, got: {heading.text_content()}"
        print("  ✓ Training page loaded in ramp-up mode")

        # ── Scenario A: Backdrop click is inert ───────────────────────────────
        print("\n=== Scenario A: Backdrop click should not dismiss dialog ===")

        # Click the first hang ramp set (amber button)
        hang_set_btn = page.locator("button[class*='amber']").first
        hang_set_btn.wait_for(state="visible", timeout=5000)
        print(f"  Clicking hang ramp set: '{hang_set_btn.text_content()}'")
        hang_set_btn.click()
        time.sleep(0.3)

        # Skip prep + hang + rest timers
        complete_hang_ramp_set(page)
        time.sleep(0.5)

        page.screenshot(path="/tmp/ramp_02_dialog.png", full_page=True)
        print("  Screenshot: /tmp/ramp_02_dialog.png")

        # Verify dialog is open
        assert_dialog_visible(page, "before backdrop click")

        # Click the backdrop (the fixed overlay outside the dialog card)
        # The backdrop is the fixed full-screen div (z-50); click at a corner far from the dialog card
        page.mouse.click(10, 10)
        time.sleep(0.4)

        page.screenshot(path="/tmp/ramp_03_after_backdrop.png", full_page=True)
        print("  Screenshot: /tmp/ramp_03_after_backdrop.png")

        try:
            assert_dialog_visible(page, "after backdrop click")
        except AssertionError as e:
            failures.append(str(e))

        # ── Scenario B: Yes → No → 3 working sets ────────────────────────────
        print("\n=== Scenario B: Yes → No → exactly 3 working sets ===")

        # Dialog is still open — click "Yes — go heavier"
        yes_btn = page.locator("button:has-text('Yes')")
        yes_btn.wait_for(state="visible", timeout=5000)
        yes_btn.click()
        time.sleep(0.3)

        # New ramp set added — click it and skip timers
        # At this point the second ramp set should be visible (amber)
        amber_btns = page.locator("button[class*='amber']")
        # Find the uncompleted amber button (the new ramp set)
        new_ramp_set = page.locator("button[class*='amber']:not(.scale-105)").first
        new_ramp_set.wait_for(state="visible", timeout=5000)
        print(f"  Clicking second hang ramp set: '{new_ramp_set.text_content()}'")
        new_ramp_set.click()
        time.sleep(0.3)

        complete_hang_ramp_set(page)
        time.sleep(0.5)

        page.screenshot(path="/tmp/ramp_04_second_dialog.png", full_page=True)
        print("  Screenshot: /tmp/ramp_04_second_dialog.png")
        assert_dialog_visible(page, "second dialog (after Yes)")

        # Click "No — that's my max"
        no_btn = page.locator("button:has-text('No')")
        no_btn.wait_for(state="visible", timeout=5000)
        no_btn.click()
        time.sleep(0.5)

        page.screenshot(path="/tmp/ramp_05_working_sets.png", full_page=True)
        print("  Screenshot: /tmp/ramp_05_working_sets.png")

        working, total = count_working_sets(page)
        print(f"  Hang buttons: {total} total, {working} working-set (non-amber)")
        try:
            assert working == 3, f"FAIL: Expected 3 working sets, got {working} (total buttons: {total})"
            print("  ✓ Exactly 3 working sets rendered")
        except AssertionError as e:
            failures.append(str(e))

        browser.close()

    # ── Results ───────────────────────────────────────────────────────────────
    print("\n=== Results ===")
    if failures:
        for f in failures:
            print(f"  ✗ {f}")
        print(f"\n{len(failures)} test(s) FAILED")
        sys.exit(1)
    else:
        print("  All tests PASSED ✓")
        sys.exit(0)


if __name__ == "__main__":
    main()
