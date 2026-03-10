const definition = Object.freeze({
  "id": "saltflat_mountains",
  "derive": {
    "type": "mountain",
    "from": "saltflat"
  },
  "settings": {
    "colors": {
      "ground": "#c3bfac",
      "water": "#8eb0bc",
      "fog": "#d0cdc2"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 0.756,
      "baseHeightMultiplier": 0.6728,
      "ridgeScaleMultiplier": 0.8495999999999999,
      "ridgeHeightMultiplier": 0.243,
      "octaves": 4,
      "lacunarity": 1.9,
      "gain": 0.53,
      "secondaryAmount": 0.1,
      "gradientCap": 0.18,
      "gradientSampleMeters": 5,
      "warpStrength": 0.12,
      "warpScaleMultiplier": 1.7,
      "heightOffset": 0
    },
    "hasTrees": false,
    "fogDensityMultiplier": 0.9720000000000001,
    "humidityBand": "xeric",
    "isMountainVariant": true,
    "baseBiomeId": "saltflat",
    "treeDensityMultiplier": 0.7,
    "detailTextureId": 7
  }
});

export default definition;
