export interface Signal<T> {
  value: T;
  peek(): T;
  subscribe(fn: (value: T) => void): () => void;
}

export interface ReadonlySignal<T> {
  readonly value: T;
  peek(): T;
  subscribe(fn: (value: T) => void): () => void;
}

export interface Subscription {
  unsubscribe(): void;
}

type Subscriber = {
  notify(): void;
  addDependency(dep: Subscribable): void;
};

type Subscribable = {
  addSubscriber(sub: Subscriber): void;
  removeSubscriber(sub: Subscriber): void;
  version: number;
};

// Global context
let activeSubscriber: Subscriber | null = null;

export function untracked<T>(fn: () => T): T {
  const prevActive = activeSubscriber;
  activeSubscriber = null;
  try {
    return fn();
  } finally {
    activeSubscriber = prevActive;
  }
}

class SignalImpl<T> implements Signal<T>, Subscribable {
  private _value: T;
  private _subscribers = new Set<Subscriber>();
  public version = 0;

  constructor(value: T) {
    this._value = value;
  }

  get value() {
    if (activeSubscriber) {
      activeSubscriber.addDependency(this);
    }
    return this._value;
  }

  set value(newValue: T) {
    if (this._value !== newValue) {
      this._value = newValue;
      this.version++;
      // Notify subscribers
      // We copy to avoid issues if subscribers list changes during emit
      for (const sub of [...this._subscribers]) {
        sub.notify();
      }
    }
  }

  peek(): T {
    return this._value;
  }

  subscribe(fn: (value: T) => void): () => void {
    const sub: Subscriber = {
      notify: () => untracked(() => fn(this.peek())),
      addDependency: () => {},
    };
    this.addSubscriber(sub);
    untracked(() => fn(this.peek()));
    return () => this.removeSubscriber(sub);
  }

  addSubscriber(sub: Subscriber) {
    this._subscribers.add(sub);
  }

  removeSubscriber(sub: Subscriber) {
    this._subscribers.delete(sub);
  }
}

export function signal<T>(value: T): Signal<T> {
  return new SignalImpl(value);
}

class ComputedImpl<T> implements ReadonlySignal<T>, Subscriber, Subscribable {
  private _fn: () => T;
  private _value: T | undefined;
  private _dirty = true;
  private _subscribers = new Set<Subscriber>();
  private _dependencies = new Map<Subscribable, number>();
  public version = 0;

  constructor(fn: () => T) {
    this._fn = fn;
  }

  get value() {
    // If accessed by an active subscriber (e.g. an effect or another computed),
    // register dependency.
    if (activeSubscriber) {
      activeSubscriber.addDependency(this);
    }

    // Determine if we need to re-compute
    if (this._shouldUpdate()) {
      this._updateValue();
    }

    return this._value!;
  }

  peek(): T {
    if (this._shouldUpdate()) {
      // If we need update, we have to run.
      // But peek shouldn't subscribe the *caller*.

      // If we are hot, we update normally (maintaining subs).
      if (this._subscribers.size > 0) {
        this._updateValue();
        return this._value!;
      }

      // If we are cold, we just compute temporarily.
      // But we must NOT capture deps for this peek if we are just peeking?
      // Actually, if we are cold and dirty, we compute.
      // But since we are not being 'read' (subscribed to), we don't need to track deps?
      // Wait, if we compute, we might want to cache?
      // If we cache, we need to know when to invalidate.
      // If we don't track deps, we can't invalidate.
      // So peek on cold dirty computed -> just run and don't cache?

      const prevActive = activeSubscriber;
      activeSubscriber = null;
      try {
        return this._fn();
      } finally {
        activeSubscriber = prevActive;
      }
    }
    return this._value!;
  }

  private _shouldUpdate(): boolean {
    if (this._dirty) return true;
    // If not dirty, check if any dependency has changed (version mismatch)
    for (const [dep, version] of this._dependencies) {
      if (dep.version !== version) {
        return true;
      }
    }
    return false;
  }

