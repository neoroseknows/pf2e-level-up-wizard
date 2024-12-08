let cachedFeats = null;
const abilityScoreIncreaseLevels = [5, 10, 15, 20];
const newSpellRankLevels = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

/**
 *
 * @returns feats compendium
 */

const getCachedFeats = async () => {
  if (!cachedFeats) {
    const featsCompendium = game.packs.get('pf2e.feats-srd');
    cachedFeats = await featsCompendium.getDocuments();
  }
  return cachedFeats;
};

/**
 *
 * @param {string} str string to normalize
 * @returns string with spaces replaced with dashes and set to lowercase
 */

const normalizeString = (str) => str.replace(/\s+/g, '-').toLowerCase();

/**
 *
 * @param {string} searchQuery feat type to search for
 * @param {number} toCharacterLevel level that the character is leveling to
 * @returns feats filtered to the character's level and below, sorted by level (descending) then alphabetically
 */

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

/**
 *
 * @param {CharacterSheetPF2e} characterData the data for the character sheet to get features for
 * @param {string} type feature type
 * @returns filtered/sorted feats based off of the feature type
 */

const getFeaturesForLevel = async (characterData, type) => {
  const levelsArray =
    characterData?.object?.class?.system?.[`${type}FeatLevels`]?.value;
  const toCharacterLevel =
    characterData?.object?.system?.details?.level?.value + 1;

  if (!levelsArray.includes(toCharacterLevel)) return;

  let searchQuery;

  // Use a switch to handle various feat types
  switch (type) {
    case 'class':
      searchQuery = characterData?.object?.class?.name;
      break;
    case 'ancestry':
      searchQuery = characterData?.object?.ancestry?.name;
      break;
    case 'general':
      searchQuery = 'general';
      break;
    case 'skill':
      searchQuery = 'skill';
      break;
    default:
      console.error(`Unknown feat type: ${type}`);
      return;
  }

  return filterAndSortFeats(searchQuery, toCharacterLevel);
};

/**
 *
 * @param {CharacterSheetPF2e} characterData data for the character sheet to get features for
 * @returns boons object for the level that the character is leveling to
 */

const getBoonsForLevel = (characterData) => {
  const toCharacterLevel =
    characterData?.object?.system?.details?.level?.value + 1;
  const doesCharacterHaveSpellcasting =
    characterData?.object?.class?.system?.spellcasting;
  const boonsArray = Object.values(characterData?.object?.class?.system?.items);

  const boonsForLevel = boonsArray.filter(
    (boon) => boon.level === toCharacterLevel
  );

  const abilityScoreIncreaseLevel =
    abilityScoreIncreaseLevels.includes(toCharacterLevel);

  const newSpellRankLevel =
    newSpellRankLevels.includes(toCharacterLevel) &&
    doesCharacterHaveSpellcasting;

  return {
    boonsForLevel,
    abilityScoreIncreaseLevel,
    newSpellRankLevel,
    doesCharacterHaveSpellcasting
  };
};

/**
 *
 * @param {CharacterSheetPF2e} characterData data for the character sheet to get features for
 * @returns array of skills for the user to select from
 */

const getSkillsForLevel = (characterData) => {
  const toCharacterLevel =
    characterData?.object?.system?.details?.level?.value + 1;
  const levelsArray =
    characterData?.object?.class?.system?.skillIncreaseLevels?.value;

  if (!levelsArray.includes(toCharacterLevel)) return;

  return Object.values(characterData?.object?.skills);
};

/**
 *
 * @param {CharacterSheetPF2e} characterData data for the character sheet to get features for
 * @returns feats for the upcoming level associated with the passed in search query
 */

const getClassFeaturesForLevel = (characterData) =>
  getFeaturesForLevel(characterData, 'class');

const getAncestryFeaturesForLevel = (characterData) =>
  getFeaturesForLevel(characterData, 'ancestry');

const getSkillFeaturesForLevel = (characterData) =>
  getFeaturesForLevel(characterData, 'skill');

