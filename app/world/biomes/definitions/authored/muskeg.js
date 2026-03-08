const definition = Object.freeze({
  "id": "muskeg",
  "label": "Muskeg",
  "category": "cold",
  "colors": {
    "ground": "#4f6356",
    "water": "#4a6f73",
    "fog": "#9cb4aa",
    "trunk": "#5b4a38",
    "canopy": "#5d7f63"
  },
  "terrainProfile": {
    "noiseAlgorithm": "hybrid",
    "noiseScaleMultiplier": 1.1,
    "baseHeightMultiplier": 0.56,
    "ridgeScaleMultiplier": 0.82,
    "ridgeHeightMultiplier": 0.26,
    "octaves": 4,
    "lacunarity": 1.82,
    "gain": 0.54,
    "warpStrength": 0.16,
    "warpScaleMultiplier": 1.3,
    "secondaryAmount": 0.05,
    "heightOffset": 0
  },
  "hasTrees": true,
  "fogDensityMultiplier": 1.3,
  "humidityBand": "hydric",
  "waterlineMode": "wetland",
  "treeStyle": "muskeg",
  "treeDensityMultiplier": 0.54,
  "detailTextureId": 6
});

export default definition;
