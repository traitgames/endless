const definition = Object.freeze({
  "id": "jagged_badlands_mountains",
  "derive": {
    "type": "subdivision",
    "from": "badlands_mountains",
    "mode": "jagged"
  },
  "settings": {
    "colors": {
      "ground": "#a47164",
      "water": "#8f7667",
      "fog": "#c9a790"
    },
    "terrainProfile": {
      "noiseAlgorithm": "ridged",
      "noiseScaleMultiplier": 0.7753846153846154,
      "baseHeightMultiplier": 1.00224,
      "ridgeScaleMultiplier": 1.2889230769230766,
      "ridgeHeightMultiplier": 1.2744,
      "octaves": 5,
      "lacunarity": 2.08,
      "gain": 0.48,
      "secondaryAmount": 0.13,
      "warpStrength": 0.12,
      "warpScaleMultiplier": 1.3076923076923075
    },
    "hasTrees": false,
    "fogDensityMultiplier": 1.1566800000000002,
    "humidityBand": "xeric",
    "isMountainVariant": true,
    "baseBiomeId": "badlands",
    "treeDensityMultiplier": 0.7,
    "detailTextureId": 9
  }
});

export default definition;
