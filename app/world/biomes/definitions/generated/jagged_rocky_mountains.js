const definition = Object.freeze({
  "id": "jagged_rocky_mountains",
  "derive": {
    "type": "subdivision",
    "from": "rocky_mountains",
    "mode": "jagged"
  },
  "settings": {
    "colors": {
      "ground": "#868c85",
      "water": "#5e7687",
      "fog": "#b2bac1"
    },
    "terrainProfile": {
      "noiseAlgorithm": "ridged",
      "noiseScaleMultiplier": 0.6923076923076923,
      "baseHeightMultiplier": 0.976,
      "ridgeScaleMultiplier": 1.1153846153846152,
      "ridgeHeightMultiplier": 1.04,
      "octaves": 5,
      "lacunarity": 2,
      "gain": 0.48,
      "secondaryAmount": 0.12,
      "warpScaleMultiplier": 1.3076923076923075
    },
    "hasTrees": false,
    "fogDensityMultiplier": 1.1550000000000002,
    "humidityBand": "mesic",
    "isMountainVariant": true,
    "baseBiomeId": "wetland",
    "detailTextureId": 11
  }
});

export default definition;
