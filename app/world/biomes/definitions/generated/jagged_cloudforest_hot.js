const definition = Object.freeze({
  "id": "jagged_cloudforest_hot",
  "derive": {
    "type": "subdivision",
    "from": "cloudforest_hot",
    "mode": "jagged"
  },
  "settings": {
    "colors": {
      "ground": "#5b765f",
      "water": "#517e83",
      "fog": "#abc1a4",
      "trunk": "#614734",
      "canopy": "#4e8a54"
    },
    "terrainProfile": {
      "noiseAlgorithm": "ridged",
      "noiseScaleMultiplier": 0.6769230769230768,
      "baseHeightMultiplier": 0.976,
      "ridgeScaleMultiplier": 1.0769230769230766,
      "ridgeHeightMultiplier": 0.96,
      "octaves": 5,
      "lacunarity": 2,
      "gain": 0.48,
      "warpStrength": 0.12,
      "warpScaleMultiplier": 1.1153846153846152,
      "secondaryAmount": 0.11,
      "heightOffset": 0
    },
    "hasTrees": true,
    "fogDensityMultiplier": 1.26,
    "humidityBand": "hydric",
    "isMountainVariant": true,
    "baseBiomeId": "base_mountains",
    "treeStyle": "cloudforest",
    "treeDensityMultiplier": 0.66,
    "detailTextureId": 11
  }
});

export default definition;
