const definition = Object.freeze({
  "id": "coastal_tundra",
  "label": "Coastal Tundra",
  "category": "cold",
  "colors": {
    "ground": "#7f8e86",
    "water": "#6489a7",
    "fog": "#ccd7dd"
  },
  "terrainProfile": {
    "noiseAlgorithm": "billow",
    "noiseScaleMultiplier": 1.22,
    "baseHeightMultiplier": 0.3,
    "ridgeScaleMultiplier": 0.82,
    "ridgeHeightMultiplier": 0.16,
    "octaves": 4,
    "lacunarity": 1.82,
    "gain": 0.54,
    "secondaryAmount": 0.02,
    "heightOffset": -1.1
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.19,
  "humidityBand": "hydric",
  "waterlineMode": "wetland",
  "detailTextureId": 2
});

export default definition;
