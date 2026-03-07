const definition = Object.freeze({
  "id": "jagged_glacier_mountains",
  "derive": {
    "type": "subdivision",
    "from": "glacier_mountains",
    "mode": "jagged"
  },
  "settings": {
    "colors": {
      "ground": "#c8d1da",
      "water": "#8fbee0",
      "fog": "#d2e3f2"
    },
    "terrainProfile": {
      "noiseAlgorithm": "ridged",
      "noiseScaleMultiplier": 0.5676923076923076,
      "baseHeightMultiplier": 1.0950399999999998,
      "ridgeScaleMultiplier": 1.2253846153846153,
      "ridgeHeightMultiplier": 1.6740000000000004,
      "octaves": 5,
      "lacunarity": 2,
      "gain": 0.5,
      "secondaryAmount": 0.11,
      "warpStrength": 0.12,
      "warpScaleMultiplier": 1.3076923076923075
    },
    "hasTrees": false,
    "fogDensityMultiplier": 1.3608,
    "humidityBand": "mesic",
    "isMountainVariant": true,
    "baseBiomeId": "glacier",
    "treeDensityMultiplier": 0.7,
    "detailTextureId": 1
  }
});

export default definition;
