export interface VideoTrackHost {
  handleVideoTrackSelectedChange(track: HeliosVideoTrack): void;
}

export class HeliosVideoTrack {
  private _id: string;
  private _kind: string;
  private _label: string;
  private _language: string;
  private _selected: boolean;
  private _host: VideoTrackHost;

  constructor(id: string, kind: string, label: string, language: string, selected: boolean, host: VideoTrackHost) {
    this._id = id;
    this._kind = kind;
    this._label = label;
    this._language = language;
    this._selected = selected;
    this._host = host;
  }

  get id() { return this._id; }
  get kind() { return this._kind; }
  get label() { return this._label; }
  get language() { return this._language; }

  get selected() { return this._selected; }
  set selected(value: boolean) {
    if (this._selected !== value) {
      this._selected = value;
      this._host.handleVideoTrackSelectedChange(this);
    }
  }

  /**
   * Internal method to update state without triggering host callback.
   * Used when syncing from external state.
   */
  _setSelectedInternal(value: boolean) {
      this._selected = value;
  }
}

export class HeliosVideoTrackList extends EventTarget implements Iterable<HeliosVideoTrack> {
  private tracks: HeliosVideoTrack[] = [];
  private _onaddtrack: ((event: any) => void) | null = null;
  private _onremovetrack: ((event: any) => void) | null = null;
  private _onchange: ((event: any) => void) | null = null;

  get length() { return this.tracks.length; }

  get selectedIndex() {
      return this.tracks.findIndex(t => t.selected);
  }

  [index: number]: HeliosVideoTrack;

  [Symbol.iterator](): Iterator<HeliosVideoTrack> {
    return this.tracks[Symbol.iterator]();
  }

  getTrackById(id: string): HeliosVideoTrack | null {
    return this.tracks.find(t => t.id === id) || null;
  }

  addTrack(track: HeliosVideoTrack) {
    this.tracks.push(track);
    // Enable array-like access
    (this as any)[this.tracks.length - 1] = track;

    const event = new Event('addtrack');
    (event as any).track = track;
    this.dispatchEvent(event);
  }

  removeTrack(track: HeliosVideoTrack) {
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
