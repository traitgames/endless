const definition = Object.freeze({
  "id": "alpine_steppe",
  "label": "Alpine Steppe",
  "category": "temperate",
  "colors": {
    "ground": "#9f9d86",
    "water": "#748b95",
    "fog": "#c7c9bc"
  },
  "terrainProfile": {
    "noiseAlgorithm": "ridged",
    "noiseScaleMultiplier": 0.94,
    "baseHeightMultiplier": 1.18,
    "ridgeScaleMultiplier": 1.38,
    "ridgeHeightMultiplier": 1.18,
    "octaves": 5,
    "lacunarity": 2,
    "gain": 0.48,
    "secondaryAmount": 0.1
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.02,
  "humidityBand": "xeric",
  "isMountainVariant": true,
  "baseBiomeId": "rocky_mountains",
  "detailTextureId": 4
});

export default definition;
