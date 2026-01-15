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
export function createAnimationController() {
  // Animation timing configuration
  let timing: AnimationTiming = {
    startTime: 0,
    endTime: 5,
    totalDuration: 5,
  };

  const box = document.querySelector(".animated-box") as HTMLElement;

  // Function to update animation progress directly
  function updateAnimationProgress(progress: number) {
    if (box) {
      box.style.setProperty("--animation-progress", progress.toString());
    }
  }

  // Function to set animation timing
  function setAnimationTiming(
    startTime: number,
    endTime: number,
    totalDuration: number
  ) {
    timing = { startTime, endTime, totalDuration };

    if (box) {
      box.style.setProperty("--animation-start-time", startTime + "s");
      box.style.setProperty("--animation-end-time", endTime + "s");
      box.style.setProperty("--animation-duration", totalDuration + "s");
    }
  }

  // Function to update animation based on current time
  function updateAnimationAtTime(currentTime: number, totalDuration: number) {
    if (box) {
      // Calculate animation progress based on timing
      let progress = 0;
      if (currentTime >= timing.startTime && currentTime <= timing.endTime) {
        // Animation is active
        progress =
          (currentTime - timing.startTime) /
          (timing.endTime - timing.startTime);
      } else if (currentTime > timing.endTime) {
        // Animation has finished
        progress = 1;
      }
      // If currentTime < startTime, progress remains 0

      box.style.setProperty("--animation-progress", progress.toString());
    }
  }

  // Attach functions to window for the player to use
  (window as any).updateAnimationProgress = updateAnimationProgress;
  (window as any).setAnimationTiming = setAnimationTiming;
  (window as any).updateAnimationAtTime = updateAnimationAtTime;

  return {
    updateAnimationProgress,
    setAnimationTiming,
    updateAnimationAtTime,
    timing,
  };
}

/**
 * Helper function to initialize animation CSS custom properties
 * Call this in your composition to set up the animation system
 */
export function initializeAnimation(elementSelector: string = ".animated-box") {
  const element = document.querySelector(elementSelector) as HTMLElement;
  if (element) {
    // Set default CSS custom properties
    element.style.setProperty("--animation-progress", "0");
    element.style.setProperty("--animation-start-time", "0s");
    element.style.setProperty("--animation-end-time", "5s");
    element.style.setProperty("--animation-duration", "5s");
  }

  // Create and return the animation controller
  return createAnimationController();
}
