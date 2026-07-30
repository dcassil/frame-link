# Connection-Status / Handshake Assessment (FLINK-T-0015)

**Satisfies:** REQ-003 (written assessment stating sufficiency or listing specific minimal changes).
**Feeds:** NFR-001 (no breaking change to `createFrameLink` without an explicit, documented decision).
**Scope:** Assessment only. This document authors no production code and changes nothing under `src/`.

## Purpose

Decide whether Frame Link's current connection-status / handshake surface is sufficient for the iframe-editor UX the SIFR adapter targets, or whether a specific, minimal, backward-compatible change is warranted. The decision is grounded in (a) the real code and (b) the friction observed in the FLINK-T-0014 two-endpoint spike.

## What the current API actually observes (evidence)

- **Ping-based handshake — `src/core/connect.ts`.** `createConnectMethod` returns `connect(target)`. It registers a message listener and an internal ping handler (`INTERNAL_PING_KEY`), then starts a ping interval (`startPingInterval`, `PING_INTERVAL_MS = 100 ms`). Each ping's `resolve` sets `state.isConnected = true`. A separate `checkInterval` polls `state.isConnected`; on `true` it clears **both** the check interval **and the ping interval** and resolves the returned promise. A `setTimeout(timeout)` rejects with `Connection timed out after <timeout>ms` if still unconnected.
- **Snapshot connection flag — `src/core/state.ts`.** `InternalState.isConnected` is a plain boolean. It flips to `true` on first successful ping and is reset to `false` only by `cleanup()` (on `destroy()`). There is no observer, no event emission, and no subscription attached to it.
- **Public surface — `src/types/frame-link.ts`.** `FrameLink` exposes `connect(target): Promise<void>` and `readonly connected: boolean`. `connected` is a point-in-time getter; there is no `onStatusChange`, no event, and no way to be notified when it changes.
- **Options surface — `src/types/options.ts`.** `FrameLinkOptions` has only `targetOrigin` and optional `timeout`. There is no status-callback hook.
- **React surface — `src/hooks/useConnection.ts`.** `useConnection()` returns `{ connected, connecting, error, connect }`. `connecting` and `error` are derived from the lifecycle of the `connect()` promise (in-flight / rejected), giving React consumers a clean tri-state for a **single** connect attempt.

**Critical behavior to note:** once `connect()` resolves, the ping interval is cleared (`connect.ts` lines 69–72). Frame Link therefore performs **no ongoing liveness probing** after initial connect. `connected` never transitions back to `false` except on explicit `destroy()`. There is no post-connection "disconnected / reconnected" signal of any kind.

## Evidence from the FLINK-T-0014 spike

The spike (`examples/stardust-cms/__tests__/spike.spec.ts`) wired a host and an iframe Frame Link together in jsdom and exercised all four SIFR operation classes: `geometry.query` (request/response), `content.inject` / `content.update` (typed acks), and `scroll.update` / `presence.update` (fire-and-forget events). All passed.

What worked, relevant to connection status:
- The **ping handshake resolves cleanly** when both endpoints call `connect()` and messages round-trip (`connectBoth` advances fake timers so ping intervals fire; both `connect()` promises settle).
- Once connected, **every operation class round-trips correctly** — the handshake is a reliable gate for real traffic.

