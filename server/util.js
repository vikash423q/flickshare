const adjectives = [
  "Sunny", "Misty", "Lucky", "Clever", "Brave", "Happy", "Gentle", "Sparkly",
  "Witty", "Charming", "Sleepy", "Tiny", "Curious", "Jolly", "Zippy", "Peppy",
  "Snug", "Dreamy", "Swift", "Cheery"
];

const cuteNames = [
  "Muffin", "Coco", "Pebble", "Tofu", "Pickle", "Waffle", "Sprout", "Mocha",
  "Taco", "Pip", "Nugget", "Cupcake", "Mochi", "Marble", "Fox", "Otter",
  "Bumble", "Panda", "Raven", "Hedgehog"
];

const generateCuteName = () => {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const name = cuteNames[Math.floor(Math.random() * cuteNames.length)];
  return `${adj} ${name}`; // e.g. "SunnyMuffin"
}

export { generateCuteName };