/**
 * Two-endpoint spike test for Frame Link + StardustCmsRegistry.
 *
 * Wires a "host" and an "iframe" Frame Link instance together in jsdom and
 * exercises all four operation classes from the SIFR adapter surface:
 *   1. geometry.query  — request → response round-trip returning SerializableRects
 *   2. content.inject / content.update — typed request → { ok } ack
 *   3. scroll.update   — fire-and-forget event (void response), iframe → host
 *   4. presence.update — fire-and-forget event (void response), iframe → host
 *
 * Friction notes for FLINK-T-0015:
 * - Both endpoints share the single jsdom `window`, so their message handlers
 *   are both registered on the same `window.addEventListener("message", ...)`.
 *   We intercept addEventListener to capture each handler individually and
 *   route messages by delivering them directly — avoiding the real postMessage
 *   broadcast which would fire both handlers for every message.
 * - The ping handshake (PING_INTERVAL_MS = 100 ms) requires fake timers and
 *   advanceTimersByTimeAsync to resolve connect() without real-time waits.
 * - Events modeled as `MessageDefinition<Payload, void>` need handlers
 *   registered on the receiving side before the sender fires, just like
 *   requests; omitting the handler causes an error response back to the sender.
 */

import { createFrameLink } from "../../../src/index.js";
import type { ResponseOf } from "../../../src/index.js";
import type { StardustCmsRegistry } from "../registry.js";

// ---------------------------------------------------------------------------
// Two-endpoint harness
// ---------------------------------------------------------------------------

type MessageHandler = (event: MessageEvent) => void;

interface TwoEndpointHarness {
  /** Handler that delivers a message TO the host (from the iframe side). */
  deliverToHost: (data: unknown) => void;
  /** Handler that delivers a message TO the iframe (from the host side). */
  deliverToIframe: (data: unknown) => void;
  teardown: () => void;
}

/**
 * Sets up a pair of fake `window` objects that cross-route postMessage calls
 * to the other side's Frame Link message handler.
 *
 * Frame Link registers exactly one `window.addEventListener("message", …)`
 * per instance (guard in dispatcher.ts). We capture each handler in
 * registration order (first call → host handler, second call → iframe handler)
 * and use them to deliver messages.
 */
