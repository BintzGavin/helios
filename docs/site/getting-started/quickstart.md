---
title: "Quickstart"
description: "Get up and running with Helios Engine in minutes."
---

# Quickstart

Helios Engine is a library for creating video-ready animations using web technologies. It allows you to build compositions using standard HTML, CSS, and Canvas (or frameworks like React and Vue) and render them to high-quality video.

## The Fastest Way to Start

The quickest way to get started is using the CLI to scaffold a project from an example.

### Using the CLI

1.  Install the CLI globally (optional, or use npx):
    ```bash
    npm install -g @helios-project/cli
    ```

2.  Initialize a new project:
    ```bash
    # Interactive mode
    helios init my-video

    # Or, scaffold from a specific example
    helios init my-video --example chartjs-animation
    ```

3.  Start the development server:
    ```bash
    cd my-video
    npm install
    npm run dev
    ```
    Open your browser to the URL shown (usually `http://localhost:5173/composition.html`).

## What's Next?

- **[Installation](/getting-started/installation)**: Learn how to add Helios to your own project.
- **[First Steps](/getting-started/first-steps)**: Understand the core concepts of a Helios composition.
- **[Examples](/examples/react-example)**: Explore more examples including Vue, Three.js, and Canvas.
