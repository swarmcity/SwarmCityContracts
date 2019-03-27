const characterTraits = require("./characterTraits");
const clothesWords = require("./clothesWords");
const foodItems = require("./foodItems");
const furniture = require("./furniture");
const houseWords = require("./houseWords");
const jobOcupations = require("./jobOcupations");
const shoes = require("./shoes");
// Connectors
const ps = require("./prepositionsSingle");
const pm = require("./prepositionsMultiple");
const intent = require("./intent");

const templates = [
  () => `${getRandom(intent)} ${getRandom(ps)} ${getRandom(furniture)}`,
  () => `${getRandom(intent)} ${getRandom(pm)} ${getRandom(furniture)}s`,
  () =>
    `${getRandom(ps)} professional ${getRandom(
      jobOcupations
    )} to build ${getRandom(ps)} ${getRandom(houseWords)}`,
  () =>
    `${getRandom(pm)} ${getRandom(characterTraits)} ${getRandom(
      jobOcupations
    )}s to do ${getRandom(ps)} ${getRandom(furniture)}`,
  () =>
    `a ${getRandom(characterTraits)}, ${getRandom(
      characterTraits
    )} and ${getRandom(characterTraits)} lover`,
  () => `some ${getRandom(shoes)}`,
  () => `${getRandom(intent)} ${getRandom(ps)} ${getRandom(clothesWords)}`,
  () => `${getRandom(intent)} ${getRandom(ps)} ${getRandom(foodItems)}`,
  () => `${getRandom(intent)} ${getRandom(ps)} ${getRandom(foodItems)}`
];

function getRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getRandomItemDescription(n) {
  return capitalize(getRandom(templates)().trim());
}

module.exports = getRandomItemDescription;
