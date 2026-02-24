import type {
  MessageRegistry,
  PayloadOf,
  ResponseOf,
  WireMessage,
} from "../types/index.js";
import { generateId } from "../utils/id.js";

import type { InternalState } from "./state.js";

export function createSendMethod<TRegistry extends MessageRegistry>(
  state: InternalState,
  sendWireMessage: (message: WireMessage) => void,
  timeout: number
): <TKey extends keyof TRegistry & string>(
  key: TKey,
  payload: PayloadOf<TRegistry, TKey>
) => Promise<ResponseOf<TRegistry, TKey>> {
  return async <TKey extends keyof TRegistry & string>(
    key: TKey,
    payload: PayloadOf<TRegistry, TKey>
  ): Promise<ResponseOf<TRegistry, TKey>> => {
    if (!state.isConnected) {
      throw new Error("Not connected");
    }

    const id = generateId();

    return await new Promise<ResponseOf<TRegistry, TKey>>(
      (
        resolve: (value: ResponseOf<TRegistry, TKey>) => void,
        reject: (error: Error) => void
      ): void => {
        const timeoutId = setTimeout((): void => {
          state.pendingRequests.delete(id);
          reject(new Error(`Request timed out: ${key}`));
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
