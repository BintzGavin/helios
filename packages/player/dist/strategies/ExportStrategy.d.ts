import { Helios } from "@helios-project/core";
export interface ExportStrategy {
    export(helios: Helios, iframe: HTMLIFrameElement, onProgress: (progress: number) => void): Promise<void>;
}
