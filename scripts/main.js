const moduleName = 'pf2e-level-up-helper';

// class PF2eLevelUpHelper {
//   static ID = 'pf2e-level-up-helper'

//   static FLAGS = {
//     LEVEL_UP_HELPER: 'level-up-helper'
//   }

//   static TEMPLATES = {
//     LEVEL_UP_HELPER: `modules/${this.ID}/templates/level-up-helper.hbs`
//   }

//   static log(...args) {
//     console.log(this.ID, '|', ...args)
//   }

//   static initialize() {
//     this.PF2eLevelUpHelperConfig = new PF2eLevelUpHelperConfig();
//   }
// }

Hooks.on('init', () => {
  // CONFIG.debug.hooks = true;
  // PF2eLevelUpHelper.initialize();
})

// Hooks.on('renderCharacterSheetPF2e', (sheetData, html) => {
//   const characterSheetHeader = html.find('section.char-level');

//   const tooltip = game.i18n.localize('PF2E_LEVEL_UP_HELPER.button-tooltip');

//   characterSheetHeader.prepend(
//     `<button type='button' class='level-up-icon-button flex0' title="${tooltip}">
//       <i class='fas fa-level-up'></i>
//     </button>`
//   );

//   html.on('click', '.level-up-icon-button', (event) => {
//     PF2eLevelUpHelper.log('Button Clicked!')
//     PF2eLevelUpHelper.PF2eLevelUpHelperConfig.render(true)
//   });
// });


// class PF2eLevelUpHelperConfig extends FormApplication {
//   static get defaultOptions() {
//     const defaults = super.defaultOptions;

//     const overrides = {
//       height: 'auto',
//       id: 'level-up-helper',
//       template: PF2eLevelUpHelper.TEMPLATES.LEVEL_UP_HELPER,
//       title: 'Level Up Helper'
//     };

//     const mergedOptions = foundry.utils.mergeObject(defaults, overrides);

//     return mergedOptions
//   }
// }