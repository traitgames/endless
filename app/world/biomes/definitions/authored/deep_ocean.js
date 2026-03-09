const definition = Object.freeze({
  "id": "deep_ocean",
  "label": "Deep Ocean",
  "category": "temperate",
  "colors": {
    "ground": "#223d4b",
    "water": "#2b6390",
    "fog": "#769bb8"
  },
  "terrainProfile": {
    "noiseAlgorithm": "warped",
    "noiseScaleMultiplier": 0.24,
    "baseHeightMultiplier": 1.28,
    "ridgeScaleMultiplier": 0.5,
    "ridgeHeightMultiplier": 0.03,
    "octaves": 2,
    "lacunarity": 1.68,
    "gain": 0.52,
    "warpStrength": 0.14,
    "warpScaleMultiplier": 1.2,
    "secondaryAmount": 0.01,
    "heightOffset": -86,
    "gradientCap": 0.28,
    "gradientSampleMeters": 8
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.04,
  "humidityBand": "mesic",
  "detailTextureId": 0
});

export default definition;
