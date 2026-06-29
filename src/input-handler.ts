import {
    Action,
    BumpAction,
    DropItem,
    LogAction,
    PickupAction,
    WaitAction,
    TakeStairsaction,
    EquipAction
} from './actions';
import { Colors } from './colors';
import { Engine } from './engine';
import { renderFrameWithTitle } from './render-functions';
import { Display } from 'rot-js';

type ActionCallback = (x: number, y: number) => Action | null;

interface LogMap {
    [key: string]: number;
}

const LOG_KEYS: LogMap = {
    ArrowUp: -1,
    ArrowDown: 1
};

interface DirectionMap {
    [key: string]: [number, number];
}

const MOVE_KEYS: DirectionMap = {
    // Arrow Keys.
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    Home: [-1, -1],
    End: [-1, 1],
    PageUp: [1, -1],
    PageDown: [1, 1],

    // Numpad Keys.
    1: [-1, 1],
    2: [0, 1],
    3: [1, 1],
    4: [-1, 0],
    6: [1, 0],
    7: [-1, -1],
    8: [0, -1],
    9: [1, -1],

    // VI Keys.
    h: [-1, 0],
    j: [0, 1],
    k: [0, -1],
    l: [1, 0],
    y: [-1, -1],
    u: [1, -1],
    b: [-1, 1],
    n: [1, 1]
}

export enum InputState {
    Game,
    Dead,
    Log,
    UseInventory,
    DropInventory,
    Target
}

export abstract class BaseInputHandler {
    nextHandler: BaseInputHandler;
    mousePosition: [number, number];
    logCursorPosition: number;
    inputState: InputState;

    protected constructor(
        inputState: InputState = InputState.Game
    ) {
        this.inputState = inputState;
        this.nextHandler = this;
        this.mousePosition = [0, 0];
        this.logCursorPosition = 0;
    }

    abstract handleKeyboardInput(event: KeyboardEvent): Action | null;

    onRender(_display: Display) {
        void _display;
    }

    handleMouseMovement(position: [number, number]) {
        this.mousePosition = position;
    }
}

export abstract class SelectIndexHandler extends BaseInputHandler {
    protected constructor() {
        super(InputState.Target);
        const { x, y } = window.engine.player;
        this.mousePosition = [x, y];
    }

    handleKeyboardInput(event: KeyboardEvent): Action | null {
        if (event.key in MOVE_KEYS) {
            const moveAmount = MOVE_KEYS[event.key];
            let modifier = 1;

            if (event.shiftKey) {
                modifier = 5;
            }

            if (event.ctrlKey) {
                modifier = 10;
            }

            if (event.altKey) {
                modifier = 20;
            }

            let [x, y] = this.mousePosition;
            const [dx, dy] = moveAmount;
            x += dx * modifier;
            y += dy * modifier;
            x = Math.max(0, Math.min(x, Engine.MAP_WIDTH - 1));
            y = Math.max(0, Math.min(y, Engine.MAP_HEIGHT - 1));
            this.mousePosition = [x, y];
            return null;
        }

        else if (event.key === 'Enter') {
            const [x, y] = this.mousePosition;
            return this.onIndexSelected(x, y);
        }

        this.nextHandler = new GameInputHandler();
        return null;
    }

    abstract onIndexSelected(x: number, y: number): Action | null;
}

export class SingleRangedAttackHandler extends SelectIndexHandler {
    callBack: ActionCallback;

    constructor(callBack: ActionCallback) {
        super();
        this.callBack = callBack;
    }

    onIndexSelected(x: number, y: number): Action | null {
        this.nextHandler = new GameInputHandler();
        return this.callBack(x, y);
    }
}

export class AreaRangedAttackHandler extends SelectIndexHandler {
    radius: number;
    callBack: ActionCallback;

    constructor(radius: number, callBack: ActionCallback) {
        super();
        this.radius = radius;
        this.callBack = callBack;
    }

