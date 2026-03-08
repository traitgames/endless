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
      "noiseScaleMultiplier": 2.2,
      "baseHeightMultiplier": 0.5,
      "ridgeScaleMultiplier": 0.5,
      "ridgeHeightMultiplier": 0.1,
      "octaves": 8,
      "lacunarity": 5,
      "gain": 0.5,
      "secondaryAmount": 0.06,
      "warpScaleMultiplier": 1.3076923076923075,
      "heightOffset": -5
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
