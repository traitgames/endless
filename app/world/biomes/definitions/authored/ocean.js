const definition = Object.freeze({
  "id": "ocean",
  "label": "Ocean",
  "category": "temperate",
  "colors": {
    "ground": "#355b68",
    "water": "#397fb3",
    "fog": "#95b7cc"
  },
  "terrainProfile": {
    "noiseAlgorithm": "hybrid",
    "noiseScaleMultiplier": 0.34,
    "baseHeightMultiplier": 1.42,
    "ridgeScaleMultiplier": 0.56,
    "ridgeHeightMultiplier": 0.05,
    "octaves": 5,
    "lacunarity": 1.72,
    "gain": 0.5,
    "warpStrength": 0.11,
    "warpScaleMultiplier": 1.16,
    "secondaryAmount": 0.015,
    "heightOffset": -54,
    "gradientCap": 0.34,
    "gradientSampleMeters": 6
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.1,
  "humidityBand": "mesic",
  "detailTextureId": 0
});

export default definition;
