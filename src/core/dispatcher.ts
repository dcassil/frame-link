import { isWireMessage, type WireMessage } from "../types/index.js";

import type { InternalState } from "./state.js";

export function handleResponse(state: InternalState, data: WireMessage): void {
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

export async function handleRequest(
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

export function createIncomingMessageHandler(
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

export function setupMessageListener(
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
