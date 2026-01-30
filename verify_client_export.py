from playwright.sync_api import sync_playwright

def verify(page):
    print("Navigating...")
    # Navigate to the example
    page.goto("http://localhost:3000/examples/client-export-api/index.html")

    print("Waiting for iframe...")
    # Wait for the iframe to load and the preview to be visible
    page.wait_for_selector("#composition-frame")

    print("Waiting for render...")
    # Wait a bit for the canvas to render the bouncing ball
    page.wait_for_timeout(2000)

    # Check if we can find the button
    btn = page.query_selector("#export-btn")
    if btn:
        print("Export button found")
    else:
        print("Export button NOT found")

    # Take screenshot
    page.screenshot(path="verification_screenshot.png")
    print("Screenshot saved to verification_screenshot.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
