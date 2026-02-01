export const getArchitectureElements = (frame) => {
    // Helper to create rectangle
    const createRect = (id, x, y, w, h, bg, opacity = 100) => ({
        type: "rectangle",
        version: frame, // Use frame as version to force update
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
        strokeColor: "#000000",
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

    // Helper to create text
    const createText = (id, x, y, text, opacity = 100) => ({
        type: "text",
        version: frame,
        versionNonce: Math.floor(Math.random() * 1000000),
        isDeleted: false,
        id,
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 1,
        opacity,
        angle: 0,
        x, y,
        strokeColor: "#000000",
        backgroundColor: "transparent",
        width: text.length * 8, // Approx width
        height: 20,
        seed: 1,
        groupIds: [],
        strokeSharpness: "sharp",
        boundElements: [],
        updated: 1,
        link: null,
        locked: false,
        text,
        fontSize: 20,
        fontFamily: 1,
        textAlign: "center",
        verticalAlign: "middle",
        baseline: 18,
    });

    // Helper to create arrow
    const createArrow = (id, x, y, points, opacity = 100) => ({
        type: "arrow",
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
        strokeColor: "#000000",
        backgroundColor: "transparent",
        width: Math.abs(points[points.length-1][0]),
        height: Math.abs(points[points.length-1][1]),
        seed: 1,
        groupIds: [],
        strokeSharpness: "round",
        boundElements: [],
        updated: 1,
        link: null,
        locked: false,
        points: points, // [[0,0], [100, 0]] relative to x,y
    });

    // Architecture Components
    const components = [
        // User Code
        { id: 'box-user', label: 'User Composition', x: 50, y: 150, bg: '#e0f7fa' },
        // Helios Core
        { id: 'box-core', label: 'Helios Core', x: 300, y: 150, bg: '#fff9c4' },
        // Framework Adapter
        { id: 'box-adapter', label: 'Framework Adapter', x: 300, y: 50, bg: '#ffccbc' },
        // Renderer/Player
        { id: 'box-renderer', label: 'Renderer / Player', x: 550, y: 150, bg: '#d1c4e9' },
        // Browser Engine
        { id: 'box-browser', label: 'Browser Engine', x: 800, y: 150, bg: '#c8e6c9' },
    ];

    const elements = [];

    components.forEach((comp, index) => {
        // Animation: Fade in one by one
        // Start showing from frame = index * 30
        const startFrame = index * 20;
        const endFrame = startFrame + 20;
        let opacity = 0;
        if (frame >= endFrame) opacity = 100;
        else if (frame > startFrame) opacity = ((frame - startFrame) / 20) * 100;

        elements.push(createRect(comp.id, comp.x, comp.y, 200, 100, comp.bg, opacity));
        elements.push(createText(comp.id + '-text', comp.x + 20, comp.y + 40, comp.label, opacity));

        // Arrow to next
        if (index < components.length - 1) {
            const arrowStart = endFrame;
            let arrowOp = 0;
            if (frame >= arrowStart + 10) arrowOp = 100;
            else if (frame > arrowStart) arrowOp = ((frame - arrowStart) / 10) * 100;

            const nextComp = components[index+1];
            // Arrow from right of current to left of next
            // x: comp.x + 200, y: comp.y + 50
            // target: nextComp.x, y: nextComp.y + 50
            // points relative to start
            const startX = comp.x + 200;
            const startY = comp.y + 50;
            const dx = nextComp.x - startX;
            const dy = nextComp.y + 50 - startY;

            elements.push(createArrow('arrow-' + index, startX, startY, [[0, 0], [dx, dy]], arrowOp));
        }
    });

    // Add logic flow (adapter connection)
    // Adapter connects User Code to Core? Or wraps Core?
    // Let's visualize Adapter -> User Code (hook)
    // Adapter -> Core (bind)

    // Animate a "signal" dot traveling through
    if (frame > 120) {
        const loopFrame = (frame - 120) % 90; // 3 seconds loop
        const totalDist = 750; // approx distance from user to browser
        const progress = loopFrame / 90;

        const dotX = 50 + 100 + (progress * totalDist); // Start center of user box
        const dotY = 200; // center y

        elements.push({
            type: "ellipse",
            version: 1,
            versionNonce: 0,
            isDeleted: false,
            id: "signal-dot",
            fillStyle: "solid",
            strokeWidth: 1,
            strokeStyle: "solid",
            roughness: 0,
            opacity: 100,
            angle: 0,
            x: dotX,
            y: dotY - 10,
            strokeColor: "#ff0000",
            backgroundColor: "#ff0000",
            width: 20,
            height: 20,
            seed: 1,
            groupIds: [],
            strokeSharpness: "sharp",
            boundElements: [],
            updated: 1,
            link: null,
            locked: false,
        });
    }

    return elements;
};
