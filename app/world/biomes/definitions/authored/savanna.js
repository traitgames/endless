const definition = Object.freeze({
  "id": "savanna",
  "label": "Savanna",
  "category": "hot",
  "colors": {
    "ground": "#b99b4a",
    "water": "#5f9db5",
    "fog": "#e2cb8f",
    "trunk": "#73523a",
    "canopy": "#9ab248"
  },
  "terrainProfile": {
    "noiseAlgorithm": "fbm_ridged",
    "noiseScaleMultiplier": 0.98,
    "baseHeightMultiplier": 0.9,
    "ridgeScaleMultiplier": 1,
    "ridgeHeightMultiplier": 0.5,
    "octaves": 4,
    "lacunarity": 1.9,
    "gain": 0.5,
    "secondaryAmount": 0.1,
    "heightOffset": 5
  },
  "hasTrees": true,
  "fogDensityMultiplier": 0.95,
  "humidityBand": "xeric",
  "treeStyle": "savanna",
  "treeDensityMultiplier": 0.48,
  "detailTextureId": 8
});

export default definition;
