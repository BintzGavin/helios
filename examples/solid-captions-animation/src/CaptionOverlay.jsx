import { createCaptions } from './hooks/createCaptions';
import { For } from 'solid-js';

export function CaptionOverlay(props) {
  const captions = createCaptions(props.helios);

  return (
    <div style={{
      position: 'absolute',
      bottom: '50px',
      left: 0,
      width: '100%',
      "text-align": 'center',
      "font-family": 'sans-serif',
      color: 'white',
      "text-shadow": '0px 2px 4px rgba(0,0,0,0.8)',
      "font-size": '40px'
    }}>
      <For each={captions()}>{(cue) =>
        <div data-testid="caption-cue">
          {cue.text}
        </div>
      }</For>
    </div>
  );
}
