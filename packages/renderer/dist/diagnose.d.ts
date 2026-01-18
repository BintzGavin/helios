export interface Diagnosis {
    ffmpeg: {
        exists: boolean;
        path: string;
        version: string | null;
    };
    gpu: {
        acceleration: boolean;
        vendor: string | null;
        renderer: string | null;
    };
    playwright: {
        browserInstalled: boolean;
        version: string | null;
    };
}
export declare function diagnose(): Promise<Diagnosis>;
