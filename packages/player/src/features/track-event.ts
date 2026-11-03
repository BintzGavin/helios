export class HeliosTrackEvent extends Event {
    public readonly track: any;
    constructor(type: string, eventInitDict?: { track?: any }) {
        super(type);
        this.track = eventInitDict?.track || null;
    }
}
