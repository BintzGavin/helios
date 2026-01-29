import { describe, it, expect, vi } from 'vitest';
import { Helios } from './index.js';

describe('Helios Stability Registry', () => {
  // Verifies the Observer pattern implementation for stability checks
  it('should allow registering a stability check', () => {
    const helios = new Helios({
      duration: 10,
      fps: 30
    });

    const check = vi.fn().mockResolvedValue(undefined);
    const unregister = helios.registerStabilityCheck(check);

    expect(typeof unregister).toBe('function');
  });

  it('should wait for registered checks in waitUntilStable', async () => {
    const helios = new Helios({
      duration: 10,
      fps: 30
    });

    let resolved = false;
    const check = async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      resolved = true;
    };

    helios.registerStabilityCheck(check);

    const start = performance.now();
    await helios.waitUntilStable();
    const end = performance.now();

    expect(resolved).toBe(true);
    // Relax timing check to handle slight environmental variations (e.g. 49ms)
    expect(end - start).toBeGreaterThanOrEqual(40);
  });

  it('should stop waiting after unregistration', async () => {
    const helios = new Helios({
      duration: 10,
      fps: 30
    });

    const check = vi.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    const unregister = helios.registerStabilityCheck(check);
    unregister();

    await helios.waitUntilStable();

    expect(check).not.toHaveBeenCalled();
  });

  it('should clear checks on dispose', async () => {
    const helios = new Helios({
      duration: 10,
      fps: 30
    });

    const check = vi.fn().mockResolvedValue(undefined);
    helios.registerStabilityCheck(check);

    helios.dispose();

    await helios.waitUntilStable();
    // Re-creating helios or checking internal state would be ideal,
    // but here we verify that calling waitUntilStable after dispose (which clears checks) doesn't invoke the check.
    // However, waitUntilStable might fail or behave unexpectedly if driver is disposed.
    // Instead, we can verify that the check is NOT called if we somehow could.
    // Actually, waitUntilStable calls driver.waitUntilStable.

    // Since we can't easily access the private set, we can rely on the fact that if it was still registered, it would be called.
    // But since helios is disposed, we should create a new one to be clean, or check that the old one doesn't fire.
    // Note: The implementation clears the set on dispose.

    expect(check).not.toHaveBeenCalled();
  });

  it('should propagate errors from checks', async () => {
    const helios = new Helios({
      duration: 10,
      fps: 30
    });

    const check = async () => {
      throw new Error('Stability check failed');
    };

    helios.registerStabilityCheck(check);

    await expect(helios.waitUntilStable()).rejects.toThrow('Stability check failed');
  });

  it('should run multiple checks in parallel', async () => {
      const helios = new Helios({ duration: 10, fps: 30 });

      let check1Finished = false;
      let check2Finished = false;

      const check1 = async () => {
          await new Promise(r => setTimeout(r, 50));
          check1Finished = true;
      };
      const check2 = async () => {
          await new Promise(r => setTimeout(r, 50));
          check2Finished = true;
      };

      helios.registerStabilityCheck(check1);
      helios.registerStabilityCheck(check2);

      const start = performance.now();
      await helios.waitUntilStable();
      const end = performance.now();

      expect(check1Finished).toBe(true);
      expect(check2Finished).toBe(true);
      // If they ran sequentially, it would be >= 100ms. Parallel should be around 50ms.
      // We'll just check it didn't take excessively long (e.g. 100ms + overhead), but strictly logic says Promise.all runs in parallel.
      expect(end - start).toBeLessThan(100);
  });
});
