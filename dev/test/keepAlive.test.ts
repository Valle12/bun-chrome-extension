import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
  type Mock,
} from "bun:test";
import { Connection } from "../connection";
import { KeepAlive } from "../keepAlive";

describe.only("keepAlive", () => {
  const originalConnection = { ...Connection };
  let retryConnectMock: Mock<(...args: any[]) => any>;

  beforeEach(async () => {
    await mock.module("../connection", () => {
      retryConnectMock = mock();
      return {
        Connection: mock(() => {
          return {
            retryConnect: retryConnectMock,
          };
        }),
      };
    });
  });

  afterEach(async () => {
    await mock.module("../connection", () => originalConnection);
  });
  test("should run constructor and keep service_worker alive", async () => {
    const originalChrome = { ...globalThis.chrome };
    const originalSetInterval = globalThis.setInterval;
    let handler = {} as (...args: any[]) => Promise<void>;
    let callback = {} as (...args: any[]) => void;

    globalThis.chrome = {
      runtime: {
        onStartup: {
          addListener: mock(),
        },
        onInstalled: {
          addListener: mock(),
        },
        getPlatformInfo: mock(),
      },
    } as unknown as typeof chrome;
    globalThis.setInterval = Object.assign(
      mock((cb: (...args: any[]) => Promise<void>, _delay, ..._args) => {
        handler = cb;
        return 0;
      })
    );

    spyOn(chrome.runtime.onStartup, "addListener").mockImplementation(cb => {
      if (cb.name === "keepAlive") cb();
      callback = cb;
    });
    spyOn(chrome.runtime.onInstalled, "addListener").mockImplementation(cb =>
      cb({} as chrome.runtime.InstalledDetails)
    );
    spyOn(chrome.runtime, "getPlatformInfo").mockImplementation(() =>
      Promise.resolve({} as chrome.runtime.PlatformInfo)
    );

    new KeepAlive();
    await handler();
    callback();

    expect(Connection).toHaveBeenCalledTimes(1);
    expect(setInterval).toHaveBeenCalledTimes(3);
    expect(chrome.runtime.onStartup.addListener).toHaveBeenCalledTimes(2);
    expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalledTimes(1);
    expect(chrome.runtime.getPlatformInfo).toHaveBeenCalledTimes(1);
    expect(retryConnectMock).toHaveBeenCalledTimes(1);

    globalThis.setInterval = originalSetInterval;
    globalThis.chrome = originalChrome;
  });
});
