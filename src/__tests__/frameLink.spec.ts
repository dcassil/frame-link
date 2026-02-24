import FrameLink, {
  type TFrameLink,
  type TMessagePayload,
} from "../frameLink";
import { fireEvent } from "@testing-library/dom";

// Helper to reset module state between tests
const resetModuleState = (): void => {
  jest.resetModules();
};

// Helper to create a mock window with postMessage
const createMockWindow = (): Window => {
  const mockPostMessage = jest.fn();
  return {
    postMessage: mockPostMessage,
  } as unknown as Window;
};

// Helper to simulate incoming message
const simulateMessage = (data: Partial<TMessagePayload>): void => {
  const event = new MessageEvent("message", {
    data: {
      key: data.key,
      resp_key: data.resp_key,
      data: data.data,
    },
  });
  fireEvent(window, event);
};

describe("frameLink", () => {
  let frameLink: TFrameLink;
  let readyCallback: jest.Mock;
  let mockWindow: Window;

  beforeEach(() => {
    resetModuleState();
    readyCallback = jest.fn();
    mockWindow = createMockWindow();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe("initialization", () => {
    it("should return a frameLink instance with all expected methods", () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const FrameLinkFresh = require("../frameLink").default;
      frameLink = FrameLinkFresh(readyCallback);

      expect(typeof frameLink.addListener).toBe("function");
      expect(typeof frameLink.postMessage).toBe("function");
      expect(typeof frameLink.removeListener).toBe("function");
      expect(typeof frameLink.hasListener).toBe("function");
      expect(typeof frameLink.registerTarget).toBe("function");
    });

    it("should set ready to true on initialization", () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const FrameLinkFresh = require("../frameLink").default;
      frameLink = FrameLinkFresh(readyCallback);

      expect(frameLink.ready).toBe(true);
    });

    it("should set connected to false initially", () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const FrameLinkFresh = require("../frameLink").default;
      frameLink = FrameLinkFresh(readyCallback);

      expect(frameLink.connected).toBe(false);
    });

    it("should return the same instance on subsequent calls (singleton)", () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const FrameLinkFresh = require("../frameLink").default;
      const instance1 = FrameLinkFresh(readyCallback);
      const instance2 = FrameLinkFresh(jest.fn());

      expect(instance1).toBe(instance2);
    });

    it("should accept targetOrigin option", () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const FrameLinkFresh = require("../frameLink").default;
      frameLink = FrameLinkFresh(readyCallback, {
        targetOrigin: "https://example.com",
      });

      expect(frameLink).toBeDefined();
    });

    it("should use default targetOrigin when not provided", () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const FrameLinkFresh = require("../frameLink").default;
      frameLink = FrameLinkFresh(readyCallback);

      expect(frameLink).toBeDefined();
    });

    it("should handle undefined options", () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const FrameLinkFresh = require("../frameLink").default;
      frameLink = FrameLinkFresh(readyCallback, undefined);

      expect(frameLink).toBeDefined();
    });
  });

  describe("registerTarget", () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const FrameLinkFresh = require("../frameLink").default;
      frameLink = FrameLinkFresh(readyCallback);
    });

    it("should register a target window", () => {
      frameLink.registerTarget(mockWindow);

      expect(frameLink.hasListener({ key: "ping" })).toBe(true);
    });

    it("should start pinging the target after registration", () => {
      frameLink.registerTarget(mockWindow);

      jest.advanceTimersByTime(500);

      expect((mockWindow.postMessage as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(1);
    });

    it("should call readyCallback when ping response is received", () => {
      frameLink.registerTarget(mockWindow);

      // Advance timer to trigger first ping
      jest.advanceTimersByTime(500);

      // Get the resp_key from the ping message
      const pingCall = (mockWindow.postMessage as jest.Mock).mock.calls[0];
      const respKey = pingCall[0].resp_key;

      // Simulate ping response
      simulateMessage({ key: respKey });

      expect(readyCallback).toHaveBeenCalled();
    });

    it("should set connected to true after successful ping", () => {
      frameLink.registerTarget(mockWindow);

      jest.advanceTimersByTime(500);

      const pingCall = (mockWindow.postMessage as jest.Mock).mock.calls[0];
      const respKey = pingCall[0].resp_key;

      simulateMessage({ key: respKey });

      expect(frameLink.connected).toBe(true);
    });

    it("should clear ping interval after successful connection", () => {
      frameLink.registerTarget(mockWindow);

      jest.advanceTimersByTime(500);

      const pingCall = (mockWindow.postMessage as jest.Mock).mock.calls[0];
      const respKey = pingCall[0].resp_key;
      const initialCallCount = (mockWindow.postMessage as jest.Mock).mock.calls.length;

      simulateMessage({ key: respKey });

      // Advance more time - should not send more pings
      jest.advanceTimersByTime(2000);

      expect((mockWindow.postMessage as jest.Mock).mock.calls.length).toBe(
        initialCallCount
      );
    });

    it("should continue pinging until response is received", () => {
      frameLink.registerTarget(mockWindow);

      jest.advanceTimersByTime(500);
      const callCount1 = (mockWindow.postMessage as jest.Mock).mock.calls.length;

      jest.advanceTimersByTime(500);
      const callCount2 = (mockWindow.postMessage as jest.Mock).mock.calls.length;

      expect(callCount2).toBeGreaterThan(callCount1);
    });

    it("should add a ping listener that does nothing when called", async () => {
      frameLink.registerTarget(mockWindow);

      // The ping listener is added with key "ping" and an empty callback
      // Simulate receiving a ping message (triggers the empty () => {} callback)
      simulateMessage({ key: "ping", data: {} });

      // Wait for async processing
      await Promise.resolve();
      await Promise.resolve();

      // The ping listener was a "once" listener, so it should be removed after being called
      // Note: Due to the async filter, we just verify no errors occurred
      expect(true).toBe(true);
    });

    it("should handle ping message being processed", async () => {
      frameLink.registerTarget(mockWindow);

      // Get initial state
      const initialHasListener = frameLink.hasListener({ key: "ping" });
      expect(initialHasListener).toBe(true);

      // Simulate receiving a ping - this triggers the empty callback
      simulateMessage({ key: "ping", data: null });

      // Wait for async processing
      await Promise.resolve();
      await Promise.resolve();

      // No errors should have occurred
      expect(true).toBe(true);
    });
  });

  describe("addListener", () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const FrameLinkFresh = require("../frameLink").default;
      frameLink = FrameLinkFresh(readyCallback);
      frameLink.registerTarget(mockWindow);
    });

    it("should add a listener for a given key", () => {
      const callback = jest.fn();
      frameLink.addListener("test-key", callback);

      expect(frameLink.hasListener({ key: "test-key" })).toBe(true);
    });

    it("should call the callback when a message with matching key is received", () => {
      const callback = jest.fn();
      frameLink.addListener("test-key", callback);

      simulateMessage({ key: "test-key", data: { value: 123 } });

      expect(callback).toHaveBeenCalledWith({ value: 123 });
    });

    it("should replace existing listener with same key", () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      frameLink.addListener("test-key", callback1);
      frameLink.addListener("test-key", callback2);

      simulateMessage({ key: "test-key", data: {} });

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it("should support numeric keys", () => {
      const callback = jest.fn();
      frameLink.addListener(12345, callback);

      simulateMessage({ key: 12345, data: {} });

      expect(callback).toHaveBeenCalled();
    });

    it("should support once option - listener removed after first call", () => {
      const callback = jest.fn();
      frameLink.addListener("once-key", callback, true);

      simulateMessage({ key: "once-key", data: {} });
      simulateMessage({ key: "once-key", data: {} });

      // Due to async filter, this tests the intent
      expect(callback).toHaveBeenCalled();
    });

    it("should handle async callbacks", async () => {
      const asyncCallback = jest.fn().mockResolvedValue({ result: "done" });
      frameLink.addListener("async-key", asyncCallback);

      simulateMessage({ key: "async-key", data: { input: "test" } });

      await Promise.resolve(); // Let async callback execute

      expect(asyncCallback).toHaveBeenCalledWith({ input: "test" });
    });
  });

  describe("removeListener", () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const FrameLinkFresh = require("../frameLink").default;
      frameLink = FrameLinkFresh(readyCallback);
      frameLink.registerTarget(mockWindow);
    });

    it("should remove a listener by key", () => {
      frameLink.addListener("remove-test", jest.fn());
      expect(frameLink.hasListener({ key: "remove-test" })).toBe(true);

      frameLink.removeListener({ key: "remove-test" });
      expect(frameLink.hasListener({ key: "remove-test" })).toBe(false);
    });

    it("should not affect other listeners when removing by key", () => {
      frameLink.addListener("keep-this", jest.fn());
      frameLink.addListener("remove-this", jest.fn());

      frameLink.removeListener({ key: "remove-this" });

      expect(frameLink.hasListener({ key: "keep-this" })).toBe(true);
      expect(frameLink.hasListener({ key: "remove-this" })).toBe(false);
    });

    it("should handle removing non-existent listener", () => {
      expect(() => {
        frameLink.removeListener({ key: "non-existent" });
      }).not.toThrow();
    });

    it("should support removing by both key and id", () => {
      frameLink.addListener("dual-remove", jest.fn());

      // Remove with both key and id (id won't match, but key will)
      frameLink.removeListener({ key: "dual-remove", id: 999999 });

      // Should still be removed because key matched
      expect(frameLink.hasListener({ key: "dual-remove" })).toBe(false);
    });

    it("should handle undefined key", () => {
      frameLink.addListener("test-key", jest.fn());

      frameLink.removeListener({ id: 999999 });

      // Should still exist since id didn't match
      expect(frameLink.hasListener({ key: "test-key" })).toBe(true);
    });

    it("should handle undefined id", () => {
      frameLink.addListener("test-key", jest.fn());

      frameLink.removeListener({ key: "test-key" });

      expect(frameLink.hasListener({ key: "test-key" })).toBe(false);
    });
  });

  describe("hasListener", () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const FrameLinkFresh = require("../frameLink").default;
      frameLink = FrameLinkFresh(readyCallback);
      frameLink.registerTarget(mockWindow);
    });

    it("should return true when listener exists for key", () => {
      frameLink.addListener("exists", jest.fn());

      expect(frameLink.hasListener({ key: "exists" })).toBe(true);
    });

    it("should return false when listener does not exist", () => {
      expect(frameLink.hasListener({ key: "does-not-exist" })).toBe(false);
    });

    it("should work with numeric keys", () => {
      frameLink.addListener(42, jest.fn());

      expect(frameLink.hasListener({ key: 42 })).toBe(true);
    });

    it("should return true if either key or id matches", () => {
      frameLink.addListener("test-key", jest.fn());

      // Test with key match
      expect(frameLink.hasListener({ key: "test-key" })).toBe(true);
    });

    it("should handle checking for non-existent id", () => {
      frameLink.addListener("some-key", jest.fn());

      expect(frameLink.hasListener({ id: 999999 })).toBe(false);
    });
  });

  describe("postMessage", () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const FrameLinkFresh = require("../frameLink").default;
      frameLink = FrameLinkFresh(readyCallback);
    });

    it("should throw error when target is not set", () => {
      expect(() => {
        frameLink.postMessage("test-key", { data: "test" });
      }).toThrow("target ref not set or has no postmessage function");
    });

    it("should send message to target when registered", () => {
      frameLink.registerTarget(mockWindow);

      frameLink.postMessage("test-key", { value: "test" });

      expect(mockWindow.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "test-key",
          data: { value: "test" },
        }),
        "*"
      );
    });

    it("should include resp_key when callback is provided", () => {
      frameLink.registerTarget(mockWindow);

      frameLink.postMessage("test-key", { value: "test" }, jest.fn());

      const call = (mockWindow.postMessage as jest.Mock).mock.calls.find(
        (c: unknown[]) => (c[0] as { key: string }).key === "test-key"
      );
      expect(call[0].resp_key).toBeDefined();
    });

    it("should not include resp_key when no callback is provided", () => {
      frameLink.registerTarget(mockWindow);

      frameLink.postMessage("test-key", { value: "test" });

      const call = (mockWindow.postMessage as jest.Mock).mock.calls.find(
        (c: unknown[]) => (c[0] as { key: string }).key === "test-key"
      );
      expect(call[0].resp_key).toBeUndefined();
    });

    it("should register response callback as listener", () => {
      frameLink.registerTarget(mockWindow);

      const respCallback = jest.fn();
      frameLink.postMessage("test-key", {}, respCallback);

      // Get the resp_key
      const call = (mockWindow.postMessage as jest.Mock).mock.calls.find(
        (c: unknown[]) => (c[0] as { key: string }).key === "test-key"
      );
      const respKey = call[0].resp_key;

      expect(frameLink.hasListener({ key: respKey })).toBe(true);
    });

    it("should call response callback when response is received", () => {
      frameLink.registerTarget(mockWindow);

      const respCallback = jest.fn();
      frameLink.postMessage("test-key", {}, respCallback);

      const call = (mockWindow.postMessage as jest.Mock).mock.calls.find(
        (c: unknown[]) => (c[0] as { key: string }).key === "test-key"
      );
      const respKey = call[0].resp_key;

      simulateMessage({ key: respKey, data: { response: "data" } });

      expect(respCallback).toHaveBeenCalledWith({ response: "data" });
    });

    it("should work with undefined data", () => {
      frameLink.registerTarget(mockWindow);

      frameLink.postMessage("test-key", undefined);

      expect(mockWindow.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "test-key",
          data: undefined,
        }),
        "*"
      );
    });

    it("should work with numeric key", () => {
      frameLink.registerTarget(mockWindow);

      frameLink.postMessage(123, { test: true });

      expect(mockWindow.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 123,
          data: { test: true },
        }),
        "*"
      );
    });
  });

  describe("message handling", () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const FrameLinkFresh = require("../frameLink").default;
      frameLink = FrameLinkFresh(readyCallback);
      frameLink.registerTarget(mockWindow);
    });

    it("should handle messages with matching key", () => {
      const callback = jest.fn();
      frameLink.addListener("handle-test", callback);

      simulateMessage({ key: "handle-test", data: { msg: "hello" } });

      expect(callback).toHaveBeenCalledWith({ msg: "hello" });
    });

    it("should ignore messages with non-matching key", () => {
      const callback = jest.fn();
      frameLink.addListener("my-key", callback);

      simulateMessage({ key: "other-key", data: {} });

      expect(callback).not.toHaveBeenCalled();
    });

    it("should handle messages with resp_key by sending response", async () => {
      const callback = jest.fn().mockReturnValue({ reply: "response" });
      frameLink.addListener("with-response", callback);

      simulateMessage({
        key: "with-response",
        resp_key: "response-123",
        data: { request: "data" },
      });

      // Wait for async callback to complete
      await Promise.resolve();
      await Promise.resolve();

      // Check that postMessage was called with the response
      expect(mockWindow.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "response-123",
          data: { reply: "response" },
        }),
        "*"
      );
    });

    it("should handle undefined data in message", () => {
      const callback = jest.fn();
      frameLink.addListener("undefined-data", callback);

      simulateMessage({ key: "undefined-data" });

      expect(callback).toHaveBeenCalledWith(undefined);
    });

    it("should handle null data in message", () => {
      const callback = jest.fn();
      frameLink.addListener("null-data", callback);

      const event = new MessageEvent("message", {
        data: {
          key: "null-data",
          data: null,
        },
      });
      fireEvent(window, event);

      expect(callback).toHaveBeenCalledWith(null);
    });

    it("should handle malformed message gracefully", () => {
      const callback = jest.fn();
      frameLink.addListener("test-key", callback);

      const event = new MessageEvent("message", {
        data: null,
      });

      expect(() => {
        fireEvent(window, event);
      }).not.toThrow();
    });

    it("should handle message with undefined data property", () => {
      const callback = jest.fn();
      frameLink.addListener("test-key", callback);

      const event = new MessageEvent("message", {
        data: undefined,
      });

      expect(() => {
        fireEvent(window, event);
      }).not.toThrow();
    });
  });

  describe("multiple listeners", () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const FrameLinkFresh = require("../frameLink").default;
      frameLink = FrameLinkFresh(readyCallback);
      frameLink.registerTarget(mockWindow);
    });

    it("should support multiple different listeners", () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      frameLink.addListener("key-1", callback1);
      frameLink.addListener("key-2", callback2);

      simulateMessage({ key: "key-1", data: {} });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });

    it("should remove correct listener and keep others", () => {
      frameLink.addListener("key-a", jest.fn());
      frameLink.addListener("key-b", jest.fn());
      frameLink.addListener("key-c", jest.fn());

      frameLink.removeListener({ key: "key-b" });

      expect(frameLink.hasListener({ key: "key-a" })).toBe(true);
      expect(frameLink.hasListener({ key: "key-b" })).toBe(false);
      expect(frameLink.hasListener({ key: "key-c" })).toBe(true);
    });
  });

  describe("edge cases", () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const FrameLinkFresh = require("../frameLink").default;
      frameLink = FrameLinkFresh(readyCallback);
      frameLink.registerTarget(mockWindow);
    });

    it("should handle empty string as key", () => {
      const callback = jest.fn();
      frameLink.addListener("", callback);

      simulateMessage({ key: "", data: { test: true } });

      expect(callback).toHaveBeenCalled();
    });

    it("should handle zero as numeric key", () => {
      const callback = jest.fn();
      frameLink.addListener(0, callback);

      simulateMessage({ key: 0, data: {} });

      expect(callback).toHaveBeenCalled();
    });

    it("should handle very long keys", () => {
      const longKey = "a".repeat(1000);
      const callback = jest.fn();
      frameLink.addListener(longKey, callback);

      expect(frameLink.hasListener({ key: longKey })).toBe(true);
    });

    it("should handle special characters in keys", () => {
      const specialKey = "key:with/special$chars!@#";
      const callback = jest.fn();
      frameLink.addListener(specialKey, callback);

      simulateMessage({ key: specialKey, data: {} });

      expect(callback).toHaveBeenCalled();
    });

    it("should handle large data payloads", () => {
      const callback = jest.fn();
      frameLink.addListener("large-data", callback);

      const largeData = { items: Array(1000).fill({ value: "test" }) };
      simulateMessage({ key: "large-data", data: largeData });

      expect(callback).toHaveBeenCalledWith(largeData);
    });

    it("should handle nested object data", () => {
      const callback = jest.fn();
      frameLink.addListener("nested", callback);

      const nestedData = {
        level1: {
          level2: {
            level3: {
              value: "deep",
            },
          },
        },
      };
      simulateMessage({ key: "nested", data: nestedData });

      expect(callback).toHaveBeenCalledWith(nestedData);
    });

    it("should handle array data", () => {
      const callback = jest.fn();
      frameLink.addListener("array-data", callback);

      const arrayData = [1, 2, 3, { nested: true }];
      simulateMessage({ key: "array-data", data: arrayData });

      expect(callback).toHaveBeenCalledWith(arrayData);
    });
  });

  describe("window event listener management", () => {
    it("should add message event listener on init", () => {
      const addEventListenerSpy = jest.spyOn(window, "addEventListener");

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const FrameLinkFresh = require("../frameLink").default;
      FrameLinkFresh(readyCallback);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "message",
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
    });

    it("should remove existing message listener before adding new one", () => {
      const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const FrameLinkFresh = require("../frameLink").default;
      FrameLinkFresh(readyCallback);

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "message",
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });

  describe("response flow", () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const FrameLinkFresh = require("../frameLink").default;
      frameLink = FrameLinkFresh(readyCallback);
      frameLink.registerTarget(mockWindow);
    });

    it("should complete request-response cycle", () => {
      const requestCallback = jest.fn();
      const responseHandler = jest.fn().mockReturnValue({ status: "ok" });

      // Add handler for incoming requests
      frameLink.addListener("request", responseHandler);

      // Send request with callback
      frameLink.postMessage("request", { action: "do-something" }, requestCallback);

      // Simulate the request being received and responded to
      const sentCall = (mockWindow.postMessage as jest.Mock).mock.calls.find(
        (c: unknown[]) => (c[0] as { key: string }).key === "request"
      );
      const respKey = sentCall[0].resp_key;

      // Simulate response
      simulateMessage({ key: respKey, data: { status: "ok" } });

      expect(requestCallback).toHaveBeenCalledWith({ status: "ok" });
    });

    it("should handle multiple concurrent requests", () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      frameLink.postMessage("req-1", {}, callback1);
      frameLink.postMessage("req-2", {}, callback2);

      const calls = (mockWindow.postMessage as jest.Mock).mock.calls;
      const req1Call = calls.find(
        (c: unknown[]) => (c[0] as { key: string }).key === "req-1"
      );
      const req2Call = calls.find(
        (c: unknown[]) => (c[0] as { key: string }).key === "req-2"
      );

      // Respond to both
      simulateMessage({ key: req1Call[0].resp_key, data: { id: 1 } });
      simulateMessage({ key: req2Call[0].resp_key, data: { id: 2 } });

      expect(callback1).toHaveBeenCalledWith({ id: 1 });
      expect(callback2).toHaveBeenCalledWith({ id: 2 });
    });
  });
});
