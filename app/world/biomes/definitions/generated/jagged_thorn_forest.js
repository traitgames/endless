const definition = Object.freeze({
  "id": "jagged_thorn_forest",
  "derive": {
    "type": "subdivision",
    "from": "thorn_forest",
    "mode": "jagged"
  },
  "settings": {
    "colors": {
      "ground": "#806748",
      "water": "#6f7c62",
      "fog": "#be9d7d",
      "trunk": "#64462f",
      "canopy": "#7e8d3d"
    },
    "terrainProfile": {
      "noiseAlgorithm": "ridged",
      "noiseScaleMultiplier": 0.8307692307692307,
      "baseHeightMultiplier": 0.768,
      "ridgeScaleMultiplier": 1,
      "ridgeHeightMultiplier": 0.7200000000000001,
      "octaves": 4,
      "lacunarity": 2.04,
      "gain": 0.49,
      "secondaryAmount": 0.08,
      "warpScaleMultiplier": 1.3076923076923075,
      "heightOffset": 5
    },
    "hasTrees": true,
    "fogDensityMultiplier": 1.05,
    "humidityBand": "hydric",
    "treeStyle": "thorn",
    "treeDensityMultiplier": 0.42,
    "detailTextureId": 9
  }
});

export default definition;
