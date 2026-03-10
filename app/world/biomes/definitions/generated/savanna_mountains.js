const definition = Object.freeze({
  "id": "savanna_mountains",
  "derive": {
    "type": "mountain",
    "from": "savanna"
  },
  "settings": {
    "colors": {
      "ground": "#ac9961",
      "water": "#689fb6",
      "fog": "#d8c696",
      "trunk": "#745743",
      "canopy": "#94a956"
    },
    "terrainProfile": {
      "noiseAlgorithm": "fbm_ridged",
      "noiseScaleMultiplier": 0.882,
      "baseHeightMultiplier": 1.044,
      "ridgeScaleMultiplier": 1.18,
      "ridgeHeightMultiplier": 0.675,
      "octaves": 5,
      "lacunarity": 1.9,
      "gain": 0.5,
      "secondaryAmount": 0.15000000000000002,
      "warpStrength": 0.12,
      "warpScaleMultiplier": 1.7,
      "heightOffset": 0
    },
    "hasTrees": true,
    "fogDensityMultiplier": 1.026,
    "humidityBand": "xeric",
    "isMountainVariant": true,
    "baseBiomeId": "savanna",
    "treeStyle": "savanna",
    "treeDensityMultiplier": 0.33599999999999997,
    "detailTextureId": 8
  }
});

export default definition;
