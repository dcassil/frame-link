import type { MessageDefinition, MessageRegistry } from "../../src/index.js";

/**
 * A plain, structured-clone-safe rectangle.
 *
 * Deliberately NOT a `DOMRect`: `DOMRect` does not serialize usefully across
 * `postMessage` (its accessor-based properties are dropped by the structured
 * clone algorithm). SIFR flattens geometry to this bare `{ x, y, width, height }`
 * shape before sending, so the sample uses the same wire-safe representation.
 */
export interface SerializableRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Sample namespaced, fully-typed CMS/Stardust message registry.
 *
 * Naming convention: every key is `<namespace>.<verb>`. The namespace groups
 * related messages (`geometry`, `content`, `scroll`, `presence`) and the verb
 * describes the action.
 *
 * Requests vs. events:
 *  - Requests (caller awaits a meaningful response):
 *      - "geometry.query"  -> returns rects
 *      - "content.inject"  -> returns { ok }
 *      - "content.update"  -> returns { ok }
 *  - Events (fire-and-forget, response is `void`):
 *      - "scroll.update"
 *      - "presence.update"
 *
 * Events are modeled as `MessageDefinition<Payload, void>` because Frame Link
 * has no separate event channel: a single API (`on` / `send`) carries both
 * requests and events, and a `void` response is what distinguishes a
 * fire-and-forget event from a request that expects an answer.
 *
 * All payloads and responses are plain, serializable objects (no DOM types),
 * so they survive `postMessage` structured cloning intact.
 */
export interface StardustCmsRegistry extends MessageRegistry {
  /** Request: query the geometry of a target and its children. */
  "geometry.query": MessageDefinition<
    { targetId: string },
    { target: SerializableRect; children: SerializableRect[] }
  >;

  /** Request: inject new HTML into a target. */
  "content.inject": MessageDefinition<
    { targetId: string; html: string },
    { ok: boolean }
  >;

  /** Request: replace the HTML of an existing target. */
  "content.update": MessageDefinition<
    { targetId: string; html: string },
    { ok: boolean }
  >;

  /** Event: the viewport scroll position changed. */
  "scroll.update": MessageDefinition<{ scrollX: number; scrollY: number }>;

  /** Event: a user's presence/cursor position changed. */
  "presence.update": MessageDefinition<{ userId: string; x: number; y: number }>;
}
