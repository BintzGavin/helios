from playwright.sync_api import sync_playwright, expect

def test_render_presets(page):
    print("Navigating to Studio...")
    page.goto("http://localhost:5173/")

    # Force Renders tab via localStorage
    print("Forcing Renders tab active...")
    page.evaluate("localStorage.setItem('helios-studio:sidebar-active-tab', JSON.stringify('renders'))")
    page.reload()

    # Wait for the sidebar to be visible
    print("Waiting for sidebar...")
    page.wait_for_selector(".studio-sidebar", timeout=10000)

    # Wait for Renders Panel to appear directly
    print("Waiting for Renders Panel...")
    page.wait_for_selector(".renders-panel", timeout=5000)

    # Locate RenderConfig
    print("Locating Render Config...")
    config_section = page.locator(".render-config")
    expect(config_section).to_be_visible()

    print("Selecting HD Preset...")
    preset_select = config_section.locator("select").first
    preset_select.select_option("HD (1080p)")

    # Verify inputs
    print("Verifying inputs...")

    def get_input_value(label_text):
        return config_section.locator(f"//label[contains(text(), '{label_text}')]/following-sibling::input").input_value()

    # Wait for state update
    page.wait_for_timeout(500)

    bitrate = get_input_value("Video Bitrate")
    codec = get_input_value("Video Codec")

    print(f"Bitrate: {bitrate}")
    print(f"Codec: {codec}")

    if bitrate != "5000k":
        raise Exception(f"Expected bitrate 5000k, got {bitrate}")

    if codec != "libx264":
        raise Exception(f"Expected codec libx264, got {codec}")

    print("Presets Verified!")

    # Take screenshot
    page.screenshot(path="verification/render_presets.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Still use large viewport to be safe
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = context.new_page()
        try:
            test_render_presets(page)
        except Exception as e:
            print(f"Test failed: {e}")
            page.screenshot(path="verification/error.png")
            raise e
        finally:
            browser.close()
