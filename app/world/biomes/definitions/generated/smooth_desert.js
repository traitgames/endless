const definition = Object.freeze({
  "id": "smooth_desert",
  "derive": {
    "type": "subdivision",
    "from": "desert",
    "mode": "smooth"
  },
  "settings": {
    "colors": {
      "ground": "#ecd699",
      "water": "#70b7ca",
      "fog": "#f1dcb8"
    },
    "terrainProfile": {
      "noiseAlgorithm": "billow",
      "noiseScaleMultiplier": 0.9632000000000001,
      "baseHeightMultiplier": 0.5084,
      "ridgeScaleMultiplier": 1.0584,
      "ridgeHeightMultiplier": 0.058800000000000005,
      "octaves": 2,
      "lacunarity": 2.04,
      "gain": 0.47,
      "secondaryAmount": 0.032,
      "warpStrength": 0,
      "warpScaleMultiplier": 1.55,
      "gradientCap": 0.05,
      "gradientSampleMeters": 6,
      "heightOffset": 10
    },
    "hasTrees": false,
    "fogDensityMultiplier": 0.7912,
    "humidityBand": "xeric",
    "detailTextureId": 7
  }
});

export default definition;
