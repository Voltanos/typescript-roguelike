import { Actor, Entity, Item } from '../entity';
import type { Action } from '../actions';
import { ItemAction } from '../actions';
import { Colors } from '../colors';
import { Inventory } from './inventory';
import { SingleRangedAttackHandler, AreaRangedAttackHandler } from '../input-handler';
import { ConfusedEnemy } from './ai';
import { ImpossibleException } from '../exceptions';
import { GameMap } from '../game-map';

export abstract class Consumable {
    parent: Item | null;

    protected constructor(parent: Item | null) {
        this.parent = parent;
    }

    getAction(): Action | null {
        if (this.parent) {
            return new ItemAction(this.parent);
        }

        return null;
    }

    abstract activate(
        action: ItemAction,
        entity: Entity,
        gamemap: GameMap
    ): void;

    consume() {
        const item = this.parent;

        if (item) {
            const inventory = item.parent;

            if (inventory instanceof Inventory) {
                const index = inventory.items.indexOf(item);

                if (index >= 0) {
                    inventory.items.splice(index, 1);
                }
            }
        }
    }
}

export class HealingConsumable extends Consumable {
    amount: number;
    parent: Item | null;

    constructor(amount: number, parent: Item | null = null) {
        super(parent);
        this.amount = amount;
        this.parent = parent;
    }

    activate(_action: ItemAction, entity: Entity) {
        const consumer = entity as Actor;
        if (!consumer) {
            return;
        }

        const amountRecovered = consumer
            .fighter
            .heal(this.amount);

        if (amountRecovered > 0) {
            window
                .engine
                .messageLog
                .addMessage(
                    `You consume the ${this.parent?.name}, and recover ${amountRecovered} HP!`,
                    Colors.HealthRecovered
                );

            this.consume();
        }

        else {
            throw new ImpossibleException('Your health is already full.');
        }
    }
}

export class LightningConsumable extends Consumable {
    damage: number;
    maxRange: number;
    parent: Item | null;

    constructor(damage: number, maxRange: number, parent: Item | null = null) {
        super(parent);
        this.damage = damage;
        this.maxRange = maxRange;
        this.parent = parent;
    }

    activate(_action: ItemAction, entity: Entity, gameMap: GameMap) {
        const NO_TARGET_MESSAGE: string = 'No enemy is close enough to strike.';
        let target: Actor | null = null;
        let closestDistance = this.maxRange + 1.0;

        for (const actor of gameMap.actors) {
            if (
                !Object.is(actor, entity) &&
                gameMap.tiles[actor.y][actor.x].visible
            ) {
                const distance = entity.distance(actor.x, actor.y);

                if (distance < closestDistance) {
                    target = actor;
                    closestDistance = distance;
                }
            }
        }

        if (target) {
            window
                .engine
                .messageLog
                .addMessage(
                    `A lightning bolt strikes the ${target.name} with a loud thunder, for ${this.damage} damage!`
                );

            target.fighter.takeDamage(this.damage);
            this.consume();
        }

        else {
            throw new ImpossibleException(NO_TARGET_MESSAGE);
        }
    }
}

export class ConfusionConsumable extends Consumable {
    numberOfTurns: number;
    parent: Item | null;

    constructor(numberOfTurns: number, parent: Item | null = null) {
        super(parent);
        this.numberOfTurns = numberOfTurns;
        this.parent = parent;
    }

    getAction(): Action | null {
        window.engine.messageLog.addMessage(
            'Select a target location.',
            Colors.NeedsTarget
        );

        window.engine.screen.inputHandler = new SingleRangedAttackHandler((x, y) => {
            return new ItemAction(this.parent, [x, y]);
        });

        return null;
    }

    activate(action: ItemAction, entity: Entity, gameMap: GameMap) {
        const target = action.targetActor(gameMap);

        if (!target) {
            throw new ImpossibleException('You must select an enemy to target.');
        }

        if (!gameMap.tiles[target.y][target.x].visible) {
            throw new ImpossibleException('You cannot target an area you cannot see.');
        }

        if (Object.is(target, entity)) {
            throw new ImpossibleException('You cannot confuse yourself!');
        }

        window
            .engine
            .messageLog
            .addMessage(
                `The eyes of the ${target.name} look vacant, as it starts to stumble around!`,
                Colors.StatusEffectApplied
            );
        target.ai = new ConfusedEnemy(target.ai, this.numberOfTurns);
        this.consume();
    }
}

export class FireballDamageConsumable extends Consumable {
    damage: number;
    radius: number;
    parent: Item | null;

    constructor(
        damage: number,
        radius: number,
        parent: Item | null = null
    ) {
        super(parent);
        this.damage = damage;
        this.radius = radius;
        this.parent = parent;
    }

    getAction(): Action | null {
        window.engine.messageLog.addMessage(
            'Select a target location.',
            Colors.NeedsTarget
        );

        window.engine.screen.inputHandler = new AreaRangedAttackHandler(
            this.radius,
            (x, y) => {
                return new ItemAction(this.parent, [x, y]);
            }
        );

        return null;
    }

    activate(action: ItemAction, _entity: Entity, gameMap: GameMap) {
        const { targetPosition } = action;

        if (!targetPosition) {
            throw new ImpossibleException('You must select an area to target.');
        }

        const [x, y] = targetPosition;
        if (!gameMap.tiles[y][x].visible) {
            throw new ImpossibleException(
                'You canno target an area that you cannot see.'
            );
        }

        let targetsHit = false;
        for (const actor of gameMap.actors) {
            if (actor.distance(x, y) <= this.radius) {
                window
                    .engine
                    .messageLog
                    .addMessage(
                        `The ${actor.name} is engulfed in a fiery explosion, taking ${this.damage} damage!`,
                    );
                actor.fighter.takeDamage(this.damage);
                targetsHit = true;
            }

            if (!targetsHit) {
                throw new ImpossibleException('There are no targets in the radius.');
            }

            this.consume();
        }
    }
}