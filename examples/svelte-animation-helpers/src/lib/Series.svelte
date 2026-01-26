<script>
  import { setContext } from 'svelte';
  import { writable, derived } from 'svelte/store';
  import { SERIES_CONTEXT_KEY } from './context';

  // Store for children items: [{id, duration}, ...]
  const items = writable([]);

  const register = (id, duration) => {
    items.update(curr => [...curr, { id, duration }]);

    // Return unregister function
    return () => {
      items.update(curr => curr.filter(i => i.id !== id));
    };
  };

  const update = (id, duration) => {
    items.update(curr => curr.map(i => i.id === id ? { ...i, duration } : i));
  };

  // Calculate cumulative offsets
  const offsets = derived(items, $items => {
    let acc = 0;
    const map = new Map();
    for (const item of $items) {
      map.set(item.id, acc);
      acc += item.duration;
    }
    return map;
  });

  const getOffset = (id) => derived(offsets, $offsets => $offsets.get(id) || 0);

  setContext(SERIES_CONTEXT_KEY, {
    register,
    update,
    getOffset
  });
</script>

<slot />
