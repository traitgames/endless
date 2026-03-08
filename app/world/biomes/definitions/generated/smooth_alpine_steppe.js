const definition = Object.freeze({
  "id": "smooth_alpine_steppe",
  "derive": {
    "type": "subdivision",
    "from": "alpine_steppe",
    "mode": "smooth"
  },
  "settings": {
    "colors": {
      "ground": "#a7a692",
      "water": "#7e949f",
      "fog": "#ced0c6"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 1.0528,
      "baseHeightMultiplier": 0.7315999999999999,
      "ridgeScaleMultiplier": 1.1591999999999998,
      "ridgeHeightMultiplier": 0.1652,
      "octaves": 3,
      "lacunarity": 2,
      "gain": 0.48,
      "secondaryAmount": 0.020000000000000004,
      "warpStrength": 0,
      "warpScaleMultiplier": 1.55,
      "gradientCap": 0.05,
      "gradientSampleMeters": 6,
      "heightOffset": 0
    },
    "hasTrees": false,
    "fogDensityMultiplier": 0.9384,
    "humidityBand": "xeric",
    "isMountainVariant": true,
    "baseBiomeId": "rocky_mountains",
    "detailTextureId": 4
  }
});

export default definition;
