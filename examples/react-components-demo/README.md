# React Components Demo

This example demonstrates how to use and compose React components within a Helios project. It showcases several reusable UI components:

- **Timer**: A timecode display component that synchronizes with the video frame.
- **ProgressBar**: A visual progress bar that tracks the video duration.
- **Watermark**: A text overlay component for branding or watermarking.

## Usage

### 1. Install Dependencies

First, install the necessary packages:

```bash
npm install
```

### 2. Start the Development Server

Run the development server to preview the composition in Helios Studio:

```bash
npm run dev
```

This will open the Studio at `http://localhost:5173`.

### 3. Render the Composition

To render the composition to a video file:

```bash
npx helios render
```

## Components

The components are located in `src/components/`:

- `Timer.tsx`: Uses the `useVideoFrame` hook to update the display based on the current frame.
- `ProgressBar.tsx`: Renders a progress bar based on the current frame and total duration.
- `Watermark.tsx`: Renders a text overlay with customizable position and opacity.
- `useVideoFrame.ts`: A custom hook that subscribes to Helios state updates to trigger re-renders on frame changes.

## Architecture

This example uses the `Helios` instance created in `src/App.tsx` and passes it down to components via props or context (though in this simple example, it's passed as a prop). The components use `helios.subscribe` to reactively update when the frame changes.
