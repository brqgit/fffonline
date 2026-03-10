import { StoryMode } from '../js/game/storyMode';

describe('StoryMode progression', () => {
  test('uses deterministic seed for rewards', () => {
    const a = new StoryMode({ seed: 'abc' });
    const b = new StoryMode({ seed: 'abc' });
    a.nextRound();
    b.nextRound();
    expect(a.rewardOptions()).toEqual(b.rewardOptions());
  });

  test('advances acts every 5 rounds', () => {
    const s = new StoryMode();
    for (let i = 0; i < 6; i += 1) s.nextRound();
    expect(s.act).toBe(2);
  });

  test('boss gives more rewards and sets modifier', () => {
    const s = new StoryMode({ bossInterval: 2 });
    s.nextRound();
    s.nextRound();
    expect(s.currentEncounter).toBe('boss');
    expect(typeof s.currentBossModifier).toBe('string');
    const { rewards, goldGain, xpGain } = s.handleVictory();
    expect(rewards).toContain('Relíquia');
    expect(goldGain).toBeGreaterThan(5);
    expect(xpGain).toBeGreaterThan(5);
  });

  test('respects totem limit', () => {
    const s = new StoryMode({ maxTotems: 1 });
    expect(s.addTotem({ name: 'A' })).toBe(true);
    expect(s.addTotem({ name: 'B' })).toBe(false);
  });
});
