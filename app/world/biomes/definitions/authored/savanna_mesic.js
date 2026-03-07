const definition = Object.freeze({
  "id": "savanna_mesic",
  "label": "Savanna (Mesic)",
  "category": "hot",
  "colors": {
    "ground": "#b7a35b",
    "water": "#67a1b9",
    "fog": "#dfcf97",
    "trunk": "#73523a",
    "canopy": "#92ac4b"
  },
  "terrainProfile": {
    "noiseAlgorithm": "fbm_ridged",
    "noiseScaleMultiplier": 1,
    "baseHeightMultiplier": 0.92,
    "ridgeScaleMultiplier": 1,
    "ridgeHeightMultiplier": 0.52,
    "octaves": 4,
    "lacunarity": 1.9,
    "gain": 0.5,
    "secondaryAmount": 0.1
  },
  "hasTrees": true,
  "fogDensityMultiplier": 0.96,
  "humidityBand": "mesic",
  "treeStyle": "savanna",
  "treeDensityMultiplier": 0.52,
  "detailTextureId": 8
});

export default definition;
