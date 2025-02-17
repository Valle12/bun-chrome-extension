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

beforeEach(() => {
  spyOn(console, "log").mockImplementation(() => {});
  connection = new Connection();
});

afterEach(() => {
  mock.restore();
});

describe("connect", () => {
  test("should not connect if ws already exists", async () => {
    connection.ws = {} as WebSocket;
    spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(new Response())
    );

    await connection.connect();

    expect(fetch).toHaveBeenCalledTimes(0);
  });
});
