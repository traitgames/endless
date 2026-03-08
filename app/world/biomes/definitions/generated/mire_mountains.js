const definition = Object.freeze({
  "id": "mire_mountains",
  "derive": {
    "type": "mountain",
    "from": "mire"
  },
  "settings": {
    "colors": {
      "ground": "#6b7a73",
      "water": "#5a787d",
      "fog": "#a7b7b2"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 0.9720000000000001,
      "baseHeightMultiplier": 0.6032,
      "ridgeScaleMultiplier": 0.8967999999999999,
      "ridgeHeightMultiplier": 0.27,
      "octaves": 5,
      "lacunarity": 1.8,
      "gain": 0.54,
      "warpStrength": 0.14,
      "warpScaleMultiplier": 1.26,
      "secondaryAmount": 0.1,
      "heightOffset": 0
    },
    "hasTrees": false,
    "fogDensityMultiplier": 1.4256000000000002,
    "humidityBand": "hydric",
    "waterlineMode": "wetland",
    "isMountainVariant": true,
    "baseBiomeId": "mire",
    "treeDensityMultiplier": 0.7,
    "detailTextureId": 6
  }
});

export default definition;
