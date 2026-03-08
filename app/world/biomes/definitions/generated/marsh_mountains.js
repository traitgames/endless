const definition = Object.freeze({
  "id": "marsh_mountains",
  "derive": {
    "type": "mountain",
    "from": "marsh"
  },
  "settings": {
    "colors": {
      "ground": "#5b7a6d",
      "water": "#4b7c75",
      "fog": "#a7c6b5",
      "trunk": "#644e40",
      "canopy": "#658d63"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 1.044,
      "baseHeightMultiplier": 0.58,
      "ridgeScaleMultiplier": 0.8732,
      "ridgeHeightMultiplier": 0.243,
      "octaves": 5,
      "lacunarity": 1.76,
      "gain": 0.55,
      "warpStrength": 0.18,
      "warpScaleMultiplier": 1.34,
      "secondaryAmount": 0.11,
      "heightOffset": 0
    },
    "hasTrees": true,
    "fogDensityMultiplier": 1.4688,
    "humidityBand": "hydric",
    "waterlineMode": "wetland",
    "wetlandRetentionGroup": "wetland",
    "isMountainVariant": true,
    "baseBiomeId": "marsh",
    "treeStyle": "wetland",
    "treeDensityMultiplier": 0.434,
    "detailTextureId": 6
  }
});

export default definition;
