import { describe, expect, it } from "bun:test";
import { SAVED_LINE } from "./world-save.service";

describe("SAVED_LINE", () => {
  it("matches the save confirmation of vanilla, Paper and newer Paper", () => {
    expect(SAVED_LINE.test("[20:57:42 INFO]: Saved the game")).toBe(true);
    expect(SAVED_LINE.test("[20:57:42] [Server thread/INFO]: Saved the game")).toBe(true);
    expect(SAVED_LINE.test("[20:57:42 INFO]: System chat: Saved the game")).toBe(true);
    expect(SAVED_LINE.test("[20:57:42 INFO]: [Server] All dimensions are saved")).toBe(true);
  });

  it("ignores players saying it in chat and the start of the save", () => {
    expect(SAVED_LINE.test("[20:57:42 INFO]: <Steve> Saved the game")).toBe(false);
    expect(SAVED_LINE.test("[20:57:42 INFO]: [Not Secure] <Steve> Saved the game")).toBe(false);
    expect(SAVED_LINE.test("[20:57:42 INFO]: System chat: Saving the game (this may take a moment!)")).toBe(false);
  });
});
