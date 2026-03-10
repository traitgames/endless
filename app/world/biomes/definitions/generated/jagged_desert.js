const definition = Object.freeze({
  "id": "jagged_desert",
  "derive": {
    "type": "subdivision",
    "from": "desert",
    "mode": "jagged"
  },
  "settings": {
    "colors": {
      "ground": "#e3cb8c",
      "water": "#64afc4",
      "fog": "#edd7ae"
    },
    "terrainProfile": {
      "noiseAlgorithm": "billow",
      "noiseScaleMultiplier": 1.3,
      "baseHeightMultiplier": 0.5,
      "ridgeScaleMultiplier": 0.6,
      "ridgeHeightMultiplier": 0.336,
      "octaves": 4,
      "lacunarity": 2.04,
      "gain": 0.47,
      "secondaryAmount": 0.16,
      "warpScaleMultiplier": 1.3076923076923075,
      "heightOffset": 15
    },
    "hasTrees": false,
    "fogDensityMultiplier": 0.903,
    "humidityBand": "xeric",
    "detailTextureId": 7
  }
});

export default definition;
