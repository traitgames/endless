const definition = Object.freeze({
  "id": "meadow",
  "label": "Meadow",
  "category": "temperate",
  "colors": {
    "ground": "#bfd05a",
    "water": "#5fa7d4",
    "fog": "#d3ecd5",
    "trunk": "#6b5138",
    "canopy": "#8dba59"
  },
  "terrainProfile": {
    "noiseAlgorithm": "billow",
    "noiseScaleMultiplier": 1.18,
    "baseHeightMultiplier": 0.76,
    "ridgeScaleMultiplier": 0.9,
    "ridgeHeightMultiplier": 0.36,
    "octaves": 4,
    "lacunarity": 1.85,
    "gain": 0.55,
    "secondaryAmount": 0.1
  },
  "hasTrees": true,
  "fogDensityMultiplier": 0.92,
  "humidityBand": "mesic",
  "treeStyle": "broadleaf",
  "treeDensityMultiplier": 0.38,
  "detailTextureId": 4
});

export default definition;
