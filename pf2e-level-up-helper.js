import { characterSheetLevelButton } from "./scripts/actor.js";

const moduleName = 'pf2e-level-up-helper';

Hooks.on('init', () => {
  CONFIG.debug.hooks = true;
})

Hooks.on("renderCharacterSheetPF2e", characterSheetLevelButton)