class PF2eLevelUpHelperData {
  static async getClassFeaturesForLevel(characterData) {
    const featsCompendium = game.packs.get('pf2e.feats-srd');
    const feats = await featsCompendium.getDocuments();
    const sorcererFeats = feats.filter(feat => feat.system.traits.value.includes('sorcerer'))
    console.log(sorcererFeats);
  }
}

export class PF2eLevelUpHelperConfig extends FormApplication {
  constructor(sheetData) {
    super();
    this.sheetData = sheetData;
  }

  static get defaultOptions() {
    const defaults = super.defaultOptions;

    // console.log(defaults)

    const overrides = {
      height: 'auto',
      id: 'level-up-helper',
      template: "./modules/pf2e-level-up-helper/templates/level-up-helper.hbs",
      title: 'Level Up Helper',
      // sheetData: game.userId
    };

    // console.log(overrides)

    const mergedOptions = foundry.utils.mergeObject(defaults, overrides);

    return mergedOptions
  }

  getData() {
    return PF2eLevelUpHelperData.getClassFeaturesForLevel(this.sheetData)
  }
}