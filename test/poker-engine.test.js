import test from "node:test";
import assert from "node:assert/strict";
import { builtInAction, runTable, seededRandom } from "../src/poker-engine.js";

test("server-side table conserves chips", async () => {
  const players = ["A", "B", "C"].map((name, id) => ({ id: String(id), name, style: "tag", stack: 1_000 }));
  const result = await runTable(players, { seed: 7, maxHands: 6, decide: (player, state) => builtInAction(player.style, state, seededRandom(2)) });
  assert.equal(result.standings.reduce((sum, player) => sum + player.stack, 0), 3_000);
  assert.equal(result.hands.length, 6);
});
