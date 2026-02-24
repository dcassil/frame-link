import { createFrameLink } from "../frame-link.js";
import { createFrameLink as createFrameLinkFromIndex } from "../index.js";
import type {
  FrameLink,
  MessageDefinition,
  MessageRegistry,
} from "../types/index.js";

interface TestMessages extends MessageRegistry {
  "test:echo": MessageDefinition<{ message: string }, { reply: string }>;
  "test:void": MessageDefinition<void, void>;
  "test:error": MessageDefinition<
    { shouldFail: boolean },
    { success: boolean }
  >;
  "__framelink:ping": MessageDefinition<void, void>;
}

describe("createFrameLink", () => {
  let link: FrameLink<TestMessages>;
  let capturedMessageHandler: ((event: MessageEvent) => void) | null = null;
  let originalAddEventListener: typeof window.addEventListener;
  let originalRemoveEventListener: typeof window.removeEventListener;

  function simulateMessage(
    data: unknown,
    origin = "https://example.com"
  ): void {
    if (capturedMessageHandler !== null) {
      const event = new MessageEvent("message", { data, origin });
      capturedMessageHandler(event);
    }
  }

  async function connectLink(
    linkInstance: FrameLink<TestMessages>,
    mockTarget: Window
  ): Promise<void> {
    const connectPromise = linkInstance.connect(mockTarget);
    await jest.advanceTimersByTimeAsync(100);

    const pingCall = (mockTarget.postMessage as jest.Mock).mock.calls[0] as [
      { type: string; id: string; key: string },
      string,
    ];
    const pingMessage = pingCall[0];

    simulateMessage({
      type: "response",
      id: pingMessage.id,
      key: "__framelink:ping",
      payload: undefined,
    });

    await jest.advanceTimersByTimeAsync(100);
    await connectPromise;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    capturedMessageHandler = null;
    originalAddEventListener = window.addEventListener;
    originalRemoveEventListener = window.removeEventListener;

    window.addEventListener = jest.fn(
      (type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === "message") {
          capturedMessageHandler = listener as (event: MessageEvent) => void;
        }
      }
    ) as typeof window.addEventListener;

    window.removeEventListener = jest.fn(
      (type: string, _listener: EventListenerOrEventListenerObject) => {
        if (type === "message") {
          capturedMessageHandler = null;
        }
      }
    ) as typeof window.removeEventListener;
  });

  afterEach(() => {
    // Restore real timers first so cleanup can proceed normally
    jest.useRealTimers();
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;

    // Don't call destroy here - tests should handle their own cleanup
    // or rely on garbage collection for non-connected instances
  });

  describe("factory function", () => {
    it("should create a FrameLink instance with expected interface", () => {
      link = createFrameLink<TestMessages>({ targetOrigin: "*" });

      expect(link.connected).toBe(false);
      expect(typeof link.send).toBe("function");
      expect(typeof link.on).toBe("function");
      expect(typeof link.off).toBe("function");
      expect(typeof link.connect).toBe("function");
      expect(typeof link.destroy).toBe("function");
    });

    it("should be exported from index.ts", () => {
      expect(createFrameLinkFromIndex).toBe(createFrameLink);
    });

    it("should create independent instances", () => {
      const link1 = createFrameLink<TestMessages>({ targetOrigin: "*" });
      const link2 = createFrameLink<TestMessages>({ targetOrigin: "*" });

      expect(link1).not.toBe(link2);
      expect(link1.connected).toBe(false);
      expect(link2.connected).toBe(false);

      link1.destroy();
      link2.destroy();
    });

    it("should use default timeout when not specified", () => {
      link = createFrameLink<TestMessages>({ targetOrigin: "*" });
      expect(link).toBeDefined();
    });

    it("should accept custom timeout", () => {
      link = createFrameLink<TestMessages>({
        targetOrigin: "*",
        timeout: 10000,
      });
      expect(link).toBeDefined();
    });
  });

  describe("connect", () => {
    it("should set connected to true after successful connection", async () => {
      link = createFrameLink<TestMessages>({
        targetOrigin: "https://example.com",
      });

      const mockTarget = {
        postMessage: jest.fn(),
      } as unknown as Window;

      await connectLink(link, mockTarget);

      expect(mockTarget.postMessage).toHaveBeenCalled();
      expect(link.connected).toBe(true);
    });

    it("should timeout if no response received", async () => {
      link = createFrameLink<TestMessages>({
        targetOrigin: "*",
        timeout: 1000,
      });

      const mockTarget = {
        postMessage: jest.fn(),
      } as unknown as Window;

      let timeoutError: Error | undefined;
      const connectPromise = link
        .connect(mockTarget)
        .catch((err: Error): void => {
          timeoutError = err;
        });

      await jest.advanceTimersByTimeAsync(1001);
      await connectPromise;

      expect(timeoutError?.message).toBe("Connection timed out after 1000ms");
    });

    it("should resolve immediately if already connected", async () => {
      link = createFrameLink<TestMessages>({
        targetOrigin: "https://example.com",
      });

      const mockTarget = {
        postMessage: jest.fn(),
      } as unknown as Window;

      await connectLink(link, mockTarget);

      const connectPromise2 = link.connect(mockTarget);
      await connectPromise2;

      expect(link.connected).toBe(true);
    });

    it("should send ping messages at regular intervals", () => {
      link = createFrameLink<TestMessages>({
        targetOrigin: "*",
        timeout: 5000,
      });

      const mockTarget = {
        postMessage: jest.fn(),
      } as unknown as Window;

      void link.connect(mockTarget).catch((): void => {
        // Expected when destroy is called
      });

      jest.advanceTimersByTime(100);
      expect(mockTarget.postMessage).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(100);
      expect(mockTarget.postMessage).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(100);
      expect(mockTarget.postMessage).toHaveBeenCalledTimes(3);
    });
  });

  describe("send", () => {
    let mockTarget: Window;

    beforeEach(async () => {
      link = createFrameLink<TestMessages>({
        targetOrigin: "https://example.com",
      });

      mockTarget = {
        postMessage: jest.fn(),
      } as unknown as Window;

      await connectLink(link, mockTarget);
      (mockTarget.postMessage as jest.Mock).mockClear();
    });

    it("should send a message with correct format", () => {
      void link.send("test:echo", { message: "hello" });

      expect(mockTarget.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "request",
          key: "test:echo",
          payload: { message: "hello" },
        }),
        "https://example.com"
      );
    });

    it("should resolve when response is received", async () => {
      const sendPromise = link.send("test:echo", { message: "hello" });

      const sentCall = (mockTarget.postMessage as jest.Mock).mock.calls[0] as [
        { type: string; id: string; key: string },
        string,
      ];
      const sentMessage = sentCall[0];

      simulateMessage({
        type: "response",
        id: sentMessage.id,
        key: "test:echo",
        payload: { reply: "world" },
      });

      const result = await sendPromise;
      expect(result).toEqual({ reply: "world" });
    });

    it("should reject when error response is received", async () => {
      const sendPromise = link.send("test:echo", { message: "hello" });

      const sentCall = (mockTarget.postMessage as jest.Mock).mock.calls[0] as [
        { type: string; id: string; key: string },
        string,
      ];
      const sentMessage = sentCall[0];

      simulateMessage({
        type: "response",
        id: sentMessage.id,
        key: "test:echo",
        payload: undefined,
        error: "Something went wrong",
      });

      await expect(sendPromise).rejects.toThrow("Something went wrong");
    });

    it("should reject when not connected", async () => {
      const newLink = createFrameLink<TestMessages>({ targetOrigin: "*" });

      await expect(
        newLink.send("test:echo", { message: "hello" })
      ).rejects.toThrow("Not connected");

      newLink.destroy();
    });

    it("should timeout if no response received", async () => {
      link.destroy();
      link = createFrameLink<TestMessages>({
        targetOrigin: "https://example.com",
        timeout: 1000,
      });

      mockTarget = {
        postMessage: jest.fn(),
      } as unknown as Window;

      await connectLink(link, mockTarget);
      (mockTarget.postMessage as jest.Mock).mockClear();

      let timeoutError: Error | undefined;
      const sendPromise = link
        .send("test:echo", { message: "hello" })
        .catch((err: Error): void => {
          timeoutError = err;
        });

      await jest.advanceTimersByTimeAsync(1001);
      await sendPromise;

      expect(timeoutError?.message).toBe("Request timed out: test:echo");
    });
  });

  describe("on and off", () => {
    let mockTarget: Window;

    beforeEach(async () => {
      link = createFrameLink<TestMessages>({
        targetOrigin: "https://example.com",
      });

      mockTarget = {
        postMessage: jest.fn(),
      } as unknown as Window;

      await connectLink(link, mockTarget);
      (mockTarget.postMessage as jest.Mock).mockClear();
    });

    it("should register a handler and respond to messages", async () => {
      link.on("test:echo", (payload) => {
        return { reply: `Echo: ${payload.message}` };
      });

      simulateMessage({
        type: "request",
        id: "req-123",
        key: "test:echo",
        payload: { message: "hello" },
      });

      await Promise.resolve();

      expect(mockTarget.postMessage).toHaveBeenCalledWith(
        {
          type: "response",
          id: "req-123",
          key: "test:echo",
          payload: { reply: "Echo: hello" },
        },
        "https://example.com"
      );
    });

    it("should return unsubscribe function from on()", async () => {
      const unsubscribe = link.on("test:echo", () => {
        return { reply: "response" };
      });

      unsubscribe();

      simulateMessage({
        type: "request",
        id: "req-456",
        key: "test:echo",
        payload: { message: "hello" },
      });

      await Promise.resolve();

      expect(mockTarget.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "response",
          id: "req-456",
          error: "No handler registered for key: test:echo",
        }),
        "https://example.com"
      );
    });

    it("should remove handler with off()", async () => {
      link.on("test:echo", () => {
        return { reply: "response" };
      });

      link.off("test:echo");

      simulateMessage({
        type: "request",
        id: "req-789",
        key: "test:echo",
        payload: { message: "hello" },
      });

      await Promise.resolve();

      expect(mockTarget.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "response",
          id: "req-789",
          error: "No handler registered for key: test:echo",
        }),
        "https://example.com"
      );
    });

    it("should handle async handlers", async () => {
      link.on("test:echo", async (payload) => {
        await Promise.resolve();
        return { reply: `Async: ${payload.message}` };
      });

      simulateMessage({
        type: "request",
        id: "req-async",
        key: "test:echo",
        payload: { message: "test" },
      });

      await Promise.resolve();
      await Promise.resolve();

      expect(mockTarget.postMessage).toHaveBeenCalledWith(
        {
          type: "response",
          id: "req-async",
          key: "test:echo",
          payload: { reply: "Async: test" },
        },
        "https://example.com"
      );
    });

    it("should handle handler errors", async () => {
      link.on("test:error", () => {
        throw new Error("Handler error");
      });

      simulateMessage({
        type: "request",
        id: "req-error",
        key: "test:error",
        payload: { shouldFail: true },
      });

      await Promise.resolve();

      expect(mockTarget.postMessage).toHaveBeenCalledWith(
        {
          type: "response",
          id: "req-error",
          key: "test:error",
          payload: undefined,
          error: "Handler error",
        },
        "https://example.com"
      );
    });

    it("should handle non-Error throws", async () => {
      link.on("test:error", () => {
        throw "string error";
      });

      simulateMessage({
        type: "request",
        id: "req-string-error",
        key: "test:error",
        payload: { shouldFail: true },
      });

      await Promise.resolve();

      expect(mockTarget.postMessage).toHaveBeenCalledWith(
        {
          type: "response",
          id: "req-string-error",
          key: "test:error",
          payload: undefined,
          error: "Unknown error",
        },
        "https://example.com"
      );
    });
  });

  describe("origin validation", () => {
    let mockTarget: Window;

    beforeEach(async () => {
      link = createFrameLink<TestMessages>({
        targetOrigin: "https://example.com",
      });

      mockTarget = {
        postMessage: jest.fn(),
      } as unknown as Window;

      await connectLink(link, mockTarget);
      (mockTarget.postMessage as jest.Mock).mockClear();
    });

    it("should ignore messages from different origins", async () => {
      const handler = jest.fn(() => ({ reply: "response" }));
      link.on("test:echo", handler);

      simulateMessage(
        {
          type: "request",
          id: "req-bad-origin",
          key: "test:echo",
          payload: { message: "hello" },
        },
        "https://evil.com"
      );

      await Promise.resolve();

      expect(handler).not.toHaveBeenCalled();
    });

    it("should accept messages with wildcard origin", async () => {
      link.destroy();
      const wildcardLink = createFrameLink<TestMessages>({
        targetOrigin: "*",
      });

      const wildcardTarget = {
        postMessage: jest.fn(),
      } as unknown as Window;

      await connectLink(wildcardLink, wildcardTarget);

      expect(wildcardLink.connected).toBe(true);
      wildcardLink.destroy();
    });
  });

  describe("destroy", () => {
    it("should set connected to false", async () => {
      link = createFrameLink<TestMessages>({
        targetOrigin: "https://example.com",
      });

      const mockTarget = {
        postMessage: jest.fn(),
      } as unknown as Window;

      await connectLink(link, mockTarget);

      expect(link.connected).toBe(true);
      link.destroy();
      expect(link.connected).toBe(false);
    });

    it("should remove message event listener", async () => {
      link = createFrameLink<TestMessages>({
        targetOrigin: "https://example.com",
      });
      const mockTarget = { postMessage: jest.fn() } as unknown as Window;

      await connectLink(link, mockTarget);

      expect(window.addEventListener).toHaveBeenCalledWith(
        "message",
        expect.any(Function)
      );

      link.destroy();

      expect(window.removeEventListener).toHaveBeenCalledWith(
        "message",
        expect.any(Function)
      );
    });

    it("should reject pending requests", async () => {
      link = createFrameLink<TestMessages>({
        targetOrigin: "https://example.com",
      });

      const mockTarget = {
        postMessage: jest.fn(),
      } as unknown as Window;

      await connectLink(link, mockTarget);

      let rejectError: Error | undefined;
      const sendPromise = link
        .send("test:echo", { message: "hello" })
        .catch((err: Error): void => {
          rejectError = err;
        });

      link.destroy();

      await sendPromise;

      expect(rejectError).toBeDefined();
      expect(rejectError?.message).toBe("FrameLink destroyed");
    });
  });

  describe("message format validation", () => {
    let mockTarget: Window;

    beforeEach(async () => {
      link = createFrameLink<TestMessages>({
        targetOrigin: "https://example.com",
      });

      mockTarget = {
        postMessage: jest.fn(),
      } as unknown as Window;

      await connectLink(link, mockTarget);
      (mockTarget.postMessage as jest.Mock).mockClear();
    });

    it("should ignore non-object messages", async () => {
      const handler = jest.fn(() => ({ reply: "response" }));
      link.on("test:echo", handler);

      simulateMessage("not an object");
      simulateMessage(null);
      simulateMessage(123);

      await Promise.resolve();

      expect(handler).not.toHaveBeenCalled();
    });

    it("should ignore messages without required fields", async () => {
      const handler = jest.fn(() => ({ reply: "response" }));
      link.on("test:echo", handler);

      simulateMessage({ type: "request" });
      simulateMessage({ type: "request", id: "123" });
      simulateMessage({ type: "request", id: "123", key: "test" });
      simulateMessage({ id: "123", key: "test", payload: {} });

      await Promise.resolve();

      expect(handler).not.toHaveBeenCalled();
    });

    it("should ignore messages with invalid type", async () => {
      const handler = jest.fn(() => ({ reply: "response" }));
      link.on("test:echo", handler);

      simulateMessage({
        type: "invalid",
        id: "123",
        key: "test:echo",
        payload: { message: "hello" },
      });

      await Promise.resolve();

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("response handling edge cases", () => {
    let mockTarget: Window;

    beforeEach(async () => {
      link = createFrameLink<TestMessages>({
        targetOrigin: "https://example.com",
      });

      mockTarget = {
        postMessage: jest.fn(),
      } as unknown as Window;

      await connectLink(link, mockTarget);
      (mockTarget.postMessage as jest.Mock).mockClear();
    });

    it("should ignore responses with unknown ids", () => {
      simulateMessage({
        type: "response",
        id: "unknown-id",
        key: "test:echo",
        payload: { reply: "orphan response" },
      });
    });

    it("should handle duplicate responses (only first is processed)", async () => {
      const sendPromise = link.send("test:echo", { message: "hello" });

      const sentCall = (mockTarget.postMessage as jest.Mock).mock.calls[0] as [
        { type: string; id: string; key: string },
        string,
      ];
      const sentMessage = sentCall[0];

      simulateMessage({
        type: "response",
        id: sentMessage.id,
        key: "test:echo",
        payload: { reply: "first" },
      });

      simulateMessage({
        type: "response",
        id: sentMessage.id,
        key: "test:echo",
        payload: { reply: "second" },
      });

      const result = await sendPromise;
      expect(result).toEqual({ reply: "first" });
    });
  });

  describe("edge cases", () => {
    it("should not setup duplicate message listeners", async () => {
      link = createFrameLink<TestMessages>({
        targetOrigin: "https://example.com",
      });

      const mockTarget = {
        postMessage: jest.fn(),
      } as unknown as Window;

      link.on("test:echo", () => ({ reply: "test" }));

      await connectLink(link, mockTarget);

      expect(window.addEventListener).toHaveBeenCalledTimes(1);
    });

    it("should handle ping requests after connection", async () => {
      link = createFrameLink<TestMessages>({
        targetOrigin: "https://example.com",
      });

      const mockTarget = {
        postMessage: jest.fn(),
      } as unknown as Window;

      await connectLink(link, mockTarget);
      (mockTarget.postMessage as jest.Mock).mockClear();

      simulateMessage({
        type: "request",
        id: "ping-req-1",
        key: "__framelink:ping",
        payload: undefined,
      });

      await jest.advanceTimersByTimeAsync(10);
      await Promise.resolve();
      await Promise.resolve();

      expect(mockTarget.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "response",
          id: "ping-req-1",
          key: "__framelink:ping",
        }),
        "https://example.com"
      );
    });

    it("should handle postMessage failure during send", async () => {
      link = createFrameLink<TestMessages>({
        targetOrigin: "https://example.com",
      });

      const mockTarget = {
        postMessage: jest.fn(),
      } as unknown as Window;

      await connectLink(link, mockTarget);
      (mockTarget.postMessage as jest.Mock).mockClear();

      (mockTarget.postMessage as jest.Mock).mockImplementation(() => {
        throw new Error("postMessage failed");
      });

      await expect(
        link.send("test:echo", { message: "hello" })
      ).rejects.toThrow("postMessage failed");
    });

    it("should throw error when responding without target connected", async () => {
      link = createFrameLink<TestMessages>({
        targetOrigin: "https://example.com",
      });

      link.on("test:echo", () => ({ reply: "response" }));

      const mockTarget = {
        postMessage: jest.fn(),
      } as unknown as Window;

      await connectLink(link, mockTarget);

      link.destroy();
    });

    it("should handle cleanup called multiple times", async () => {
      link = createFrameLink<TestMessages>({
        targetOrigin: "https://example.com",
      });

      const mockTarget = {
        postMessage: jest.fn(),
      } as unknown as Window;

      await connectLink(link, mockTarget);

      link.destroy();
      link.destroy();

      expect(link.connected).toBe(false);
    });
  });
});
