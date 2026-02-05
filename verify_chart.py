from playwright.sync_api import sync_playwright

def verify_svelte_chart(page):
    page.goto("http://localhost:8080/examples/svelte-chartjs-animation/composition.html")
    # Wait for chart to appear
    page.wait_for_selector("canvas")
    # Wait a bit for animation
    page.wait_for_timeout(1000)
    page.screenshot(path="verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_svelte_chart(page)
        finally:
            browser.close()
