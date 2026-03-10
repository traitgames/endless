const definition = Object.freeze({
  "id": "icefield_mountains",
  "derive": {
    "type": "mountain",
    "from": "icefield"
  },
  "settings": {
    "colors": {
      "ground": "#cedae4",
      "water": "#a0cfe9",
      "fog": "#d9e6f4"
    },
    "terrainProfile": {
      "noiseAlgorithm": "ridged",
      "noiseScaleMultiplier": 0.7200000000000001,
      "baseHeightMultiplier": 1.4616,
      "ridgeScaleMultiplier": 1.6991999999999998,
      "ridgeHeightMultiplier": 2.1870000000000003,
      "octaves": 6,
      "lacunarity": 2.02,
      "gain": 0.48,
      "secondaryAmount": 0.12000000000000001,
      "warpStrength": 0.12,
      "warpScaleMultiplier": 1.7,
      "heightOffset": 0
    },
    "hasTrees": false,
    "fogDensityMultiplier": 1.3608,
    "humidityBand": "hydric",
    "isMountainVariant": true,
    "baseBiomeId": "icefield",
    "treeDensityMultiplier": 0.7,
    "detailTextureId": 1
  }
});

export default definition;
