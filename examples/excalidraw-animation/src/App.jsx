import React, { useState, useEffect } from 'react';
import { Excalidraw, restoreElements } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { Helios } from '../../../packages/core/src/index.ts';
import { useVideoFrame } from './hooks/useVideoFrame';
import { getArchitectureElements } from './diagram';

const duration = 30;
const fps = 30;
const helios = new Helios({ duration, fps });

// Bind to document timeline for preview
helios.bindToDocumentTimeline();

if (typeof window !== 'undefined') {
    window.helios = helios;
}

export default function App() {
    const frame = useVideoFrame(helios);
    const [excalidrawAPI, setExcalidrawAPI] = useState(null);
    const [centered, setCentered] = useState(false);
    const [fontsLoaded, setFontsLoaded] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // Wait for all fonts to be ready, including Excalidraw's fonts
        // Excalidraw uses multiple fonts loaded via CSS, so we need to wait for all of them
        const loadFonts = async () => {
            // Wait for document.fonts to be ready (all fonts loaded)
            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
            }
            
            // Check if fonts are actually loaded by testing font availability
            const checkFont = (fontFamily) => {
                if (!document.fonts) return false;
                try {
                    // Check if font is loaded by trying to use it
                    const testEl = document.createElement('span');
                    testEl.style.fontFamily = fontFamily;
                    testEl.style.fontSize = '16px';
                    testEl.style.position = 'absolute';
                    testEl.style.visibility = 'hidden';
                    testEl.textContent = 'test';
                    document.body.appendChild(testEl);
                    const loaded = document.fonts.check(`16px ${fontFamily}`);
                    document.body.removeChild(testEl);
                    return loaded;
                } catch (e) {
                    return false;
                }
            };
            
            // Also explicitly load Excalidraw fonts to ensure they're available
            // Excalidraw uses: Virgil (Excalifont), Nunito, Comic Shanns
            const fontPromises = [
                document.fonts.load("20px Virgil"),
                document.fonts.load("20px Nunito"),
                document.fonts.load("20px 'Comic Shanns'"),
            ];
            
            // Wait for all fonts, but don't fail if some don't load
            await Promise.allSettled(fontPromises);
            
            // Wait a bit more and verify fonts are actually loaded
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Verify fonts are loaded
            const virgilLoaded = checkFont('Virgil');
            const nunitoLoaded = checkFont('Nunito');
            const comicLoaded = checkFont('Comic Shanns');
            
            console.log('[Excalidraw] Font loading status:', {
                Virgil: virgilLoaded,
                Nunito: nunitoLoaded,
                'Comic Shanns': comicLoaded,
                allFontsReady: document.fonts ? document.fonts.status : 'unknown'
            });
            
            // Give Excalidraw additional time to initialize fonts
            await new Promise(resolve => setTimeout(resolve, 300));
            
            setFontsLoaded(true);
        };
        
        loadFonts().catch(err => {
            console.warn('Font loading error:', err);
            // Still set fontsLoaded to true after a delay to avoid blocking
            setTimeout(() => setFontsLoaded(true), 1000);
        });
    }, []);

    // Wait for API to be ready
    useEffect(() => {
        if (excalidrawAPI && !isReady) {
            console.log('[Excalidraw] API received, waiting for initialization...');
            // Give Excalidraw time to fully initialize
            setTimeout(() => {
                console.log('[Excalidraw] Marking as ready');
                setIsReady(true);
            }, 500);
        }
    }, [excalidrawAPI, isReady]);

    useEffect(() => {
        // Log state to debug why effect might not run
        if (frame < 3 || frame % 30 === 0) {
            console.log(`[Excalidraw Debug] Frame ${frame} - API: ${!!excalidrawAPI}, Fonts: ${fontsLoaded}, Ready: ${isReady}`);
        }
        
        if (excalidrawAPI && fontsLoaded && isReady) {
            console.log(`[Excalidraw] Running effect for frame ${frame}`);
            const rawElements = getArchitectureElements(frame);
            
            // Use restoreElements directly on mixed format elements (some full, some skeleton)
            // This ensures all properties are correctly set with defaults
            // refreshDimensions: false since we provide dimensions and headless mode may fail to measure
            const elements = restoreElements(rawElements, null, {
                refreshDimensions: false, // Use provided dimensions
                repairBindings: true,
                normalizeIndices: true
            });
            
            // Log text elements for debugging
            const textElements = elements.filter(el => el.type === 'text');
            console.log(`[Excalidraw] Frame ${frame}: ${elements.length} total elements, ${textElements.length} text elements`);
            
            if (textElements.length > 0 && (frame < 5 || frame % 30 === 0)) {
                const firstText = textElements[0];
                console.log(`[Excalidraw] Sample text element:`, {
                    id: firstText.id,
                    text: firstText.text,
                    opacity: firstText.opacity,
                    width: firstText.width,
                    height: firstText.height,
                    x: firstText.x,
                    y: firstText.y,
                    strokeColor: firstText.strokeColor,
                    fontSize: firstText.fontSize,
                    fontFamily: firstText.fontFamily
                });
            }
            
            // Check scene after update (for frames where effect first runs)
            const isFirstRun = frame >= 9 && frame <= 12; // Effect starts around frame 9
            if (isFirstRun) {
                setTimeout(() => {
                    try {
                        const sceneElements = excalidrawAPI.getSceneElements();
                        const sceneTextElements = sceneElements.filter(el => el.type === 'text');
                        console.log(`[Excalidraw] Scene check frame ${frame}: ${sceneElements.length} total, ${sceneTextElements.length} text`);
                        
                        if (sceneTextElements.length > 0) {
                            const sceneText = sceneTextElements[0];
                            console.log(`[Excalidraw] Scene text element:`, {
                                id: sceneText.id,
                                text: sceneText.text,
                                width: sceneText.width,
                                height: sceneText.height,
                                opacity: sceneText.opacity,
                                strokeColor: sceneText.strokeColor
                            });
                        } else {
                            console.log(`[Excalidraw] WARNING: No text elements in scene!`);
                        }
                        
                        // Check DOM - look for both SVG and canvas rendering
                        const excalidrawContainer = document.querySelector('.excalidraw, [class*="excalidraw"]');
                        if (excalidrawContainer) {
                            const svgs = excalidrawContainer.querySelectorAll('svg');
                            const canvases = excalidrawContainer.querySelectorAll('canvas');
                            let totalTextNodes = 0;
                            svgs.forEach(svg => {
                                totalTextNodes += svg.querySelectorAll('text, tspan').length;
                            });
                            console.log(`[DOM] Frame ${frame}: Found ${svgs.length} SVGs, ${canvases.length} canvases, ${totalTextNodes} text/tspan nodes`);
                            
                            // If no text nodes, check what's actually in the SVGs
                            if (totalTextNodes === 0 && svgs.length > 0) {
                                console.log(`[DOM] WARNING: No text nodes found in SVGs!`);
                                svgs.forEach((svg, i) => {
                                    console.log(`[DOM] SVG ${i}:`, {
                                        children: svg.children.length,
                                        innerHTMLLength: svg.innerHTML.length,
                                        hasText: svg.innerHTML.includes('text'),
                                        hasTspan: svg.innerHTML.includes('tspan'),
                                        innerHTMLPreview: svg.innerHTML.substring(0, 200)
                                    });
                                });
                                
                                // Check if text might be rendered to canvas
                                if (canvases.length > 0) {
                                    console.log(`[DOM] Found ${canvases.length} canvas elements - text is rendered to canvas`);
                                    canvases.forEach((canvas, i) => {
                                        const ctx = canvas.getContext('2d');
                                        const imageData = ctx ? ctx.getImageData(0, 0, Math.min(100, canvas.width), Math.min(100, canvas.height)) : null;
                                        const hasContent = imageData ? Array.from(imageData.data).some(pixel => pixel !== 0) : false;
                                        console.log(`[DOM] Canvas ${i}:`, {
                                            width: canvas.width,
                                            height: canvas.height,
                                            hasContent: hasContent,
                                            className: canvas.className
                                        });
                                    });
                                }
                            }
                        } else {
                            console.log(`[DOM] Frame ${frame}: Excalidraw container not found`);
                        }
                    } catch (e) {
                        console.log(`[Excalidraw] Error checking scene: ${e}`);
                    }
                }, 1500);
            }
            
            // Update scene - text rendering requires multiple updates sometimes
            excalidrawAPI.updateScene({
                elements,
                appState: {
                    viewModeEnabled: false // Keep false for proper rendering
                }
            });
            
            // Force refresh to update canvas rendering
            excalidrawAPI.refresh();

            // Center content once
            if (!centered && elements.length > 0) {
                setTimeout(() => {
                    excalidrawAPI.scrollToContent(elements, { fitToContent: true });
                    setCentered(true);
                }, 100);
            }
            
            // Force Excalidraw to render text to canvas
            // Text rendering may require multiple update cycles
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    // Force another update to trigger text rendering
                    excalidrawAPI.updateScene({ elements });
                    excalidrawAPI.refresh();
                    
                    requestAnimationFrame(() => {
                        // One more update cycle for text rendering
                        excalidrawAPI.updateScene({ elements });
                    });
                });
            });
        }
    }, [frame, excalidrawAPI, fontsLoaded, isReady, centered]);

    if (!fontsLoaded) {
        return <div>Loading fonts...</div>;
    }

    return (
        <div style={{ height: "100vh", width: "100vw" }}>
            <Excalidraw
                excalidrawAPI={(api) => {
                    console.log('[Excalidraw] API callback fired!', !!api);
                    setExcalidrawAPI(api);
                }}
                viewModeEnabled={false}
                zenModeEnabled={true}
                gridModeEnabled={false}
                UIOptions={{
                    canvasActions: {
                        loadScene: false,
                        saveToActiveFile: false,
                        export: false,
                        toggleTheme: false,
                    },
                    tools: {
                        image: false,
                    },
                }}
                initialData={{
                    appState: { 
                        viewModeEnabled: false,
                        viewBackgroundColor: "#ffffff"
                    }
                }}
            />
        </div>
    );
}
