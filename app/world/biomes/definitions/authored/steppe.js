const definition = Object.freeze({
  "id": "steppe",
  "label": "Steppe",
  "category": "temperate",
  "colors": {
    "ground": "#bda86a",
    "water": "#72a6bf",
    "fog": "#dbcda0",
    "trunk": "#6f553c",
    "canopy": "#a7a95b"
  },
  "terrainProfile": {
    "noiseAlgorithm": "billow",
    "noiseScaleMultiplier": 1.08,
    "baseHeightMultiplier": 0.7,
    "ridgeScaleMultiplier": 0.84,
    "ridgeHeightMultiplier": 0.28,
    "octaves": 4,
    "lacunarity": 1.85,
    "gain": 0.54,
    "secondaryAmount": 0.08
  },
  "hasTrees": true,
  "fogDensityMultiplier": 0.86,
  "humidityBand": "xeric",
  "treeStyle": "woodland",
  "treeDensityMultiplier": 0.24,
  "detailTextureId": 4
});

export default definition;
