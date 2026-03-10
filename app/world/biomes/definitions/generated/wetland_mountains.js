const definition = Object.freeze({
  "id": "wetland_mountains",
  "derive": {
    "type": "mountain",
    "from": "wetland"
  },
  "settings": {
    "colors": {
      "ground": "#608580",
      "water": "#4c8075",
      "fog": "#a8c2b8",
      "trunk": "#5e4d40",
      "canopy": "#658d63"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 1.062,
      "baseHeightMultiplier": 0.5568,
      "ridgeScaleMultiplier": 0.8967999999999999,
      "ridgeHeightMultiplier": 0.243,
      "octaves": 5,
      "lacunarity": 1.74,
      "gain": 0.55,
      "warpStrength": 0.18,
      "warpScaleMultiplier": 1.35,
      "secondaryAmount": 0.1,
      "heightOffset": 0
    },
    "hasTrees": true,
    "fogDensityMultiplier": 1.4580000000000002,
    "humidityBand": "mesic",
    "waterlineMode": "wetland",
    "wetlandRetentionGroup": "wetland",
    "isMountainVariant": true,
    "baseBiomeId": "wetland",
    "treeStyle": "wetland",
    "treeDensityMultiplier": 0.504,
    "detailTextureId": 6
  }
});

export default definition;
