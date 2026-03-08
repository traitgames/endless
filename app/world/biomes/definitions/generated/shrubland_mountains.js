const definition = Object.freeze({
  "id": "shrubland_mountains",
  "derive": {
    "type": "mountain",
    "from": "shrubland"
  },
  "settings": {
    "colors": {
      "ground": "#b3a37c",
      "water": "#84a7a8",
      "fog": "#cebc96",
      "trunk": "#70563e",
      "canopy": "#8d9958"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 0.81,
      "baseHeightMultiplier": 0.9047999999999999,
      "ridgeScaleMultiplier": 1.3216,
      "ridgeHeightMultiplier": 0.4590000000000001,
      "octaves": 5,
      "lacunarity": 1.96,
      "gain": 0.5,
      "secondaryAmount": 0.16999999999999998,
      "warpStrength": 0.12,
      "warpScaleMultiplier": 1.7,
      "heightOffset": 0
    },
    "hasTrees": true,
    "fogDensityMultiplier": 0.9720000000000001,
    "humidityBand": "mesic",
    "isMountainVariant": true,
    "baseBiomeId": "shrubland",
    "treeStyle": "shrubland",
    "treeDensityMultiplier": 0.196,
    "detailTextureId": 8
  }
});

export default definition;
