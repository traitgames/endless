const definition = Object.freeze({
  "id": "glacier_mountains",
  "derive": {
    "type": "mountain",
    "from": "glacier"
  },
  "settings": {
    "colors": {
      "ground": "#d1dbe3",
      "water": "#92c2e4",
      "fog": "#d5e5f3"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 0.76752,
      "baseHeightMultiplier": 1.0950399999999998,
      "ridgeScaleMultiplier": 1.46556,
      "ridgeHeightMultiplier": 0.7533000000000001,
      "octaves": 4,
      "lacunarity": 2,
      "gain": 0.5,
      "secondaryAmount": 0.0495,
      "warpStrength": 0.08399999999999999,
      "warpScaleMultiplier": 1.7,
      "gradientCap": 0.3,
      "gradientSampleMeters": 5,
      "heightOffset": -7
    },
    "hasTrees": false,
    "fogDensityMultiplier": 1.27008,
    "humidityBand": "mesic",
    "isMountainVariant": true,
    "baseBiomeId": "glacier",
    "treeDensityMultiplier": 0.7,
    "detailTextureId": 1
  }
});

export default definition;
