import { characterSheetLevelButton } from './scripts/actor.js';

Hooks.on('init', () => {
  CONFIG.debug.hooks = true;
  console.log('PF2e Level-Up Helper | Module Initialized');
});

Hooks.on('renderCharacterSheetPF2e', characterSheetLevelButton);
