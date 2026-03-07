const definition = Object.freeze({
  "id": "thorn_forest_mountains",
  "derive": {
    "type": "mountain",
    "from": "thorn_forest"
  },
  "settings": {
    "colors": {
      "ground": "#85745d",
      "water": "#768269",
      "fog": "#ba9d81",
      "trunk": "#674d39",
      "canopy": "#7e8c4e"
    },
    "terrainProfile": {
      "noiseAlgorithm": "ridged",
      "noiseScaleMultiplier": 0.9720000000000001,
      "baseHeightMultiplier": 1.1136,
      "ridgeScaleMultiplier": 1.534,
      "ridgeHeightMultiplier": 1.215,
      "octaves": 5,
      "lacunarity": 2.04,
      "gain": 0.49,
      "secondaryAmount": 0.13,
      "warpStrength": 0.12,
      "warpScaleMultiplier": 1.7
    },
    "hasTrees": true,
    "fogDensityMultiplier": 1.08,
    "humidityBand": "hydric",
    "isMountainVariant": true,
    "baseBiomeId": "thorn_forest",
    "treeStyle": "thorn",
    "treeDensityMultiplier": 0.294,
    "detailTextureId": 9
  }
});

export default definition;