Friction observed (from the spike's top-of-file notes) — and its correct classification:
- **Shared-window / origin-routing friction (TEST-SCAFFOLDING, not a library gap).** Both endpoints share the single jsdom `window`, so both register on the same `window.addEventListener("message", …)`. The test intercepts `addEventListener` to capture each handler and route messages directly, avoiding a broadcast that would fire both handlers. This is an artifact of co-locating two endpoints in one jsdom realm. In production the host and iframe live in **separate** realms with a real `postMessage` boundary and origin checks (`validateOrigin`), so this friction does not exist. It is **not** evidence of a connection-status gap.
- **Fake timers required for the ping interval (TEST-SCAFFOLDING).** `advanceTimersByTimeAsync` is needed only because the test controls time; irrelevant to production.
- **Handlers must be registered before the sender fires (LIBRARY BEHAVIOR, by design).** Events modeled as `void`-response still need a receiving handler or an error response is returned. This is expected request/response semantics, not a status gap.

The spike surfaced **no** friction attributable to connection status, handshake visibility, or reconnect during normal operation. The one substantive friction note is unambiguously test-scaffolding.

## The three iframe-editor UX needs

| # | UX need | Current API satisfies? | Evidence |
|---|---------|------------------------|----------|
| 1 | **Initial handshake visibility** — know when the editor iframe is ready to receive commands | **Yes** | `connect()` returns a promise that resolves on successful ping handshake (`connect.ts`); `FrameLink.connected` reflects the result; React's `useConnection` exposes `connecting` (in-flight) and `connected` (settled). This is a complete, ergonomic tri-state for the initial handshake. |
| 2 | **Iframe reload / reconnect detection after initial connect** — detect that the iframe navigated/reloaded and re-establish | **Partial (by re-invocation, not by signal)** | No ongoing liveness probing after connect (ping interval cleared, `connect.ts`). `connected` is a snapshot with no change-notification. BUT the parent owns the `<iframe>` element and already receives the DOM `load` event on reload; the documented pattern (`useConnection` JSDoc `handleIframeLoad`) is to call `connect()` again on `onLoad`. The reconnect trigger the editor needs is the iframe's own `load` event, which the parent already has. |
| 3 | **Error surfacing** — show the user when the editor failed to connect | **Yes** | `connect()` rejects with `Connection timed out after <timeout>ms` (`connect.ts`); `useConnection` captures it as `error: Error \| null`. The JSDoc example renders `error.message`. Complete for the connect lifecycle. |

## Honest evaluation of the known gap candidate

The gap candidate is real and correctly identified: **after `connect()` resolves there is no ongoing "connection lost / reconnected" event.** The ping interval is cleared once connected, and `connected` is a snapshot boolean with no subscription. If the iframe silently died (crashed, hung) without a DOM `load` event, Frame Link would continue reporting `connected === true` and `send()` calls would simply time out per-request.

Does an iframe editor genuinely need **live reconnect signaling**? Analysis says no, for this UX:

1. **The reconnect trigger the editor cares about is iframe reload/navigation, and the parent already observes it directly.** The parent renders the `<iframe>` and gets its `onLoad`. That is a stronger, earlier, and more precise signal than any ping-derived heartbeat Frame Link could synthesize — the documented `useConnection` pattern already wires `connect()` to `onLoad`. Adding a library heartbeat would duplicate a signal the host already has, at higher cost.
2. **Per-request timeouts already cover the "silently dead iframe" case.** Every `send()` has its own `timeout`; a hung iframe surfaces as a rejected request exactly where the editor is doing work and can react. A background heartbeat would surface the same failure less contextually.
3. **Transport-not-application principle.** Frame Link is a typed `postMessage` transport. Liveness policy — how often to probe, how to back off, when to show a "reconnecting…" banner — is application concern. Baking a heartbeat + reconnect state machine into the transport would push it up the stack toward being an application framework, which is out of scope for this initiative.
4. **The spike demonstrated no need.** All four operation classes worked over a single handshake with no reconnect churn. There is no demonstrated failure the current surface cannot handle via `onLoad` re-connect + per-request timeouts.

Polling `connected` would add nothing (it never flips back to `false` post-connect without `destroy()`), so the real fallback is **re-calling `connect()` on iframe `load`** — which is adequate, already documented, and already the intended pattern.

## VERDICT

**(a) Sufficient as-is.**

The current connection-status / handshake surface satisfies all three iframe-editor UX needs for the SIFR adapter:
- **Initial handshake visibility** — fully served by `connect()`'s promise, `FrameLink.connected`, and `useConnection`'s `{ connecting, connected }`.
- **Reload/reconnect detection** — served by the host's own iframe `onLoad` + re-invoking `connect()` (documented pattern), which is a better signal than any transport-level heartbeat.
- **Error surfacing** — fully served by `connect()` rejection and `useConnection`'s `error`.

The identified gap (no post-connect "lost/reconnected" event) is real but **not needed** for this UX: the parent already owns the authoritative reload signal via the DOM, and per-request `send()` timeouts cover silent-death cases. Adding live reconnect signaling would duplicate an existing host signal and push liveness policy into the transport, violating the transport-not-application principle and NFR-001's bias against unproven additions. The FLINK-T-0014 spike surfaced no connection-status friction; its one substantive friction note is test-scaffolding (shared-window routing in jsdom), not a library gap.

No change to `createFrameLink`, `FrameLinkOptions`, `FrameLink`, or `useConnection` is warranted.

## Entry condition for FLINK-T-0016

FLINK-T-0016 executes a code change **only if this verdict is (b) "Minimal change required."** Because this verdict is **(a) "Sufficient as-is,"** FLINK-T-0016 must **record "sufficient as-is" and make no code change.** No API addition is handed downstream.

_(If future demonstrated evidence — e.g. a real editor scenario where `onLoad` + per-request timeouts prove inadequate — reopens this, the minimal shape to consider first would be an additive optional `onStatusChange?: (status: "connected" | "disconnected") => void` in `FrameLinkOptions`, purely additive and backward-compatible. That is **not** proposed here and is out of scope for FLINK-T-0016; it would require its own documented decision per NFR-001. If it required a persistent heartbeat + reconnect state machine, that is larger than minimal and would be an **ESCALATION**, not a fold-in.)_

---

## FLINK-T-0016 outcome — No change required

**Decision:** Per the VERDICT above (**(a) Sufficient as-is**), the conditional API
extension task FLINK-T-0016 makes **no code change**. This is an explicitly valid,
successful completion — the transport-not-application principle and NFR-001 forbid
inventing an addition to justify the task.

- No file under `src/` was modified.
- The existing public API (`createFrameLink`, `FrameLink`, `FrameLinkOptions`,
  `useConnection`) is unchanged and remains the confirmed-sufficient transport surface
  for the SIFR Stardust Iframe Adapter.
- If future evidence reopens the question, the first minimal shape to evaluate would be
  an additive optional `onStatusChange?: (status: "connected" | "disconnected") => void`
  in `FrameLinkOptions` (explicitly **not** implemented here); a persistent heartbeat
  would be an escalation, not a minimal change.

**Frame Link is confirmed sufficient to back the Stardust Iframe Adapter without
reintroducing a custom `postMessage` hook.**
