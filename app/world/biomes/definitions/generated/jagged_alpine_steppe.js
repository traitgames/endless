const definition = Object.freeze({
  "id": "jagged_alpine_steppe",
  "derive": {
    "type": "subdivision",
    "from": "alpine_steppe",
    "mode": "jagged"
  },
  "settings": {
    "colors": {
      "ground": "#9a9984",
      "water": "#738a95",
      "fog": "#c7c9be"
    },
    "terrainProfile": {
      "noiseAlgorithm": "ridged",
      "noiseScaleMultiplier": 0.723076923076923,
      "baseHeightMultiplier": 0.944,
      "ridgeScaleMultiplier": 1.0615384615384613,
      "ridgeHeightMultiplier": 0.944,
      "octaves": 5,
      "lacunarity": 2,
      "gain": 0.48,
      "secondaryAmount": 0.1,
      "warpScaleMultiplier": 1.3076923076923075,
      "heightOffset": 0
    },
    "hasTrees": false,
    "fogDensityMultiplier": 1.0710000000000002,
    "humidityBand": "xeric",
    "isMountainVariant": true,
    "baseBiomeId": "rocky_mountains",
    "detailTextureId": 4
  }
});

export default definition;
