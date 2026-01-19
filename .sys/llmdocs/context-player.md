# Context: Player Component

## A. Component Structure
The `<helios-player>` Web Component uses a Shadow DOM to encapsulate:
-   **Wrapper**: Container for the player interface.
-   **Iframe**: Loads the composition/animation content.
-   **Controls Overlay**:
    -   `Play/Pause` button.
    -   `Scrubber` (range input) for seeking.
    -   `Time Display` (current / total).
    -   `Export` button (triggers client-side rendering).

## B. Events
*No custom events are currently dispatched publicly.*

## C. Attributes
The component observes the following attributes:
-   `src`: URL of the composition to load in the iframe.
-   `width`: Width of the player.
-   `height`: Height of the player.
-   `duration`: Duration of the animation in seconds (default: 5).
-   `fps`: Frames per second (default: 60).
