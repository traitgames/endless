const definition = Object.freeze({
  "id": "marsh",
  "label": "Marsh",
  "category": "temperate",
  "colors": {
    "ground": "#496f5a",
    "water": "#3e756c",
    "fog": "#a8cab5",
    "trunk": "#614837",
    "canopy": "#5f8f58"
  },
  "terrainProfile": {
    "noiseAlgorithm": "hybrid",
    "noiseScaleMultiplier": 1.16,
    "baseHeightMultiplier": 0.5,
    "ridgeScaleMultiplier": 0.74,
    "ridgeHeightMultiplier": 0.18,
    "octaves": 4,
    "lacunarity": 1.76,
    "gain": 0.55,
    "warpStrength": 0.18,
    "warpScaleMultiplier": 1.34,
    "secondaryAmount": 0.06,
    "heightOffset": 0
  },
  "hasTrees": true,
  "fogDensityMultiplier": 1.36,
  "humidityBand": "hydric",
  "waterlineMode": "wetland",
  "wetlandRetentionGroup": "wetland",
  "treeStyle": "wetland",
  "treeDensityMultiplier": 0.62,
  "detailTextureId": 6
});

export default definition;
