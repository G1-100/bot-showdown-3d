"""Upload this file through POST /api/bots. Do not read files or call the network."""
def act(state):
    # state includes only your private cards plus public table information.
    ranks = "23456789TJQKA"
    strength = sum(ranks.index(card[0]) for card in state["holeCards"])
    if state["toCall"] > 60 and strength < 15:
        return {"type": "fold"}
    if strength > 19 and state["stack"] > state["toCall"] + 40:
        return {"type": "raise", "amount": state["toCall"] + 40}
    return {"type": "call"}
