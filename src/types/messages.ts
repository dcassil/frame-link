/**
 * Defines a message contract with payload and response types.
 * Use void for messages that don't require a payload or response.
 *
 * @example
 * ```typescript
 * interface MyMessages {
 *   "user:login": MessageDefinition<{ token: string }, { userId: string }>;
 *   "event:notify": MessageDefinition<{ message: string }, void>;
 * }
 * ```
 */
export interface MessageDefinition<TPayload = void, TResponse = void> {
  payload: TPayload;
  response: TResponse;
}

/**
 * A registry mapping message keys to their payload/response types.
 * Consumers extend this to define their message contracts.
 */
export type MessageRegistry = Record<
  string,
  MessageDefinition<unknown, unknown>
>;

/**
 * Extracts the payload type for a given message key from a registry.
 */
export type PayloadOf<
  TRegistry extends MessageRegistry,
  TKey extends keyof TRegistry,
> = TRegistry[TKey]["payload"];

/**
 * Extracts the response type for a given message key from a registry.
 */
export type ResponseOf<
  TRegistry extends MessageRegistry,
  TKey extends keyof TRegistry,
> = TRegistry[TKey]["response"];

/**
 * Handler function type for a specific message key.
 */
export type MessageHandler<
  TRegistry extends MessageRegistry,
  TKey extends keyof TRegistry,
> = (
  payload: PayloadOf<TRegistry, TKey>
) => ResponseOf<TRegistry, TKey> | Promise<ResponseOf<TRegistry, TKey>>;
