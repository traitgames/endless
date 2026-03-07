const definition = Object.freeze({
  "id": "tundra_mesic_mountains",
  "derive": {
    "type": "mountain",
    "from": "tundra_mesic"
  },
  "settings": {
    "colors": {
      "ground": "#a4a99d",
      "water": "#7896a7",
      "fog": "#c2c9c8"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 0.882,
      "baseHeightMultiplier": 0.9743999999999999,
      "ridgeScaleMultiplier": 1.18,
      "ridgeHeightMultiplier": 0.7560000000000001,
      "octaves": 5,
      "lacunarity": 1.88,
      "gain": 0.52,
      "secondaryAmount": 0.13,
      "warpStrength": 0.12,
      "warpScaleMultiplier": 1.7
    },
    "hasTrees": false,
    "fogDensityMultiplier": 1.1880000000000002,
    "humidityBand": "mesic",
    "isMountainVariant": true,
    "baseBiomeId": "tundra_mesic",
    "treeDensityMultiplier": 0.7,
    "detailTextureId": 2
  }
});

export default definition;
