import {
  type AnyHandler,
  cleanup,
  createConnectMethod,
  createInitialState,
  createMessageSender,
  createOriginValidator,
  createSendMethod,
  DEFAULT_TIMEOUT_MS,
} from "./core/index.js";
import type {
  FrameLink,
  FrameLinkOptions,
  MessageHandler,
  MessageRegistry,
} from "./types/index.js";

/**
 * Creates a new FrameLink instance for type-safe postMessage communication.
 *
 * @template TRegistry - Message registry defining available message types
 * @param options - Configuration options for the FrameLink instance
 * @returns A FrameLink instance with send, on, off, connect, and destroy methods
 *
 * @example
 * ```typescript
 * interface MyMessages extends MessageRegistry {
 *   'user:get': MessageDefinition<{ id: string }, { name: string }>;
 * }
 *
 * const link = createFrameLink<MyMessages>({ targetOrigin: 'https://example.com' });
 * await link.connect(iframe.contentWindow);
 * const user = await link.send('user:get', { id: '123' });
 * ```
 */
export function createFrameLink<TRegistry extends MessageRegistry>(
  options: FrameLinkOptions
): FrameLink<TRegistry> {
  const { targetOrigin, timeout = DEFAULT_TIMEOUT_MS } = options;

  const state = createInitialState();
  const validateOrigin = createOriginValidator(targetOrigin);
  const sendWireMessage = createMessageSender(
    (): Window | null => state.target,
    targetOrigin
  );

  return {
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

    connect: createConnectMethod(
      state,
      validateOrigin,
      sendWireMessage,
      timeout
    ),

    destroy(): void {
      cleanup(state);
    },
  };
}
