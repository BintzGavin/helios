import { createMemo, Show } from 'solid-js';

export function Sequence(props) {
  // props: { frame: () => number, from: number, duration: number, helios: Helios, children: JSX.Element }

  const isActive = createMemo(() => {
    const f = props.frame();
    return f >= props.from && f < (props.from + props.duration);
  });

  const startTime = createMemo(() => props.from / props.helios.fps);

  return (
    <Show when={isActive()}>
      <div
        class="sequence-container"
        style={{
          "--sequence-start": `${startTime()}s`,
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%'
        }}
      >
        {props.children}
      </div>
    </Show>
  );
}
