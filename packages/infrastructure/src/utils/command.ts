/**
 * Parses a command string into a command and arguments array.
 * Currently supports simple space-separated arguments.
 *
 * @param commandString The full command string (e.g., "npm run test -- --watch")
 * @returns Object containing the command and args array
 */
export function parseCommand(commandString: string): { command: string, args: string[] } {
  if (!commandString || commandString.trim().length === 0) {
    throw new Error('Command string cannot be empty');
  }

  // TODO: Implement more robust parsing for quoted arguments if needed
  // For now, simple splitting by space is sufficient for our controlled use cases
  const parts = commandString.trim().split(/\s+/);
  const command = parts[0];
  const args = parts.slice(1);

  return { command, args };
}
