# frame-link

Type-safe, bidirectional `postMessage` communication between a parent page and an iframe. Handles the handshake, request/response pairing, and timeout — you just define your message types and call `send`.

> **React?** See [frame-link-react](https://www.npmjs.com/package/frame-link-react) for hooks that wrap this core library.

---

## Install

Install on **both** the parent page and the iframe:

```bash
npm install frame-link
# or
yarn add frame-link
```

---

## Quickstart

### Parent page

```typescript
import { createFrameLink } from "frame-link";

const iframe = document.getElementById("my-iframe") as HTMLIFrameElement;

// Always use an explicit origin — never "*" in production.
const link = createFrameLink({ targetOrigin: "https://app.example.com" });

// Wait for the handshake to complete before sending.
await link.connect(iframe.contentWindow!);

// Send a request and await the response.
const result = await link.send("user:get", { id: "123" });
console.log(result.name);
```

### Iframe

```typescript
import { createFrameLink } from "frame-link";

const link = createFrameLink({ targetOrigin: "https://host.example.com" });

// Register a handler before connecting.
link.on("user:get", async ({ id }) => {
  const user = await db.getUser(id);
  return { name: user.name, email: user.email };
});

// Connect back to the parent window.
await link.connect(window.parent);
```

Both sides must call `connect`. The handshake is symmetric: whichever side calls `connect` first waits until the other side responds.

---

## Core concepts

### Creating a link

`createFrameLink(options)` returns a `FrameLink` instance. Options:

| Option | Type | Default | Description |
|---|---|---|---|
| `targetOrigin` | `string` | — | Origin of the remote window. Use an exact origin in production. |
| `timeout` | `number` | `5000` | Milliseconds before `send` or `connect` rejects. |

### Request / response via `send`

`link.send(key, payload)` sends a message and returns a `Promise` that resolves to the response. The remote side handles it with `link.on(key, handler)`, where the handler's return value becomes the response.

```typescript
// Sender
const response = await link.send("user:update", { id: "42", name: "Ada" });
console.log(response.success); // boolean

// Receiver
link.on("user:update", async ({ id, name }) => {
  const ok = await db.updateUser(id, name);
  return { success: ok };
});
```

### Events (fire-and-forget)

Define the response type as `void` in your registry for events where the sender does not wait for a meaningful reply:

```typescript
link.on("notification:show", ({ message, type }) => {
  showToast(message, type);
  // No return value needed — response is void.
});

// Fire and forget — still returns Promise<void>, which you can discard.
void link.send("notification:show", { message: "Saved!", type: "info" });
```

### Handshake / connection status via `connect` and `connected`

`link.connect(targetWindow)` performs a handshake and returns a `Promise<void>` that resolves once both sides are ready. After that, `link.connected` is `true`.

```typescript
await link.connect(iframe.contentWindow!);
console.log(link.connected); // true

link.destroy(); // tears down listeners and resets state
console.log(link.connected); // false
```

Always `await link.connect(...)` before calling `link.send(...)`. Sending before the handshake completes throws an error.

---

## Typed message registry

Define your messages once as an interface that extends `MessageRegistry`. Each key maps to a `MessageDefinition<Payload, Response>`.

```typescript
import { createFrameLink } from "frame-link";
import type { MessageDefinition, MessageRegistry } from "frame-link";

// Define a registry — do this in a shared file imported by both sides.
interface SampleMessages extends MessageRegistry {
  /** Fetch a user by ID. */
  "user:get": MessageDefinition<{ id: string }, { name: string; email: string }>;

  /** Update a user's display name. */
  "user:update": MessageDefinition<{ id: string; name: string }, { success: boolean }>;

  /**
   * Fire-and-forget notification event.
   * Response is void — the sender does not wait for a reply.
   */
  "notification:show": MessageDefinition<
    { message: string; type: "info" | "error" },
    void
  >;
}

// Pass the registry as a type parameter — both sides must use the same registry.
const link = createFrameLink<SampleMessages>({ targetOrigin: "https://app.example.com" });

// The compiler knows the exact payload and response shapes for every key.
const user = await link.send("user:get", { id: "123" });
//    ^ { name: string; email: string }

void link.send("notification:show", { message: "Done!", type: "info" });
//                                   ^ { message: string; type: "info" | "error" }
```

### Utility types

```typescript
import type { PayloadOf, ResponseOf } from "frame-link";

type GetPayload  = PayloadOf<SampleMessages, "user:get">;
// => { id: string }

type GetResponse = ResponseOf<SampleMessages, "user:get">;
// => { name: string; email: string }
```

---

## Security

### Never use `targetOrigin: "*"` outside a local demo

Passing `"*"` as `targetOrigin` tells the browser to deliver your `postMessage` to **any** origin. This can leak sensitive data (tokens, PII, internal state) to a malicious page that has embedded your iframe or that your page has embedded.

> **Rule:** Always set `targetOrigin` to the exact origin of the remote window in every non-demo environment.

```typescript
// WRONG — do not use in production
const link = createFrameLink({ targetOrigin: "*" }); // leaks messages to any page

// CORRECT — lock it to the exact origin of the remote window
const link = createFrameLink({ targetOrigin: "https://app.example.com" });
```

The `*` wildcard is acceptable **only** in local development where both sides run on `localhost` and you accept the risk, and it should be behind a build flag (e.g., `process.env.NODE_ENV === "development"`).

### Receiver-side origin validation

frame-link validates the sender's origin on every incoming message using an internal `createOriginValidator`. When `targetOrigin` is an exact origin string, any message arriving from a different origin is silently dropped — it is never delivered to your handlers. This means both sides of the link reject unexpected senders automatically, as long as you supply an explicit `targetOrigin`.

---

## API reference

### `createFrameLink<TRegistry>(options): FrameLink<TRegistry>`

Creates a new FrameLink instance.

```typescript
function createFrameLink<TRegistry extends MessageRegistry>(
  options: FrameLinkOptions
): FrameLink<TRegistry>
```

**`FrameLinkOptions`**

```typescript
interface FrameLinkOptions {
  targetOrigin: string; // Origin of the remote window (e.g. "https://app.example.com")
  timeout?: number;     // Request timeout in ms. Default: 5000
}
```

---

### `FrameLink<TRegistry>` instance

#### `link.connect(target: Window): Promise<void>`

Performs the handshake with the remote window. Must be awaited before calling `send`. Rejects if the handshake is not completed within `timeout` ms.

```typescript
await link.connect(iframe.contentWindow!); // parent side
await link.connect(window.parent);         // iframe side
```

#### `link.connected: boolean` (read-only)

`true` after the handshake completes; `false` before `connect` resolves or after `destroy` is called.

#### `link.send<TKey>(key: TKey, payload: PayloadOf<TRegistry, TKey>): Promise<ResponseOf<TRegistry, TKey>>`

Sends a message and waits for a response. Rejects after `timeout` ms if no response is received.

```typescript
const user = await link.send("user:get", { id: "123" });
```

#### `link.on<TKey>(key: TKey, handler: MessageHandler<TRegistry, TKey>): () => void`

Registers a handler for incoming messages of type `key`. Returns an unsubscribe function.

```typescript
const unsubscribe = link.on("user:get", async ({ id }) => {
  return { name: "Ada", email: "ada@example.com" };
});

unsubscribe(); // remove the handler
```

**`MessageHandler` signature:**

```typescript
type MessageHandler<TRegistry, TKey> = (
  payload: PayloadOf<TRegistry, TKey>
) => ResponseOf<TRegistry, TKey> | Promise<ResponseOf<TRegistry, TKey>>;
```

#### `link.off(key: keyof TRegistry & string): void`

Removes the handler for `key`.

#### `link.destroy(): void`

Tears down all internal listeners and resets connection state. Call this in cleanup (e.g., component unmount, page unload).

---

### Type exports

| Export | Kind | Description |
|---|---|---|
| `createFrameLink` | function | Creates a FrameLink instance |
| `isWireMessage` | function | Type guard — returns `true` if the value is a valid `WireMessage` |
| `FrameLink` | type | Interface for a FrameLink instance |
| `FrameLinkOptions` | type | Options passed to `createFrameLink` |
| `MessageDefinition` | type | Defines a message's payload and response types |
| `MessageHandler` | type | Handler function type for a message key |
| `MessageRegistry` | type | A record mapping message keys to `MessageDefinition` |
| `PayloadOf` | type | Extracts the payload type for a key from a registry |
| `ResponseOf` | type | Extracts the response type for a key from a registry |
| `WireMessage` | type | Internal protocol message type |

---

## Troubleshooting

### Messages are silently dropped (origin mismatch)

**Symptom:** `link.send(...)` times out; handlers never fire.

**Cause:** The `targetOrigin` you set does not match the actual origin of the remote window. frame-link drops all messages from unexpected origins.

**Fix:** Make sure `targetOrigin` on the **sender** matches the `window.location.origin` of the **receiver**, and vice versa.

```
Parent uses  targetOrigin: "https://app.example.com"
↓  must match  ↓
Iframe is served from  https://app.example.com
```

### Handshake never completes (`connect` hangs or rejects with timeout)

**Symptom:** `await link.connect(...)` hangs and eventually rejects.

**Causes and fixes:**
- One side did not call `connect` — both the parent and the iframe must call `connect`.
- The iframe is not yet loaded when the parent calls `connect` — wait for the iframe's `load` event before calling `connect` on the parent side.
- `targetOrigin` mismatch (see above) prevents the handshake messages from being delivered.
- The `timeout` option is too short for your network/load conditions — increase it.

```typescript
iframe.addEventListener("load", async () => {
  await link.connect(iframe.contentWindow!);
  // safe to send now
});
```

### Error: "Not connected to target window"

**Symptom:** `link.send(...)` throws immediately.

**Cause:** `send` was called before `connect` resolved (or `connect` was never called).

**Fix:** Always `await link.connect(target)` before calling `link.send(...)`.

```typescript
// Wrong
link.send("user:get", { id: "1" }); // throws — not connected yet

// Correct
await link.connect(iframe.contentWindow!);
const user = await link.send("user:get", { id: "1" });
```
