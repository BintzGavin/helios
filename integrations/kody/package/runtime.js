import { kody, packageStorage } from 'kody:runtime';
import { createWorkflow } from './workflow.js';
export const workflow = () => createWorkflow(kody.mcp['helios'], packageStorage());
