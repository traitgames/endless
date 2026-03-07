const definition = Object.freeze({
  "id": "saltflat",
  "label": "Saltflat",
  "category": "temperate",
  "colors": {
    "ground": "#d9cfb2",
    "water": "#8bb0bc",
    "fog": "#d8d3c4"
  },
  "terrainProfile": {
    "noiseAlgorithm": "billow",
    "noiseScaleMultiplier": 0.84,
    "baseHeightMultiplier": 0.58,
    "ridgeScaleMultiplier": 0.72,
    "ridgeHeightMultiplier": 0.18,
    "octaves": 3,
    "lacunarity": 1.9,
    "gain": 0.53,
    "secondaryAmount": 0.05,
    "gradientCap": 0.18,
    "gradientSampleMeters": 5
  },
  "hasTrees": false,
  "fogDensityMultiplier": 0.9,
  "humidityBand": "xeric",
  "detailTextureId": 7
});

export default definition;
