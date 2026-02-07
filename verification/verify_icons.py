from playwright.sync_api import sync_playwright
import os

def test_icons():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load the local HTML file
        url = f"file://{os.path.abspath('verification/index.html')}"
        page.goto(url)

        # Wait for player to be defined and controls to appear
        page.wait_for_selector("helios-player")

        # Allow some time for script execution
        page.wait_for_timeout(1000)

        # Take screenshot of the player
        page.locator("helios-player").screenshot(path="verification/player_icons.png")

        browser.close()

if __name__ == "__main__":
    test_icons()