const getGeneralFeaturesForLevel = (characterData) =>
  getFeaturesForLevel(characterData, 'general');

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
    const classFeats = await getClassFeaturesForLevel(this.sheetData);
    const ancestryFeats = await getAncestryFeaturesForLevel(this.sheetData);
    const skillFeats = await getSkillFeaturesForLevel(this.sheetData);
    const generalFeats = await getGeneralFeaturesForLevel(this.sheetData);
    const boons = getBoonsForLevel(this.sheetData);
    const skills = getSkillsForLevel(this.sheetData);

    // Check if at least one field in `boons` is truthy
    const hasBoonsToDisplay = !!(
      boons.boonsForLevel.length > 0 ||
      boons.abilityScoreIncreaseLevel ||
      boons.newSpellRankLevel ||
      boons.doesCharacterHaveSpellcasting
    );

    return {
      classFeats,
      ancestryFeats,
      skillFeats,
      generalFeats,
      boons,
      skills,
      hasBoonsToDisplay
    };
  }

  async _updateObject(event, formData) {
    const actor = this.sheetData.object;

    // Update the actor's level
    const currentLevel = actor.system.details.level.value;
    const newLevel = currentLevel + 1;

    ui.notifications.info(`Updating level to ${newLevel}...`);
    await actor.update({ 'system.details.level.value': newLevel });

    // Wait for the actor to refresh
    await Hooks.once('updateActor', () => {});

    ui.notifications.info('Level updated. Starting feat updates...');

    const featPromises = [];
    const locations = {};

    // Define feat groups
    const featGroups = {
      classFeats: `class-${newLevel}`,
      ancestryFeats: `ancestry-${newLevel}`,
      skillFeats: `skill-${newLevel}`,
      generalFeats: `general-${newLevel}`
    };

    // Collect selected feats and their target locations
    if (formData.classFeats) {
      featPromises.push(fromUuid(formData.classFeats));
      locations[formData.classFeats] = featGroups.classFeats;
    }
    if (formData.ancestryFeats) {
      featPromises.push(fromUuid(formData.ancestryFeats));
      locations[formData.ancestryFeats] = featGroups.ancestryFeats;
    }
    if (formData.skillFeats) {
      featPromises.push(fromUuid(formData.skillFeats));
      locations[formData.skillFeats] = featGroups.skillFeats;
    }
    if (formData.generalFeats) {
      featPromises.push(fromUuid(formData.generalFeats));
      locations[formData.generalFeats] = featGroups.generalFeats;
    }

    // Fetch all selected feats
    const featsToAdd = await Promise.all(
      featPromises.map((p) => p.catch(() => null))
    );

    // Filter out null values (invalid UUIDs)
    const validFeats = featsToAdd.filter((feat) => feat !== null);

    if (validFeats.length === 0) {
      ui.notifications.warn('No valid feats were selected or found.');
    } else {
      // Add the feats to the actor with correct locations and level
      const itemsToCreate = validFeats.map((feat) => {
        const location = locations[feat.uuid];
        return {
          ...feat.toObject(),
          system: {
            ...feat.system,
            location: location, // Assign the correct location
            level: {
              ...feat.system.level,
              taken: newLevel // Set the level the feat is taken
            }
          }
        };
      });

      await actor.createEmbeddedDocuments('Item', itemsToCreate);
      ui.notifications.info(
        'Selected feats have been added to your character.'
      );
    }

    // Handle Skill Increase
    if (formData.skills) {
      const skill = formData.skills;
      const normalizedSkill = normalizeString(skill);
      const skillRankPath = `system.skills.${normalizedSkill}.rank`;
      const updatedRank = actor.system.skills[normalizedSkill].rank + 1;
      await actor.update({ [skillRankPath]: updatedRank });
      ui.notifications.info(`${skill} skill rank has been increased.`);
    }

    // Notify user of manual updates
    if (formData.abilityScoreIncreaseLevel) {
      ui.notifications.info(
        'Remember to manually update Ability Score Increases in the Character tab!'
      );
    }

    if (formData.newSpellRankLevel) {
      ui.notifications.info(
        'Remember to manually update your Spellcasting tab for the new spell rank!'
      );
    }

    ui.notifications.info('Feat updates complete!');
  }
}
