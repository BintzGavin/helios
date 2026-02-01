import { mount } from 'svelte';
// @ts-ignore
import App from './App.svelte';

const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;
