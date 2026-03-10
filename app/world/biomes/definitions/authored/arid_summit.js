const definition = Object.freeze({
  "id": "arid_summit",
  "label": "Arid Summit",
  "category": "hot",
  "colors": {
    "ground": "#8f7f6f",
    "water": "#6b7f91",
    "fog": "#cbb89d"
  },
  "terrainProfile": {
    "noiseAlgorithm": "ridged",
    "noiseScaleMultiplier": 0.8,
    "baseHeightMultiplier": 1.28,
    "ridgeScaleMultiplier": 1.52,
    "ridgeHeightMultiplier": 1.42,
    "octaves": 5,
    "lacunarity": 2.02,
    "gain": 0.47,
    "secondaryAmount": 0.1,
    "heightOffset": 1.2
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.02,
  "humidityBand": "xeric",
  "isMountainVariant": true,
  "baseBiomeId": "rocky_mountains",
  "detailTextureId": 11
});

export default definition;
