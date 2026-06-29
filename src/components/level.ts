import { BaseComponent } from "./base-component";
import { Actor } from "../entity";

export class Level extends BaseComponent {
    levelUpBase: number;
    xpGiven: number;
    currentLevel: number;
    currentXp: number;
    levelUpFactor: number;

    constructor(
        levelUpBase: number = 0,
        xpGiven: number = 0,
        currentLevel: number = 1,
        currentXp: number = 0,
        levelUpFactor: number = 200
    ) {
        super();
        this.levelUpBase = levelUpBase;
        this.xpGiven = xpGiven;
        this.currentLevel = currentLevel;
        this.currentXp = currentXp;
        this.levelUpFactor = levelUpFactor;
    }

    public get experienceToNextLevel(): number {
        return this.levelUpBase + this.currentLevel * this.levelUpFactor;
    }

    public get requiresLevelUp(): boolean {
        return this.currentXp > this.experienceToNextLevel;
    }

    addXp(xp: number) {
        if (xp === 0 || this.levelUpBase === 0) {
            return;
        }

        this.currentXp += xp;

        window.engine.messageLog.addMessage(`You gain ${xp} experience points.`);

        if (this.requiresLevelUp) {
            window.engine.messageLog.addMessage(
                `You advance to level ${this.currentLevel + 1}!`
            );
        }
    }

    private increaseLevel() {
        this.currentXp -= this.experienceToNextLevel;
        this.currentLevel += 1;
    }

    increaseMaxHp(amount: number = 20) {
        const actor = this.parent as Actor;
        if (!actor) {
            return;
        }

        actor.fighter.maxHp += amount;
        actor.fighter.hp += amount;

        window.engine.messageLog.addMessage('Your health improves!');

        this.increaseLevel();
    }

    increasePower(amount: number = 1) {
        const actor = this.parent as Actor;
        if (!actor) {
            return;
        }

        actor.fighter.basePower += amount;

        window.engine.messageLog.addMessage('You feel stronger!');

        this.increaseLevel();
    }

    increaseDefense(amount: number = 1) {
        const actor = this.parent as Actor;
        if (!actor) {
            return;
        }

        actor.fighter.baseDefense += amount;

        window.engine.messageLog.addMessage('Your movements are getting swifter!');

        this.increaseLevel();
    }
}