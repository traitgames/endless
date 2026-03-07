const definition = Object.freeze({
  "id": "woodland_temperate_mountains",
  "derive": {
    "type": "mountain",
    "from": "woodland_temperate"
  },
  "settings": {
    "colors": {
      "ground": "#8a996d",
      "water": "#7299b5",
      "fog": "#c3d0af",
      "trunk": "#6d5641",
      "canopy": "#8b9d62"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 0.918,
      "baseHeightMultiplier": 0.9975999999999999,
      "ridgeScaleMultiplier": 1.2272,
      "ridgeHeightMultiplier": 0.7020000000000001,
      "octaves": 5,
      "lacunarity": 1.9,
      "gain": 0.5,
      "secondaryAmount": 0.15000000000000002,
      "warpStrength": 0.12,
      "warpScaleMultiplier": 1.7
    },
    "hasTrees": true,
    "fogDensityMultiplier": 1.0368,
    "humidityBand": "xeric",
    "isMountainVariant": true,
    "baseBiomeId": "woodland_temperate",
    "treeStyle": "woodland",
    "treeDensityMultiplier": 0.40599999999999997,
    "detailTextureId": 5
  }
});

export default definition;
