let cachedFeats = null;

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

const getFeaturesForLevel = async (characterData, type) => {
  console.log(characterData?.object?.class?.system);
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

const getBoonsForLevel = (characterData) => {
  const toCharacterLevel =
    characterData?.object?.system?.details?.level?.value + 1;
  const boonsArray = Object.values(characterData?.object?.class?.system?.items);

  return boonsArray.filter((boon) => boon.level === toCharacterLevel);
};

const getSkillsForLevel = (characterData) => {
  const toCharacterLevel =
    characterData?.object?.system?.details?.level?.value + 1;
  const levelsArray =
    characterData?.object?.class?.system?.skillIncreaseLevels?.value;

  if (!levelsArray.includes(toCharacterLevel)) return;

  console.log(characterData?.object?.skills);

  return Object.values(characterData?.object?.skills);
};

const getClassFeaturesForLevel = (characterData) =>
  getFeaturesForLevel(characterData, 'class');

const getAncestryFeaturesForLevel = (characterData) =>
  getFeaturesForLevel(characterData, 'ancestry');

const getSkillFeaturesForLevel = (characterData) =>
  getFeaturesForLevel(characterData, 'skill');

const getGeneralFeaturesForLevel = (characterData) =>
  getFeaturesForLevel(characterData, 'general');

/**
 * TODO:
 * Attribute Boosts
 * Spellcasting
 */

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
    return {
      classFeats: await getClassFeaturesForLevel(this.sheetData),
      ancestryFeats: await getAncestryFeaturesForLevel(this.sheetData),
      skillFeats: await getSkillFeaturesForLevel(this.sheetData),
      generalFeats: await getGeneralFeaturesForLevel(this.sheetData),
      boons: getBoonsForLevel(this.sheetData),
      skills: getSkillsForLevel(this.sheetData)
    };
  }
}
