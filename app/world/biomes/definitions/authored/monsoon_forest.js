const definition = Object.freeze({
  "id": "monsoon_forest",
  "label": "Monsoon Forest",
  "category": "hot",
  "colors": {
    "ground": "#3d6b44",
    "water": "#3e7f7f",
    "fog": "#a5c68d",
    "trunk": "#5f4332",
    "canopy": "#2f7d3f"
  },
  "terrainProfile": {
    "noiseAlgorithm": "hybrid",
    "noiseScaleMultiplier": 1.12,
    "baseHeightMultiplier": 1.02,
    "ridgeScaleMultiplier": 1.04,
    "ridgeHeightMultiplier": 0.56,
    "octaves": 5,
    "lacunarity": 1.9,
    "gain": 0.5,
    "warpStrength": 0.16,
    "warpScaleMultiplier": 1.34,
    "secondaryAmount": 0.13
  },
  "hasTrees": true,
  "fogDensityMultiplier": 1.24,
  "humidityBand": "hydric",
  "waterlineMode": "wetland",
  "treeStyle": "monsoon",
  "treeDensityMultiplier": 1.16,
  "detailTextureId": 10
});

export default definition;
