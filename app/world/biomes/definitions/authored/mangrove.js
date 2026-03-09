const definition = Object.freeze({
  "id": "mangrove",
  "label": "Mangrove",
  "category": "hot",
  "colors": {
    "ground": "#4d6f59",
    "water": "#3e8c80",
    "fog": "#a8cfbf",
    "trunk": "#5a4636",
    "canopy": "#5f8f62"
  },
  "terrainProfile": {
    "noiseAlgorithm": "hybrid",
    "noiseScaleMultiplier": 1.08,
    "baseHeightMultiplier": 0.42,
    "ridgeScaleMultiplier": 0.82,
    "ridgeHeightMultiplier": 0.2,
    "octaves": 4,
    "lacunarity": 1.78,
    "gain": 0.56,
    "warpStrength": 0.22,
    "warpScaleMultiplier": 1.28,
    "secondaryAmount": 0.08,
    "heightOffset": -0.9
  },
  "hasTrees": true,
  "fogDensityMultiplier": 1.3,
  "humidityBand": "hydric",
  "waterlineMode": "wetland",
  "treeStyle": "wetland",
  "treeDensityMultiplier": 0.28,
  "detailTextureId": 6
});

export default definition;
