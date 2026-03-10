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
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 0.2,
      "baseHeightMultiplier": 0.6,
      "ridgeScaleMultiplier": 0.2,
      "ridgeHeightMultiplier": 0.2,
      "octaves": 7,
      "lacunarity": 0.3,
      "gain": 0.5,
      "warpStrength": 3.1,
      "warpScaleMultiplier": 12,
      "secondaryAmount": 0.2,
      "heightOffset": -12,
      "heightMultiplier": -1,
      "gradientCap": 1.6,
      "gradientSampleMeters": 6
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
