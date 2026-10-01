import fs from 'fs';
import path from 'path';

/** A path argument the tools refuse: outside the project root, missing, or the wrong kind. */
export class PathError extends Error {}

/** True when target is root itself or somewhere below it. Both must be absolute. */
export function isInside(root: string, target: string): boolean {
  const rel = path.relative(root, target);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel));
}

/** A path relative to root with forward slashes, as tools report it. */
export function toRootRelative(root: string, abs: string): string {
  return path.relative(root, abs).split(path.sep).join('/');
}

export interface ResolvedPath {
  /** Absolute, symlinks resolved as far as the path exists. */
  abs: string;
  /** Relative to the root, with forward slashes. */
  rel: string;
}

export interface ResolveOptions {
  /** 'file' and 'directory' require the path to exist as that kind; 'new' allows it not to exist yet. */
  kind: 'file' | 'directory' | 'new';
  /** Names the argument in error messages, e.g. "path" or "output". */
  label?: string;
}

/**
 * Resolves a tool's path argument against the (already realpath'd) project root and rejects
 * anything that escapes it, before or after following symlinks.
 */
export async function resolveInRoot(root: string, input: string, options: ResolveOptions): Promise<ResolvedPath> {
  const label = options.label ?? 'path';
  if (typeof input !== 'string' || input.trim() === '') {
    throw new PathError(`${label} must be a path inside the project`);
  }
  if (input.includes('\0')) throw new PathError(`${label} contains a NUL byte`);
  const lexical = path.resolve(root, input);
  if (!isInside(root, lexical)) {
    throw new PathError(`${label} "${input}" is outside the project root (${root})`);
  }

  let real: string;
  if (options.kind === 'new') {
    real = await realpathOfNearestAncestor(lexical);
  } else {
    try {
      real = await fs.promises.realpath(lexical);
    } catch {
      throw new PathError(`${label} "${input}" was not found in the project (${root})`);
    }
  }
  if (!isInside(root, real)) {
    throw new PathError(`${label} "${input}" resolves outside the project root (${root})`);
  }

  if (options.kind !== 'new') {
    const stat = await fs.promises.stat(real);
    if (options.kind === 'file' && !stat.isFile()) throw new PathError(`${label} "${input}" is not a file`);
    if (options.kind === 'directory' && !stat.isDirectory()) throw new PathError(`${label} "${input}" is not a directory`);
  }
  return { abs: real, rel: toRootRelative(root, real) };
}

/** Follows symlinks in the part of the path that exists and appends the rest unchanged. */
async function realpathOfNearestAncestor(abs: string): Promise<string> {
  const rest: string[] = [];
  let current = abs;
  for (;;) {
    try {
      const real = await fs.promises.realpath(current);
      return rest.length ? path.join(real, ...rest.reverse()) : real;
    } catch {
      // Something is there but can't be resolved: a dangling symlink, which a write would follow.
      const dangling = await fs.promises.lstat(current).then(() => true, () => false);
      if (dangling) throw new PathError(`"${current}" is a broken symlink`);
      const parent = path.dirname(current);
      if (parent === current) return abs;
      rest.push(path.basename(current));
      current = parent;
    }
  }
}
