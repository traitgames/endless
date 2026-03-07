const definition = Object.freeze({
  "id": "smooth_badlands_mountains",
  "derive": {
    "type": "subdivision",
    "from": "badlands_mountains",
    "mode": "smooth"
  },
  "settings": {
    "colors": {
      "ground": "#b18274",
      "water": "#988174",
      "fog": "#d0b19d"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 1.1289600000000004,
      "baseHeightMultiplier": 0.776736,
      "ridgeScaleMultiplier": 1.4075039999999996,
      "ridgeHeightMultiplier": 0.22302000000000002,
      "octaves": 3,
      "lacunarity": 2.08,
      "gain": 0.48,
      "secondaryAmount": 0.026000000000000002,
      "warpStrength": 0.054,
      "warpScaleMultiplier": 1.7,
      "gradientCap": 0.05,
      "gradientSampleMeters": 6
    },
    "hasTrees": false,
    "fogDensityMultiplier": 1.0134720000000002,
    "humidityBand": "xeric",
    "isMountainVariant": true,
    "baseBiomeId": "badlands",
    "treeDensityMultiplier": 0.7,
    "detailTextureId": 9
  }
});

export default definition;
