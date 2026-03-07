const definition = Object.freeze({
  "id": "woodland_temperate",
  "label": "Woodland (Temperate)",
  "category": "temperate",
  "colors": {
    "ground": "#8a9b5a",
    "water": "#6b96b4",
    "fog": "#c9d6ad",
    "trunk": "#6b5138",
    "canopy": "#8ea256"
  },
  "terrainProfile": {
    "noiseAlgorithm": "hybrid",
    "noiseScaleMultiplier": 1.02,
    "baseHeightMultiplier": 0.86,
    "ridgeScaleMultiplier": 1.04,
    "ridgeHeightMultiplier": 0.52,
    "octaves": 4,
    "lacunarity": 1.9,
    "gain": 0.5,
    "secondaryAmount": 0.1
  },
  "hasTrees": true,
  "fogDensityMultiplier": 0.96,
  "humidityBand": "xeric",
  "treeStyle": "woodland",
  "treeDensityMultiplier": 0.58,
  "detailTextureId": 5
});

export default definition;
