const definition = Object.freeze({
  "id": "smooth_rocky_mountains",
  "derive": {
    "type": "subdivision",
    "from": "rocky_mountains",
    "mode": "smooth"
  },
  "settings": {
    "colors": {
      "ground": "#959a93",
      "water": "#6a8192",
      "fog": "#bcc3c9"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 1.0080000000000002,
      "baseHeightMultiplier": 0.7564,
      "ridgeScaleMultiplier": 1.218,
      "ridgeHeightMultiplier": 0.18200000000000002,
      "octaves": 3,
      "lacunarity": 2,
      "gain": 0.48,
      "secondaryAmount": 0.024,
      "warpStrength": 0,
      "warpScaleMultiplier": 1.55,
      "gradientCap": 0.05,
      "gradientSampleMeters": 6,
      "heightOffset": 0
    },
    "hasTrees": false,
    "fogDensityMultiplier": 1.0120000000000002,
    "humidityBand": "mesic",
    "isMountainVariant": true,
    "baseBiomeId": "wetland",
    "detailTextureId": 11
  }
});

export default definition;
