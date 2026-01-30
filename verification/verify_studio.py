from playwright.sync_api import sync_playwright

def verify(page):
    page.goto("http://localhost:5173/")
    page.wait_for_timeout(2000) # Wait for load
    page.screenshot(path="verification/studio_initial.png")
    print(page.title())

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    verify(page)
    browser.close()
