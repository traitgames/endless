const definition = Object.freeze({
  "id": "mire",
  "label": "Mire",
  "category": "cold",
  "colors": {
    "ground": "#5f6f63",
    "water": "#4f7075",
    "fog": "#a7b8b1"
  },
  "terrainProfile": {
    "noiseAlgorithm": "hybrid",
    "noiseScaleMultiplier": 1.08,
    "baseHeightMultiplier": 0.52,
    "ridgeScaleMultiplier": 0.76,
    "ridgeHeightMultiplier": 0.2,
    "octaves": 4,
    "lacunarity": 1.8,
    "gain": 0.54,
    "warpStrength": 0.14,
    "warpScaleMultiplier": 1.26,
    "secondaryAmount": 0.05,
    "heightOffset": 0
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.32,
  "humidityBand": "hydric",
  "waterlineMode": "wetland",
  "detailTextureId": 6
});

export default definition;
