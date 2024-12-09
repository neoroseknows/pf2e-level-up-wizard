import { module_name } from '../pf2e-level-up-helper.js';
import { PF2eLevelUpHelperConfig } from './levelUpHelper.js';

export const renderLevelUpButton = (sheet, html) => {
  if (!sheet.actor.isOwner) return;

  const title = game.i18n.localize('PF2E_LEVEL_UP_HELPER.button-tooltip');

  if (game.settings.get(module_name, 'buttonPlacement') === 'CHAR_HEADER') {
    const button = $(
      `<button type='button' class='level-up-icon-button flex0' title="${title}">
      <i class='fas fa-hat-wizard'></i>
      </button>`
    );

    button.on('click', () => new PF2eLevelUpHelperConfig(sheet).render(true));

    html.find('section.char-level').prepend(button);
  }

  if (game.settings.get(module_name, 'buttonPlacement') === 'WINDOW_HEADER') {
    const button = $(
      `<a class="level-up-helper" title="Level Up Helper"><i class="fas fa-level-up-alt"></i>${title}</a>`
    );
    button.on('click', () => new PF2eLevelUpHelperConfig(sheet).render(true));

    html.find('.window-title').after(button);
  }
};
