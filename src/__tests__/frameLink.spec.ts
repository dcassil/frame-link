import FrameLink, {
  TFrameLink,
  TListener,
  TMessagePayload,
} from "../frameLink";
import { fireEvent, waitFor } from "@testing-library/dom";

type TTestPayload = {
  message: string;
};
describe("frameLink", () => {
  let frameLink: TFrameLink;

  beforeAll(() => {
    frameLink = FrameLink(() => {
      fireEvent(window, new Event("__test_connected"));
      console.log("ready callback, connected:");
    });
    expect(typeof frameLink.registerTarget).toBe("function");
  });

  it("should have expected methods", () => {
    expect(typeof frameLink.addListener).toBe("function");
    expect(typeof frameLink.hasListener).toBe("function");
    expect(typeof frameLink.postMessage).toBe("function");
    expect(typeof frameLink.removeListener).toBe("function");
  });

  describe("Ready actions", () => {
    beforeAll((done) => {
      expect(frameLink.ready).toBe(true);
      expect(frameLink.connected).toBe(false);

      addEventListener("__test_connected", () => {
        expect(frameLink.connected).toBe(true);
        done();
      });

      window.addEventListener("message", (message: any) => {
        if (message.key === "ping") {
          fireEvent(
            window,
            new MessageEvent("message", {
              origin: window.location.origin,
              data: { key: message.resp_key },
            })
          );
        }
      });

      if (frameLink.ready) {
        frameLink.registerTarget(window);
      }
    });

    it("should listen on key with addListener", (done) => {
      const testKey = "test_add_listener";
      const testMessage = "test-add-1";
      frameLink.addListener(testKey, (data: TTestPayload) => {
        expect(data.message).toBe(testMessage);
        done();
      });
      frameLink.postMessage(testKey, { message: testMessage });
    });

    it("should listen on key with addListener", (done) => {
      const testKey = "test_post_with_callback";
      const testMessage = "respond to message";
      frameLink.addListener(testKey, () => {
        return { message: testMessage };
      });
      frameLink.postMessage(
        testKey,
        { message: testMessage },
        (data: TTestPayload) => {
          expect(data.message).toBe(testMessage);
          done();
        }
      );
    });

    it("should have listen if added", (done) => {
      const testKey = "test_has_listener";

      frameLink.addListener(testKey, () => {});

      let hasListener = frameLink.hasListener({ key: testKey });

      expect(hasListener).toBe(true);
      done();
    });
  });
});
