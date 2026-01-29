import { render } from 'solid-js/web';
import App from './App';
import { Helios } from '../../../packages/core/src/index.ts';

// Initialize Helios
const helios = new Helios({
  duration: 5,
  fps: 30,
  autoSyncAnimations: true
});
window.helios = helios;
helios.bindToDocumentTimeline();

render(() => <App />, document.getElementById('app'));
