from playwright.sync_api import sync_playwright, expect
import time

def verify_captions(page):
    # Navigate to the example
    page.goto("http://localhost:8080/examples/vanilla-captions-animation/composition.html")

    # Wait for the captions container to exist
    captions = page.locator("#captions")
    expect(captions).to_be_visible(timeout=5000)

    # Wait for some text to appear (first caption starts at 0.5s)
    # "Welcome to Helios."
    # We can wait for it.
    expect(captions).to_contain_text("Welcome to Helios", timeout=5000)

    # Take a screenshot
    page.screenshot(path="verification_captions.png")
    print("Screenshot taken.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_captions(page)
        finally:
            browser.close()
