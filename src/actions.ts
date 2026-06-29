import { ImpossibleException } from './exceptions';
import { Actor, Entity, Item } from './entity';
import { Colors } from './colors';
import { GameMap } from './game-map';

function createBlockedMessage(message: string): void {
    throw new ImpossibleException(message);
}

export abstract class Action {
    abstract perform(entity: Entity, gameMap: GameMap): void;
}

export class TakeStairsaction extends Action {
    perform(entity: Entity, gameMap: GameMap) {
        if (
            entity.x === gameMap.downStairsLocation[0] &&
            entity.y === gameMap.downStairsLocation[1]
        ) {
            window.engine.screen.generateFloor();
            window.engine.messageLog.addMessage(
                'You descend the staircase.',
                Colors.Descend
            );
        }

        else {
            throw new ImpossibleException('There are no stairs here.');
        }
    }
}

export class PickupAction extends Action {
    perform(entity: Entity, gameMap: GameMap) {
        const ITEM_FULL_MESSAGE: string = 'Your inventory is full.';
        const NOTHING_MESSAGE: string = 'There is nothing here to pick up.';
        const consumer = entity as Actor;

        if (!consumer) {
            return;
        }

        const { x, y, inventory } = consumer;

        for (const item of gameMap.items) {
            if (x === item.x && y === item.y) {
                if (inventory.items.length >= inventory.capacity) {
                    createBlockedMessage(ITEM_FULL_MESSAGE);
                }

                gameMap.removeEntity(item);
                item.parent = inventory;
                inventory.items.push(item);

                window
                    .engine
                    .messageLog
                    .addMessage(`You picked up the ${item.name}!`);
                return;
            }
        }

        createBlockedMessage(NOTHING_MESSAGE);
    }
}

export class ItemAction extends Action {
    item: Item | null;
    targetPosition: [number, number] | null;

    constructor(
        item: Item | null,
        targetPosition: [number, number] | null = null
    ) {
        super();
        this.item = item;
        this.targetPosition = targetPosition;
    }

    targetActor(gameMap: GameMap): Actor | undefined {
        if (!this.targetPosition) {
            return;
        }

        const [x, y] = this.targetPosition;
        return gameMap.getActorAtLocation(x, y);
    }

    perform(entity: Entity, gameMap: GameMap) {
        this.item?.consumable?.activate(this, entity, gameMap);
    }
}

export class WaitAction extends Action {
    perform(_entity: Entity, _gameMap: GameMap) {
        void _entity;
        void _gameMap;
    }
}

export abstract class ActionWithDirection extends Action {
    dx: number;
    dy: number;

    constructor(dx: number, dy: number) {
        super();
        this.dx = dx;
        this.dy = dy;
    }

    abstract perform(entity: Entity, gameMap: GameMap): void;
}

export class MovementAction extends ActionWithDirection {
    perform(entity: Entity, gameMap: GameMap) {
        const BLOCKED_MESSAGE: string = 'That way is blocked.';
        const destX = entity.x + this.dx;
        const destY = entity.y + this.dy;

        if (!gameMap.isInBounds(destX, destY)) {
            createBlockedMessage(BLOCKED_MESSAGE);
        }

        if (!gameMap.tiles[destY][destX].walkable) {
            createBlockedMessage(BLOCKED_MESSAGE);
        }

        if (gameMap.getBlockingEntityAtLocation(destX, destY)) {
            createBlockedMessage(BLOCKED_MESSAGE);
        }

        entity.move(this.dx, this.dy);
    }
}

export class BumpAction extends ActionWithDirection {
    perform(entity: Entity, gameMap: GameMap) {
        const destX = entity.x + this.dx;
        const destY = entity.y + this.dy;

        if (gameMap.getActorAtLocation(destX, destY)) {
            return new MeleeAction(this.dx, this.dy).perform(entity as Actor, gameMap);
        }

        else {
            return new MovementAction(this.dx, this.dy).perform(entity, gameMap);
        }
    }
}

export class MeleeAction extends ActionWithDirection {
    perform(actor: Actor, gameMap: GameMap) {
        const NO_ATTACK_MESSAGE: string = 'Nothing to attack.';
        const destX = actor.x + this.dx;
        const destY = actor.y + this.dy;

        const target = gameMap.getActorAtLocation(destX, destY);

        if (!target) {
            createBlockedMessage(NO_ATTACK_MESSAGE);
        }

        const targetActor: Actor = target as Actor;
        const damage = actor.fighter.power - targetActor.fighter.defense;
        const attackDescription = `${actor.name.toUpperCase()} attacks ${targetActor.name}`;

        const fg = actor.name === 'Player' ?
            Colors.PlayerAttack :
            Colors.EnemyAttack;

        if (damage > 0) {
            window
                .engine
                .messageLog
                .addMessage(`${attackDescription} for ${damage} hit points!`, fg);
            targetActor.fighter.hp -= damage;
        }

        else {
            window
                .engine
                .messageLog
                .addMessage(`${attackDescription} but does no damage!`, fg);
        }
    }
}

export class LogAction extends Action {
    moveLog: () => void;

    constructor(moveLog: () => void) {
        super();
        this.moveLog = moveLog;
    }

    perform(_entity: Entity) {
        void _entity;
        this.moveLog();
    }
}

export class EquipAction extends Action {
    item: Item;

    constructor(item: Item) {
        super();

        this.item = item;
    }

    perform(entity: Entity, _gameMap: GameMap) {
        void _gameMap;
        const actor = entity as Actor;

        if (!actor) {
            return;
        }

        actor.equipment.toggleEquip(this.item);
    }
}

export class DropItem extends ItemAction {
    perform(entity: Entity, gameMap: GameMap) {
        const dropper = entity as Actor;

        if (!dropper || !this.item) {
            return;
        }

        dropper.inventory.drop(this.item, gameMap);

        if (dropper.equipment.itemIsEquipped(this.item)) {
            dropper.equipment.toggleEquip(this.item);
        }
    }
}