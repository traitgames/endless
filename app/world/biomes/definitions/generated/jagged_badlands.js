const definition = Object.freeze({
  "id": "jagged_badlands",
  "derive": {
    "type": "subdivision",
    "from": "badlands",
    "mode": "jagged"
  },
  "settings": {
    "colors": {
      "ground": "#b0654f",
      "water": "#8c6e5c",
      "fog": "#cfa588"
    },
    "terrainProfile": {
      "noiseAlgorithm": "ridged",
      "noiseScaleMultiplier": 0.8615384615384616,
      "baseHeightMultiplier": 0.8640000000000001,
      "ridgeScaleMultiplier": 1.0923076923076922,
      "ridgeHeightMultiplier": 0.944,
      "octaves": 4,
      "lacunarity": 2.08,
      "gain": 0.48,
      "secondaryAmount": 0.08,
      "warpScaleMultiplier": 1.3076923076923075
    },
    "hasTrees": false,
    "fogDensityMultiplier": 1.0710000000000002,
    "humidityBand": "xeric",
    "detailTextureId": 9
  }
});

export default definition;
