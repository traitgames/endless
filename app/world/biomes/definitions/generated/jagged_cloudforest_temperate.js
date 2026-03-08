const definition = Object.freeze({
  "id": "jagged_cloudforest_temperate",
  "derive": {
    "type": "subdivision",
    "from": "cloudforest_temperate",
    "mode": "jagged"
  },
  "settings": {
    "colors": {
      "ground": "#5f7d6f",
      "water": "#4f7f89",
      "fog": "#a0bab5",
      "trunk": "#604b3a",
      "canopy": "#4c8d62"
    },
    "terrainProfile": {
      "noiseAlgorithm": "ridged",
      "noiseScaleMultiplier": 0.6923076923076923,
      "baseHeightMultiplier": 0.992,
      "ridgeScaleMultiplier": 1.0923076923076922,
      "ridgeHeightMultiplier": 0.944,
      "octaves": 5,
      "lacunarity": 1.98,
      "gain": 0.49,
      "warpStrength": 0.13,
      "warpScaleMultiplier": 1.1538461538461537,
      "secondaryAmount": 0.12,
      "heightOffset": 0
    },
    "hasTrees": true,
    "fogDensityMultiplier": 1.281,
    "humidityBand": "hydric",
    "isMountainVariant": true,
    "baseBiomeId": "rocky_mountains",
    "treeStyle": "cloudforest",
    "treeDensityMultiplier": 0.62,
    "detailTextureId": 11
  }
});

export default definition;
