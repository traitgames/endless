const definition = Object.freeze({
  "id": "desert",
  "label": "Desert",
  "category": "hot",
  "colors": {
    "ground": "#efd48e",
    "water": "#64b3c7",
    "fog": "#f0d7ab"
  },
  "terrainProfile": {
    "noiseAlgorithm": "billow",
    "noiseScaleMultiplier": 0.86,
    "baseHeightMultiplier": 0.82,
    "ridgeScaleMultiplier": 1.26,
    "ridgeHeightMultiplier": 0.42,
    "octaves": 4,
    "lacunarity": 2.04,
    "gain": 0.47,
    "secondaryAmount": 0.16,
    "heightOffset": 5
  },
  "hasTrees": false,
  "fogDensityMultiplier": 0.86,
  "humidityBand": "xeric",
  "detailTextureId": 7
});

export default definition;
