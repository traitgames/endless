const definition = Object.freeze({
  "id": "rocky_shore",
  "label": "Rocky Shore",
  "category": "cold",
  "colors": {
    "ground": "#6f7a82",
    "water": "#557493",
    "fog": "#c0cad4"
  },
  "terrainProfile": {
    "noiseAlgorithm": "ridged",
    "noiseScaleMultiplier": 0.96,
    "baseHeightMultiplier": 0.36,
    "ridgeScaleMultiplier": 1.15,
    "ridgeHeightMultiplier": 0.36,
    "octaves": 4,
    "lacunarity": 1.96,
    "gain": 0.5,
    "secondaryAmount": 0.05,
    "heightOffset": -0.8
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.16,
  "humidityBand": "xeric",
  "detailTextureId": 11
});

export default definition;
