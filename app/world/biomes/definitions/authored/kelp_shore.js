const definition = Object.freeze({
  "id": "kelp_shore",
  "label": "Kelp Shore",
  "category": "temperate",
  "colors": {
    "ground": "#4a6f63",
    "water": "#3f7fa0",
    "fog": "#b0c7cf"
  },
  "terrainProfile": {
    "noiseAlgorithm": "hybrid",
    "noiseScaleMultiplier": 1.18,
    "baseHeightMultiplier": 0.34,
    "ridgeScaleMultiplier": 0.9,
    "ridgeHeightMultiplier": 0.25,
    "octaves": 4,
    "lacunarity": 1.86,
    "gain": 0.53,
    "warpStrength": 0.14,
    "warpScaleMultiplier": 1.3,
    "secondaryAmount": 0.06,
    "heightOffset": -1.5
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.18,
  "humidityBand": "mesic",
  "waterlineMode": "wetland",
  "detailTextureId": 11
});

export default definition;
