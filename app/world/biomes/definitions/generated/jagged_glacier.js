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
      "noiseScaleMultiplier": 2.2,
      "baseHeightMultiplier": 0.5,
      "ridgeScaleMultiplier": 0.5,
      "ridgeHeightMultiplier": 0.1,
      "octaves": 8,
      "lacunarity": 5,
      "gain": 0.5,
      "secondaryAmount": 0.06,
      "warpScaleMultiplier": 1.3076923076923075,
      "heightOffset": -8
    },
    "hasTrees": false,
    "fogDensityMultiplier": 1.26,
    "humidityBand": "mesic",
    "detailTextureId": 1
  }
});

export default definition;
