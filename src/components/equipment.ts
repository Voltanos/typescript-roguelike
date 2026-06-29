import { BaseComponent } from "./base-component";
import { Actor, Item } from '../entity';
import { EquipmentType } from "../equipment-types";

const WEAPON_KEY: string = 'weapon';
const ARMOR_KEY: string = 'armor';

const SLOT_KEY: string[] = [
    WEAPON_KEY,
    ARMOR_KEY
];

type Slot = {
    [slotName: string]: Item | null
};

export class Equipment extends BaseComponent {
    parent: Actor | null;
    slots: Slot;
    weapon: Item | null;
    armor: Item | null;

    constructor(
        weapon: Item | null = null,
        armor: Item | null = null
    ) {
        super();
        this.parent = null;
        this.weapon = weapon;
        this.armor = armor;

        this.slots = {
            weapon,
            armor
        };
    }

    public get defenseBonus(): number {
        let bonus = 0;

        SLOT_KEY
            .forEach((k) => {
                if (this.slots[k] && this.slots[k].equippable) {
                    bonus += this.slots[k].equippable.defenseBonus;
                }
            });

        return bonus;
    }

    public get powerBonus(): number {
        let bonus = 0;

        SLOT_KEY
            .forEach((k) => {
                if (this.slots[k] && this.slots[k].equippable) {
                    bonus += this.slots[k].equippable.powerBonus;
                }
            });

        return bonus;
    }

    itemIsEquipped(item: Item): boolean {
        return this.slots[WEAPON_KEY] === item || this.slots[ARMOR_KEY] === item;
    }

    unequipMessage(itemName: string) {
        window
            .engine
            .messageLog
            .addMessage(`You remove the ${itemName}`);
    }

    equipMessage(itemName: string) {
        window
            .engine
            .messageLog
            .addMessage(`You equip the ${itemName}`);
    }

    unequipFromSlot(slot: string, addMessage: boolean) {
        const currentItem = this.slots[slot];
        if (addMessage && currentItem) {
            this.unequipMessage(currentItem.name);
        }
        this.slots[slot] = null;
    }

    equipToSlot(slot: string, item: Item, addMessage: boolean) {
        const currentItem = this.slots[slot];
        if (currentItem) {
            this.unequipFromSlot(slot, addMessage);
        }
        this.slots[slot] = item;

        if (addMessage) {
            this.equipMessage(item.name);
        }
    }

    toggleEquip(item: Item, addMessage: boolean = true) {
        let slot = ARMOR_KEY;

        if (
            item.equippable &&
            item.equippable.equipmentType === EquipmentType.Weapon
        ) {
            slot = WEAPON_KEY
        }

        if (this.slots[slot] === item) {
            this.unequipFromSlot(slot, addMessage);
        }

        else {
            this.equipToSlot(slot, item, addMessage);
        }
    }
}