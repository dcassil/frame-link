import type {
  FrameLink,
  FrameLinkOptions,
  MessageHandler,
  MessageRegistry,
  PayloadOf,
  ResponseOf,
  WireMessage,
} from "./types/index.js";
import { isWireMessage } from "./types/index.js";

const DEFAULT_TIMEOUT_MS = 5000;
const PING_INTERVAL_MS = 100;
const ID_RADIX = 36;
const ID_SLICE_START = 2;
const ID_SLICE_END = 11;
const INTERNAL_PING_KEY = "__framelink:ping";

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

type AnyHandler = (payload: unknown) => Promise<unknown>;

function generateId(): string {
  const timestamp = Date.now().toString(ID_RADIX);
  const random = Math.random()
    .toString(ID_RADIX)
    .slice(ID_SLICE_START, ID_SLICE_END);
  return `${timestamp}-${random}`;
}

function createMessageSender(
  getTarget: () => Window | null,
  targetOrigin: string
): (message: WireMessage) => void {
  return (message: WireMessage): void => {
    const currentTarget = getTarget();
    if (currentTarget === null) {
      throw new Error("Not connected to target window");
    }
    currentTarget.postMessage(message, targetOrigin);
  };
}

function createOriginValidator(
  targetOrigin: string
): (origin: string) => boolean {
  return (origin: string): boolean => {
    if (targetOrigin === "*") {
      return true;
    }
    return origin === targetOrigin;
  };
}

interface InternalState {
  target: Window | null;
  isConnected: boolean;
  messageHandler: ((event: MessageEvent) => void) | null;
  listeners: Map<string, AnyHandler>;
  pendingRequests: Map<string, PendingRequest>;
}

function handleResponse(state: InternalState, data: WireMessage): void {
  const pending = state.pendingRequests.get(data.id);
  if (pending === undefined) {
    return;
  }

  state.pendingRequests.delete(data.id);
  clearTimeout(pending.timeoutId);

  if (data.error !== undefined) {
    pending.reject(new Error(data.error));
  } else {
    pending.resolve(data.payload);
  }
}

