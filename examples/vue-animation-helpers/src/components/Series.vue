<script>
import { cloneVNode } from 'vue';

function getChildren(slot) {
  const children = slot ? slot() : [];
  return children.flat();
}

export default {
  name: 'Series',
  setup(props, { slots }) {
    return () => {
      let currentFrom = 0;
      const children = getChildren(slots.default);

      return children.map(child => {
        // Robust check for props
        if (!child || typeof child !== 'object') return child;

        // Try to get durationInFrames from props.
        const duration = child.props?.durationInFrames || 0;

        const newFrom = currentFrom;
        currentFrom += Number(duration);

        return cloneVNode(child, { from: newFrom });
      });
    };
  }
}
</script>