    onRender(display: Display) {
        const startX = this.mousePosition[0] - this.radius - 1;
        const startY = this.mousePosition[1] - this.radius - 1;

        for (let x = startX; x < startX + this.radius ** 2; x += 1) {
            for (let y = startY; y < startY + this.radius ** 2; y += 1) {
                display.drawOver(x, y, null, '#fff', '#f00');
            }
        }
    }

    onIndexSelected(x: number, y: number): Action | null {
        this.nextHandler = new GameInputHandler();
        return this.callBack(x, y);
    }
}

export class LookHandler extends SelectIndexHandler {
    constructor() {
        super();
    }

    onIndexSelected(_x: number, _y: number): Action | null {
        void _x;
        void _y;

        this.nextHandler = new GameInputHandler();
        return null;
    }
}

export class LevelUpEventHandler extends BaseInputHandler {
    constructor() {
        super();
    }

    onRender(display: Display) {
        let x = 0;

        if (window.engine.player.x <= 30) {
            x = 40;
        }

        renderFrameWithTitle(x, 0, 35, 8, 'Level Up');

        display.drawText(x + 1, 1, 'Congratulations!  You level up!');
        display.drawText(x + 1, 2, 'Select an attribute to increase.');

        display.drawText(
            x + 1,
            4,
            `a) Constitution (+20 HP, from ${window.engine.player.fighter.maxHp})`
        );

        display.drawText(
            x + 1,
            5,
            `b) Strength (+1 attack, from ${window.engine.player.fighter.power})`
        );

        display.drawText(
            x + 1,
            6,
            `c) Agility (+1 defense, from ${window.engine.player.fighter.defense})`
        );
    }

    handleKeyboardInput(event: KeyboardEvent): Action | null {
        if (event.key === 'a') {
            window.engine.player.level.increaseMaxHp();
        }

        else if (event.key === 'b') {
            window.engine.player.level.increasePower();
        }

        else if (event.key === 'c') {
            window.engine.player.level.increaseDefense();
        }

        else {
            window.engine.messageLog.addMessage('Invalid entry.', Colors.Invalid);
            return null;
        }

        this.nextHandler = new GameInputHandler();
        return null;
    }
}

export class CharacterScreenInputHandler extends BaseInputHandler {
    constructor() {
        super();
    }

    onRender(display: Display) {
        const x = window.engine.player.x <= 30 ? 40 : 0;
        const y = 0;
        const title = 'Character Information';
        const width = title.length + 4;

        renderFrameWithTitle(x, y, width, 7, title);

        display.drawText(
            x + 1,
            y + 1,
            `Level:  ${window.engine.player.level.currentLevel}`
        );
        display.drawText(
            x + 1,
            y + 2,
            `XP:  ${window.engine.player.level.currentXp}`
        );
        display.drawText(
            x + 1,
            y + 3,
            `XP for next Level:  ${window.engine.player.level.experienceToNextLevel}`
        );
        display.drawText(
            x + 1,
            y + 4,
            `Attack:  ${window.engine.player.fighter.power}`
        );
        display.drawText(
            x + 1,
            y + 5,
            `Defense:  ${window.engine.player.fighter.defense}`
        );
    }

    handleKeyboardInput(_event: KeyboardEvent): Action | null {
        void _event;

        this.nextHandler = new GameInputHandler();
        return null;
    }
}

export class GameInputHandler extends BaseInputHandler {
    constructor() {
        super();
    }

