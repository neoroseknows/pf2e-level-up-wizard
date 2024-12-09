import { module_name } from '../pf2e-level-up-helper.js';

export const registerSettings = () => {
  game.settings.register(module_name, 'buttonPlacement', {
    name: 'Button Placement',
    hint: 'Controls whether the Level Up button is on the character sheet next to the level or in the toolbar',
    scope: 'client',
    config: true,
    type: String,
    default: 'CHAR_HEADER',
    choices: {
      CHAR_HEADER: 'Next To Level',
      WINDOW_HEADER: 'Toolbar'
    }
    // onChange: () => {
    //   Object.values(ui.windows).forEach((app) => {
    //     if (app instanceof CharacterSheetPF2e) {
    //       app.render(false);
    //     }
    //   });
    // }
  });
};
