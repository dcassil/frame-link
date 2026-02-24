import type { WireMessage } from "../types/index.js";
import { generateId } from "../utils/id.js";

import { INTERNAL_PING_KEY, PING_INTERVAL_MS } from "./constants.js";
import { setupMessageListener } from "./dispatcher.js";
import type { AnyHandler, InternalState } from "./state.js";

function setupPingHandler(state: InternalState): void {
  const pingHandler: AnyHandler = async (): Promise<undefined> => {
    await Promise.resolve();
    return undefined;
  };
  state.listeners.set(INTERNAL_PING_KEY, pingHandler);
}

function startPingInterval(
  state: InternalState,
  sendWireMessage: (message: WireMessage) => void,
  timeout: number
): ReturnType<typeof setInterval> {
  return setInterval((): void => {
    const id = generateId();

    const timeoutId = setTimeout((): void => {
      state.pendingRequests.delete(id);
    }, timeout);

    state.pendingRequests.set(id, {
      resolve: (): void => {
        state.isConnected = true;
      },
      reject: (): void => {
        // Silent rejection - connection retry handled by interval
      },
      timeoutId,
    });

    sendWireMessage({
      type: "request",
      id,
      key: INTERNAL_PING_KEY,
      payload: undefined,
    });
  }, PING_INTERVAL_MS);
}

export function createConnectMethod(
  state: InternalState,
  validateOrigin: (origin: string) => boolean,
  sendWireMessage: (message: WireMessage) => void,
  timeout: number
): (target: Window) => Promise<void> {
  return async (target: Window): Promise<void> => {
    if (state.isConnected) {
      return;
    }

    state.target = target;

    setupMessageListener(state, validateOrigin, sendWireMessage);
    setupPingHandler(state);

    const pingInterval = startPingInterval(state, sendWireMessage, timeout);

    const connectionPromise = new Promise<void>(
      (resolve: () => void, reject: (error: Error) => void): void => {
        const checkInterval = setInterval((): void => {
          if (state.isConnected) {
            clearInterval(checkInterval);
            clearInterval(pingInterval);
            resolve();
          }
        }, PING_INTERVAL_MS);

        setTimeout((): void => {
          clearInterval(checkInterval);
          clearInterval(pingInterval);
          if (!state.isConnected) {
            reject(new Error(`Connection timed out after ${String(timeout)}ms`));
          }
        }, timeout);
      }
    );

    await connectionPromise;
  };
}
