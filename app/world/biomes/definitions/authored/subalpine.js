const definition = Object.freeze({
  "id": "subalpine",
  "label": "Subalpine",
  "category": "cold",
  "colors": {
    "ground": "#718574",
    "water": "#5b798d",
    "fog": "#b5c4be",
    "trunk": "#665142",
    "canopy": "#5f8168"
  },
  "terrainProfile": {
    "noiseAlgorithm": "ridged",
    "noiseScaleMultiplier": 0.5,
    "baseHeightMultiplier": 1.098,
    "ridgeScaleMultiplier": 0.8,
    "ridgeHeightMultiplier": 1.08,
    "octaves": 5,
    "lacunarity": 1.98,
    "gain": 0.49,
    "secondaryAmount": 0.11
  },
  "hasTrees": true,
  "fogDensityMultiplier": 1.14,
  "humidityBand": "mesic",
  "isMountainVariant": true,
  "baseBiomeId": "rocky_mountains",
  "treeStyle": "subalpine",
  "treeDensityMultiplier": 0.48,
  "detailTextureId": 3
});

export default definition;
