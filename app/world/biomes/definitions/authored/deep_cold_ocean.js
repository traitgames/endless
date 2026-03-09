const definition = Object.freeze({
  "id": "deep_cold_ocean",
  "label": "Deep Cold Ocean",
  "category": "cold",
  "colors": {
    "ground": "#253845",
    "water": "#355d86",
    "fog": "#7995ad"
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
  "fogDensityMultiplier": 1.06,
  "humidityBand": "mesic",
  "detailTextureId": 1
});

export default definition;
