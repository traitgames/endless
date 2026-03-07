const definition = Object.freeze({
  "id": "thorn_forest",
  "label": "Thorn Forest",
  "category": "hot",
  "colors": {
    "ground": "#836744",
    "water": "#6f7c5e",
    "fog": "#be9a77",
    "trunk": "#64462f",
    "canopy": "#7e8d3d"
  },
  "terrainProfile": {
    "noiseAlgorithm": "ridged",
    "noiseScaleMultiplier": 1.08,
    "baseHeightMultiplier": 0.96,
    "ridgeScaleMultiplier": 1.3,
    "ridgeHeightMultiplier": 0.9,
    "octaves": 4,
    "lacunarity": 2.04,
    "gain": 0.49,
    "secondaryAmount": 0.08
  },
  "hasTrees": true,
  "fogDensityMultiplier": 1,
  "humidityBand": "hydric",
  "treeStyle": "thorn",
  "treeDensityMultiplier": 0.42,
  "detailTextureId": 9
});

export default definition;
