const definition = Object.freeze({
  "id": "badlands_mountains",
  "derive": {
    "type": "mountain",
    "from": "badlands"
  },
  "settings": {
    "colors": {
      "ground": "#ad7868",
      "water": "#927868",
      "fog": "#cba890"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 1.0483200000000004,
      "baseHeightMultiplier": 1.00224,
      "ridgeScaleMultiplier": 1.5415519999999998,
      "ridgeHeightMultiplier": 0.57348,
      "octaves": 4,
      "lacunarity": 2.08,
      "gain": 0.48,
      "secondaryAmount": 0.0585,
      "warpStrength": 0.08399999999999999,
      "warpScaleMultiplier": 1.7,
      "gradientCap": 0.3,
      "gradientSampleMeters": 5,
      "heightOffset": 0
    },
    "hasTrees": false,
    "fogDensityMultiplier": 1.079568,
    "humidityBand": "xeric",
    "isMountainVariant": true,
    "baseBiomeId": "badlands",
    "treeDensityMultiplier": 0.7,
    "detailTextureId": 9
  }
});

export default definition;
