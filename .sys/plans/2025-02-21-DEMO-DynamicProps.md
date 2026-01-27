# Context & Goal
- **Objective**: Create a new example `examples/dynamic-props-animation` to demonstrate the usage of `inputProps` and `schema` validation in Helios.
- **Trigger**: Vision gap identified in `README.md` (promised feature) and `Planner's Journal` (missing example for core feature).
- **Impact**: Enables users to understand how to create parameterized video compositions, a key requirement for Studio and reusable templates.

# File Inventory
- **Create**:
    - `examples/dynamic-props-animation/vite.config.js`: Bundler config for the example.
    - `examples/dynamic-props-animation/composition.html`: HTML entry point for the composition.
    - `examples/dynamic-props-animation/index.html`: Dev server entry point.
    - `examples/dynamic-props-animation/src/main.jsx`: React entry point.
    - `examples/dynamic-props-animation/src/App.jsx`: Main application logic demonstrating schema and props.
    - `examples/dynamic-props-animation/src/hooks/useHelios.js`: React hook for Helios state subscription.
- **Modify**:
    - `vite.build-example.config.js`: Register the new example for the build system.
- **Read-Only**:
    - `packages/core/src/index.ts`: To reference API.

# Implementation Spec
- **Architecture**:
    - Uses **React** for the UI.
    - Uses **Helios Core** for state management and validation.
    - Defines a `HeliosSchema` for inputs (title, colors, scale).
    - Subscribes to `helios.inputProps` signal via a custom hook `useHelios`.
    - Updates DOM based on `inputProps` changes.

- **Pseudo-Code**:

    **`examples/dynamic-props-animation/vite.config.js`**:
    ```javascript
    import { defineConfig, searchForWorkspaceRoot } from 'vite';
    import react from '@vitejs/plugin-react';
    import path from 'path';

    export default defineConfig({
      plugins: [react()],
      server: {
        port: 5173,
        fs: {
          allow: [
            searchForWorkspaceRoot(process.cwd()),
          ],
        },
      },
      resolve: {
        alias: [
            { find: /^\/packages\/(.*)/, replacement: path.resolve(process.cwd(), 'packages') + '/$1' }
        ]
      }
    });
    ```

    **`examples/dynamic-props-animation/composition.html`**:
    ```html
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Dynamic Props Animation</title>
      </head>
      <body>
        <div id="root"></div>
        <script type="module" src="/src/main.jsx"></script>
      </body>
    </html>
    ```

    **`examples/dynamic-props-animation/src/hooks/useHelios.js`**:
    ```javascript
    import { useState, useEffect } from 'react';

    export function useHelios(helios) {
        const [state, setState] = useState(helios.getState());

        useEffect(() => {
            const update = (s) => setState(s);
            return helios.subscribe(update);
        }, [helios]);

        return state;
    }
    ```

    **`examples/dynamic-props-animation/src/App.jsx`**:
    ```javascript
    import React from 'react';
    import { Helios } from '../../../packages/core/dist/index.js';
    import { useHelios } from './hooks/useHelios';

    // 1. Define Schema
    const schema = {
        title: { type: 'string', default: 'Dynamic Title' },
        subtitle: { type: 'string', default: 'Change me via props' },
        backgroundColor: { type: 'color', default: '#ffffff' },
        textColor: { type: 'color', default: '#000000' },
        scale: { type: 'number', minimum: 0.5, maximum: 2.0, default: 1.0 },
        showSubtitle: { type: 'boolean', default: true }
    };

    // 2. Initialize Helios
    const helios = new Helios({
        duration: 5,
        fps: 30,
        schema,
        inputProps: {
            title: 'Dynamic Title',
            scale: 1.0
        }
    });

    helios.bindToDocumentTimeline();

    if (typeof window !== 'undefined') {
        window.helios = helios;
    }

    export default function App() {
        const state = useHelios(helios);
        const { inputProps, currentFrame, fps } = state;

        const time = currentFrame / fps;

        // Demonstrate using props in animation
        const pulse = Math.sin(time * 2) * 0.1;
        const currentScale = (inputProps.scale || 1) + pulse;

        return (
            <div style={{
                width: '100vw',
                height: '100vh',
                backgroundColor: inputProps.backgroundColor,
                color: inputProps.textColor,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'sans-serif',
                overflow: 'hidden'
            }}>
                <div style={{ transform: `scale(${currentScale})`, textAlign: 'center' }}>
                    <h1 style={{ margin: 0 }}>{inputProps.title}</h1>
                    {inputProps.showSubtitle && (
                        <p style={{ marginTop: '0.5em', opacity: 0.8 }}>{inputProps.subtitle}</p>
                    )}
                </div>
                <div style={{ position: 'absolute', bottom: 20, fontSize: '12px', opacity: 0.5 }}>
                    Frame: {Math.round(currentFrame)}
                </div>
            </div>
        );
    }
    ```

- **Public API Changes**: None.
- **Dependencies**: None.

# Test Plan
- **Verification**:
    - Run `npm run build:examples`.
    - Verify that `output/example-build/dynamic_props/composition.html` exists.
    - Inspect the build output to ensure no errors.
- **Success Criteria**:
    - The build completes successfully.
    - The example code is correctly scaffolded.
- **Edge Cases**:
    - Check if `vite.build-example.config.js` is correctly updated to include `dynamic_props`.
