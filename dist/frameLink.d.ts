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
export type TPostMessage = (key: string | number, data?: any, respCallback?: (data?: any) => any) => any;
export type TAddListener = (key: string | number, callBack: any, once?: boolean) => any;
export type TRemoveListener = ({ key, id, }: {
    key?: string | number;
    id?: string | number;
}) => void;
export type THasListener = ({ key, id, }: {
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
export default function frameLink(readyCallback: TReadyCallback, options?: {
    targetOrigin: string;
}): TFrameLink;
//# sourceMappingURL=frameLink.d.ts.map