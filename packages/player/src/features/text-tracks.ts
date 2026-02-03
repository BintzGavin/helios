export type TextTrackMode = 'disabled' | 'hidden' | 'showing';

export interface TrackHost {
    handleTrackModeChange(track: HeliosTextTrack): void;
}

// Shim for VTTCue if not present (e.g. JSDOM, older browsers)
const GlobalVTTCue = (typeof window !== 'undefined' && (window as any).VTTCue) || null;

export class HeliosCue {
  startTime: number;
  endTime: number;
  text: string;

  constructor(startTime: number, endTime: number, text: string) {
    this.startTime = startTime;
    this.endTime = endTime;
    this.text = text;
  }
}

export const CueClass = GlobalVTTCue || HeliosCue;

export class HeliosTextTrack extends EventTarget {
  private _mode: TextTrackMode = 'disabled';
  private _cues: any[] = [];
  private _activeCues: any[] = [];
  private _oncuechange: ((event: Event) => void) | null = null;
  private _kind: string;
  private _label: string;
  private _language: string;
  private _id: string;
  private _host: TrackHost;

  constructor(kind: string, label: string, language: string, host: TrackHost) {
    super();
    this._kind = kind;
    this._label = label;
    this._language = language;
    this._id = Math.random().toString(36).substring(2) + Date.now().toString(36);
    this._host = host;
  }

  get kind() { return this._kind; }
  get label() { return this._label; }
  get language() { return this._language; }
  get id() { return this._id; }
  get cues() { return this._cues; }
  get activeCues() { return this._activeCues; }

  get oncuechange() { return this._oncuechange; }

  set oncuechange(handler: ((event: Event) => void) | null) {
    if (this._oncuechange) {
      this.removeEventListener('cuechange', this._oncuechange);
    }
    this._oncuechange = handler;
    if (handler) {
      this.addEventListener('cuechange', handler);
    }
  }

  get mode(): TextTrackMode {
    return this._mode;
  }

  set mode(value: TextTrackMode) {
    if (this._mode !== value) {
      this._mode = value;
      this._host.handleTrackModeChange(this);
    }
  }

  updateActiveCues(currentTime: number) {
    if (this._mode === 'disabled') {
      if (this._activeCues.length > 0) {
        this._activeCues = [];
        this.dispatchEvent(new Event('cuechange'));
      }
      return;
    }

    const newActiveCues = this._cues.filter(cue =>
      currentTime >= cue.startTime && currentTime < cue.endTime
    );

    let changed = false;
    if (newActiveCues.length !== this._activeCues.length) {
      changed = true;
    } else {
      for (let i = 0; i < newActiveCues.length; i++) {
        if (newActiveCues[i] !== this._activeCues[i]) {
          changed = true;
          break;
        }
      }
    }

    if (changed) {
      this._activeCues = newActiveCues;
      this.dispatchEvent(new Event('cuechange'));
    }
  }

  addCue(cue: any) {
    this._cues.push(cue);
    this._cues.sort((a, b) => a.startTime - b.startTime);

    // If we are showing, we need to update the host (controller) immediately with new cues
    if (this._mode === 'showing') {
        this._host.handleTrackModeChange(this);
    }
  }

  removeCue(cue: any) {
      const idx = this._cues.indexOf(cue);
      if (idx !== -1) {
          this._cues.splice(idx, 1);
          if (this._mode === 'showing') {
              this._host.handleTrackModeChange(this);
          }
      }
  }
}

export class HeliosTextTrackList extends EventTarget implements Iterable<HeliosTextTrack> {
    private tracks: HeliosTextTrack[] = [];
    private _onaddtrack: ((event: any) => void) | null = null;
    private _onremovetrack: ((event: any) => void) | null = null;
    private _onchange: ((event: any) => void) | null = null;

    get length() { return this.tracks.length; }

    [index: number]: HeliosTextTrack;

    [Symbol.iterator](): Iterator<HeliosTextTrack> {
        return this.tracks[Symbol.iterator]();
    }

    addTrack(track: HeliosTextTrack) {
        this.tracks.push(track);
        // Enable array-like access
        (this as any)[this.tracks.length - 1] = track;

        const event = new Event('addtrack');
        (event as any).track = track;
        this.dispatchEvent(event);
    }

    getTrackById(id: string): HeliosTextTrack | null {
        return this.tracks.find(t => t.id === id) || null;
    }

    removeTrack(track: HeliosTextTrack) {
        const index = this.tracks.indexOf(track);
        if (index !== -1) {
            this.tracks.splice(index, 1);

            // Re-index properties
            for (let i = index; i < this.tracks.length; i++) {
                (this as any)[i] = this.tracks[i];
            }
            delete (this as any)[this.tracks.length];

            const event = new Event('removetrack');
            (event as any).track = track;
            this.dispatchEvent(event);
        }
    }

    dispatchChangeEvent() {
        this.dispatchEvent(new Event('change'));
    }

    get onaddtrack() { return this._onaddtrack; }
    set onaddtrack(handler: ((event: any) => void) | null) {
        if (this._onaddtrack) {
            this.removeEventListener('addtrack', this._onaddtrack);
        }
        this._onaddtrack = handler;
        if (handler) {
            this.addEventListener('addtrack', handler);
        }
    }

    get onremovetrack() { return this._onremovetrack; }
    set onremovetrack(handler: ((event: any) => void) | null) {
        if (this._onremovetrack) {
            this.removeEventListener('removetrack', this._onremovetrack);
        }
        this._onremovetrack = handler;
        if (handler) {
            this.addEventListener('removetrack', handler);
        }
    }

    get onchange() { return this._onchange; }
    set onchange(handler: ((event: any) => void) | null) {
        if (this._onchange) {
            this.removeEventListener('change', this._onchange);
        }
        this._onchange = handler;
        if (handler) {
            this.addEventListener('change', handler);
        }
    }
}
