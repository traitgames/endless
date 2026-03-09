const definition = Object.freeze({
  "id": "tropical_ocean",
  "label": "Tropical Ocean",
  "category": "hot",
  "colors": {
    "ground": "#2b5f69",
    "water": "#2e91c2",
    "fog": "#8bbfd6"
  },
  "terrainProfile": {
    "noiseAlgorithm": "hybrid",
    "noiseScaleMultiplier": 0.36,
    "baseHeightMultiplier": 1.46,
    "ridgeScaleMultiplier": 0.57,
    "ridgeHeightMultiplier": 0.055,
    "octaves": 3,
    "lacunarity": 1.7,
    "gain": 0.5,
    "warpStrength": 0.12,
    "warpScaleMultiplier": 1.15,
    "secondaryAmount": 0.018,
    "heightOffset": -52,
    "gradientCap": 0.34,
    "gradientSampleMeters": 6
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.08,
  "humidityBand": "mesic",
  "detailTextureId": 0
});

export default definition;
