import { BaseComponent } from './base-component';
import { Actor, Item } from '../entity';
import { GameMap } from '../game-map';

export class Inventory extends BaseComponent {
    parent: Actor | null;
    items: Item[];

    capacity: number;

    constructor(capacity: number) {
        super();
        this.parent = null;
        this.items = [];
        this.capacity = capacity;
    }

    drop(item: Item, gameMap: GameMap) {
        const index = this.items.indexOf(item);
        if (index >= 0) {
            this.items.splice(index, 1);

            if (this.parent) {
                item.place(this.parent.x, this.parent.y, gameMap);
            }

            window
                .engine
                .messageLog
                .addMessage(`you dropped the ${item.name}.`);
        }
    }
}