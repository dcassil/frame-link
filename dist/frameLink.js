"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
let __frameLink;
let __target;
let __targetOrigin = "*";
let __ready = false;
let __listeners = [];
const handleMessage = (message) => {
    var _a, _b, _c;
    let key = (_a = message === null || message === void 0 ? void 0 : message.data) === null || _a === void 0 ? void 0 : _a.key;
    let resp_key = (_b = message === null || message === void 0 ? void 0 : message.data) === null || _b === void 0 ? void 0 : _b.resp_key;
    let data = (_c = message === null || message === void 0 ? void 0 : message.data) === null || _c === void 0 ? void 0 : _c.data;
    __listeners = __listeners.filter((listener) => __awaiter(void 0, void 0, void 0, function* () {
        if (key === listener.key) {
            const replyData = yield listener.callBack(data);
            if (resp_key) {
                postMessage(resp_key, replyData);
            }
            return !listener.once;
        }
        return true;
    }));
};
const postMessage = (key, data, respCallback) => {
    const resp_key = respCallback
        ? Math.random() + new Date().getTime()
        : undefined;
    if (__target === null || __target === void 0 ? void 0 : __target.postMessage) {
        if (resp_key && respCallback) {
            addListener(resp_key, respCallback);
        }
        __target === null || __target === void 0 ? void 0 : __target.postMessage({ key, resp_key, data }, "*");
    }
    else {
        throw new Error("target ref not set or has no postmessage function");
    }
};
const addListener = (key, callBack, once = false) => {
    __listeners = __listeners.filter((l) => l.key !== key);
    __listeners.push({
        key,
        callBack,
        id: Math.random() + new Date().getTime(),
        once,
    });
};
const removeListener = ({ key, id }) => {
    __listeners = __listeners.filter((l) => (id === undefined || l.id !== id) && (key === undefined || l.key !== key));
};
const hasListener = ({ key, id }) => {
    return __listeners.some((listener) => {
        listener.key === key || listener.id === id;
    });
};
const init = (readyCallback) => {
    window.removeEventListener("message", handleMessage);
    window.addEventListener("message", handleMessage);
    console.log("init frame-link called");
    const registerTarget = (target) => {
        __target = target;
        if ("postMessage" in __target && !__ready) {
            addListener("ping", () => { }, true);
            let ping = setInterval(() => {
                postMessage("ping", undefined, (e) => {
                    console.log("in ping listener", e);
                    __ready = true;
                    readyCallback(true);
                    clearInterval(ping);
                });
            }, 500);
        }
    };
    return {
        addListener,
        postMessage,
        removeListener,
        hasListener,
        registerTarget,
        ready: __ready,
    };
};
function frameLink(readyCallback, options) {
    __targetOrigin = (options === null || options === void 0 ? void 0 : options.targetOrigin) || "*";
    __frameLink = __frameLink || init(readyCallback);
    return __frameLink;
}
exports.default = frameLink;
//# sourceMappingURL=frameLink.js.map