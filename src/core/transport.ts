import type { WireMessage } from "../types/index.js";

export function createMessageSender(
  getTarget: () => Window | null,
  targetOrigin: string
): (message: WireMessage) => void {
  return (message: WireMessage): void => {
    const currentTarget = getTarget();
    if (currentTarget === null) {
      throw new Error("Not connected to target window");
    }
    currentTarget.postMessage(message, targetOrigin);
  };
}

export function createOriginValidator(
  targetOrigin: string
): (origin: string) => boolean {
  return (origin: string): boolean => {
    if (targetOrigin === "*") {
      return true;
    }
    return origin === targetOrigin;
  };
}
