export interface AudioTrackHost {
  handleAudioTrackEnabledChange(track: HeliosAudioTrack): void;
}

export class HeliosAudioTrack {
  private _id: string;
  private _kind: string;
  private _label: string;
  private _language: string;
  private _enabled: boolean;
  private _host: AudioTrackHost;

  constructor(id: string, kind: string, label: string, language: string, enabled: boolean, host: AudioTrackHost) {
    this._id = id;
    this._kind = kind;
    this._label = label;
    this._language = language;
    this._enabled = enabled;
    this._host = host;
  }

  get id() { return this._id; }
  get kind() { return this._kind; }
  get label() { return this._label; }
  get language() { return this._language; }

  get enabled() { return this._enabled; }
  set enabled(value: boolean) {
    if (this._enabled !== value) {
      this._enabled = value;
      this._host.handleAudioTrackEnabledChange(this);
    }
  }

  /**
   * Internal method to update state without triggering host callback.
   * Used when syncing from external state.
   */
  _setEnabledInternal(value: boolean) {
      this._enabled = value;
  }
}

export class HeliosAudioTrackList extends EventTarget implements Iterable<HeliosAudioTrack> {
  private tracks: HeliosAudioTrack[] = [];

  get length() { return this.tracks.length; }

  [index: number]: HeliosAudioTrack;

  [Symbol.iterator](): Iterator<HeliosAudioTrack> {
    return this.tracks[Symbol.iterator]();
  }

  getTrackById(id: string): HeliosAudioTrack | null {
    return this.tracks.find(t => t.id === id) || null;
  }

  addTrack(track: HeliosAudioTrack) {
    this.tracks.push(track);
    // Enable array-like access
    (this as any)[this.tracks.length - 1] = track;

    const event = new Event('addtrack');
    (event as any).track = track;
    this.dispatchEvent(event);
  }

  removeTrack(track: HeliosAudioTrack) {
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

  // Helper to dispatch change event
  dispatchChangeEvent() {
      this.dispatchEvent(new Event('change'));
  }

  // Standard event handler properties
  set onaddtrack(handler: ((event: any) => void) | null) {
    if (handler) {
      this.addEventListener('addtrack', handler);
    }
  }

  set onremovetrack(handler: ((event: any) => void) | null) {
    if (handler) {
      this.addEventListener('removetrack', handler);
    }
  }

  set onchange(handler: ((event: any) => void) | null) {
    if (handler) {
      this.addEventListener('change', handler);
    }
  }
}
