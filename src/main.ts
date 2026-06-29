import { Engine } from './engine';

declare global {
    interface Window {
        engine: Engine;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.engine = new Engine();
    window.engine.screen.render();
})