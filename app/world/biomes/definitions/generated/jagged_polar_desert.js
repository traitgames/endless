const definition = Object.freeze({
  "id": "jagged_polar_desert",
  "derive": {
    "type": "subdivision",
    "from": "polar_desert",
    "mode": "jagged"
  },
  "settings": {
    "colors": {
      "ground": "#ced3d0",
      "water": "#9ab5c5",
      "fog": "#d6e1e7"
    },
    "terrainProfile": {
      "noiseAlgorithm": "ridged",
      "noiseScaleMultiplier": 0.6923076923076923,
      "baseHeightMultiplier": 0.6880000000000001,
      "ridgeScaleMultiplier": 0.9076923076923076,
      "ridgeHeightMultiplier": 0.6880000000000001,
      "octaves": 4,
      "lacunarity": 2,
      "gain": 0.5,
      "secondaryAmount": 0.05,
      "warpScaleMultiplier": 1.3076923076923075
    },
    "hasTrees": false,
    "fogDensityMultiplier": 1.05,
    "humidityBand": "xeric",
    "detailTextureId": 2
  }
});

export default definition;
