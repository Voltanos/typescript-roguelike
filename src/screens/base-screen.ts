import { Display } from 'rot-js';
import { Actor } from '../entity';
import { BaseInputHandler } from '../input-handler';

export abstract class BaseScreen {
    abstract inputHandler: BaseInputHandler;
    display: Display;
    player: Actor;

    protected constructor(
        display: Display,
        player: Actor
    ) {
        this.display = display;
        this.player = player;
    }

    abstract update(event: KeyboardEvent): BaseScreen;

    abstract render(): void;

    generateFloor() { }
}