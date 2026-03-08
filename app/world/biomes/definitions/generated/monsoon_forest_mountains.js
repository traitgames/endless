const definition = Object.freeze({
  "id": "monsoon_forest_mountains",
  "derive": {
    "type": "mountain",
    "from": "monsoon_forest"
  },
  "settings": {
    "colors": {
      "ground": "#53775d",
      "water": "#4b8586",
      "fog": "#a5c294",
      "trunk": "#624a3b",
      "canopy": "#3f7f4f"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 1.0080000000000002,
      "baseHeightMultiplier": 1.1832,
      "ridgeScaleMultiplier": 1.2272,
      "ridgeHeightMultiplier": 0.7560000000000001,
      "octaves": 6,
      "lacunarity": 1.9,
      "gain": 0.5,
      "warpStrength": 0.16,
      "warpScaleMultiplier": 1.34,
      "secondaryAmount": 0.18,
      "heightOffset": 0
    },
    "hasTrees": true,
    "fogDensityMultiplier": 1.3392000000000002,
    "humidityBand": "hydric",
    "waterlineMode": "wetland",
    "isMountainVariant": true,
    "baseBiomeId": "monsoon_forest",
    "treeStyle": "monsoon",
    "treeDensityMultiplier": 0.8119999999999999,
    "detailTextureId": 10
  }
});

export default definition;
