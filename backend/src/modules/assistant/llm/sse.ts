/**
 * Splits a text/event-stream body into the data payloads of its events.
 * Multi line data fields are joined with a newline, comments and other
 * fields are skipped
 */
export async function* readSseData(
  body: AsyncIterable<Uint8Array>,
): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let buffer = "";
  let data: string[] = [];

  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true });
    let newline: number;
    while ((newline = buffer.search(/\r\n|\r|\n/)) >= 0) {
      const line = buffer.slice(0, newline);
      const width = buffer.startsWith("\r\n", newline) ? 2 : 1;
      // A lone \r at the end may be the first half of \r\n
      if (
        width === 1 &&
        buffer[newline] === "\r" &&
        newline === buffer.length - 1
      )
        break;
      buffer = buffer.slice(newline + width);
      if (line === "") {
        if (data.length) yield data.join("\n");
        data = [];
      } else if (line.startsWith("data:")) {
        data.push(line.slice(5).replace(/^ /, ""));
      }
    }
  }
  buffer += decoder.decode();
  if (buffer.startsWith("data:")) data.push(buffer.slice(5).replace(/^ /, ""));
  if (data.length) yield data.join("\n");
}
