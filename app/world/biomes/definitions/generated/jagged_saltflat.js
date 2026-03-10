const definition = Object.freeze({
  "id": "jagged_saltflat",
  "derive": {
    "type": "subdivision",
    "from": "saltflat",
    "mode": "jagged"
  },
  "settings": {
    "colors": {
      "ground": "#cfc7ad",
      "water": "#89adb9",
      "fog": "#d7d3c6"
    },
    "terrainProfile": {
      "noiseAlgorithm": "billow",
      "noiseScaleMultiplier": 12.5,
      "baseHeightMultiplier": 0.05,
      "ridgeScaleMultiplier": 2.6,
      "ridgeHeightMultiplier": 0.1,
      "octaves": 3,
      "lacunarity": 1.9,
      "gain": 0.53,
      "secondaryAmount": 0.05,
      "gradientCap": 0.18,
      "gradientSampleMeters": 5,
      "warpScaleMultiplier": 1.3076923076923075,
      "heightOffset": 1
    },
    "hasTrees": false,
    "fogDensityMultiplier": 0.9450000000000001,
    "humidityBand": "xeric",
    "detailTextureId": 7
  }
});

export default definition;
