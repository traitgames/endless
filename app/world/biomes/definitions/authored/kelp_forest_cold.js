const definition = Object.freeze({
  "id": "kelp_forest_cold",
  "label": "Kelp Forest (Cold)",
  "category": "cold",
  "colors": {
    "ground": "#3f5e67",
    "water": "#426b94",
    "fog": "#9fb7c4"
  },
  "terrainProfile": {
    "noiseAlgorithm": "hybrid",
    "noiseScaleMultiplier": 0.26,
    "baseHeightMultiplier": 1.3,
    "ridgeScaleMultiplier": 0.56,
    "ridgeHeightMultiplier": 0.04,
    "octaves": 3,
    "lacunarity": 1.68,
    "gain": 0.5,
    "warpStrength": 0.1,
    "warpScaleMultiplier": 1.2,
    "secondaryAmount": 0.015,
    "heightOffset": -76,
    "gradientCap": 0.28,
    "gradientSampleMeters": 7
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.16,
  "humidityBand": "hydric",
  "detailTextureId": 3
});

export default definition;
