const definition = Object.freeze({
  "id": "icefield",
  "label": "Icefield",
  "category": "cold",
  "colors": {
    "ground": "#e8f5ff",
    "water": "#9fd3ef",
    "fog": "#e3f1ff"
  },
  "terrainProfile": {
    "noiseAlgorithm": "ridged",
    "noiseScaleMultiplier": 0.8,
    "baseHeightMultiplier": 1.26,
    "ridgeScaleMultiplier": 1.44,
    "ridgeHeightMultiplier": 1.62,
    "octaves": 5,
    "lacunarity": 2.02,
    "gain": 0.48,
    "secondaryAmount": 0.07,
    "heightOffset": 0
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.26,
  "humidityBand": "hydric",
  "detailTextureId": 1
});

export default definition;
