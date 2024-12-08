import { PF2eLevelUpHelperConfig } from './levelUpHelper.js';

export const characterSheetLevelButton = (sheetData, html) => {
  const characterSheetHeader = html.find('section.char-level');

  const tooltip = game.i18n.localize('PF2E_LEVEL_UP_HELPER.button-tooltip');

  characterSheetHeader.prepend(
    `<button type='button' class='level-up-icon-button flex0' title="${tooltip}">
      <i class='fas fa-hat-wizard'></i>
    </button>`
  );

  html.on('click', '.level-up-icon-button', (event) => {
    console.log('Button Clicked!');
    new PF2eLevelUpHelperConfig(sheetData).render(true);
  });
};
