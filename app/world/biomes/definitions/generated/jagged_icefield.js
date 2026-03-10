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
      "noiseScaleMultiplier": 2.2,
      "baseHeightMultiplier": 0.5,
      "ridgeScaleMultiplier": 0.5,
      "ridgeHeightMultiplier": 0.1,
      "octaves": 8,
      "lacunarity": 5,
      "gain": 0.5,
      "secondaryAmount": 0.06,
      "warpScaleMultiplier": 1.3076923076923075,
      "heightOffset": -2
    },
    "hasTrees": false,
    "fogDensityMultiplier": 1.3230000000000002,
    "humidityBand": "hydric",
    "detailTextureId": 1
  }
});

export default definition;
