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
    "noiseScaleMultiplier": 0.2,
    "baseHeightMultiplier": 1.9,
    "ridgeScaleMultiplier": 0.56,
    "ridgeHeightMultiplier": 0.06,
    "octaves": 3,
    "lacunarity": 1.82,
    "gain": 0.56,
    "warpStrength": 0.24,
    "warpScaleMultiplier": 1.32,
    "secondaryAmount": 0.02,
    "heightOffset": -99
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.06,
  "humidityBand": "mesic",
  "detailTextureId": 1
});

export default definition;
