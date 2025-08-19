/**
 * Animation helpers for Helios compositions
 * Provides framework-agnostic animation control functions
 */
export interface AnimationTiming {
    startTime: number;
    endTime: number;
    totalDuration: number;
}
export interface AnimationState {
    progress: number;
    isActive: boolean;
    isComplete: boolean;
}
/**
 * Creates animation control functions and attaches them to the window object
 * This allows the player to control animations in the composition
 */
export declare function createAnimationController(): {
    updateAnimationProgress: (progress: number) => void;
    setAnimationTiming: (startTime: number, endTime: number, totalDuration: number) => void;
    updateAnimationAtTime: (currentTime: number, totalDuration: number) => void;
    timing: AnimationTiming;
};
/**
 * Helper function to initialize animation CSS custom properties
 * Call this in your composition to set up the animation system
 */
export declare function initializeAnimation(elementSelector?: string): {
    updateAnimationProgress: (progress: number) => void;
    setAnimationTiming: (startTime: number, endTime: number, totalDuration: number) => void;
    updateAnimationAtTime: (currentTime: number, totalDuration: number) => void;
    timing: AnimationTiming;
};
