const definition = Object.freeze({
  "id": "kelp_shore_cold",
  "label": "Kelp Shore (Cold)",
  "category": "cold",
  "colors": {
    "ground": "#4c6165",
    "water": "#4e7697",
    "fog": "#adc0cc"
  },
  "terrainProfile": {
    "noiseAlgorithm": "hybrid",
    "noiseScaleMultiplier": 1.12,
    "baseHeightMultiplier": 0.32,
    "ridgeScaleMultiplier": 0.94,
    "ridgeHeightMultiplier": 0.24,
    "octaves": 4,
    "lacunarity": 1.9,
    "gain": 0.52,
    "warpStrength": 0.1,
    "warpScaleMultiplier": 1.34,
    "secondaryAmount": 0.04,
    "heightOffset": -2.2
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.22,
  "humidityBand": "mesic",
  "waterlineMode": "wetland",
  "detailTextureId": 11
});

export default definition;
