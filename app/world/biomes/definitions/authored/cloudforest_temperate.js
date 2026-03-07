const definition = Object.freeze({
  "id": "cloudforest_temperate",
  "label": "Cloudforest (Temperate)",
  "category": "temperate",
  "colors": {
    "ground": "#5f7f6f",
    "water": "#4d7f88",
    "fog": "#9eb9b2",
    "trunk": "#604b3a",
    "canopy": "#4c8d62"
  },
  "terrainProfile": {
    "noiseAlgorithm": "ridged",
    "noiseScaleMultiplier": 0.9,
    "baseHeightMultiplier": 1.24,
    "ridgeScaleMultiplier": 1.42,
    "ridgeHeightMultiplier": 1.18,
    "octaves": 5,
    "lacunarity": 1.98,
    "gain": 0.49,
    "warpStrength": 0.13,
    "warpScaleMultiplier": 1.5,
    "secondaryAmount": 0.12
  },
  "hasTrees": true,
  "fogDensityMultiplier": 1.22,
  "humidityBand": "hydric",
  "isMountainVariant": true,
  "baseBiomeId": "rocky_mountains",
  "treeStyle": "cloudforest",
  "treeDensityMultiplier": 0.62,
  "detailTextureId": 11
});

export default definition;
