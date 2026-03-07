const definition = Object.freeze({
  "id": "shrubland",
  "label": "Shrubland",
  "category": "hot",
  "colors": {
    "ground": "#c2a96f",
    "water": "#7fa5a6",
    "fog": "#d6bf8f",
    "trunk": "#6e5035",
    "canopy": "#919e4a"
  },
  "terrainProfile": {
    "noiseAlgorithm": "billow",
    "noiseScaleMultiplier": 0.9,
    "baseHeightMultiplier": 0.78,
    "ridgeScaleMultiplier": 1.12,
    "ridgeHeightMultiplier": 0.34,
    "octaves": 4,
    "lacunarity": 1.96,
    "gain": 0.5,
    "secondaryAmount": 0.12
  },
  "hasTrees": true,
  "fogDensityMultiplier": 0.9,
  "humidityBand": "mesic",
  "treeStyle": "shrubland",
  "treeDensityMultiplier": 0.28,
  "detailTextureId": 8
});

export default definition;
