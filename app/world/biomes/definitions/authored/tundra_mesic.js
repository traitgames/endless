const definition = Object.freeze({
  "id": "tundra_mesic",
  "label": "Tundra (Mesic)",
  "category": "cold",
  "colors": {
    "ground": "#aeb19d",
    "water": "#7192a4",
    "fog": "#c7cecb"
  },
  "terrainProfile": {
    "noiseAlgorithm": "hybrid",
    "noiseScaleMultiplier": 0.98,
    "baseHeightMultiplier": 0.84,
    "ridgeScaleMultiplier": 1,
    "ridgeHeightMultiplier": 0.56,
    "octaves": 4,
    "lacunarity": 1.88,
    "gain": 0.52,
    "secondaryAmount": 0.08,
    "heightOffset": 5
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.1,
  "humidityBand": "mesic",
  "detailTextureId": 2
});

export default definition;
