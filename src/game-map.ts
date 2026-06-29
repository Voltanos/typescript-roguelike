import type { Tile } from './tile-types';
import { WALL_TILE } from './tile-types';
import * as ROT from 'rot-js';
import { Entity, Actor, Item } from './entity';

export class GameMap {
    width: number;
    height: number;
    display: ROT.Display;

    entityList: Entity[];

    tiles: Tile[][];

    downStairsLocation: [number, number];

    constructor(
        width: number,
        height: number,
        display: ROT.Display,
        entityList: Entity[]
    ) {
        this.width = width;
        this.height = height;
        this.display = display;
        this.entityList = entityList;
        this.tiles = new Array(this.height);

        for (let y = 0; y < this.height; y++) {
            const row = new Array(this.width);

            for (let x = 0; x < this.width; x++) {
                row[x] = { ...WALL_TILE };
            }
            this.tiles[y] = row;
        }

        this.downStairsLocation = [0, 0];
    }

    public get gameMap(): GameMap {
        return this;
    }

    isInBounds(x: number, y: number) {
        return 0 <= x && x < this.width && 0 <= y && y < this.height;
    }

    render() {
        for (let y = 0; y < this.tiles.length; y++) {
            const row = this.tiles[y];
            for (let x = 0; x < row.length; x++) {
                const tile = row[x];

                let char = ' ';
                let fg = '#fff';
                let bg = '#000';

                if (tile.visible) {
                    char = tile.light.char;
                    fg = tile.light.fg;
                    bg = tile.light.bg;
                }

                else if (tile.seen) {
                    char = tile.dark.char;
                    fg = tile.dark.fg;
                    bg = tile.dark.bg;
                }

                this.display.draw(x, y, char, fg, bg);
            }
        }

        const sortedEntityList = this
            .entityList
            .slice()
            .sort((a, b) => a.renderOrder - b.renderOrder);

        sortedEntityList
            .forEach((e) => {
                if (this.tiles[e.y][e.x].visible) {
                    this
                        .display
                        .draw(e.x, e.y, e.char, e.fg, e.bg);
                }
            })
    }

    addRoom(x: number, y: number, roomTiles: Tile[][]) {
        for (let curY = y; curY < y + roomTiles.length; curY += 1) {
            const mapRow = this.tiles[curY];
            const roomRow = roomTiles[curY - y];

            for (let curX = x; curX < x + roomRow.length; curX += 1) {
                mapRow[curX] = roomRow[curX - x];
            }
        }
    }

    lightPasses(x: number, y: number): boolean {
        if (this.isInBounds(x, y)) {
            return this.tiles[y][x].transparent;
        }

        return false;
    }

    updateFov(player: Entity) {
        for (let y = 0; y < this.height; y += 1) {
            for (let x = 0; x < this.width; x += 1) {
                this.tiles[y][x].visible = false;
            }
        }

        const fov = new ROT.FOV.PreciseShadowcasting(this.lightPasses.bind(this));
        fov.compute(player.x, player.y, 8, (x, y, _r, visibility) => {
            if (visibility === 1) {
                this.tiles[y][x].visible = true;
                this.tiles[y][x].seen = true;
            }
        })
    }

    getBlockingEntityAtLocation(x: number, y: number): Entity | undefined {
        return this
            .entityList
            .find((e) =>
                e.blocksMovement &&
                e.x === x &&
                e.y === y
            );
    }

    public get nonPlayerEntities(): Entity[] {
        return this
            .entityList
            .filter((e) => e.name !== 'Player');
    }

    public get actors(): Actor[] {
        return this
            .entityList
            .filter((e) => e instanceof Actor)
            .map((e) => e as Actor)
            .filter((a) => a.isAlive);
    }

    getActorAtLocation(x: number, y: number): Actor | undefined {
        return this.actors.find((a) => a.x === x && a.y === y);
    }

    public get items(): Item[] {
        return this
            .entityList
            .filter((e) => e instanceof Item)
            .map((e) => e as Item);
    }

    removeEntity(entity: Entity) {
        const index = this.entityList.indexOf(entity);

        if (index >= 0) {
            this.entityList.splice(index, 1);
        }
    }
}