from playwright.sync_api import sync_playwright, expect

def test_assets_panel(page):
    print("Navigating to Studio...")
    page.goto("http://localhost:5174")

    print("Waiting for Assets panel...")
    # Expect the Assets panel header
    expect(page.get_by_text("Assets", exact=True)).to_be_visible()

    print("Checking for asset items...")
    # Check for mock assets
    expect(page.get_by_text("logo.png")).to_be_visible()
    expect(page.get_by_text("background.jpg")).to_be_visible()
    expect(page.get_by_text("music.mp3")).to_be_visible()

    print("Taking screenshot...")
    page.screenshot(path="verification/assets_panel.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_assets_panel(page)
            print("Verification successful!")
        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="verification/failure.png")
            raise
        finally:
            browser.close()
