const definition = Object.freeze({
  "id": "rockydesert",
  "label": "Rocky Desert",
  "category": "hot",
  "colors": {
    "ground": "#9e7a58",
    "water": "#7a7f70",
    "fog": "#caa27d"
  },
  "terrainProfile": {
    "noiseAlgorithm": "ridged",
    "noiseScaleMultiplier": 0.92,
    "baseHeightMultiplier": 1.18,
    "ridgeScaleMultiplier": 1.42,
    "ridgeHeightMultiplier": 1.24,
    "octaves": 5,
    "lacunarity": 2.02,
    "gain": 0.48,
    "secondaryAmount": 0.1
  },
  "hasTrees": false,
  "fogDensityMultiplier": 0.96,
  "humidityBand": "xeric",
  "isMountainVariant": true,
  "baseBiomeId": "rocky_mountains",
  "detailTextureId": 7
});

export default definition;
