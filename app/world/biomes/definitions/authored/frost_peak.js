const definition = Object.freeze({
  "id": "frost_peak",
  "label": "Frost Peak",
  "category": "cold",
  "colors": {
    "ground": "#9299a3",
    "water": "#66829b",
    "fog": "#d0d7df"
  },
  "terrainProfile": {
    "noiseAlgorithm": "ridged",
    "noiseScaleMultiplier": 0.78,
    "baseHeightMultiplier": 1.36,
    "ridgeScaleMultiplier": 1.58,
    "ridgeHeightMultiplier": 1.44,
    "octaves": 5,
    "lacunarity": 2.04,
    "gain": 0.47,
    "secondaryAmount": 0.1,
    "heightOffset": 1.2
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.22,
  "humidityBand": "mesic",
  "isMountainVariant": true,
  "baseBiomeId": "base_mountains",
  "detailTextureId": 2
});

export default definition;
