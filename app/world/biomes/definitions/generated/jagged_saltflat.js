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
      "noiseScaleMultiplier": 0.6461538461538461,
      "baseHeightMultiplier": 0.46399999999999997,
      "ridgeScaleMultiplier": 0.5538461538461538,
      "ridgeHeightMultiplier": 0.144,
      "octaves": 3,
      "lacunarity": 1.9,
      "gain": 0.53,
      "secondaryAmount": 0.05,
      "gradientCap": 0.18,
      "gradientSampleMeters": 5,
      "warpScaleMultiplier": 1.3076923076923075
    },
    "hasTrees": false,
    "fogDensityMultiplier": 0.9450000000000001,
    "humidityBand": "xeric",
    "detailTextureId": 7
  }
});

export default definition;
