const definition = Object.freeze({
  "id": "barren_highlands",
  "label": "Barren Highlands",
  "category": "temperate",
  "colors": {
    "ground": "#84827a",
    "water": "#637b90",
    "fog": "#bcc2c3"
  },
  "terrainProfile": {
    "noiseAlgorithm": "ridged",
    "noiseScaleMultiplier": 0.82,
    "baseHeightMultiplier": 1.3,
    "ridgeScaleMultiplier": 1.55,
    "ridgeHeightMultiplier": 1.38,
    "octaves": 5,
    "lacunarity": 2.02,
    "gain": 0.47,
    "secondaryAmount": 0.12,
    "heightOffset": 1
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.08,
  "humidityBand": "xeric",
  "isMountainVariant": true,
  "baseBiomeId": "rocky_mountains",
  "detailTextureId": 11
});

export default definition;
