import { manifest } from "./manifest";

console.log(manifest);

export const twelve = 12;

export function test() {
  return "test";
}
test();

const name = "test";
export { name };

export class Test {
  constructor() {
    console.log("test");
  }
}
new Test();

export default { name: "test" };
