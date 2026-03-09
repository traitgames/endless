const definition = Object.freeze({
  "id": "seagrass_meadow",
  "label": "Seagrass Meadow",
  "category": "hot",
  "colors": {
    "ground": "#5a8c6d",
    "water": "#3b97a4",
    "fog": "#9ecdc8"
  },
  "terrainProfile": {
    "noiseAlgorithm": "billow",
    "noiseScaleMultiplier": 1.24,
    "baseHeightMultiplier": 0.36,
    "ridgeScaleMultiplier": 0.72,
    "ridgeHeightMultiplier": 0.14,
    "octaves": 4,
    "lacunarity": 1.82,
    "gain": 0.54,
    "secondaryAmount": 0.05,
    "heightOffset": -2.1
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.2,
  "humidityBand": "hydric",
  "waterlineMode": "wetland",
  "detailTextureId": 4
});

export default definition;
