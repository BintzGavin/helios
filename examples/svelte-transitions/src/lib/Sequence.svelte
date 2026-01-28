<script>
  export let from = 0;
  export let fps = 30;

  $: startTime = from / fps;
</script>

<div class="sequence-wrapper" style="--sequence-start: {startTime}s">
  <slot />
</div>

<style>
  .sequence-wrapper {
    display: contents;
  }
</style>
