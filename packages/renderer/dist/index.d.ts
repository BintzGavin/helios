export interface RendererOptions {
    width: number;
    height: number;
    fps: number;
    durationInSeconds: number;
}
export declare class Renderer {
    private options;
    constructor(options: RendererOptions);
    render(compositionUrl: string, outputPath: string): Promise<void>;
}
