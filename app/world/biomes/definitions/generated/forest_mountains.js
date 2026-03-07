const definition = Object.freeze({
  "id": "forest_mountains",
  "derive": {
    "type": "mountain",
    "from": "forest"
  },
  "settings": {
    "colors": {
      "ground": "#688464",
      "water": "#588db7",
      "fog": "#b6ccb2",
      "trunk": "#68523d",
      "canopy": "#4b8253"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 0.936,
      "baseHeightMultiplier": 1.1367999999999998,
      "ridgeScaleMultiplier": 1.2744,
      "ridgeHeightMultiplier": 0.972,
      "octaves": 6,
      "lacunarity": 1.92,
      "gain": 0.5,
      "secondaryAmount": 0.16999999999999998,
      "warpStrength": 0.12,
      "warpScaleMultiplier": 1.7
    },
    "hasTrees": true,
    "fogDensityMultiplier": 1.1340000000000001,
    "humidityBand": "mesic",
    "isMountainVariant": true,
    "baseBiomeId": "forest",
    "treeStyle": "broadleaf",
    "treeDensityMultiplier": 0.77,
    "detailTextureId": 5
  }
});

export default definition;
