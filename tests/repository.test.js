const test = require("node:test");
const assert = require("node:assert/strict");
const { createRepository } = require("../src/function/repository");

test("passes document fields directly to the CloudBase Node SDK", async () => {
  const calls = [];
  const document = {
    get: async () => ({ data: [] }),
    set: async (value) => calls.push(["set", value]),
    update: async (value) => calls.push(["update", value]),
  };
  const app = {
    database: () => ({ collection: () => ({ doc: () => document }) }),
  };
  const repository = createRepository(app);
  const value = { state: { familyName: "示例家庭" } };

  await repository.create(value);
  await repository.update(value);

  assert.deepEqual(calls, [["set", value], ["update", value]]);
});
