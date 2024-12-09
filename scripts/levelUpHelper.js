import {
  normalizeString,
  getFeatsForLevel,
  getFeaturesForLevel,
  getSkillsForLevel,
  createGlobalLevelMessage,
  createPersonalLevelMessage,
  skillProficiencyRanks
} from './helpers.js';

export class PF2eLevelUpHelperConfig extends FormApplication {
  constructor(sheetData) {
    super();
    this.sheetData = sheetData;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      height: 'auto',
      width: 'auto',
      id: 'level-up-helper',
      template: './modules/pf2e-level-up-helper/templates/level-up-helper.hbs',
      title: 'Level Up Helper'
    });
  }

  async getData() {
    const classFeats = await getFeatsForLevel(this.sheetData, 'class');
    const ancestryFeats = await getFeatsForLevel(this.sheetData, 'ancestry');
    const skillFeats = await getFeatsForLevel(this.sheetData, 'skill');
    const generalFeats = await getFeatsForLevel(this.sheetData, 'general');
    const features = getFeaturesForLevel(this.sheetData);
    const skills = getSkillsForLevel(this.sheetData);

    // Check if at least one field in `features` is truthy
    const hasFeaturesToDisplay = !!(
      features.featuresForLevel.length > 0 ||
      features.abilityScoreIncreaseLevel ||
      features.newSpellRankLevel ||
      features.spellcasting
    );

    return {
      classFeats,
      ancestryFeats,
      skillFeats,
      generalFeats,
      features,
      skills,
      hasFeaturesToDisplay
    };
  }

  async _updateObject(event, formData) {
    const actor = this.sheetData.object;
    const currentLevel = actor.system.details.level.value;
    const newLevel = currentLevel + 1;

    // Merge `features` from `getData` with `formData`
    const data = await this.getData();
    formData.abilityScoreIncreaseLevel =
      data.features.abilityScoreIncreaseLevel;
    formData.spellcasting = data.features.spellcasting;
    formData.newSpellRankLevel = data.features.newSpellRankLevel;

    // Update the actor's level
    await actor.update({ 'system.details.level.value': newLevel });

    ui.notifications.info(`Updating level to ${newLevel}...`);

    // Wait for the actor to refresh
    await Hooks.once('updateActor', () => {});

    ui.notifications.info('Level updated. Starting feat updates...');

    // Process feats
    // Map form data to feat types and UUIDs
    const featEntries = Object.entries({
      classFeats: formData.classFeats,
      ancestryFeats: formData.ancestryFeats,
      skillFeats: formData.skillFeats,
      generalFeats: formData.generalFeats
    });

    // Filter out invalid entries (no UUID provided)
    const validFeatEntries = featEntries.filter(([, uuid]) => uuid);

    // Fetch feats by UUID
    const featPromises = validFeatEntries.map(async ([type, uuid]) => {
      const feat = await fromUuid(uuid).catch(() => null);
      return { feat, type };
    });

    // Resolve all promises and filter valid feats
    const featsToAdd = (await Promise.all(featPromises)).filter(
      ({ feat }) => feat
    );

    const featGroupMap = {
      classFeats: 'class',
      ancestryFeats: 'ancestry',
      skillFeats: 'skill',
      generalFeats: 'general'
    };

    const itemsToCreate = featsToAdd.map(({ feat, type }) => ({
      ...feat.toObject(),
      system: {
        ...feat.system,
        location: `${featGroupMap[type]}-${newLevel}`,
        level: { ...feat.system.level, taken: newLevel }
      }
    }));

    await actor.createEmbeddedDocuments('Item', itemsToCreate);

    // Handle Skill Increase
    let skillIncreaseMessage = '';
    if (formData.skills) {
      const skill = formData.skills;
      const normalizedSkill = normalizeString(skill);
      const skillRankPath = `system.skills.${normalizedSkill}.rank`;
      const updatedRank = actor.system.skills[normalizedSkill].rank + 1;
      await actor.update({ [skillRankPath]: updatedRank });

      const rankName =
        skillProficiencyRanks[updatedRank] || `Rank ${updatedRank}`;
      skillIncreaseMessage = `${skill} skill rank increased to ${rankName}.`;
      ui.notifications.info(skillIncreaseMessage);
    }

    // Prepare messages
    const selectedFeats = featsToAdd
      .map(({ feat }) => `@UUID[${feat.uuid}]`)
      .join(', ');
    const playerId = game.user.id;
    const actorName = actor.name;

    createGlobalLevelMessage(
      actorName,
      newLevel,
      selectedFeats,
      skillIncreaseMessage
    );

    createPersonalLevelMessage(formData, playerId, actorName);

    ui.notifications.info('Feat updates complete!');
  }
}
