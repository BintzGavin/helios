import { Helios } from "@helios-project/core";
import { ExportStrategy } from "./ExportStrategy";
export declare class CanvasExportStrategy implements ExportStrategy {
    export(helios: Helios, iframe: HTMLIFrameElement, onProgress: (progress: number) => void): Promise<void>;
}
