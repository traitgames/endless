const definition = Object.freeze({
  "id": "tropical_lagoon",
  "label": "Tropical Lagoon",
  "category": "hot",
  "colors": {
    "ground": "#6da089",
    "water": "#42abc4",
    "fog": "#b0dce0"
  },
  "terrainProfile": {
    "noiseAlgorithm": "warped",
    "noiseScaleMultiplier": 1.14,
    "baseHeightMultiplier": 0.34,
    "ridgeScaleMultiplier": 0.66,
    "ridgeHeightMultiplier": 0.12,
    "octaves": 3,
    "lacunarity": 1.76,
    "gain": 0.57,
    "warpStrength": 0.3,
    "warpScaleMultiplier": 1.22,
    "secondaryAmount": 0.04,
    "heightOffset": -3.4
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.12,
  "humidityBand": "mesic",
  "detailTextureId": 8
});

export default definition;
