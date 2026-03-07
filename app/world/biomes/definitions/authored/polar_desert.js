const definition = Object.freeze({
  "id": "polar_desert",
  "label": "Polar Desert",
  "category": "cold",
  "colors": {
    "ground": "#d8ddd8",
    "water": "#9eb9c8",
    "fog": "#d7e2e8"
  },
  "terrainProfile": {
    "noiseAlgorithm": "ridged",
    "noiseScaleMultiplier": 0.9,
    "baseHeightMultiplier": 0.86,
    "ridgeScaleMultiplier": 1.18,
    "ridgeHeightMultiplier": 0.86,
    "octaves": 4,
    "lacunarity": 2,
    "gain": 0.5,
    "secondaryAmount": 0.05
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1,
  "humidityBand": "xeric",
  "detailTextureId": 2
});

export default definition;
