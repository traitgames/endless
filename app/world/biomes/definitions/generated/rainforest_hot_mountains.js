const definition = Object.freeze({
  "id": "rainforest_hot_mountains",
  "derive": {
    "type": "mountain",
    "from": "rainforest_hot"
  },
  "settings": {
    "colors": {
      "ground": "#496b51",
      "water": "#3d7f80",
      "fog": "#9dbd94",
      "trunk": "#5f493a",
      "canopy": "#36754b"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 0.9720000000000001,
      "baseHeightMultiplier": 1.1136,
      "ridgeScaleMultiplier": 1.298,
      "ridgeHeightMultiplier": 0.6210000000000001,
      "octaves": 6,
      "lacunarity": 1.9,
      "gain": 0.5,
      "warpStrength": 0.14,
      "warpScaleMultiplier": 1.32,
      "secondaryAmount": 0.19
    },
    "hasTrees": true,
    "fogDensityMultiplier": 1.3392000000000002,
    "humidityBand": "hydric",
    "waterlineMode": "wetland",
    "isMountainVariant": true,
    "baseBiomeId": "rainforest_hot",
    "treeStyle": "rainforest",
    "treeDensityMultiplier": 0.8959999999999999,
    "detailTextureId": 10
  }
});

export default definition;
