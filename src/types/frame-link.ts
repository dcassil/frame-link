import type {
  MessageHandler,
  MessageRegistry,
  PayloadOf,
  ResponseOf,
} from "./messages.js";

/**
 * A type-safe bidirectional communication channel over postMessage.
 *
 * @typeParam TRegistry - The message registry defining all valid message types
 */
export interface FrameLink<TRegistry extends MessageRegistry> {
  /**
   * Send a message and wait for a response.
   *
   * @param key - The message key (must be defined in TRegistry)
   * @param payload - The message payload (type-checked against TRegistry)
   * @returns Promise resolving to the response (type-checked against TRegistry)
   * @throws Error if the request times out or the target is not connected
   */
  send: <TKey extends keyof TRegistry & string>(
    key: TKey,
    payload: PayloadOf<TRegistry, TKey>
  ) => Promise<ResponseOf<TRegistry, TKey>>;

  /**
   * Register a handler for incoming messages.
   *
   * @param key - The message key to listen for
   * @param handler - Function to handle the message and return a response
   * @returns Unsubscribe function to remove the handler
   */
  on: <TKey extends keyof TRegistry & string>(
    key: TKey,
    handler: MessageHandler<TRegistry, TKey>
  ) => () => void;

  /**
   * Remove a handler for a message key.
   *
   * @param key - The message key to stop listening for
   */
  off: (key: keyof TRegistry & string) => void;

  /**
   * Connect to a target window and establish communication.
   *
   * @param target - The target window (iframe.contentWindow or parent)
   * @returns Promise that resolves when the connection is established
   */
  connect: (target: Window) => Promise<void>;

  /**
   * Whether the connection to the target has been established.
   */
  readonly connected: boolean;

  /**
   * Clean up all listeners and disconnect.
   * Call this when you're done with the FrameLink instance.
   */
  destroy: () => void;
}
