interface ParsedLog {
  time?: string;
  level?: string;
  message: string;
}

/**
 * Parse lines format 1 ([00:00:00] [Server thread/INFO]...)
 * @param line
 */
function parseLog1(line: string): ParsedLog {
  const match = line.match(
    /^\[(\d{2}:\d{2}:\d{2})](?: \[[^\]]*\/)? ?([A-Z]+)]?:?\s*(.*)$/
  );
  if (!match) {
    return { message: line };
  }
  const [, time, level, message] = match;
  return { time, level, message };
}

/**
 * Parse lines format 2 ([00:00:00 INFO]...)
 * @param line
 */
function parseLog2(line: string): ParsedLog {
  const match = line.match(/^\[(\d{2}:\d{2}:\d{2}) (\w+)\]: (.*)$/);
  if (!match) {
    return { message: line };
  }
  const [, time, level, message] = match;
  return { time, level, message };
}

/**
 * Parse lines format 3 ([2026-11-09 15:45:12:865 INFO]...)
 * @param line
 */
function parseLog3(line: string): ParsedLog {
  const match = line.match(
    /^\[(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}):(\d{3}) (\w+)\](.*)$/
  );
  if (!match) {
    return { message: line };
  }
  const [, , time, , level, message] = match;
  return {
    time, // merge time and milliseconds
    level,
    message,
  };
}

/**
 * Parse server log line
 * @param line
 */
export function parseLog(line: string): ParsedLog {
  // Trying v1
  const result1 = parseLog1(line);
  if (result1.time || result1.level) {
    return result1;
  }

  // Trying v2
  const result2 = parseLog2(line);
  if (result2.time || result2.level) {
    return result2;
  }

  // Trying v3
  const result3 = parseLog3(line);
  if (result3.time || result3.level) {
    return result3;
  }

  // If no one parses, return v1 result (only message)
  return result1;
}
