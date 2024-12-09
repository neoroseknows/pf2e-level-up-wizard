import { renderLevelUpButton } from './scripts/actor.js';
import { registerSettings } from './scripts/settings.js';

export const module_name = 'pf2e-level-up-helper';

Hooks.on('init', () => {
  CONFIG.debug.hooks = true;
  console.log('PF2e Level-Up Helper | Module Initialized');
  registerSettings();
});

Hooks.on('renderCharacterSheetPF2e', renderLevelUpButton);
