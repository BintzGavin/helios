import os
from playwright.sync_api import sync_playwright

def verify_pip():
    cwd = os.getcwd()
    file_path = f"file://{cwd}/verification/verify.html"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print(f"Navigating to {file_path}")
        page.goto(file_path)

        # Wait for custom element to upgrade (script to load)
        page.wait_for_timeout(1000)

        # Take screenshot of the whole page
        screenshot_path = f"{cwd}/verification/verification.png"
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    verify_pip()
