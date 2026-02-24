export interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

export type AnyHandler = (payload: unknown) => Promise<unknown>;

export interface InternalState {
  target: Window | null;
  isConnected: boolean;
  messageHandler: ((event: MessageEvent) => void) | null;
  listeners: Map<string, AnyHandler>;
  pendingRequests: Map<string, PendingRequest>;
}

export function createInitialState(): InternalState {
  return {
    target: null,
    isConnected: false,
    messageHandler: null,
    listeners: new Map(),
    pendingRequests: new Map(),
  };
}

export function cleanup(state: InternalState): void {
  if (state.messageHandler !== null) {
    window.removeEventListener("message", state.messageHandler);
    state.messageHandler = null;
  }

  const destroyError = new Error("FrameLink destroyed");
  state.pendingRequests.forEach((pending: PendingRequest): void => {
    clearTimeout(pending.timeoutId);
    pending.reject(destroyError);
  });

  state.listeners.clear();
  state.pendingRequests.clear();
  state.target = null;
  state.isConnected = false;
}
