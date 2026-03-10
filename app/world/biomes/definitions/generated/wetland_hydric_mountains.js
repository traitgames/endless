const definition = Object.freeze({
  "id": "wetland_hydric_mountains",
  "derive": {
    "type": "mountain",
    "from": "wetland_hydric"
  },
  "settings": {
    "colors": {
      "ground": "#547c78",
      "water": "#41796e",
      "fog": "#9fbdb5",
      "trunk": "#5c4b3d",
      "canopy": "#54875e"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 1.08,
      "baseHeightMultiplier": 0.5104,
      "ridgeScaleMultiplier": 0.826,
      "ridgeHeightMultiplier": 0.2025,
      "octaves": 5,
      "lacunarity": 1.7,
      "gain": 0.56,
      "warpStrength": 0.22,
      "warpScaleMultiplier": 1.42,
      "secondaryAmount": 0.12000000000000001,
      "heightOffset": 0
    },
    "hasTrees": true,
    "fogDensityMultiplier": 1.5336,
    "humidityBand": "hydric",
    "waterlineMode": "wetland",
    "wetlandRetentionGroup": "wetland",
    "isMountainVariant": true,
    "baseBiomeId": "wetland_hydric",
    "treeStyle": "wetland",
    "treeDensityMultiplier": 0.588,
    "detailTextureId": 6
  }
});

export default definition;
