const definition = Object.freeze({
  "id": "forest",
  "label": "Forest",
  "category": "temperate",
  "colors": {
    "ground": "#5b7e4d",
    "water": "#4d88b7",
    "fog": "#b9d2b1",
    "trunk": "#664c34",
    "canopy": "#3f8144"
  },
  "terrainProfile": {
    "noiseAlgorithm": "hybrid",
    "noiseScaleMultiplier": 1.04,
    "baseHeightMultiplier": 0.98,
    "ridgeScaleMultiplier": 1.08,
    "ridgeHeightMultiplier": 0.72,
    "octaves": 5,
    "lacunarity": 1.92,
    "gain": 0.5,
    "secondaryAmount": 0.12,
    "heightOffset": 5
  },
  "hasTrees": true,
  "fogDensityMultiplier": 1.05,
  "humidityBand": "mesic",
  "treeStyle": "broadleaf",
  "treeDensityMultiplier": 1.1,
  "detailTextureId": 5
});

export default definition;
