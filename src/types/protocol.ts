/**
 * Wire protocol message format for postMessage communication.
 * This is the internal format used on the wire, not exposed to consumers.
 */
export interface WireMessage {
  /**
   * Discriminator for message type.
   */
  readonly type: "request" | "response";

  /**
   * Unique identifier for request/response correlation.
   */
  readonly id: string;

  /**
   * The message key from the registry.
   */
  readonly key: string;

  /**
   * The message payload (request) or response data.
   */
  readonly payload: unknown;

  /**
   * Error message if the handler threw an error.
   * Only present on response messages.
   */
  readonly error?: string;
}

/**
 * Type guard to check if a value is a valid WireMessage.
 */
export function isWireMessage(value: unknown): value is WireMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const msg = value as Record<string, unknown>;
  const msgType = msg["type"];
  const msgId = msg["id"];
  const msgKey = msg["key"];

  return (
    (msgType === "request" || msgType === "response") &&
    typeof msgId === "string" &&
    typeof msgKey === "string" &&
    "payload" in msg
  );
}
