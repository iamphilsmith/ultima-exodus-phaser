import { PendingAttack } from './pending-attack';

describe('PendingAttack', () => {
  it('starts out not waiting', () => {
    expect(new PendingAttack().isWaiting).toBe(false);
  });

  it('start() opens the prompt', () => {
    const attack = new PendingAttack();

    expect(attack.start()).toBe(true);
    expect(attack.isWaiting).toBe(true);
  });

  it('start() while already waiting does nothing', () => {
    const attack = new PendingAttack();
    attack.start();

    expect(attack.start()).toBe(false);
    expect(attack.isWaiting).toBe(true);
  });

  it('cancel() closes an open prompt', () => {
    const attack = new PendingAttack();
    attack.start();

    expect(attack.cancel()).toBe(true);
    expect(attack.isWaiting).toBe(false);
  });

  it('cancel() with no prompt open does nothing', () => {
    expect(new PendingAttack().cancel()).toBe(false);
  });

  it('take() uses up the prompt, so the direction is the attack direction', () => {
    const attack = new PendingAttack();
    attack.start();

    expect(attack.take()).toBe(true);
    expect(attack.isWaiting).toBe(false);
  });

  it('take() with no prompt open means an ordinary move', () => {
    expect(new PendingAttack().take()).toBe(false);
  });

  it('can be started again after an attack', () => {
    const attack = new PendingAttack();
    attack.start();
    attack.take();

    expect(attack.start()).toBe(true);
  });
});