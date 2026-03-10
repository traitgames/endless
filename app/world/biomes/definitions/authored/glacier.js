const definition = Object.freeze({
  "id": "glacier",
  "label": "Glacier",
  "category": "cold",
  "colors": {
    "ground": "#ecf6ff",
    "water": "#8fc5eb",
    "fog": "#dceefe"
  },
  "terrainProfile": {
    "noiseAlgorithm": "ridged",
    "noiseScaleMultiplier": 0.82,
    "baseHeightMultiplier": 1.18,
    "ridgeScaleMultiplier": 1.35,
    "ridgeHeightMultiplier": 1.55,
    "octaves": 4,
    "lacunarity": 2,
    "gain": 0.5,
    "secondaryAmount": 0.06,
    "heightOffset": -8
  },
  "hasTrees": false,
  "fogDensityMultiplier": 1.2,
  "humidityBand": "mesic",
  "detailTextureId": 1
});

export default definition;
