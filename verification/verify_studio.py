from playwright.sync_api import sync_playwright

def verify_studio():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("http://localhost:4173")
            # Wait for header
            page.wait_for_selector("text=Helios Studio")

            # Wait a bit for layout to settle
            page.wait_for_timeout(1000)

            # Take a screenshot of the whole page
            page.screenshot(path="verification/studio_ui.png")
            print("Screenshot taken at verification/studio_ui.png")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_studio()
