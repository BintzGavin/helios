import { describe, expect, it } from 'vitest';
import { observeTerminal } from '../benchmarks/cloudflare/observe.mjs';

function fixture(type = 'workflow_completed') {
  const events: string[] = [];
  const subscription = {
    async next() { events.push('next'); return { done: false, value: { instanceId: 'qualification-01', type, eventId: 7, timestamp: 12345, output: { private: 'must not copy' }, error: { message: 'must not copy' } } }; },
    [Symbol.dispose]() { events.push('dispose'); },
  };
  const deps = {
    async getInstance() { events.push('get'); return { async subscribe() { events.push('subscribe'); return subscription; } }; },
    async publish(receipt: unknown) { events.push('publish'); },
    onTerminal(receipt: unknown) { events.push('notify'); },
  };
  return { events, deps, subscription };
}

describe('blocking benchmark completion observer', () => {
  it.each(['workflow_completed', 'workflow_errored', 'workflow_terminated'])('retains only bounded metadata for %s and disposes the subscription', async type => {
    const f = fixture(type); const receipt = await observeTerminal('qualification-01', f.deps);
    expect(receipt).toEqual({ instanceId: 'qualification-01', type, eventId: 7, timestamp: 12345 });
    expect(f.events).toEqual(['get', 'subscribe', 'next', 'publish', 'notify', 'dispose']);
  });
  it('does not publish or notify until the actual completion event arrives', async () => {
    const f = fixture(); let complete!: (value: any) => void;
    f.subscription.next = () => new Promise(resolve => { complete = resolve; });
    const pending = observeTerminal('qualification-01', f.deps);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(f.events).toEqual(['get', 'subscribe']);
    complete({ done: false, value: { instanceId: 'qualification-01', type: 'workflow_completed', eventId: 1, timestamp: 10 } });
    await pending; expect(f.events).toContain('publish');
  });
  it.each(['workflow_running', 'unrecognized'])('rejects a nonterminal event: %s', async type => {
    const f = fixture(type); await expect(observeTerminal('qualification-01', f.deps)).rejects.toThrow();
    expect(f.events).not.toContain('publish'); expect(f.events.at(-1)).toBe('dispose');
  });
  it('rejects an invalid identifier before resource work', async () => {
    const f = fixture(); await expect(observeTerminal('../other', f.deps)).rejects.toThrow(); expect(f.events).toEqual([]);
  });
  it('disposes when persistence fails and withholds notification', async () => {
    const f = fixture(); f.deps.publish = async () => { throw new Error('storage failed'); };
    await expect(observeTerminal('qualification-01', f.deps)).rejects.toThrow('storage failed');
    expect(f.events).not.toContain('notify'); expect(f.events.at(-1)).toBe('dispose');
  });
});
