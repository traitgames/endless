const definition = Object.freeze({
  "id": "smooth_cloudforest_hot",
  "derive": {
    "type": "subdivision",
    "from": "cloudforest_hot",
    "mode": "smooth"
  },
  "settings": {
    "colors": {
      "ground": "#6d866f",
      "water": "#5e898e",
      "fog": "#b5c9af",
      "trunk": "#614734",
      "canopy": "#4e8a54"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 0.9856000000000001,
      "baseHeightMultiplier": 0.7564,
      "ridgeScaleMultiplier": 1.176,
      "ridgeHeightMultiplier": 0.168,
      "octaves": 3,
      "lacunarity": 2,
      "gain": 0.48,
      "warpStrength": 0.054,
      "warpScaleMultiplier": 1.45,
      "secondaryAmount": 0.022000000000000002,
      "gradientCap": 0.05,
      "gradientSampleMeters": 6,
      "heightOffset": 0
    },
    "hasTrees": true,
    "fogDensityMultiplier": 1.104,
    "humidityBand": "hydric",
    "isMountainVariant": true,
    "baseBiomeId": "rocky_mountains",
    "treeStyle": "cloudforest",
    "treeDensityMultiplier": 0.66,
    "detailTextureId": 11
  }
});

export default definition;