async function handleRequest(
  state: InternalState,
  data: WireMessage,
  sendWireMessage: (message: WireMessage) => void
): Promise<void> {
  const handler = state.listeners.get(data.key);
  if (handler === undefined) {
    sendWireMessage({
      type: "response",
      id: data.id,
      key: data.key,
      payload: undefined,
      error: `No handler registered for key: ${data.key}`,
    });
    return;
  }

  try {
    const result = await handler(data.payload);
    sendWireMessage({
      type: "response",
      id: data.id,
      key: data.key,
      payload: result,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    sendWireMessage({
      type: "response",
      id: data.id,
      key: data.key,
      payload: undefined,
      error: errorMessage,
    });
  }
}

function createIncomingMessageHandler(
  state: InternalState,
  validateOrigin: (origin: string) => boolean,
  sendWireMessage: (message: WireMessage) => void
): (event: MessageEvent) => void {
  return (event: MessageEvent): void => {
    if (!validateOrigin(event.origin)) {
      return;
    }

    const eventData: unknown = event.data;
    if (!isWireMessage(eventData)) {
      return;
    }

    if (eventData.type === "response") {
      handleResponse(state, eventData);
      return;
    }

    handleRequest(state, eventData, sendWireMessage).catch((): void => {
      // Error handling is done within handleRequest
    });
  };
}

function setupMessageListener(
  state: InternalState,
  validateOrigin: (origin: string) => boolean,
  sendWireMessage: (message: WireMessage) => void
): void {
  if (state.messageHandler !== null) {
    return;
  }

  state.messageHandler = createIncomingMessageHandler(
    state,
    validateOrigin,
    sendWireMessage
  );
  window.addEventListener("message", state.messageHandler);
}

function cleanup(state: InternalState): void {
  if (state.messageHandler !== null) {
    window.removeEventListener("message", state.messageHandler);
    state.messageHandler = null;
  }

  const destroyError = new Error("FrameLink destroyed");
  state.pendingRequests.forEach((pending: PendingRequest): void => {
    clearTimeout(pending.timeoutId);
    pending.reject(destroyError);
  });

  state.listeners.clear();
  state.pendingRequests.clear();
  state.target = null;
  state.isConnected = false;
}

function createSendMethod<TRegistry extends MessageRegistry>(
  state: InternalState,
  sendWireMessage: (message: WireMessage) => void,
  timeout: number
): FrameLink<TRegistry>["send"] {
  return async function send<TKey extends keyof TRegistry & string>(
    key: TKey,
    payload: PayloadOf<TRegistry, TKey>
  ): Promise<ResponseOf<TRegistry, TKey>> {
    return await new Promise<ResponseOf<TRegistry, TKey>>(
      (
        resolve: (value: ResponseOf<TRegistry, TKey>) => void,
        reject: (reason: Error) => void
      ): void => {
        if (!state.isConnected) {
          reject(new Error("Not connected to target window"));
          return;
        }

        const id = generateId();
        const timeoutId = setTimeout((): void => {
          const pending = state.pendingRequests.get(id);
          if (pending !== undefined) {
            state.pendingRequests.delete(id);
            pending.reject(
              new Error(`Request timed out after ${String(timeout)}ms`)
            );
          }
        }, timeout);

        state.pendingRequests.set(id, {
          resolve: resolve as (value: unknown) => void,
          reject,
          timeoutId,
        });

        sendWireMessage({
          type: "request",
          id,
          key,
          payload,
        });
      }
    );
  };
}

function setupPingHandler(state: InternalState): void {
  const previousHandler = state.listeners.get(INTERNAL_PING_KEY);

  state.listeners.set(INTERNAL_PING_KEY, async (): Promise<void> => {
    await Promise.resolve();
    if (previousHandler !== undefined) {
      state.listeners.set(INTERNAL_PING_KEY, previousHandler);
    } else {
      state.listeners.delete(INTERNAL_PING_KEY);
    }
  });
}

function startPingInterval(
  state: InternalState,
  sendWireMessage: (message: WireMessage) => void,
  connectionId: string
): ReturnType<typeof setInterval> {
  return setInterval((): void => {
    if (!state.pendingRequests.has(connectionId)) {
      return;
    }

    sendWireMessage({
      type: "request",
      id: connectionId,
      key: INTERNAL_PING_KEY,
      payload: undefined,
    });
  }, PING_INTERVAL_MS);
}

function createConnectMethod<TRegistry extends MessageRegistry>(
  state: InternalState,
  validateOrigin: (origin: string) => boolean,
  sendWireMessage: (message: WireMessage) => void,
  timeout: number
): FrameLink<TRegistry>["connect"] {
  return async function connect(targetWindow: Window): Promise<void> {
    const connectionPromise = new Promise<void>(
      (resolve: () => void, reject: (reason: Error) => void): void => {
        if (state.isConnected) {
          resolve();
          return;
        }

        state.target = targetWindow;
        setupMessageListener(state, validateOrigin, sendWireMessage);

        const connectionId = generateId();
        const connectionTimeout = setTimeout((): void => {
          state.pendingRequests.delete(connectionId);
          reject(new Error(`Connection timed out after ${String(timeout)}ms`));
        }, timeout);

        setupPingHandler(state);
        const pingInterval = startPingInterval(
          state,
          sendWireMessage,
          connectionId
        );

        state.pendingRequests.set(connectionId, {
          resolve: (): void => {
            clearInterval(pingInterval);
            state.isConnected = true;
            resolve();
          },
          reject: (err: Error): void => {
            clearInterval(pingInterval);
            reject(err);
          },
          timeoutId: connectionTimeout,
        });
      }
    );
    await connectionPromise;
  };
}

/**
 * Creates a new FrameLink instance for type-safe postMessage communication.
 *
 * @typeParam TRegistry - The message registry defining all valid message types
 * @param options - Configuration options
 * @returns A FrameLink instance
 *
 * @example
 * ```typescript
 * interface MyMessages {
 *   "user:login": { payload: { token: string }; response: { userId: string } };
 * }
 *
 * const link = createFrameLink<MyMessages>({ targetOrigin: "https://example.com" });
 * await link.connect(iframe.contentWindow);
 * const result = await link.send("user:login", { token: "abc123" });
 * ```
 */
export function createFrameLink<TRegistry extends MessageRegistry>(
  options: FrameLinkOptions
): FrameLink<TRegistry> {
  const { targetOrigin, timeout = DEFAULT_TIMEOUT_MS } = options;

  const state: InternalState = {
    target: null,
    isConnected: false,
    messageHandler: null,
    listeners: new Map(),
    pendingRequests: new Map(),
  };

  const validateOrigin = createOriginValidator(targetOrigin);
  const sendWireMessage = createMessageSender(
    (): Window | null => state.target,
    targetOrigin
  );

  const instance: FrameLink<TRegistry> = {
    get connected(): boolean {
      return state.isConnected;
    },

    send: createSendMethod<TRegistry>(state, sendWireMessage, timeout),

    on<TKey extends keyof TRegistry & string>(
      key: TKey,
      handler: MessageHandler<TRegistry, TKey>
    ): () => void {
      state.listeners.set(key, handler as AnyHandler);
      return (): void => {
        state.listeners.delete(key);
      };
    },

    off(key: keyof TRegistry & string): void {
      state.listeners.delete(key);
    },

    connect: createConnectMethod<TRegistry>(
      state,
      validateOrigin,
      sendWireMessage,
      timeout
    ),

    destroy(): void {
      cleanup(state);
    },
  };

  return instance;
}
