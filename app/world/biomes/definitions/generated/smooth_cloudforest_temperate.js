const definition = Object.freeze({
  "id": "smooth_cloudforest_temperate",
  "derive": {
    "type": "subdivision",
    "from": "cloudforest_temperate",
    "mode": "smooth"
  },
  "settings": {
    "colors": {
      "ground": "#708c7e",
      "water": "#5c8a93",
      "fog": "#acc3be",
      "trunk": "#604b3a",
      "canopy": "#4c8d62"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 1.0080000000000002,
      "baseHeightMultiplier": 0.7688,
      "ridgeScaleMultiplier": 1.1927999999999999,
      "ridgeHeightMultiplier": 0.1652,
      "octaves": 3,
      "lacunarity": 1.98,
      "gain": 0.49,
      "warpStrength": 0.0585,
      "warpScaleMultiplier": 1.5,
      "secondaryAmount": 0.024,
      "gradientCap": 0.05,
      "gradientSampleMeters": 6,
      "heightOffset": 0
    },
    "hasTrees": true,
    "fogDensityMultiplier": 1.1224,
    "humidityBand": "hydric",
    "isMountainVariant": true,
    "baseBiomeId": "base_mountains",
    "treeStyle": "cloudforest",
    "treeDensityMultiplier": 0.62,
    "detailTextureId": 11
  }
});

export default definition;
