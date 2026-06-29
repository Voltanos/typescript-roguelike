import { BaseComponent } from "./base-component";
import { Item } from "../entity";
import { EquipmentType } from "../equipment-types";

export abstract class Equippable extends BaseComponent {
    parent: Item | null;

    equipmentType: EquipmentType;
    powerBonus: number;
    defenseBonus: number;

    constructor(
        equipmentType: EquipmentType,
        powerBonus: number = 0,
        defenseBonus: number = 0
    ) {
        super();
        this.parent = null;
        this.equipmentType = equipmentType;
        this.powerBonus = powerBonus;
        this.defenseBonus = defenseBonus;
    }
}

export class Dagger extends Equippable {
    constructor() {
        super(EquipmentType.Weapon, 2);
    }
}

export class Sword extends Equippable {
    constructor() {
        super(EquipmentType.Weapon, 4);
    }
}

export class LeatherArmor extends Equippable {
    constructor() {
        super(EquipmentType.Armor, 0, 1);
    }
}

export class ChainMail extends Equippable {
    constructor() {
        super(EquipmentType.Armor, 0, 3);
    }
}