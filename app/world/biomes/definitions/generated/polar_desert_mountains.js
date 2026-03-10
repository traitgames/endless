const definition = Object.freeze({
  "id": "polar_desert_mountains",
  "derive": {
    "type": "mountain",
    "from": "polar_desert"
  },
  "settings": {
    "colors": {
      "ground": "#c2c9c8",
      "water": "#9fb8c6",
      "fog": "#cfdae0"
    },
    "terrainProfile": {
      "noiseAlgorithm": "ridged",
      "noiseScaleMultiplier": 0.81,
      "baseHeightMultiplier": 0.9975999999999999,
      "ridgeScaleMultiplier": 1.3923999999999999,
      "ridgeHeightMultiplier": 1.161,
      "octaves": 5,
      "lacunarity": 2,
      "gain": 0.5,
      "secondaryAmount": 0.1,
      "warpStrength": 0.12,
      "warpScaleMultiplier": 1.7,
      "heightOffset": 0
    },
    "hasTrees": false,
    "fogDensityMultiplier": 1.08,
    "humidityBand": "xeric",
    "isMountainVariant": true,
    "baseBiomeId": "polar_desert",
    "treeDensityMultiplier": 0.7,
    "detailTextureId": 2
  }
});

export default definition;