function buildTwoEndpointHarness(): TwoEndpointHarness {
  const capturedHandlers: MessageHandler[] = [];
  const originalAdd = window.addEventListener.bind(window);
  const originalRemove = window.removeEventListener.bind(window);

  // Intercept addEventListener to capture each instance's handler.
  window.addEventListener = jest.fn(
    (type: string, listener: EventListenerOrEventListenerObject) => {
      if (type === "message") {
        capturedHandlers.push(listener as MessageHandler);
      }
    }
  ) as typeof window.addEventListener;

  window.removeEventListener = jest.fn(
    (_type: string, _listener: EventListenerOrEventListenerObject) => {
      // no-op in the harness; cleanup handled by teardown
    }
  ) as typeof window.removeEventListener;

  const deliverTo = (handlerIndex: number, data: unknown): void => {
    const handler = capturedHandlers[handlerIndex];
    if (handler !== undefined) {
      const event = new MessageEvent("message", { data, origin: "*" });
      handler(event);
    }
  };

  return {
    deliverToHost: (data) => { deliverTo(0, data); },
    deliverToIframe: (data) => { deliverTo(1, data); },
    teardown: () => {
      window.addEventListener = originalAdd;
      window.removeEventListener = originalRemove;
    },
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("StardustCmsRegistry two-endpoint spike", () => {
  let harness: TwoEndpointHarness;

  /**
   * Fake Window objects passed to connect(). Their postMessage
   * implementations route data to the opposite endpoint's handler.
   */
  let hostWindow: Window;
  let iframeWindow: Window;

  beforeEach(() => {
    jest.useFakeTimers();
    harness = buildTwoEndpointHarness();

    // hostWindow.postMessage → deliver to iframe handler
    hostWindow = {
      postMessage: jest.fn((data: unknown) => {
        harness.deliverToIframe(data);
      }),
    } as unknown as Window;

    // iframeWindow.postMessage → deliver to host handler
    iframeWindow = {
      postMessage: jest.fn((data: unknown) => {
        harness.deliverToHost(data);
      }),
    } as unknown as Window;
  });

  afterEach(() => {
    jest.useRealTimers();
    harness.teardown();
  });

  /**
   * Establishes connection on both ends concurrently.
   * Both call connect() which starts sending pings; messages delivered via
   * the fake windows above complete the handshake on each side.
   */
  async function connectBoth(
    host: ReturnType<typeof createFrameLink<StardustCmsRegistry>>,
    iframe: ReturnType<typeof createFrameLink<StardustCmsRegistry>>
  ): Promise<void> {
    const hostConnect = host.connect(hostWindow);
    const iframeConnect = iframe.connect(iframeWindow);

    // Advance fake timers enough for ping intervals to fire and responses to
    // round-trip. PING_INTERVAL_MS is 100 ms; a few intervals + micro-task
    // flushes settle the handshake on both sides.
    for (let i = 0; i < 5; i++) {
      await jest.advanceTimersByTimeAsync(200);
    }

    await hostConnect;
    await iframeConnect;
  }

  // -------------------------------------------------------------------------
  // 1. geometry.query — request → response round-trip
  // -------------------------------------------------------------------------

  it("geometry.query: host send resolves to typed SerializableRect response", async () => {
    const host = createFrameLink<StardustCmsRegistry>({ targetOrigin: "*" });
    const iframe = createFrameLink<StardustCmsRegistry>({ targetOrigin: "*" });

    const expectedTarget = { x: 10, y: 20, width: 300, height: 150 };
    const expectedChildren = [
      { x: 10, y: 20, width: 100, height: 50 },
      { x: 110, y: 20, width: 100, height: 50 },
    ];

    // Register iframe handler BEFORE host sends.
    iframe.on("geometry.query", (_payload) => {
      return { target: expectedTarget, children: expectedChildren };
    });

    await connectBoth(host, iframe);

    const result: ResponseOf<StardustCmsRegistry, "geometry.query"> =
      await host.send("geometry.query", { targetId: "banner" });

    expect(result).toEqual({
      target: expectedTarget,
      children: expectedChildren,
    });

    host.destroy();
    iframe.destroy();
  });

  // -------------------------------------------------------------------------
  // 2. content.inject — typed request → { ok } ack
  // -------------------------------------------------------------------------

  it("content.inject: iframe handler receives correct payload and returns ok", async () => {
    const host = createFrameLink<StardustCmsRegistry>({ targetOrigin: "*" });
    const iframe = createFrameLink<StardustCmsRegistry>({ targetOrigin: "*" });

    const receivedPayloads: { targetId: string; html: string }[] = [];

    iframe.on("content.inject", (payload) => {
      receivedPayloads.push(payload);
      return { ok: true };
    });

    await connectBoth(host, iframe);

    const result = await host.send("content.inject", {
      targetId: "hero",
      html: "<h1>Hello</h1>",
    });

    expect(result).toEqual({ ok: true });
    expect(receivedPayloads).toHaveLength(1);
    expect(receivedPayloads[0]).toEqual({
      targetId: "hero",
      html: "<h1>Hello</h1>",
    });

    host.destroy();
    iframe.destroy();
  });

  // -------------------------------------------------------------------------
  // 3. content.update — typed request → { ok } ack
  // -------------------------------------------------------------------------

  it("content.update: iframe handler receives correct payload and returns ok", async () => {
    const host = createFrameLink<StardustCmsRegistry>({ targetOrigin: "*" });
    const iframe = createFrameLink<StardustCmsRegistry>({ targetOrigin: "*" });

    const receivedPayloads: { targetId: string; html: string }[] = [];

    iframe.on("content.update", (payload) => {
      receivedPayloads.push(payload);
      return { ok: true };
    });

    await connectBoth(host, iframe);

    const result = await host.send("content.update", {
      targetId: "footer",
      html: "<p>Updated content</p>",
    });

    expect(result).toEqual({ ok: true });
    expect(receivedPayloads).toHaveLength(1);
    expect(receivedPayloads[0]).toEqual({
      targetId: "footer",
      html: "<p>Updated content</p>",
    });

    host.destroy();
    iframe.destroy();
  });

  // -------------------------------------------------------------------------
  // 4. scroll.update — fire-and-forget event, iframe → host
  // -------------------------------------------------------------------------

  it("scroll.update: host handler receives typed scroll payload from iframe", async () => {
    const host = createFrameLink<StardustCmsRegistry>({ targetOrigin: "*" });
    const iframe = createFrameLink<StardustCmsRegistry>({ targetOrigin: "*" });

    const receivedScrollPayloads: {
      scrollX: number;
      scrollY: number;
    }[] = [];

    // Register host handler before iframe sends.
    host.on("scroll.update", (payload) => {
      receivedScrollPayloads.push(payload);
      return undefined;
    });

    await connectBoth(host, iframe);

    await iframe.send("scroll.update", { scrollX: 0, scrollY: 450 });

    // Flush micro-tasks so the handler has run.
    await Promise.resolve();
    await Promise.resolve();

    expect(receivedScrollPayloads).toHaveLength(1);
    expect(receivedScrollPayloads[0]).toEqual({ scrollX: 0, scrollY: 450 });

    host.destroy();
    iframe.destroy();
  });

  // -------------------------------------------------------------------------
  // 5. presence.update — fire-and-forget event, iframe → host
  // -------------------------------------------------------------------------

  it("presence.update: host handler receives typed presence payload from iframe", async () => {
    const host = createFrameLink<StardustCmsRegistry>({ targetOrigin: "*" });
    const iframe = createFrameLink<StardustCmsRegistry>({ targetOrigin: "*" });

    const receivedPresencePayloads: {
      userId: string;
      x: number;
      y: number;
    }[] = [];

    // Register host handler before iframe sends.
    host.on("presence.update", (payload) => {
      receivedPresencePayloads.push(payload);
      return undefined;
    });

    await connectBoth(host, iframe);

    await iframe.send("presence.update", { userId: "user-42", x: 120, y: 300 });

    await Promise.resolve();
    await Promise.resolve();

    expect(receivedPresencePayloads).toHaveLength(1);
    expect(receivedPresencePayloads[0]).toEqual({
      userId: "user-42",
      x: 120,
      y: 300,
    });

    host.destroy();
    iframe.destroy();
  });
});
