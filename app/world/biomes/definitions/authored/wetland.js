const definition = Object.freeze({
  "id": "wetland",
  "label": "Wetland",
  "category": "temperate",
  "colors": {
    "ground": "#4f7f74",
    "water": "#3f796b",
    "fog": "#a9c6b8",
    "trunk": "#5a4637",
    "canopy": "#5f8f58"
  },
  "terrainProfile": {
    "noiseAlgorithm": "hybrid",
    "noiseScaleMultiplier": 1.18,
    "baseHeightMultiplier": 0.48,
    "ridgeScaleMultiplier": 0.76,
    "ridgeHeightMultiplier": 0.18,
    "octaves": 4,
    "lacunarity": 1.74,
    "gain": 0.55,
    "warpStrength": 0.18,
    "warpScaleMultiplier": 1.35,
    "secondaryAmount": 0.05
  },
  "hasTrees": true,
  "fogDensityMultiplier": 1.35,
  "humidityBand": "mesic",
  "waterlineMode": "wetland",
  "wetlandRetentionGroup": "wetland",
  "treeStyle": "wetland",
  "treeDensityMultiplier": 0.72,
  "detailTextureId": 6
});

export default definition;
