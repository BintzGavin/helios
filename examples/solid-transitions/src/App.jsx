import { createSignal, onMount, onCleanup } from 'solid-js';
import { Sequence } from './components/Sequence';

function App(props) {
  const [frame, setFrame] = createSignal(0);

  let unsubscribe;
  onMount(() => {
    unsubscribe = props.helios.subscribe((state) => {
      setFrame(state.currentFrame);
    });
  });

  onCleanup(() => {
    if (unsubscribe) unsubscribe();
  });

  return (
    <div class="container">
      <h1>Solid Transitions</h1>

      {/* Sequence 1: 0-60 frames */}
      <Sequence frame={frame} from={0} duration={60} helios={props.helios}>
        <div class="box fade-in" style={{ background: '#446b9e', top: '100px', left: '100px' }}>
          Solid
        </div>
      </Sequence>

      {/* Sequence 2: 60-120 frames */}
      <Sequence frame={frame} from={60} duration={60} helios={props.helios}>
        <div class="box slide-right" style={{ background: '#e94c4c', top: '250px', left: '100px' }}>
          Moves
        </div>
      </Sequence>
    </div>
  );
}

export default App;
