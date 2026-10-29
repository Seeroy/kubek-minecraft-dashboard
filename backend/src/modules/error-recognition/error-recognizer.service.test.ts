import { expect, test } from "bun:test";
import { ErrorRecognizerService } from "./error-recognizer.service";

const recognizer = new ErrorRecognizerService();

test("port out of range is an invalid port, not a busy one", () => {
  const result = recognizer.recognizeError(
    "java.lang.IllegalArgumentException: port out of range:255682",
  );
  expect(result?.errorType).toBe("port_invalid");
});

test("busy port still maps to bind failure", () => {
  expect(
    recognizer.recognizeError("java.net.BindException: Address already in use")
      ?.errorType,
  ).toBe("port_bind_failed");
});

test("plain lines are not errors", () => {
  expect(recognizer.recognizeError("[Server thread/INFO]: Done (3.2s)!")).toBe(
    null,
  );
});
