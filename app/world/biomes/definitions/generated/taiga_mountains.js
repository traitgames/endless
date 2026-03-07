const definition = Object.freeze({
  "id": "taiga_mountains",
  "derive": {
    "type": "mountain",
    "from": "taiga"
  },
  "settings": {
    "colors": {
      "ground": "#788795",
      "water": "#60849f",
      "fog": "#9eb4c3",
      "trunk": "#6f5d4c",
      "canopy": "#6e9d95"
    },
    "terrainProfile": {
      "noiseAlgorithm": "fbm_ridged",
      "noiseScaleMultiplier": 0.9720000000000001,
      "baseHeightMultiplier": 1.1832,
      "ridgeScaleMultiplier": 1.416,
      "ridgeHeightMultiplier": 1.215,
      "octaves": 6,
      "lacunarity": 1.95,
      "gain": 0.49,
      "secondaryAmount": 0.1,
      "warpStrength": 0.12,
      "warpScaleMultiplier": 1.7
    },
    "hasTrees": true,
    "fogDensityMultiplier": 1.2096000000000002,
    "humidityBand": "mesic",
    "isMountainVariant": true,
    "baseBiomeId": "taiga",
    "treeStyle": "conifer",
    "treeDensityMultiplier": 0.5599999999999999,
    "detailTextureId": 3
  }
});

export default definition;
