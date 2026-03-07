const definition = Object.freeze({
  "id": "steppe_mountains",
  "derive": {
    "type": "mountain",
    "from": "steppe"
  },
  "settings": {
    "colors": {
      "ground": "#afa378",
      "water": "#78a7be",
      "fog": "#d2c8a4",
      "trunk": "#705a44",
      "canopy": "#9fa266"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 0.9720000000000001,
      "baseHeightMultiplier": 0.8119999999999999,
      "ridgeScaleMultiplier": 0.9911999999999999,
      "ridgeHeightMultiplier": 0.37800000000000006,
      "octaves": 5,
      "lacunarity": 1.85,
      "gain": 0.54,
      "secondaryAmount": 0.13,
      "warpStrength": 0.12,
      "warpScaleMultiplier": 1.7
    },
    "hasTrees": true,
    "fogDensityMultiplier": 0.9288000000000001,
    "humidityBand": "xeric",
    "isMountainVariant": true,
    "baseBiomeId": "steppe",
    "treeStyle": "woodland",
    "treeDensityMultiplier": 0.16799999999999998,
    "detailTextureId": 4
  }
});

export default definition;
