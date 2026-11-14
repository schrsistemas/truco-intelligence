import { describe, expect, it } from "vitest";
import { acceptBid, createBidState, declineBid, requestBid, validateBidRules } from "./bidding";

const rules = {
  initialStake: 1,
  levels: [
    { id: "truco", label: "Truco", stake: 3, refusalAward: 1 },
    { id: "six", label: "Seis", stake: 6, refusalAward: 3 },
    { id: "nine", label: "Nove", stake: 9, refusalAward: 6 },
    { id: "twelve", label: "Doze", stake: 12, refusalAward: 9 }
  ]
};

function initialState() {
  const result = createBidState(rules);
  if (!result.ok) throw new Error("Configuração de teste inválida.");
  return result.state;
}

describe("configurable bid escalation", () => {
  it("validates a strictly increasing ladder and unique identifiers", () => {
    expect(validateBidRules(rules)).toMatchObject({ ok: true });
    expect(validateBidRules({
      initialStake: 1,
      levels: [{ id: "bad", label: "Bad", stake: 3, refusalAward: 4 }]
    })).toMatchObject({ ok: false, reason: "INVALID_RULES" });
    expect(validateBidRules({
      initialStake: 1,
      levels: [
        { id: "same", label: "A", stake: 3, refusalAward: 1 },
        { id: "same", label: "B", stake: 6, refusalAward: 3 }
      ]
    })).toMatchObject({ ok: false, reason: "INVALID_RULES" });
  });

  it("requests only the next level and prevents concurrent requests", () => {
    expect(requestBid(initialState(), "team-a", "six"))
      .toMatchObject({ ok: false, reason: "LEVEL_NOT_NEXT" });
    const request = requestBid(initialState(), "team-a", "truco");
    expect(request).toMatchObject({ ok: true, state: { pending: { levelId: "truco" } } });
    if (!request.ok) return;
    expect(request.events[0].type).toBe("BID_REQUESTED");
    expect(requestBid(request.state, "team-b", "six"))
      .toMatchObject({ ok: false, reason: "BID_ALREADY_PENDING" });
  });

  it("only the opposing team can accept or decline", () => {
    const request = requestBid(initialState(), "team-a", "truco");
    if (!request.ok) throw new Error("Pedido deveria ser válido.");
    expect(acceptBid(request.state, "team-a"))
      .toMatchObject({ ok: false, reason: "SAME_TEAM_CANNOT_RESPOND" });
    expect(declineBid(request.state, "team-a"))
      .toMatchObject({ ok: false, reason: "SAME_TEAM_CANNOT_RESPOND" });
  });

  it("updates accepted stake and allows the next escalation", () => {
    const request = requestBid(initialState(), "team-a", "truco");
    if (!request.ok) throw new Error("Pedido deveria ser válido.");
    const accepted = acceptBid(request.state, "team-b");
    if (!accepted.ok) throw new Error("Aceite deveria ser válido.");
    expect(accepted.state.currentStake).toBe(3);
    expect(accepted.state.currentLevelIndex).toBe(0);
    expect(requestBid(accepted.state, "team-b", "six"))
      .toMatchObject({ ok: true, state: { pending: { levelId: "six" } } });
    expect(requestBid(accepted.state, "team-a", "truco"))
      .toMatchObject({ ok: false, reason: "LEVEL_NOT_NEXT" });
  });

  it("awards configured refusal points and settles the bidding", () => {
    const request = requestBid(initialState(), "team-a", "truco");
    if (!request.ok) throw new Error("Pedido deveria ser válido.");
    const declined = declineBid(request.state, "team-b");
    expect(declined).toMatchObject({
      ok: true,
      state: { status: "settled", awardedTeam: "team-a", awardedPoints: 1, pending: null }
    });
    if (declined.ok) expect(declined.events[0].type).toBe("BID_DECLINED");
  });

  it("does not permit new requests after a refusal", () => {
    const request = requestBid(initialState(), "team-a", "truco");
    if (!request.ok) throw new Error("Pedido deveria ser válido.");
    const declined = declineBid(request.state, "team-b");
    if (!declined.ok) throw new Error("Recusa deveria ser válida.");
    expect(requestBid(declined.state, "team-b", "six"))
      .toMatchObject({ ok: false, reason: "BID_SETTLED" });
  });

  it("rejects unknown levels", () => {
    expect(requestBid(initialState(), "team-a", "unknown"))
      .toMatchObject({ ok: false, reason: "INVALID_LEVEL" });
  });
});
