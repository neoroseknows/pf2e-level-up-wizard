import { characterSheetLevelButton } from "./scripts/actor.js";

Hooks.on('init', () => {
  CONFIG.debug.hooks = true;
})

Hooks.on("renderCharacterSheetPF2e", characterSheetLevelButton)