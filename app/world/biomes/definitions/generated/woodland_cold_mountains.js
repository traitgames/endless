const definition = Object.freeze({
  "id": "woodland_cold_mountains",
  "derive": {
    "type": "mountain",
    "from": "woodland_cold"
  },
  "settings": {
    "colors": {
      "ground": "#828e8a",
      "water": "#7691a3",
      "fog": "#adbbbd",
      "trunk": "#6c594a",
      "canopy": "#7b998a"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 0.918,
      "baseHeightMultiplier": 1.0208,
      "ridgeScaleMultiplier": 1.2744,
      "ridgeHeightMultiplier": 0.8370000000000001,
      "octaves": 5,
      "lacunarity": 1.9,
      "gain": 0.51,
      "secondaryAmount": 0.11,
      "warpStrength": 0.12,
      "warpScaleMultiplier": 1.7
    },
    "hasTrees": true,
    "fogDensityMultiplier": 1.1016000000000001,
    "humidityBand": "xeric",
    "isMountainVariant": true,
    "baseBiomeId": "woodland_cold",
    "treeStyle": "muskeg",
    "treeDensityMultiplier": 0.322,
    "detailTextureId": 3
  }
});

export default definition;
