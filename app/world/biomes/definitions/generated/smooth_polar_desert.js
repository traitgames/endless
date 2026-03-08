const definition = Object.freeze({
  "id": "smooth_polar_desert",
  "derive": {
    "type": "subdivision",
    "from": "polar_desert",
    "mode": "smooth"
  },
  "settings": {
    "colors": {
      "ground": "#d8ddd9",
      "water": "#a2bccb",
      "fog": "#dce5eb"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 1.0080000000000002,
      "baseHeightMultiplier": 0.5332,
      "ridgeScaleMultiplier": 0.9911999999999999,
      "ridgeHeightMultiplier": 0.12040000000000001,
      "octaves": 2,
      "lacunarity": 2,
      "gain": 0.5,
      "secondaryAmount": 0.010000000000000002,
      "warpStrength": 0,
      "warpScaleMultiplier": 1.55,
      "gradientCap": 0.05,
      "gradientSampleMeters": 6,
      "heightOffset": 5
    },
    "hasTrees": false,
    "fogDensityMultiplier": 0.92,
    "humidityBand": "xeric",
    "detailTextureId": 2
  }
});

export default definition;
