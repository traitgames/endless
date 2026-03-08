const definition = Object.freeze({
  "id": "jagged_alpine_tundra",
  "derive": {
    "type": "subdivision",
    "from": "alpine_tundra",
    "mode": "jagged"
  },
  "settings": {
    "colors": {
      "ground": "#9fa197",
      "water": "#748a98",
      "fog": "#ccd2d1"
    },
    "terrainProfile": {
      "noiseAlgorithm": "ridged",
      "noiseScaleMultiplier": 0.7076923076923076,
      "baseHeightMultiplier": 0.96,
      "ridgeScaleMultiplier": 1.0461538461538462,
      "ridgeHeightMultiplier": 0.976,
      "octaves": 5,
      "lacunarity": 2,
      "gain": 0.48,
      "secondaryAmount": 0.09,
      "warpScaleMultiplier": 1.3076923076923075,
      "heightOffset": 0
    },
    "hasTrees": false,
    "fogDensityMultiplier": 1.1340000000000001,
    "humidityBand": "xeric",
    "isMountainVariant": true,
    "baseBiomeId": "rocky_mountains",
    "detailTextureId": 2
  }
});

export default definition;
