const definition = Object.freeze({
  "id": "jagged_rockydesert",
  "derive": {
    "type": "subdivision",
    "from": "rockydesert",
    "mode": "jagged"
  },
  "settings": {
    "colors": {
      "ground": "#99785a",
      "water": "#797f73",
      "fog": "#caa583"
    },
    "terrainProfile": {
      "noiseAlgorithm": "ridged",
      "noiseScaleMultiplier": 0.7076923076923076,
      "baseHeightMultiplier": 0.944,
      "ridgeScaleMultiplier": 1.0923076923076922,
      "ridgeHeightMultiplier": 0.992,
      "octaves": 5,
      "lacunarity": 2.02,
      "gain": 0.48,
      "secondaryAmount": 0.1,
      "warpScaleMultiplier": 1.3076923076923075,
      "heightOffset": 0
    },
    "hasTrees": false,
    "fogDensityMultiplier": 1.008,
    "humidityBand": "xeric",
    "isMountainVariant": true,
    "baseBiomeId": "base_mountains",
    "detailTextureId": 7
  }
});

export default definition;
