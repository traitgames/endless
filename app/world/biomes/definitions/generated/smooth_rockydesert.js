const definition = Object.freeze({
  "id": "smooth_rockydesert",
  "derive": {
    "type": "subdivision",
    "from": "rockydesert",
    "mode": "smooth"
  },
  "settings": {
    "colors": {
      "ground": "#a6886a",
      "water": "#838a7f",
      "fog": "#d1b091"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 1.0304000000000002,
      "baseHeightMultiplier": 0.7315999999999999,
      "ridgeScaleMultiplier": 1.1927999999999999,
      "ridgeHeightMultiplier": 0.1736,
      "octaves": 3,
      "lacunarity": 2.02,
      "gain": 0.48,
      "secondaryAmount": 0.020000000000000004,
      "warpStrength": 0,
      "warpScaleMultiplier": 1.55,
      "gradientCap": 0.05,
      "gradientSampleMeters": 6,
      "heightOffset": 0
    },
    "hasTrees": false,
    "fogDensityMultiplier": 0.8832,
    "humidityBand": "xeric",
    "isMountainVariant": true,
    "baseBiomeId": "rocky_mountains",
    "detailTextureId": 7
  }
});

export default definition;
