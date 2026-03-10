const definition = Object.freeze({
  "id": "savanna_mesic_mountains",
  "derive": {
    "type": "mountain",
    "from": "savanna_mesic"
  },
  "settings": {
    "colors": {
      "ground": "#ab9f6e",
      "water": "#6fa3b9",
      "fog": "#d6ca9c",
      "trunk": "#745743",
      "canopy": "#8ea559"
    },
    "terrainProfile": {
      "noiseAlgorithm": "fbm_ridged",
      "noiseScaleMultiplier": 0.9,
      "baseHeightMultiplier": 1.0672,
      "ridgeScaleMultiplier": 1.18,
      "ridgeHeightMultiplier": 0.7020000000000001,
      "octaves": 5,
      "lacunarity": 1.9,
      "gain": 0.5,
      "secondaryAmount": 0.15000000000000002,
      "warpStrength": 0.12,
      "warpScaleMultiplier": 1.7,
      "heightOffset": 0
    },
    "hasTrees": true,
    "fogDensityMultiplier": 1.0368,
    "humidityBand": "mesic",
    "isMountainVariant": true,
    "baseBiomeId": "savanna_mesic",
    "treeStyle": "savanna",
    "treeDensityMultiplier": 0.364,
    "detailTextureId": 8
  }
});

export default definition;
