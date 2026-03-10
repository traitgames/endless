const definition = Object.freeze({
  "id": "jagged_alpine_mire",
  "derive": {
    "type": "subdivision",
    "from": "alpine_mire",
    "mode": "jagged"
  },
  "settings": {
    "colors": {
      "ground": "#5d6d68",
      "water": "#4f6e75",
      "fog": "#a1b2b0",
      "trunk": "#5a4739",
      "canopy": "#58705f"
    },
    "terrainProfile": {
      "noiseAlgorithm": "ridged",
      "noiseScaleMultiplier": 0.6769230769230768,
      "baseHeightMultiplier": 0.8960000000000001,
      "ridgeScaleMultiplier": 1.0153846153846153,
      "ridgeHeightMultiplier": 0.8,
      "octaves": 5,
      "lacunarity": 1.95,
      "gain": 0.5,
      "warpStrength": 0.12,
      "warpScaleMultiplier": 1.1153846153846152,
      "secondaryAmount": 0.1,
      "heightOffset": 0
    },
    "hasTrees": true,
    "fogDensityMultiplier": 1.3230000000000002,
    "humidityBand": "hydric",
    "waterlineMode": "wetland",
    "isMountainVariant": true,
    "baseBiomeId": "base_mountains",
    "treeStyle": "muskeg",
    "treeDensityMultiplier": 0.34,
    "detailTextureId": 6
  }
});

export default definition;
