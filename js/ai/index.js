export function aiTurn(ctx) {
  const { G, summon, renderAll, legalTarget, attackCard, attackFace, rand, newTurn } = ctx;
  const playable = G.aiHand
    .filter((c) => c.cost <= G.aiMana && c.harvestCost <= G.aiHarvest)
    .sort((a, b) => b.cost - a.cost);
  while (playable.length && G.aiBoard.length < 5 && G.aiMana > 0) {
    const c = playable.shift();
    const i = G.aiHand.findIndex((x) => x.id === c.id);
    if (i > -1 && c.cost <= G.aiMana && c.harvestCost <= G.aiHarvest) {
      G.aiHand.splice(i, 1);
      const stance =
        c.hp >= c.atk + 1
          ? Math.random() < 0.7
            ? "defense"
            : "attack"
          : Math.random() < 0.3
            ? "defense"
            : "attack";
      summon("ai", c, stance);
      G.aiMana -= c.cost;
      G.aiHarvest -= c.harvestCost;
    }
  }
  renderAll();
  const attackers = G.aiBoard.filter((c) => c.canAttack && c.stance !== "defense");
  function next() {
    if (!attackers.length) {
      G.current = "player";
      newTurn("ai");
      return;
    }
    const a = attackers.shift();
    const legal = G.playerBoard.filter((x) => legalTarget("player", x));
    if (legal.length) {
      attackCard(a, rand(legal));
    } else {
      attackFace(a, "player");
    }
    setTimeout(next, 500);
  }
  setTimeout(next, 500);
}
