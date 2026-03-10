const definition = Object.freeze({
  "id": "scrubland",
  "label": "Scrubland",
  "category": "hot",
  "colors": {
    "ground": "#9a8254",
    "water": "#7e8f7d",
    "fog": "#c7ab7e",
    "trunk": "#6f5138",
    "canopy": "#8d8e46"
  },
  "terrainProfile": {
    "noiseAlgorithm": "hybrid",
    "noiseScaleMultiplier": 1.06,
    "baseHeightMultiplier": 0.92,
    "ridgeScaleMultiplier": 1.16,
    "ridgeHeightMultiplier": 0.72,
    "octaves": 4,
    "lacunarity": 1.98,
    "gain": 0.5,
    "secondaryAmount": 0.07,
    "heightOffset": 5
  },
  "hasTrees": true,
  "fogDensityMultiplier": 0.94,
  "humidityBand": "mesic",
  "treeStyle": "shrubland",
  "treeDensityMultiplier": 0.34,
  "detailTextureId": 8
});

export default definition;
