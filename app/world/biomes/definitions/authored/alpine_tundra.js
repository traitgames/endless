const definition = Object.freeze({
  "id": "alpine_tundra",
  "label": "Alpine Tundra",
  "category": "cold",
  "colors": {
    "ground": "#a5a69a",
    "water": "#758b98",
    "fog": "#ccd2d0"
  },
  "terrainProfile": {
    "noiseAlgorithm": "ridged",
    "noiseScaleMultiplier": 0.92,
    "baseHeightMultiplier": 1.2,
    "ridgeScaleMultiplier": 1.36,
    "ridgeHeightMultiplier": 1.22,
    "octaves": 5,
    "lacunarity": 2,
    "gain": 0.48,
    "secondaryAmount": 0.09,
    "heightOffset": 0
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.08,
  "humidityBand": "xeric",
  "isMountainVariant": true,
  "baseBiomeId": "base_mountains",
  "detailTextureId": 2
});

export default definition;
