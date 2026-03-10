const definition = Object.freeze({
  "id": "badlands",
  "label": "Badlands",
  "category": "hot",
  "colors": {
    "ground": "#b7654c",
    "water": "#8f6d58",
    "fog": "#d0a282"
  },
  "terrainProfile": {
    "noiseAlgorithm": "ridged",
    "noiseScaleMultiplier": 1.12,
    "baseHeightMultiplier": 1.08,
    "ridgeScaleMultiplier": 1.42,
    "ridgeHeightMultiplier": 1.18,
    "octaves": 4,
    "lacunarity": 2.08,
    "gain": 0.48,
    "secondaryAmount": 0.08,
    "heightOffset": 12
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.02,
  "humidityBand": "xeric",
  "detailTextureId": 9
});

export default definition;
