const definition = Object.freeze({
  "id": "cold_ocean",
  "label": "Cold Ocean",
  "category": "cold",
  "colors": {
    "ground": "#3f5765",
    "water": "#4f7da8",
    "fog": "#9eb7cc"
  },
  "terrainProfile": {
    "noiseAlgorithm": "hybrid",
    "noiseScaleMultiplier": 0.3,
    "baseHeightMultiplier": 1.7,
    "ridgeScaleMultiplier": 0.72,
    "ridgeHeightMultiplier": 0.11,
    "octaves": 4,
    "lacunarity": 1.9,
    "gain": 0.52,
    "warpStrength": 0.12,
    "warpScaleMultiplier": 1.24,
    "secondaryAmount": 0.03,
    "heightOffset": -65
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.13,
  "humidityBand": "mesic",
  "detailTextureId": 1
});

export default definition;
