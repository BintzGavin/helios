import { Helios } from '@helios-project/core';

export class HeliosState {
    currentFrame = $state(0);
    fps = $state(0);
    duration = $state(0);
    isPlaying = $state(false);

    constructor(helios: Helios) {
        this.fps = helios.fps;
        this.duration = helios.duration;
        this.isPlaying = helios.isPlaying;

        helios.subscribe((state) => {
            this.currentFrame = state.currentFrame;
            this.isPlaying = state.isPlaying;
        });
    }
}
