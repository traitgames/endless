const definition = Object.freeze({
  "id": "coral_reef",
  "label": "Coral Reef",
  "category": "hot",
  "colors": {
    "ground": "#4f7a7f",
    "water": "#3ea4c9",
    "fog": "#a6d7df"
  },
  "terrainProfile": {
    "noiseAlgorithm": "hybrid",
    "noiseScaleMultiplier": 0.32,
    "baseHeightMultiplier": 1.38,
    "ridgeScaleMultiplier": 0.64,
    "ridgeHeightMultiplier": 0.05,
    "octaves": 3,
    "lacunarity": 1.72,
    "gain": 0.5,
    "warpStrength": 0.1,
    "warpScaleMultiplier": 1.12,
    "secondaryAmount": 0.02,
    "heightOffset": -60,
    "gradientCap": 0.32,
    "gradientSampleMeters": 6
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.1,
  "humidityBand": "hydric",
  "detailTextureId": 8
});

export default definition;
