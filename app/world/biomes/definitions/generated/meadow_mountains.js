const definition = Object.freeze({
  "id": "meadow_mountains",
  "derive": {
    "type": "mountain",
    "from": "meadow"
  },
  "settings": {
    "colors": {
      "ground": "#b0bf6d",
      "water": "#68a8d1",
      "fog": "#cce2d0",
      "trunk": "#6d5641",
      "canopy": "#8ab064"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 1.062,
      "baseHeightMultiplier": 0.8815999999999999,
      "ridgeScaleMultiplier": 1.062,
      "ridgeHeightMultiplier": 0.486,
      "octaves": 5,
      "lacunarity": 1.85,
      "gain": 0.55,
      "secondaryAmount": 0.15000000000000002,
      "warpStrength": 0.12,
      "warpScaleMultiplier": 1.7
    },
    "hasTrees": true,
    "fogDensityMultiplier": 0.9936000000000001,
    "humidityBand": "mesic",
    "isMountainVariant": true,
    "baseBiomeId": "meadow",
    "treeStyle": "broadleaf",
    "treeDensityMultiplier": 0.26599999999999996,
    "detailTextureId": 4
  }
});

export default definition;
