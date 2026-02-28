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

  const tokens: string[] = [];
  let currentToken = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let isEscaped = false;
  let hasExplicitQuotes = false;

  const trimmedCommand = commandString.trim();

  for (let i = 0; i < trimmedCommand.length; i++) {
    const char = trimmedCommand[i];

    if (isEscaped) {
      currentToken += char;
      isEscaped = false;
      continue;
    }

    if (char === '\\') {
      isEscaped = true;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      hasExplicitQuotes = true;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      hasExplicitQuotes = true;
      continue;
    }

    if (/\s/.test(char) && !inSingleQuote && !inDoubleQuote) {
      if (currentToken.length > 0 || hasExplicitQuotes) {
        tokens.push(currentToken);
        currentToken = '';
        hasExplicitQuotes = false;
      }
      continue;
    }

    currentToken += char;
  }

  if (currentToken.length > 0 || hasExplicitQuotes) {
    tokens.push(currentToken);
  }

  const command = tokens[0];
  const args = tokens.slice(1);

  return { command, args };
}
