const definition = Object.freeze({
  "id": "rainforest_temperate_mountains",
  "derive": {
    "type": "mountain",
    "from": "rainforest_temperate"
  },
  "settings": {
    "colors": {
      "ground": "#4d6e5a",
      "water": "#458186",
      "fog": "#9ac0a7",
      "trunk": "#5e493b",
      "canopy": "#3d7d4e"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 1.026,
      "baseHeightMultiplier": 1.2064,
      "ridgeScaleMultiplier": 1.2508,
      "ridgeHeightMultiplier": 0.783,
      "octaves": 6,
      "lacunarity": 1.88,
      "gain": 0.51,
      "warpStrength": 0.14,
      "warpScaleMultiplier": 1.4,
      "secondaryAmount": 0.16999999999999998
    },
    "hasTrees": true,
    "fogDensityMultiplier": 1.3824,
    "humidityBand": "hydric",
    "isMountainVariant": true,
    "baseBiomeId": "rainforest_temperate",
    "treeStyle": "rainforest",
    "treeDensityMultiplier": 0.854,
    "detailTextureId": 10
  }
});

export default definition;
