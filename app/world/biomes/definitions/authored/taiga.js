const definition = Object.freeze({
  "id": "taiga",
  "label": "Taiga",
  "category": "cold",
  "colors": {
    "ground": "#718292",
    "water": "#567e9b",
    "fog": "#9db5c5",
    "trunk": "#6d5844",
    "canopy": "#6aa296"
  },
  "terrainProfile": {
    "noiseAlgorithm": "fbm_ridged",
    "noiseScaleMultiplier": 1.08,
    "baseHeightMultiplier": 1.02,
    "ridgeScaleMultiplier": 1.2,
    "ridgeHeightMultiplier": 0.9,
    "octaves": 5,
    "lacunarity": 1.95,
    "gain": 0.49,
    "secondaryAmount": 0.05
  },
  "hasTrees": true,
  "fogDensityMultiplier": 1.12,
  "humidityBand": "mesic",
  "treeStyle": "conifer",
  "treeDensityMultiplier": 0.8,
  "detailTextureId": 3
});

export default definition;
