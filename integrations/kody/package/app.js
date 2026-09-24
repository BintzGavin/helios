import { packageContext } from 'kody:runtime';
import { workflow } from './runtime.js';
import { createApp } from './app-handler.js';
export default createApp(workflow, () => packageContext);
