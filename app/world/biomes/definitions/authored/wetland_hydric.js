const definition = Object.freeze({
  "id": "wetland_hydric",
  "label": "Wetland (Hydric)",
  "category": "temperate",
  "colors": {
    "ground": "#3f7269",
    "water": "#337163",
    "fog": "#9ec0b5",
    "trunk": "#584434",
    "canopy": "#4a8752"
  },
  "terrainProfile": {
    "noiseAlgorithm": "hybrid",
    "noiseScaleMultiplier": 1.2,
    "baseHeightMultiplier": 0.44,
    "ridgeScaleMultiplier": 0.7,
    "ridgeHeightMultiplier": 0.15,
    "octaves": 4,
    "lacunarity": 1.7,
    "gain": 0.56,
    "warpStrength": 0.22,
    "warpScaleMultiplier": 1.42,
    "secondaryAmount": 0.07,
    "heightOffset": 0
  },
  "hasTrees": true,
  "fogDensityMultiplier": 1.42,
  "humidityBand": "hydric",
  "waterlineMode": "wetland",
  "wetlandRetentionGroup": "wetland",
  "treeStyle": "wetland",
  "treeDensityMultiplier": 0.84,
  "detailTextureId": 6
});

export default definition;
