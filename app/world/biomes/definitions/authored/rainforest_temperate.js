const definition = Object.freeze({
  "id": "rainforest_temperate",
  "label": "Rainforest (Temperate)",
  "category": "temperate",
  "colors": {
    "ground": "#355f3f",
    "water": "#377a7f",
    "fog": "#98c3a4",
    "trunk": "#5b4232",
    "canopy": "#2d7a3d"
  },
  "terrainProfile": {
    "noiseAlgorithm": "hybrid",
    "noiseScaleMultiplier": 1.14,
    "baseHeightMultiplier": 1.04,
    "ridgeScaleMultiplier": 1.06,
    "ridgeHeightMultiplier": 0.58,
    "octaves": 5,
    "lacunarity": 1.88,
    "gain": 0.51,
    "warpStrength": 0.14,
    "warpScaleMultiplier": 1.4,
    "secondaryAmount": 0.12,
    "heightOffset": 5
  },
  "hasTrees": true,
  "fogDensityMultiplier": 1.28,
  "humidityBand": "hydric",
  "treeStyle": "rainforest",
  "treeDensityMultiplier": 1.22,
  "detailTextureId": 10
});

export default definition;
