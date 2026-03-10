const definition = Object.freeze({
  "id": "salt_marsh",
  "label": "Salt Marsh",
  "category": "temperate",
  "colors": {
    "ground": "#6a7c66",
    "water": "#527f7f",
    "fog": "#b8c8bd",
    "trunk": "#5f4c3d",
    "canopy": "#6c9469"
  },
  "terrainProfile": {
    "noiseAlgorithm": "hybrid",
    "noiseScaleMultiplier": 1.1,
    "baseHeightMultiplier": 0.3,
    "ridgeScaleMultiplier": 0.68,
    "ridgeHeightMultiplier": 0.12,
    "octaves": 4,
    "lacunarity": 1.78,
    "gain": 0.56,
    "warpStrength": 0.16,
    "warpScaleMultiplier": 1.24,
    "secondaryAmount": 0.05,
    "heightOffset": -0.2
  },
  "hasTrees": true,
  "fogDensityMultiplier": 1.31,
  "humidityBand": "hydric",
  "waterlineMode": "wetland",
  "treeStyle": "wetland",
  "treeDensityMultiplier": 0.22,
  "detailTextureId": 6
});

export default definition;