  private _updateValue() {
    // Before running, we need to handle deps.
    // If Hot: Unsubscribe from old deps, then run (which will add new deps).
    // If Cold: Clear old deps (no unsubscribe needed as we weren't subscribed), then run.

    const isHot = this._subscribers.size > 0;

    if (isHot) {
      this._cleanupDeps();
    } else {
      this._dependencies.clear();
    }

    // Now activeSubscriber = this.
    // If Hot, addDependency will subscribe.
    // If Cold, addDependency will NOT subscribe, but WILL track.

    const prevActive = activeSubscriber;
    activeSubscriber = this;
    try {
      const newValue = this._fn();
      if (this._value !== newValue) {
         this._value = newValue;
         this.version++;
      }
      this._dirty = false;
    } finally {
      activeSubscriber = prevActive;
    }
  }

  notify() {
    if (!this._dirty) {
      this._dirty = true;
      for (const sub of [...this._subscribers]) {
        sub.notify();
      }
    }
  }

  addDependency(dep: Subscribable) {
    // Always track deps for version validation
    // Only subscribe if we are hot
    const isHot = this._subscribers.size > 0;

    if (!this._dependencies.has(dep)) {
        if (isHot) {
            dep.addSubscriber(this);
        }
        this._dependencies.set(dep, dep.version);
    } else {
        // Update version of existing dep
        this._dependencies.set(dep, dep.version);
    }
  }

  subscribe(fn: (value: T) => void): () => void {
    const sub: Subscriber = {
      notify: () => untracked(() => fn(this.peek())),
      addDependency: () => {},
    };
    this.addSubscriber(sub);
    untracked(() => fn(this.peek()));
    return () => this.removeSubscriber(sub);
  }

  addSubscriber(sub: Subscriber) {
    const wasCold = this._subscribers.size === 0;
    this._subscribers.add(sub);

    if (wasCold) {
        // Transition Cold -> Hot.
        // We need to subscribe to all tracked dependencies.
        // Note: Some might be stale, but _shouldUpdate next time will fix it.
        for (const [dep] of this._dependencies) {
            dep.addSubscriber(this);
        }
    }
  }

  removeSubscriber(sub: Subscriber) {
    this._subscribers.delete(sub);
    if (this._subscribers.size === 0) {
      // Transition Hot -> Cold.
      // Unsubscribe from all deps, but KEEP tracking them (don't clear map).
      for (const [dep] of this._dependencies) {
          dep.removeSubscriber(this);
      }
      // Note: We don't mark dirty here because our cache is still valid relative to versions we hold.
      // But if a dep changes later, we won't be notified.
      // So _shouldUpdate will check versions.
    }
  }

  private _cleanupDeps() {
    for (const [dep] of this._dependencies) {
      dep.removeSubscriber(this);
    }
    this._dependencies.clear();
  }
}

export function computed<T>(fn: () => T): ReadonlySignal<T> {
  return new ComputedImpl(fn);
}

class EffectImpl implements Subscriber {
  private _fn: () => void;
  private _dependencies = new Set<Subscribable>();
  private _disposed = false;

  constructor(fn: () => void) {
    this._fn = fn;
  }

  run() {
    if (this._disposed) return;

    // Cleanup old deps
    this._cleanupDeps();

    const prevActive = activeSubscriber;
    activeSubscriber = this;
    try {
      this._fn();
    } finally {
      activeSubscriber = prevActive;
    }
  }

  notify() {
    this.run();
  }

  addDependency(dep: Subscribable) {
    if (!this._dependencies.has(dep)) {
      dep.addSubscriber(this);
      this._dependencies.add(dep);
    }
  }

  private _cleanupDeps() {
    for (const dep of this._dependencies) {
      dep.removeSubscriber(this);
    }
    this._dependencies.clear();
  }

  dispose() {
    this._disposed = true;
    this._cleanupDeps();
  }
}

export function effect(fn: () => void): () => void {
  const e = new EffectImpl(fn);
  e.run();
  return () => e.dispose();
}
