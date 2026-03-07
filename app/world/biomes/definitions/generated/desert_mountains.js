const definition = Object.freeze({
  "id": "desert_mountains",
  "derive": {
    "type": "mountain",
    "from": "desert"
  },
  "settings": {
    "colors": {
      "ground": "#d3c292",
      "water": "#6cb3c6",
      "fog": "#e4d1ad"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 0.774,
      "baseHeightMultiplier": 0.9511999999999998,
      "ridgeScaleMultiplier": 1.4868,
      "ridgeHeightMultiplier": 0.5670000000000001,
      "octaves": 5,
      "lacunarity": 2.04,
      "gain": 0.47,
      "secondaryAmount": 0.21000000000000002,
      "warpStrength": 0.12,
      "warpScaleMultiplier": 1.7
    },
    "hasTrees": false,
    "fogDensityMultiplier": 0.9288000000000001,
    "humidityBand": "xeric",
    "isMountainVariant": true,
    "baseBiomeId": "desert",
    "treeDensityMultiplier": 0.7,
    "detailTextureId": 7
  }
});

export default definition;
