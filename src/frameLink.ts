export type TTarget = Window;

export type TRegisterTarget = (target: Window) => void;

export type TMessagePayload = {
  key: string | number;
  resp_key: string | number;
  data: any;
};
export type TListener = {
  key: string | number;
  callBack: (data: any) => {};
  once?: boolean;
  id?: number;
};

export type TPostMessage = (
  key: string | number,
  data?: any,
  respCallback?: (data?: any) => any
) => any;

export type TAddListener = (
  key: string | number,
  callBack: any,
  once?: boolean
) => any;

export type TRemoveListener = ({
  key,
  id,
}: {
  key?: string | number;
  id?: string | number;
}) => void;

export type THasListener = ({
  key,
  id,
}: {
  key?: string | number;
  id?: string | number;
}) => boolean;

export type TReadyCallback = () => void;

export type TFrameLink = {
  addListener: TAddListener;
  postMessage: TPostMessage;
  removeListener: TRemoveListener;
  hasListener: THasListener;
  registerTarget: TRegisterTarget;
  ready: boolean;
  connected: boolean;
};

let __frameLink: TFrameLink;
let __target: TTarget | undefined;
let __targetOrigin: string = "*";
let connected = false;
let __listeners: any[] = [];

const handleMessage = (message: { data: TMessagePayload }) => {
  let key = message?.data?.key;
  let resp_key = message?.data?.resp_key;
  let data = message?.data?.data;

  __listeners = __listeners.filter(async (listener) => {
    if (key === listener.key) {
      const replyData = await listener.callBack(data);
      if (resp_key) {
        postMessage(resp_key, replyData);
      }
      return !listener.once;
    }
    return true;
  });
};

const postMessage: TPostMessage = (key, data, respCallback?) => {
  const resp_key = respCallback
    ? Math.random() + new Date().getTime()
    : undefined;

  if (__target?.postMessage) {
    if (resp_key && respCallback) {
      addListener(resp_key, respCallback);
    }
    __target?.postMessage({ key, resp_key, data }, "*");
  } else {
    throw new Error("target ref not set or has no postmessage function");
  }
};

const addListener: TAddListener = (key, callBack, once = false) => {
  __listeners = __listeners.filter((l) => l.key !== key);
  __listeners.push({
    key,
    callBack,
    id: Math.random() + new Date().getTime(),
    once,
  });
};

const removeListener: TRemoveListener = ({ key, id }) => {
  __listeners = __listeners.filter(
    (l) =>
      (id === undefined || l.id !== id) && (key === undefined || l.key !== key)
  );
};

const hasListener: THasListener = ({ key, id }) => {
  return __listeners.some(
    (listener) => listener.key === key || listener.id === id
  );
};

const init = (readyCallback: TReadyCallback): TFrameLink => {
  window.removeEventListener("message", handleMessage);
  window.addEventListener("message", handleMessage);

  const registerTarget = (target: TTarget) => {
    __target = target;
    if ("postMessage" in __target && !connected) {
      addListener("ping", () => {}, true);
      let ping = setInterval(() => {
        postMessage("ping", undefined, (e) => {
          returnValue.connected = true;
          readyCallback();
          clearInterval(ping);
        });
      }, 500);
    }
  };

  const returnValue = {
    addListener,
    postMessage,
    removeListener,
    hasListener,
    registerTarget,
    ready: true,
    connected,
  };

  return returnValue;
};

export default function frameLink(
  readyCallback: TReadyCallback,
  options?: { targetOrigin: string }
) {
  __targetOrigin = options?.targetOrigin || "*";
  __frameLink = __frameLink || init(readyCallback);

  return __frameLink;
}
