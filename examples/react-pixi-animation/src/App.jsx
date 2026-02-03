import React, { useRef, useEffect } from 'react';
import { Helios } from '../../../packages/core/src/index.ts';
import { Application, Graphics } from 'pixi.js';

const duration = 5;
const fps = 30;
const helios = new Helios({ duration, fps });

helios.bindToDocumentTimeline();

if (typeof window !== 'undefined') {
    window.helios = helios;
}

export default function App() {
    const containerRef = useRef(null);

    useEffect(() => {
        let app = null;
        let unsubscribe = null;
        let mounted = true;

        const init = async () => {
            const pixiApp = new Application();

            await pixiApp.init({
                resizeTo: window,
                backgroundColor: 0x111111,
                antialias: true
            });

            if (!mounted) {
                pixiApp.destroy({ removeView: true, children: true });
                return;
            }

            app = pixiApp;

            if (containerRef.current) {
                containerRef.current.appendChild(app.canvas);
            }

            // Create a simple rotating rectangle
            const rect = new Graphics();
            rect.rect(-50, -50, 100, 100);
            rect.fill(0x61dafb);

            rect.x = app.screen.width / 2;
            rect.y = app.screen.height / 2;

            app.stage.addChild(rect);

            // Sync with Helios
            unsubscribe = helios.subscribe((state) => {
                const time = state.currentTime;
                // Rotate based on time
                rect.rotation = time * Math.PI;

                // Keep centered on resize
                rect.x = app.screen.width / 2;
                rect.y = app.screen.height / 2;
            });
        };

        init();

        return () => {
            mounted = false;
            if (unsubscribe) unsubscribe();
            if (app) {
                app.destroy({ removeView: true, children: true });
            }
        };
    }, []);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    );
}
