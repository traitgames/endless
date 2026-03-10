const definition = Object.freeze({
  "id": "jagged_montane",
  "derive": {
    "type": "subdivision",
    "from": "montane",
    "mode": "jagged"
  },
  "settings": {
    "colors": {
      "ground": "#788a73",
      "water": "#607f8f",
      "fog": "#b9c8b9",
      "trunk": "#6a5541",
      "canopy": "#5b8660"
    },
    "terrainProfile": {
      "noiseAlgorithm": "ridged",
      "noiseScaleMultiplier": 0.7076923076923076,
      "baseHeightMultiplier": 0.96,
      "ridgeScaleMultiplier": 1.0769230769230766,
      "ridgeHeightMultiplier": 0.992,
      "octaves": 5,
      "lacunarity": 2,
      "gain": 0.48,
      "secondaryAmount": 0.11,
      "warpScaleMultiplier": 1.3076923076923075,
      "heightOffset": 0
    },
    "hasTrees": true,
    "fogDensityMultiplier": 1.1550000000000002,
    "humidityBand": "mesic",
    "isMountainVariant": true,
    "baseBiomeId": "base_mountains",
    "treeStyle": "subalpine",
    "treeDensityMultiplier": 0.42,
    "detailTextureId": 11
  }
});

export default definition;
