export interface StudioComponentDefinition {
  name: string;
  description?: string;
  type: string;
  files: { name: string; content: string }[];
  dependencies?: Record<string, string>;
}

export interface StudioPluginOptions {
  /** Explicit project directory, pinned for the lifetime of this Studio process. */
  projectRoot?: string;
  remoteMcp?: import('./remote-startup').RemoteMcpOptions;
  studioRoot?: string;
  skillsRoot?: string;
  components?: StudioComponentDefinition[];
  onInstallComponent?: (name: string) => Promise<void>;
  onRemoveComponent?: (name: string) => Promise<void>;
  onUpdateComponent?: (name: string) => Promise<void>;
  onCheckInstalled?: (name: string) => Promise<boolean>;
}
