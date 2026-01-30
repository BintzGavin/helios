from playwright.sync_api import Page, expect, sync_playwright
import time

def test_timecode_edit(page: Page):
    page.goto("http://localhost:5173")
    page.wait_for_timeout(2000)

    play_btn = page.locator("button[title='Play / Pause (Space)']")

    # Force toggle to ensure we have control
    print("Clicking Play...")
    play_btn.click()
    page.wait_for_timeout(1000)

    print("Clicking Pause...")
    play_btn.click()
    page.wait_for_timeout(1000)

    # Check if timecode is stable
    display = page.locator(".timecode-display")
    initial_text = display.text_content()
    print(f"Timecode after pause: {initial_text}")

    page.wait_for_timeout(1000)
    final_text = display.text_content()
    print(f"Timecode 1s later: {final_text}")

    if initial_text != final_text:
        print("WARNING: Timecode is still moving!")

    # Now try to edit
    display.click()
    input_el = page.locator(".timecode-input")
    input_el.fill("10")
    input_el.press("Enter")

    expect(display).to_contain_text(":10")

    page.screenshot(path="/home/jules/verification/timecode_edit.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_timecode_edit(page)
            print("Verification successful!")
        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="/home/jules/verification/failure.png")
        finally:
            browser.close()
