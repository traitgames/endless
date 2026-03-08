const definition = Object.freeze({
  "id": "rocky_mountains",
  "label": "Rocky Mountains",
  "category": "temperate",
  "colors": {
    "ground": "#8a8f87",
    "water": "#5d7586",
    "fog": "#b1b9bf"
  },
  "terrainProfile": {
    "noiseAlgorithm": "ridged",
    "noiseScaleMultiplier": 0.9,
    "baseHeightMultiplier": 1.22,
    "ridgeScaleMultiplier": 1.45,
    "ridgeHeightMultiplier": 1.3,
    "octaves": 5,
    "lacunarity": 2,
    "gain": 0.48,
    "secondaryAmount": 0.12,
    "heightOffset": 0
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.1,
  "humidityBand": "mesic",
  "isMountainVariant": true,
  "baseBiomeId": "wetland",
  "detailTextureId": 11
});

export default definition;
