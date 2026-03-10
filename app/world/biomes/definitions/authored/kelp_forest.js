const definition = Object.freeze({
  "id": "kelp_forest",
  "label": "Kelp Forest",
  "category": "temperate",
  "colors": {
    "ground": "#3f645e",
    "water": "#346f9f",
    "fog": "#92b6c1"
  },
  "terrainProfile": {
    "noiseAlgorithm": "hybrid",
    "noiseScaleMultiplier": 0.8,
    "baseHeightMultiplier": 0.9,
    "ridgeScaleMultiplier": 0.58,
    "ridgeHeightMultiplier": 0.045,
    "octaves": 4,
    "lacunarity": 0.7,
    "gain": 0.5,
    "warpStrength": 0.12,
    "warpScaleMultiplier": 1.17,
    "secondaryAmount": 0.018,
    "heightOffset": -22,
    "gradientCap": 0.3,
    "gradientSampleMeters": 7
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.14,
  "humidityBand": "hydric",
  "detailTextureId": 3
});

export default definition;
