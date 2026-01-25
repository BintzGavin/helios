from playwright.sync_api import sync_playwright
import time

def verify(page):
    print("Navigating to studio...")
    page.goto("http://localhost:5173")
    print("Waiting for layout...")
    page.wait_for_selector(".studio-layout", timeout=10000)

    print("Clicking Renders tab...")
    # Adjust selector if needed. Assuming 'Renders' text is in the tab.
    # If the tabs are icons, I might need a specific selector.
    # Looking at Sidebar/index.tsx might help, but let's try text first.
    page.get_by_text("Renders").click()

    print("Checking for No render jobs...")
    # Check if "No render jobs" is visible (since we have no jobs)
    page.wait_for_selector("text=No render jobs")

    print("Taking screenshot...")
    page.screenshot(path="verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="error.png")
        finally:
            browser.close()
