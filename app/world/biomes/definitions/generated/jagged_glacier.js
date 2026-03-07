const definition = Object.freeze({
  "id": "jagged_glacier",
  "derive": {
    "type": "subdivision",
    "from": "glacier",
    "mode": "jagged"
  },
  "settings": {
    "colors": {
      "ground": "#e1eaf4",
      "water": "#8cc0e5",
      "fog": "#dbecfc"
    },
    "terrainProfile": {
      "noiseAlgorithm": "ridged",
      "noiseScaleMultiplier": 0.6307692307692306,
      "baseHeightMultiplier": 0.944,
      "ridgeScaleMultiplier": 1.0384615384615385,
      "ridgeHeightMultiplier": 1.2400000000000002,
      "octaves": 4,
      "lacunarity": 2,
      "gain": 0.5,
      "secondaryAmount": 0.06,
      "warpScaleMultiplier": 1.3076923076923075
    },
    "hasTrees": false,
    "fogDensityMultiplier": 1.26,
    "humidityBand": "mesic",
    "detailTextureId": 1
  }
});

export default definition;
