let cachedFeats = null;

// @Constants
const abilityScoreIncreaseLevels = [5, 10, 15, 20];
const newSpellRankLevels = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

// @Utility
const getCachedFeats = async () => {
  if (!cachedFeats) {
    const featsCompendium = game.packs.get('pf2e.feats-srd');
    cachedFeats = await featsCompendium.getDocuments();
  }
  return cachedFeats;
};

const normalizeString = (str) => str.replace(/\s+/g, '-').toLowerCase();

const filterAndSortFeats = async (searchQuery, toCharacterLevel) => {
  const feats = await getCachedFeats();
  const normalizedQuery = normalizeString(searchQuery);

  const filteredFeats = feats.filter((feat) => {
    const traits = feat.system.traits.value.map(normalizeString);
    return (
      traits.includes(normalizedQuery) &&
      feat.system.level.value <= toCharacterLevel
    );
  });

  return filteredFeats.sort((a, b) =>
    a.system.level.value !== b.system.level.value
      ? b.system.level.value - a.system.level.value
      : a.name.localeCompare(b.name)
  );
};

// Retrieve Feats for specific Levels and Types
const getFeatsForLevel = async (characterData, type) => {
  const levelsArray =
    characterData?.object?.class?.system?.[`${type}FeatLevels`]?.value;
  const toCharacterLevel =
    characterData?.object?.system?.details?.level?.value + 1;

  if (!levelsArray.includes(toCharacterLevel)) return;

  const queryMap = {
    class: characterData?.object?.class?.name,
    ancestry: characterData?.object?.ancestry?.name,
    general: 'general',
    skill: 'skill'
  };

  const searchQuery = queryMap[type];
  if (!searchQuery) {
    console.error(`Unknown feat type: ${type}`);
    return;
  }

  return filterAndSortFeats(searchQuery, toCharacterLevel);
};

// Retrieve Features for specific Levels for class
const getFeaturesForLevel = (characterData) => {
  const toCharacterLevel =
    characterData?.object?.system?.details?.level?.value + 1;
  const spellcasting = characterData?.object?.class?.system?.spellcasting;
  const featuresArray = Object.values(
    characterData?.object?.class?.system?.items
  );

  const featuresForLevel = featuresArray.filter(
    (boon) => boon.level === toCharacterLevel
  );

  const abilityScoreIncreaseLevel =
    abilityScoreIncreaseLevels.includes(toCharacterLevel);

  const newSpellRankLevel =
    newSpellRankLevels.includes(toCharacterLevel) && spellcasting;

  return {
    featuresForLevel,
    abilityScoreIncreaseLevel,
    newSpellRankLevel,
    spellcasting
  };
};

// Retrieve Skill options
const getSkillsForLevel = (characterData) => {
  const toCharacterLevel =
    characterData?.object?.system?.details?.level?.value + 1;
  const levelsArray =
    characterData?.object?.class?.system?.skillIncreaseLevels?.value;

  return levelsArray.includes(toCharacterLevel)
    ? Object.values(characterData?.object?.skills)
    : [];
};

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
    // Transform data to feat types and UUIDs
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

      skillIncreaseMessage = `${skill} skill rank increased.`;
      ui.notifications.info(skillIncreaseMessage);
    }

    // Prepare messages
    const selectedFeats = featsToAdd
      .map(({ feat }) => `@UUID[${feat.uuid}]`)
      .join(', ');
    const playerId = game.user.id;
    const actorName = actor.name;

    // Global message: Announce level-up and selected feats
    const globalMessage = `
            <h2>${actorName} has leveled up to Level ${newLevel}!</h2>
            <p><strong>Selected Feats:</strong> ${
              selectedFeats || 'No feats selected.'
            }</p>
            ${
              skillIncreaseMessage
                ? `<p><strong>Skill Increase:</strong> ${skillIncreaseMessage}</p>`
                : ''
            }
        `;
    ChatMessage.create({
      content: globalMessage,
      speaker: { alias: actorName }
    });

    // Whisper to player: Remind of manual updates
    const manualUpdates = [];
    if (formData.abilityScoreIncreaseLevel) {
      manualUpdates.push('Ability Score Increases (Character tab)');
    }
    if (formData.spellcasting) {
      manualUpdates.push(
        formData.newSpellRankLevel
          ? 'New Spell Rank & Slots (Spellcasting tab)'
          : 'New Spell Slots (Spellcasting tab)'
      );
    }

    if (manualUpdates.length > 0) {
      const whisperMessage = `
                <h2>Manual Updates Needed</h2>
                <ul>${manualUpdates
                  .map((update) => `<li>${update}</li>`)
                  .join('')}</ul>
            `;
      ChatMessage.create({
        content: whisperMessage,
        whisper: [playerId],
        speaker: { alias: actorName }
      });
    }

    ui.notifications.info('Feat updates complete!');
  }
}
