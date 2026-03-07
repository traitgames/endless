const definition = Object.freeze({
  "id": "jagged_icefield",
  "derive": {
    "type": "subdivision",
    "from": "icefield",
    "mode": "jagged"
  },
  "settings": {
    "colors": {
      "ground": "#dde9f4",
      "water": "#9bcde9",
      "fog": "#e1effd"
    },
    "terrainProfile": {
      "noiseAlgorithm": "ridged",
      "noiseScaleMultiplier": 0.6153846153846154,
      "baseHeightMultiplier": 1.008,
      "ridgeScaleMultiplier": 1.1076923076923075,
      "ridgeHeightMultiplier": 1.2960000000000003,
      "octaves": 5,
      "lacunarity": 2.02,
      "gain": 0.48,
      "secondaryAmount": 0.07,
      "warpScaleMultiplier": 1.3076923076923075
    },
    "hasTrees": false,
    "fogDensityMultiplier": 1.3230000000000002,
    "humidityBand": "hydric",
    "detailTextureId": 1
  }
});

export default definition;