    handleKeyboardInput(event: KeyboardEvent): Action | null {
        if (window.engine.player.fighter.hp > 0) {
            if (window.engine.player.level.requiresLevelUp) {
                this.nextHandler = new LevelUpEventHandler();
                return null;
            }

            if (event.key in MOVE_KEYS) {
                const [dx, dy] = MOVE_KEYS[event.key];
                return new BumpAction(dx, dy);
            }

            if (event.key === 'v') {
                this.nextHandler = new LogInputHandler();
            }

            if (event.key === '5' || event.key === '.') {
                return new WaitAction();
            }

            if (event.key === 'g') {
                return new PickupAction();
            }

            if (event.key === 'i') {
                this.nextHandler = new InventoryInputHandler(InputState.UseInventory);
            }

            if (event.key === 'd') {
                this.nextHandler = new InventoryInputHandler(InputState.DropInventory);
            }

            if (event.key === 'c') {
                this.nextHandler = new CharacterScreenInputHandler();
            }

            if (event.key === '/') {
                this.nextHandler = new LookHandler();
            }

            if (event.key === '>') {
                return new TakeStairsaction();
            }
        }

        return null;
    }
}

export class LogInputHandler extends BaseInputHandler {
    constructor() {
        super(InputState.Log);
        this.logCursorPosition = window.engine.messageLog.messages.length - 1;
    }

    handleKeyboardInput(event: KeyboardEvent): Action | null {
        if (event.key === 'Home') {
            return new LogAction(() => (this.logCursorPosition = 0));
        }

        if (event.key === 'End') {
            return new LogAction(
                () => (this.logCursorPosition =
                    window.engine.messageLog.messages.length - 1
                )
            );
        }

        const scrollAmount = LOG_KEYS[event.key];

        if (!scrollAmount) {
            this.nextHandler = new GameInputHandler();
        }

        return new LogAction(() => {
            if (scrollAmount < 0 && this.logCursorPosition === 0) {
                this.logCursorPosition =
                    window.engine.messageLog.messages.length - 1;
            }

            else if (
                scrollAmount > 0 &&
                this.logCursorPosition ===
                window.engine.messageLog.messages.length - 1
            ) {
                this.logCursorPosition = 0;
            }

            else {
                this.logCursorPosition = Math.max(
                    0,
                    Math.min(
                        this.logCursorPosition + scrollAmount,
                        window.engine.messageLog.messages.length - 1
                    )
                );
            }
        });
    }
}

export class InventoryInputHandler extends BaseInputHandler {
    constructor(inputState: InputState) {
        super(inputState);
    }

    onRender(display: Display) {
        const title = this.inputState === InputState.UseInventory ?
            'Select an item to use' :
            'Select an item to drop';
        const itemCount = window.engine.player.inventory.items.length;
        const height = itemCount + 2 <= 3 ? 3 : itemCount + 2;
        const width = title.length + 4;
        const x = window.engine.player.x <= 30 ? 40 : 0;
        const y = 0;

        renderFrameWithTitle(x, y, width, height, title);

        if (itemCount > 0) {
            window.engine.player.inventory.items.forEach((i, index) => {
                const key = String.fromCharCode('a'.charCodeAt(0) + index);
                const isEquipped = window.engine.player.equipment.itemIsEquipped(i);
                let itemString = `(${key}) ${i.name}`;
                itemString = isEquipped ?
                    `${itemString} (E)` :
                    itemString;
                display.drawText(x + 1, y + index + 1, itemString);
            });
        }

        else {
            display.drawText(x + 1, y + 1, '(Empty)');
        }
    }

    handleKeyboardInput(event: KeyboardEvent): Action | null {
        if (event.key.length === 1) {
            const ordinal = event.key.charCodeAt(0);
            const index = ordinal - 'a'.charCodeAt(0);

            if (index >= 0 && index <= 26) {
                const item = window.engine.player.inventory.items[index];

                if (item) {
                    this.nextHandler = new GameInputHandler();

                    if (this.inputState === InputState.UseInventory) {
                        if (item.consumable) {
                            return item.consumable.getAction();
                        }

                        else if (item.equippable) {
                            return new EquipAction(item);
                        }

                        return null;
                    }

                    else if (this.inputState === InputState.DropInventory) {
                        return new DropItem(item);
                    }
                }

                else {
                    window
                        .engine
                        .messageLog
                        .addMessage('Invalid entry.', Colors.Invalid);
                    return null;
                }
            }
        }

        this.nextHandler = new GameInputHandler();
        return null;
    }
}