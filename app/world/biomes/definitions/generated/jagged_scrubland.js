const definition = Object.freeze({
  "id": "jagged_scrubland",
  "derive": {
    "type": "subdivision",
    "from": "scrubland",
    "mode": "jagged"
  },
  "settings": {
    "colors": {
      "ground": "#958056",
      "water": "#7d8e7f",
      "fog": "#c7ad84",
      "trunk": "#6f5138",
      "canopy": "#8d8e46"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 0.8153846153846154,
      "baseHeightMultiplier": 0.7360000000000001,
      "ridgeScaleMultiplier": 0.8923076923076921,
      "ridgeHeightMultiplier": 0.576,
      "octaves": 4,
      "lacunarity": 1.98,
      "gain": 0.5,
      "secondaryAmount": 0.07,
      "warpScaleMultiplier": 1.3076923076923075,
      "heightOffset": 5
    },
    "hasTrees": true,
    "fogDensityMultiplier": 0.987,
    "humidityBand": "mesic",
    "treeStyle": "shrubland",
    "treeDensityMultiplier": 0.34,
    "detailTextureId": 8
  }
});

export default definition;
