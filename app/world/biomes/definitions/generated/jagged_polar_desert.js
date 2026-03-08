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
      "noiseScaleMultiplier": 0.3,
      "baseHeightMultiplier": 3.2,
      "ridgeScaleMultiplier": 0.5,
      "ridgeHeightMultiplier": 0.1,
      "octaves": 4,
      "lacunarity": 5,
      "gain": 0.5,
      "secondaryAmount": 0.05,
      "warpScaleMultiplier": 1.2,
      "heightOffset": 5
    },
    "hasTrees": false,
    "fogDensityMultiplier": 1.05,
    "humidityBand": "xeric",
    "detailTextureId": 2
  }
});

export default definition;
