const definition = Object.freeze({
  "id": "rainforest_hot",
  "label": "Rainforest (Hot)",
  "category": "hot",
  "colors": {
    "ground": "#2f5b33",
    "water": "#2f7878",
    "fog": "#9bc08d",
    "trunk": "#5c4230",
    "canopy": "#24703a"
  },
  "terrainProfile": {
    "noiseAlgorithm": "hybrid",
    "noiseScaleMultiplier": 1.08,
    "baseHeightMultiplier": 0.96,
    "ridgeScaleMultiplier": 1.1,
    "ridgeHeightMultiplier": 0.46,
    "octaves": 5,
    "lacunarity": 1.9,
    "gain": 0.5,
    "warpStrength": 0.14,
    "warpScaleMultiplier": 1.32,
    "secondaryAmount": 0.14,
    "heightOffset": 5
  },
  "hasTrees": true,
  "fogDensityMultiplier": 1.24,
  "humidityBand": "hydric",
  "waterlineMode": "wetland",
  "treeStyle": "rainforest",
  "treeDensityMultiplier": 1.28,
  "detailTextureId": 10
});

export default definition;
