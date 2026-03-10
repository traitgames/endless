const definition = Object.freeze({
  "id": "smooth_montane",
  "derive": {
    "type": "subdivision",
    "from": "montane",
    "mode": "smooth"
  },
  "settings": {
    "colors": {
      "ground": "#879882",
      "water": "#6b8a9a",
      "fog": "#c2cfc2",
      "trunk": "#6a5541",
      "canopy": "#5b8660"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 1.0304000000000002,
      "baseHeightMultiplier": 0.744,
      "ridgeScaleMultiplier": 1.176,
      "ridgeHeightMultiplier": 0.1736,
      "octaves": 3,
      "lacunarity": 2,
      "gain": 0.48,
      "secondaryAmount": 0.022000000000000002,
      "warpStrength": 0,
      "warpScaleMultiplier": 1.55,
      "gradientCap": 0.05,
      "gradientSampleMeters": 6,
      "heightOffset": 0
    },
    "hasTrees": true,
    "fogDensityMultiplier": 1.0120000000000002,
    "humidityBand": "mesic",
    "isMountainVariant": true,
    "baseBiomeId": "base_mountains",
    "treeStyle": "subalpine",
    "treeDensityMultiplier": 0.42,
    "detailTextureId": 11
  }
});

export default definition;
