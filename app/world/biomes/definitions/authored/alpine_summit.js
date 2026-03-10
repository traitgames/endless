const definition = Object.freeze({
  "id": "alpine_summit",
  "label": "Alpine Summit",
  "category": "temperate",
  "colors": {
    "ground": "#8a9188",
    "water": "#66829a",
    "fog": "#c2cad0"
  },
  "terrainProfile": {
    "noiseAlgorithm": "ridged",
    "noiseScaleMultiplier": 0.84,
    "baseHeightMultiplier": 1.32,
    "ridgeScaleMultiplier": 1.5,
    "ridgeHeightMultiplier": 1.32,
    "octaves": 5,
    "lacunarity": 2,
    "gain": 0.47,
    "secondaryAmount": 0.12,
    "heightOffset": 1
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.14,
  "humidityBand": "mesic",
  "isMountainVariant": true,
  "baseBiomeId": "base_mountains",
  "detailTextureId": 11
});

export default definition;
