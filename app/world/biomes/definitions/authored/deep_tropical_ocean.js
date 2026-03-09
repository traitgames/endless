const definition = Object.freeze({
  "id": "deep_tropical_ocean",
  "label": "Deep Tropical Ocean",
  "category": "hot",
  "colors": {
    "ground": "#1a3f4d",
    "water": "#1f6e9d",
    "fog": "#6ea5c2"
  },
  "terrainProfile": {
    "noiseAlgorithm": "warped",
    "noiseScaleMultiplier": 0.24,
    "baseHeightMultiplier": 2.3,
    "ridgeScaleMultiplier": 0.5,
    "ridgeHeightMultiplier": 0.03,
    "octaves": 4,
    "lacunarity": 1.66,
    "gain": 0.52,
    "warpStrength": 0.4,
    "warpScaleMultiplier": 1.2,
    "secondaryAmount": 0.01,
    "heightOffset": -84,
    "gradientCap": 0.28,
    "gradientSampleMeters": 8
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.02,
  "humidityBand": "mesic",
  "detailTextureId": 0
});

export default definition;
