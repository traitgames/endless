const definition = Object.freeze({
  "id": "scrubland_mountains",
  "derive": {
    "type": "mountain",
    "from": "scrubland"
  },
  "settings": {
    "colors": {
      "ground": "#968769",
      "water": "#839384",
      "fog": "#c2ac87",
      "trunk": "#705641",
      "canopy": "#8a8d55"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 0.9540000000000001,
      "baseHeightMultiplier": 1.0672,
      "ridgeScaleMultiplier": 1.3687999999999998,
      "ridgeHeightMultiplier": 0.972,
      "octaves": 5,
      "lacunarity": 1.98,
      "gain": 0.5,
      "secondaryAmount": 0.12000000000000001,
      "warpStrength": 0.12,
      "warpScaleMultiplier": 1.7
    },
    "hasTrees": true,
    "fogDensityMultiplier": 1.0152,
    "humidityBand": "mesic",
    "isMountainVariant": true,
    "baseBiomeId": "scrubland",
    "treeStyle": "shrubland",
    "treeDensityMultiplier": 0.238,
    "detailTextureId": 8
  }
});

export default definition;
