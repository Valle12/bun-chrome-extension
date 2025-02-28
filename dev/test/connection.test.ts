import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import { Connection } from "../connection";

let connection: Connection;

class MockWebSocket {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  constructor(_url: string) {}
}

beforeEach(() => {
  connection = new Connection();
});

afterEach(() => {
  mock.restore();
});

describe("connect", () => {
  test("should not connect if ws already exists", async () => {
    console.log(connection);
    connection.ws = {} as WebSocket;
    spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(new Response())
    );

    await connection.connect();

    expect(fetch).toHaveBeenCalledTimes(0);
  });

  test("fetch should fail", async () => {
    spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.reject(new Error())
    );
    spyOn(console, "log").mockImplementation(() => {});

    await connection.connect();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("http://localhost:3000", {
      mode: "no-cors",
    });
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith("Server not running :(");
  });

  test("should connect", async () => {
    spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(new Response())
    );
    spyOn(console, "log").mockImplementation(() => {});
    spyOn(connection, "addListener").mockImplementation(() => {});

    await connection.connect();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("http://localhost:3000", {
      mode: "no-cors",
    });
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith("Connected to server!");
    expect(connection.addListener).toHaveBeenCalledTimes(1);
  });
});

describe("addListener", () => {
  const originalWebSocket = WebSocket;

  beforeEach(() => {
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket;
    mock.restore();
  });

  test("test if addListener does nothing if ws is undefined", () => {
    connection.addListener();

    expect(connection.ws).toBeUndefined();
  });

  test("test if addListener executes code on message, but no reload", () => {
    new MockWebSocket("test");
    const event = {
      data: "test",
    } as MessageEvent;
    connection.ws = new WebSocket("test");
    const originalChrome = { ...globalThis.chrome };
    globalThis.chrome = {
      runtime: {
        reload: mock(),
      },
    } as unknown as typeof chrome;

    connection.addListener();
    if (connection.ws.onmessage) connection.ws.onmessage(event);

    expect(chrome.runtime.reload).toHaveBeenCalledTimes(0);

    globalThis.chrome = originalChrome;
  });

  test("test if addListener executes code on message, also reload", () => {
    const event = {
      data: "reload",
    } as MessageEvent;
    connection.ws = new WebSocket("test");
    const originalChrome = { ...globalThis.chrome };
    globalThis.chrome = {
      runtime: {
        reload: mock(),
      },
    } as unknown as typeof chrome;

    connection.addListener();
    if (connection.ws.onmessage) connection.ws.onmessage(event);

    expect(chrome.runtime.reload).toHaveBeenCalledTimes(1);

    globalThis.chrome = originalChrome;
  });

  test("test if addListener executes code on close", () => {
    connection.ws = new WebSocket("test");
    spyOn(console, "log").mockImplementation(() => {});
    spyOn(console, "clear").mockImplementation(() => {});
    spyOn(connection, "retryConnect").mockImplementation(() => {});

    connection.addListener();
    if (connection.ws.onclose) connection.ws.onclose({} as CloseEvent);

    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith("Connection closed!");
    expect(console.clear).toHaveBeenCalledTimes(1);
    expect(connection.ws).toBeUndefined();
    expect(connection.retryConnect).toHaveBeenCalledTimes(1);
  });
});

describe("retryConnect", () => {
  test("test if retryConnect calls connect twice", async () => {
    const originalSetInterval = globalThis.setInterval;
    let handler = {} as (...args: any[]) => Promise<void>;
    spyOn(connection, "connect").mockImplementation(() => Promise.resolve());
    globalThis.setInterval = Object.assign(
      mock((cb: (...args: any[]) => Promise<void>, _delay, ..._args) => {
        handler = cb;
        return 0;
      })
    );

    connection.retryConnect();
    await handler();

    expect(connection.connect).toHaveBeenCalledTimes(2);

    globalThis.setInterval = originalSetInterval;
  });
});
