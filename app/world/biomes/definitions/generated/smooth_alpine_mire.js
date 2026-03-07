const definition = Object.freeze({
  "id": "smooth_alpine_mire",
  "derive": {
    "type": "subdivision",
    "from": "alpine_mire",
    "mode": "smooth"
  },
  "settings": {
    "colors": {
      "ground": "#6e7e77",
      "water": "#5c7a80",
      "fog": "#adbbb9",
      "trunk": "#5a4739",
      "canopy": "#58705f"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 0.9856000000000001,
      "baseHeightMultiplier": 0.6944,
      "ridgeScaleMultiplier": 1.1088,
      "ridgeHeightMultiplier": 0.14,
      "octaves": 3,
      "lacunarity": 1.95,
      "gain": 0.5,
      "warpStrength": 0.054,
      "warpScaleMultiplier": 1.45,
      "secondaryAmount": 0.020000000000000004,
      "gradientCap": 0.05,
      "gradientSampleMeters": 6
    },
    "hasTrees": true,
    "fogDensityMultiplier": 1.1592,
    "humidityBand": "hydric",
    "waterlineMode": "wetland",
    "isMountainVariant": true,
    "baseBiomeId": "rocky_mountains",
    "treeStyle": "muskeg",
    "treeDensityMultiplier": 0.34,
    "detailTextureId": 6
  }
});

export default definition;
