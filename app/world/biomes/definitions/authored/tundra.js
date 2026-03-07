const definition = Object.freeze({
  "id": "tundra",
  "label": "Tundra",
  "category": "cold",
  "colors": {
    "ground": "#b7b7a3",
    "water": "#6e8fa1",
    "fog": "#c7ccd0"
  },
  "terrainProfile": {
    "noiseAlgorithm": "hybrid",
    "noiseScaleMultiplier": 0.95,
    "baseHeightMultiplier": 0.88,
    "ridgeScaleMultiplier": 1.05,
    "ridgeHeightMultiplier": 0.62,
    "octaves": 4,
    "lacunarity": 1.9,
    "gain": 0.52,
    "secondaryAmount": 0.08
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.08,
  "humidityBand": "xeric",
  "detailTextureId": 2
});

export default definition;
