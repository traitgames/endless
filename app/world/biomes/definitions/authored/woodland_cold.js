const definition = Object.freeze({
  "id": "woodland_cold",
  "label": "Woodland (Cold)",
  "category": "cold",
  "colors": {
    "ground": "#7e8c82",
    "water": "#6f8da0",
    "fog": "#afbdbe",
    "trunk": "#6a5442",
    "canopy": "#7a9d88"
  },
  "terrainProfile": {
    "noiseAlgorithm": "hybrid",
    "noiseScaleMultiplier": 1.02,
    "baseHeightMultiplier": 0.88,
    "ridgeScaleMultiplier": 1.08,
    "ridgeHeightMultiplier": 0.62,
    "octaves": 4,
    "lacunarity": 1.9,
    "gain": 0.51,
    "secondaryAmount": 0.06
  },
  "hasTrees": true,
  "fogDensityMultiplier": 1.02,
  "humidityBand": "xeric",
  "treeStyle": "muskeg",
  "treeDensityMultiplier": 0.46,
  "detailTextureId": 3
});

export default definition;
