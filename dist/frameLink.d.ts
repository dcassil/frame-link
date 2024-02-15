export type TTarget = Window;
export type TRegisterTarget = (target: Window) => void;
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
export type TReadyCallback = (ready: boolean) => void;
export type TFrameLink = {
    addListener: TAddListener;
    postMessage: TPostMessage;
    removeListener: TRemoveListener;
    registerTarget: TRegisterTarget;
    ready: boolean;
};
export default function frameLink({ targetOrigin }: {
    targetOrigin: string;
}, readyCallback: TReadyCallback): TFrameLink;
//# sourceMappingURL=frameLink.d.ts.map