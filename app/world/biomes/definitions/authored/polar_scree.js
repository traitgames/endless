const definition = Object.freeze({
  "id": "polar_scree",
  "label": "Polar Scree",
  "category": "cold",
  "colors": {
    "ground": "#7b8088",
    "water": "#5f7891",
    "fog": "#c3ccd5"
  },
  "terrainProfile": {
    "noiseAlgorithm": "ridged",
    "noiseScaleMultiplier": 0.8,
    "baseHeightMultiplier": 1.34,
    "ridgeScaleMultiplier": 1.6,
    "ridgeHeightMultiplier": 1.4,
    "octaves": 5,
    "lacunarity": 2.04,
    "gain": 0.47,
    "secondaryAmount": 0.12,
    "heightOffset": 1.2
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.16,
  "humidityBand": "xeric",
  "isMountainVariant": true,
  "baseBiomeId": "rocky_mountains",
  "detailTextureId": 2
});

export default definition;
