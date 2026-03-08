const definition = Object.freeze({
  "id": "montane",
  "label": "Montane",
  "category": "temperate",
  "colors": {
    "ground": "#7a8d73",
    "water": "#5f7f8f",
    "fog": "#b8c7b7",
    "trunk": "#6a5541",
    "canopy": "#5b8660"
  },
  "terrainProfile": {
    "noiseAlgorithm": "ridged",
    "noiseScaleMultiplier": 0.92,
    "baseHeightMultiplier": 1.2,
    "ridgeScaleMultiplier": 1.4,
    "ridgeHeightMultiplier": 1.24,
    "octaves": 5,
    "lacunarity": 2,
    "gain": 0.48,
    "secondaryAmount": 0.11,
    "heightOffset": 0
  },
  "hasTrees": true,
  "fogDensityMultiplier": 1.1,
  "humidityBand": "mesic",
  "isMountainVariant": true,
  "baseBiomeId": "rocky_mountains",
  "treeStyle": "subalpine",
  "treeDensityMultiplier": 0.42,
  "detailTextureId": 11
});

export default definition;
