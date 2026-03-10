const definition = Object.freeze({
  "id": "paramo",
  "label": "Paramo",
  "category": "hot",
  "colors": {
    "ground": "#7f9878",
    "water": "#64889a",
    "fog": "#b8cec0"
  },
  "terrainProfile": {
    "noiseAlgorithm": "hybrid",
    "noiseScaleMultiplier": 0.86,
    "baseHeightMultiplier": 1.25,
    "ridgeScaleMultiplier": 1.38,
    "ridgeHeightMultiplier": 1.18,
    "octaves": 5,
    "lacunarity": 1.98,
    "gain": 0.48,
    "warpStrength": 0.14,
    "warpScaleMultiplier": 1.52,
    "secondaryAmount": 0.11,
    "heightOffset": 0.9
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.24,
  "humidityBand": "hydric",
  "isMountainVariant": true,
  "baseBiomeId": "rocky_mountains",
  "detailTextureId": 4
});

export default definition;
