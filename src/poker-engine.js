// Server-side workshop engine. It intentionally keeps the state contract small so
// students can write a bot in any language, while the server remains the authority
// for chips, dealing, and scoring.
const RANKS = "23456789TJQKA";

export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => ((state = (state * 1664525 + 1013904223) >>> 0) / 0x100000000);
}

function shuffle(deck, rng) { for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; } return deck; }
function deck(rng) { return shuffle(Array.from({ length: 52 }, (_, n) => n), rng); }
function cardName(card) { return `${RANKS[card >> 2]}${"♣♦♥♠"[card & 3]}`; }

// A compact but real 5-card evaluator. Higher values win; evaluateBest tests each
// 5-card subset of a seven-card Texas Hold'em hand.
function evalFive(cards) {
  const ranks = cards.map(c => (c >> 2) + 2).sort((a, b) => b - a);
  const counts = new Map(); ranks.forEach(rank => counts.set(rank, (counts.get(rank) || 0) + 1));
  const groups = [...counts].map(([rank, count]) => ({ rank, count })).sort((a, b) => b.count - a.count || b.rank - a.rank);
  const flush = cards.every(c => (c & 3) === (cards[0] & 3));
  const unique = [...new Set(ranks)]; const wheel = unique.join(",") === "14,5,4,3,2";
  const straightHigh = unique.length === 5 && (ranks[0] - ranks[4] === 4 || wheel) ? (wheel ? 5 : ranks[0]) : 0;
  const value = (kind, kickers) => kickers.reduce((score, rank) => score * 15 + rank, kind);
  if (flush && straightHigh) return value(8, [straightHigh]);
  if (groups[0].count === 4) return value(7, [groups[0].rank, groups[1].rank]);
  if (groups[0].count === 3 && groups[1].count === 2) return value(6, [groups[0].rank, groups[1].rank]);
  if (flush) return value(5, ranks);
  if (straightHigh) return value(4, [straightHigh]);
  if (groups[0].count === 3) return value(3, [groups[0].rank, ...groups.slice(1).map(g => g.rank)]);
  if (groups[0].count === 2 && groups[1].count === 2) return value(2, [groups[0].rank, groups[1].rank, groups[2].rank]);
  if (groups[0].count === 2) return value(1, [groups[0].rank, ...groups.slice(1).map(g => g.rank)]);
  return value(0, ranks);
}
function evaluateBest(cards) {
  let best = -1;
  for (let a = 0; a < cards.length - 4; a++) for (let b = a + 1; b < cards.length - 3; b++) for (let c = b + 1; c < cards.length - 2; c++) for (let d = c + 1; d < cards.length - 1; d++) for (let e = d + 1; e < cards.length; e++) best = Math.max(best, evalFive([cards[a], cards[b], cards[c], cards[d], cards[e]]));
  return best;
}

export function builtInAction(style, state, rng = Math.random) {
  const strength = ((state.hole[0] >> 2) + (state.hole[1] >> 2)) / 24 + (state.hole[0] >> 2 === state.hole[1] >> 2 ? 0.28 : 0);
  if (style === "nit" && strength < 0.52) return { type: "fold" };
  if (style === "shove" && strength > 0.45) return { type: "raise", amount: state.stack };
  if (style === "maniac" && rng() < 0.42) return { type: "raise", amount: Math.min(state.stack, state.toCall + 80) };
  if (style === "lag" && (strength > 0.38 || rng() < 0.25)) return { type: "raise", amount: Math.min(state.stack, state.toCall + 40) };
  return strength + rng() * 0.18 < 0.25 && state.toCall > 20 ? { type: "fold" } : { type: "call" };
}

function normaliseAction(action, state) {
  if (!action || typeof action !== "object") return { type: "call" };
  if (action.type === "fold") return { type: "fold" };
  if (action.type === "raise") return { type: "raise", amount: Math.max(state.toCall, Math.min(state.stack, Math.floor(Number(action.amount) || 0))) };
  return { type: "call" };
}

export async function playHand(players, { rng, dealer, decide }) {
  const cards = deck(rng); const board = cards.splice(0, 5); const active = players.filter(player => player.stack > 0).map(player => ({ ...player, hole: cards.splice(0, 2), folded: false, paid: 0 }));
  const blind = 20; let currentBet = blind; const events = [];
  for (const player of active) { const paid = Math.min(blind, player.stack); player.stack -= paid; player.paid += paid; }
  for (let offset = 1; offset <= active.length; offset++) {
    const player = active[(dealer + offset) % active.length]; const state = { hand: "preflop", hole: player.hole, holeCards: player.hole.map(cardName), board: [], stack: player.stack, pot: active.reduce((sum, p) => sum + p.paid, 0), toCall: Math.max(0, currentBet - player.paid), players: active.filter(p => !p.folded).length };
    const action = normaliseAction(await decide(player, state), state);
    if (action.type === "fold") { player.folded = true; events.push({ type: "fold", bot: player.name }); continue; }
    const add = action.type === "raise" ? action.amount : state.toCall; const paid = Math.min(player.stack, add); player.stack -= paid; player.paid += paid;
    if (action.type === "raise" && player.paid > currentBet) currentBet = player.paid;
    events.push({ type: action.type, bot: player.name, amount: paid });
  }
  const contenders = active.filter(player => !player.folded); const pot = active.reduce((sum, player) => sum + player.paid, 0);
  const ranked = contenders.map(player => ({ player, score: evaluateBest([...player.hole, ...board]) })).sort((a, b) => b.score - a.score);
  const winner = ranked[0]?.player || active[0]; winner.stack += pot;
  return { players: players.map(player => ({ ...player, stack: active.find(a => a.id === player.id)?.stack ?? player.stack })), event: {
    board: board.map(cardName), rawBoard: board, winner: winner.name, pot, events,
    players: active.map(({ id, name, stack, hole, folded }) => ({ id, name, stack, hole, folded }))
  } };
}

export async function runTable(players, { seed = Date.now(), decide, maxHands = 12 } = {}) {
  const rng = seededRandom(seed); let table = players.map(player => ({ ...player, stack: player.stack ?? 1_000 })); const hands = [];
  for (let hand = 0; hand < maxHands && table.filter(p => p.stack > 0).length > 1; hand++) { const result = await playHand(table, { rng, dealer: hand % table.length, decide }); table = result.players; hands.push(result.event); }
  return { standings: [...table].sort((a, b) => b.stack - a.stack).map(({ id, name, stack }) => ({ id, name, stack })), hands };
}
