const definition = Object.freeze({
  "id": "mudflat",
  "label": "Mudflat",
  "category": "temperate",
  "colors": {
    "ground": "#6f7366",
    "water": "#5c7f88",
    "fog": "#c4c4b9"
  },
  "terrainProfile": {
    "noiseAlgorithm": "billow",
    "noiseScaleMultiplier": 1.06,
    "baseHeightMultiplier": 0.26,
    "ridgeScaleMultiplier": 0.54,
    "ridgeHeightMultiplier": 0.09,
    "octaves": 3,
    "lacunarity": 1.72,
    "gain": 0.58,
    "secondaryAmount": 0.03,
    "heightOffset": -0.6
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.27,
  "humidityBand": "hydric",
  "waterlineMode": "wetland",
  "detailTextureId": 6
});

export default definition;
