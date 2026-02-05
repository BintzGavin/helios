/* @refresh reload */
import { render } from 'solid-js/web';
import App from './App';
import './helios'; // Initialize Helios

const root = document.getElementById('root');

if (root instanceof HTMLElement) {
  render(() => <App />, root);
}
