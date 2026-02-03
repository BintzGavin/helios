export const getArchitectureElements = (frame) => {
    // Helper to create rectangle
    const createRect = (id, x, y, w, h, bg, opacity = 100, strokeColor = "#1e1e1e") => ({
        type: "rectangle",
        version: frame,
        versionNonce: Math.floor(Math.random() * 1000000),
        isDeleted: false,
        id,
        fillStyle: "solid",
        strokeWidth: 2,
        strokeStyle: "solid",
        roughness: 1,
        opacity,
        angle: 0,
        x, y,
        strokeColor,
        backgroundColor: bg,
        width: w,
        height: h,
        seed: 1,
        groupIds: [],
        strokeSharpness: "sharp",
        boundElements: [],
        updated: 1,
        link: null,
        locked: false,
        roundness: { type: 3 },
    });

    // Helper to create text - use full element format like rectangles/arrows
    const createText = (id, x, y, text, opacity = 100, fontSize = 16, fontFamily = 1) => {
        // Estimate text dimensions - Excalidraw uses approximate 0.6x multiplier for width
        const estimatedWidth = Math.max(text.length * fontSize * 0.6, fontSize);
        const estimatedHeight = fontSize + 4;
        
        return {
            type: "text",
            version: frame,
            versionNonce: Math.floor(Math.random() * 1000000),
            isDeleted: false,
            id,
            fillStyle: "solid",
            strokeWidth: 1,
            strokeStyle: "solid",
            roughness: 1,
            opacity: Math.max(1, opacity), // Ensure opacity is at least 1
            angle: 0,
            x, y,
            strokeColor: "#1e1e1e", // Black text color
            backgroundColor: "transparent",
            width: estimatedWidth,
            height: estimatedHeight,
            seed: 1,
            groupIds: [],
            strokeSharpness: "sharp",
            boundElements: [],
            updated: 1,
            link: null,
            locked: false,
            text: text || "", // Ensure text is never undefined
            originalText: text || "", // Store original text
            fontSize,
            fontFamily, // 1 = Excalifont (Virgil), 2 = Nunito, 3 = Comic Shanns
            textAlign: "center",
            verticalAlign: "middle",
            baseline: fontSize - 2, // Baseline offset
        };
    };

    // Helper to create arrow
    const createArrow = (id, x, y, points, opacity = 100, strokeColor = "#1e1e1e", strokeWidth = 2) => ({
        type: "arrow",
        version: frame,
        versionNonce: Math.floor(Math.random() * 1000000),
        isDeleted: false,
        id,
        fillStyle: "solid",
        strokeWidth,
        strokeStyle: "solid",
        roughness: 1,
        opacity,
        angle: 0,
        x, y,
        strokeColor,
        backgroundColor: "transparent",
        width: Math.abs(points[points.length-1][0]),
        height: Math.abs(points[points.length-1][1]) || 1,
        seed: 1,
        groupIds: [],
        strokeSharpness: "round",
        boundElements: [],
        updated: 1,
        link: null,
        locked: false,
        points,
        roundness: { type: 2 },
    });

    // Helper to create ellipse (for signal dots)
    const createEllipse = (id, x, y, w, h, bg, opacity = 100) => ({
        type: "ellipse",
        version: frame,
        versionNonce: Math.floor(Math.random() * 1000000),
        isDeleted: false,
        id,
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 0,
        opacity,
        angle: 0,
        x, y,
        strokeColor: bg,
        backgroundColor: bg,
        width: w,
        height: h,
        seed: 1,
        groupIds: [],
        strokeSharpness: "sharp",
        boundElements: [],
        updated: 1,
        link: null,
        locked: false,
    });

    const elements = [];
    
    // Animation phases (30fps, 30 seconds = 900 frames)
    // Phase 1 (0-180): Title and composition appear
    // Phase 2 (180-360): Core package appears with signals
    // Phase 3 (360-540): Player and Renderer branches appear
    // Phase 4 (540-720): Studio and CLI appear
    // Phase 5 (720-900): Data flows animate

    // === TITLE ===
    const titleOpacity = Math.min(100, frame * 5 / 3); // Scaled for 30 seconds
    elements.push(createText('title', 320, 20, 'Helios Architecture', titleOpacity, 28, 1));
    elements.push(createText('subtitle', 300, 55, 'Programmatic Video Creation Engine', Math.max(0, Math.min(100, (frame - 30) * 5 / 3)), 14, 1));

    // === COMPOSITION (Center piece) ===
    const compStart = 90; // 30 * 3
    const compOpacity = Math.max(0, Math.min(100, (frame - compStart) * 4 / 3));
    
    // Composition box - the user's video project
    elements.push(createRect('comp-box', 350, 140, 180, 100, '#fef3c7', compOpacity, '#d97706'));
    elements.push(createText('comp-label', 375, 165, 'Composition', compOpacity, 18));
    elements.push(createText('comp-sub', 385, 190, '(Your Video)', compOpacity, 12));
    elements.push(createText('comp-tech', 370, 210, 'HTML + Any Framework', compOpacity, 10));

    // === CORE PACKAGE ===
    const coreStart = 180; // 60 * 3
    const coreOpacity = Math.max(0, Math.min(100, (frame - coreStart) * 4 / 3));
    
    // Core is below composition - the engine
    elements.push(createRect('core-box', 350, 290, 180, 120, '#dbeafe', coreOpacity, '#2563eb'));
    elements.push(createText('core-label', 365, 310, '@helios/core', coreOpacity, 16));
    elements.push(createText('core-sub1', 385, 335, 'Signals', coreOpacity, 11));
    elements.push(createText('core-sub2', 385, 350, 'Time Drivers', coreOpacity, 11));
    elements.push(createText('core-sub3', 385, 365, 'Animation Helpers', coreOpacity, 11));
    elements.push(createText('core-sub4', 385, 380, 'Sequencing', coreOpacity, 11));

    // Arrow: Composition -> Core
    const compToCoreOpacity = Math.max(0, Math.min(100, (frame - coreStart - 30) * 5 / 3));
    elements.push(createArrow('arrow-comp-core', 440, 240, [[0, 0], [0, 50]], compToCoreOpacity, '#2563eb', 2));

    // === PLAYER (Left branch - Preview) ===
    const playerStart = 300; // 100 * 3
    const playerOpacity = Math.max(0, Math.min(100, (frame - playerStart) * 4 / 3));
    
    elements.push(createRect('player-box', 80, 290, 160, 100, '#dcfce7', playerOpacity, '#16a34a'));
    elements.push(createText('player-label', 95, 310, '@helios/player', playerOpacity, 14));
    elements.push(createText('player-sub1', 105, 335, 'Web Component', playerOpacity, 10));
    elements.push(createText('player-sub2', 105, 350, 'Bridge Mode', playerOpacity, 10));
    elements.push(createText('player-sub3', 105, 365, 'Client Export', playerOpacity, 10));

    // Arrow: Core -> Player
    const coreToPlayerOpacity = Math.max(0, Math.min(100, (frame - playerStart - 30) * 5 / 3));
    elements.push(createArrow('arrow-core-player', 350, 350, [[0, 0], [-110, 0]], coreToPlayerOpacity, '#16a34a', 2));

    // Browser preview below player
    const browserOpacity = Math.max(0, Math.min(100, (frame - playerStart - 60) * 4 / 3));
    elements.push(createRect('browser-box', 80, 430, 160, 60, '#f0fdf4', browserOpacity, '#16a34a'));
    elements.push(createText('browser-label', 105, 450, 'Browser Preview', browserOpacity, 12));

    // Arrow: Player -> Browser
    elements.push(createArrow('arrow-player-browser', 160, 390, [[0, 0], [0, 40]], browserOpacity, '#16a34a', 2));

    // === RENDERER (Right branch - Production) ===
    const rendererStart = 390; // 130 * 3
    const rendererOpacity = Math.max(0, Math.min(100, (frame - rendererStart) * 4 / 3));
    
    elements.push(createRect('renderer-box', 640, 290, 170, 100, '#fce7f3', rendererOpacity, '#db2777'));
    elements.push(createText('renderer-label', 650, 310, '@helios/renderer', rendererOpacity, 14));
    elements.push(createText('renderer-sub1', 665, 335, 'Playwright', rendererOpacity, 10));
    elements.push(createText('renderer-sub2', 665, 350, 'FFmpeg Pipeline', rendererOpacity, 10));
    elements.push(createText('renderer-sub3', 665, 365, 'Zero Disk I/O', rendererOpacity, 10));

    // Arrow: Core -> Renderer
    const coreToRendererOpacity = Math.max(0, Math.min(100, (frame - rendererStart - 30) * 5 / 3));
    elements.push(createArrow('arrow-core-renderer', 530, 350, [[0, 0], [110, 0]], coreToRendererOpacity, '#db2777', 2));

    // Video output below renderer
    const videoOpacity = Math.max(0, Math.min(100, (frame - rendererStart - 60) * 4 / 3));
    elements.push(createRect('video-box', 640, 430, 170, 60, '#fdf2f8', videoOpacity, '#db2777'));
    elements.push(createText('video-label', 675, 450, 'MP4 / WebM', videoOpacity, 12));

    // Arrow: Renderer -> Video
    elements.push(createArrow('arrow-renderer-video', 725, 390, [[0, 0], [0, 40]], videoOpacity, '#db2777', 2));

    // === STUDIO (Top left) ===
    const studioStart = 480; // 160 * 3
    const studioOpacity = Math.max(0, Math.min(100, (frame - studioStart) * 4 / 3));
    
    elements.push(createRect('studio-box', 80, 120, 160, 90, '#e0e7ff', studioOpacity, '#4f46e5'));
    elements.push(createText('studio-label', 100, 140, '@helios/studio', studioOpacity, 14));
    elements.push(createText('studio-sub1', 110, 165, 'Visual Timeline', studioOpacity, 10));
    elements.push(createText('studio-sub2', 110, 180, 'Props Editor', studioOpacity, 10));

    // Arrow: Studio -> Composition
    const studioToCompOpacity = Math.max(0, Math.min(100, (frame - studioStart - 30) * 5 / 3));
    elements.push(createArrow('arrow-studio-comp', 240, 165, [[0, 0], [110, 25]], studioToCompOpacity, '#4f46e5', 2));

    // === CLI (Top right) ===
    const cliStart = 540; // 180 * 3
    const cliOpacity = Math.max(0, Math.min(100, (frame - cliStart) * 4 / 3));
    
    elements.push(createRect('cli-box', 640, 120, 170, 90, '#fef9c3', cliOpacity, '#ca8a04'));
    elements.push(createText('cli-label', 680, 140, '@helios/cli', cliOpacity, 14));
    elements.push(createText('cli-sub1', 680, 165, 'helios studio', cliOpacity, 10));
    elements.push(createText('cli-sub2', 680, 180, 'helios render', cliOpacity, 10));

    // Arrow: CLI -> Composition
    const cliToCompOpacity = Math.max(0, Math.min(100, (frame - cliStart - 30) * 5 / 3));
    elements.push(createArrow('arrow-cli-comp', 640, 165, [[0, 0], [-110, 25]], cliToCompOpacity, '#ca8a04', 2));

    // === FLOW LABELS ===
    const labelStart = 600; // 200 * 3
    const labelOpacity = Math.max(0, Math.min(100, (frame - labelStart) * 4 / 3));
    
    elements.push(createText('preview-flow', 90, 270, 'Preview Flow', labelOpacity, 11));
    elements.push(createText('render-flow', 670, 270, 'Render Flow', labelOpacity, 11));

    // === ANIMATED SIGNAL DOTS ===
    if (frame > 660) { // 220 * 3
        const signalFrame = (frame - 660) % 360; // 12 second loop (was 4 seconds)
        
        // Signal 1: Composition -> Core -> Player -> Browser (green)
        if (signalFrame < 60) {
            const progress = signalFrame / 60;
            let dotX, dotY;
            
            if (progress < 0.33) {
                // Comp to Core
                const p = progress / 0.33;
                dotX = 440;
                dotY = 240 + (p * 50);
            } else if (progress < 0.66) {
                // Core to Player
                const p = (progress - 0.33) / 0.33;
                dotX = 350 - (p * 110);
                dotY = 350;
            } else {
                // Player to Browser
                const p = (progress - 0.66) / 0.34;
                dotX = 160;
                dotY = 390 + (p * 40);
            }
            
            elements.push(createEllipse('signal-green', dotX - 8, dotY - 8, 16, 16, '#22c55e', 100));
        }
        
        // Signal 2: Composition -> Core -> Renderer -> Video (pink)
        if (signalFrame >= 30 && signalFrame < 90) {
            const progress = (signalFrame - 30) / 60;
            let dotX, dotY;
            
            if (progress < 0.33) {
                // Comp to Core
                const p = progress / 0.33;
                dotX = 440;
                dotY = 240 + (p * 50);
            } else if (progress < 0.66) {
                // Core to Renderer
                const p = (progress - 0.33) / 0.33;
                dotX = 530 + (p * 110);
                dotY = 350;
            } else {
                // Renderer to Video
                const p = (progress - 0.66) / 0.34;
                dotX = 725;
                dotY = 390 + (p * 40);
            }
            
            elements.push(createEllipse('signal-pink', dotX - 8, dotY - 8, 16, 16, '#ec4899', 100));
        }
    }

    // === NATIVE BROWSER BADGE ===
    const badgeStart = 720; // 240 * 3
    const badgeOpacity = Math.max(0, Math.min(100, (frame - badgeStart) * 4 / 3));
    
    elements.push(createRect('native-badge', 360, 505, 160, 35, '#f3f4f6', badgeOpacity, '#6b7280'));
    elements.push(createText('native-text', 375, 515, 'Native Browser Engine', badgeOpacity, 11));
    elements.push(createText('native-sub', 395, 530, 'CSS + WAAPI + WebGL', badgeOpacity, 9));

    // Connecting lines to browser and video
    if (badgeOpacity > 50) {
        elements.push(createArrow('badge-left', 360, 522, [[0, 0], [-120, -50]], badgeOpacity, '#9ca3af', 1));
        elements.push(createArrow('badge-right', 520, 522, [[0, 0], [120, -50]], badgeOpacity, '#9ca3af', 1));
    }

    return elements;
};
