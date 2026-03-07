const definition = Object.freeze({
  "id": "tundra_mountains",
  "derive": {
    "type": "mountain",
    "from": "tundra"
  },
  "settings": {
    "colors": {
      "ground": "#abada2",
      "water": "#7593a4",
      "fog": "#c2c7cc"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 0.855,
      "baseHeightMultiplier": 1.0208,
      "ridgeScaleMultiplier": 1.2389999999999999,
      "ridgeHeightMultiplier": 0.8370000000000001,
      "octaves": 5,
      "lacunarity": 1.9,
      "gain": 0.52,
      "secondaryAmount": 0.13,
      "warpStrength": 0.12,
      "warpScaleMultiplier": 1.7
    },
    "hasTrees": false,
    "fogDensityMultiplier": 1.1664,
    "humidityBand": "xeric",
    "isMountainVariant": true,
    "baseBiomeId": "tundra",
    "treeDensityMultiplier": 0.7,
    "detailTextureId": 2
  }
});

export default definition;
