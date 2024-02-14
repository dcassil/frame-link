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
let target;
let ready = false;
let listeners = [];
const handleMessage = (e) => {
    var _a, _b, _c;
    let key = (_a = e === null || e === void 0 ? void 0 : e.data) === null || _a === void 0 ? void 0 : _a.key;
    let resp_key = (_b = e === null || e === void 0 ? void 0 : e.data) === null || _b === void 0 ? void 0 : _b.resp_key;
    let data = (_c = e === null || e === void 0 ? void 0 : e.data) === null || _c === void 0 ? void 0 : _c.data;
    listeners = listeners.filter((listener) => __awaiter(void 0, void 0, void 0, function* () {
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
    if (target === null || target === void 0 ? void 0 : target.postMessage) {
        if (resp_key && respCallback) {
            addListener(resp_key, respCallback);
        }
        target === null || target === void 0 ? void 0 : target.postMessage({ key, resp_key, data }, "*");
    }
    else {
        throw new Error("target ref not set or has no postmessage function");
    }
};
const addListener = (key, callBack, once = false) => {
    listeners = listeners.filter((l) => l.key !== key);
    listeners.push({
        key,
        callBack,
        id: Math.random() + new Date().getTime(),
        once,
    });
};
const removeListener = ({ key, id }) => {
    listeners = listeners.filter((l) => (id === undefined || l.id !== id) && (key === undefined || l.key !== key));
};
let _frameLink;
const init = (readyCallback) => {
    window.removeEventListener("message", handleMessage);
    window.addEventListener("message", handleMessage);
    console.log("init frame-link called");
    const registerTarget = (_target) => {
        target = _target;
        if ("postMessage" in target && !ready) {
            addListener("ping", () => { }, true);
            let ping = setInterval(() => {
                postMessage("ping", undefined, (e) => {
                    console.log("in ping listener", e);
                    ready = true;
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
        registerTarget,
        ready,
    };
};
function frameLink(readyCallback) {
    _frameLink = _frameLink || init(readyCallback);
    return _frameLink;
}
exports.default = frameLink;
//# sourceMappingURL=frameLink.js.map