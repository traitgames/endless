const definition = Object.freeze({
  "id": "smooth_alpine_tundra",
  "derive": {
    "type": "subdivision",
    "from": "alpine_tundra",
    "mode": "smooth"
  },
  "settings": {
    "colors": {
      "ground": "#acaea3",
      "water": "#7f94a1",
      "fog": "#d2d8d7"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 1.0304000000000002,
      "baseHeightMultiplier": 0.744,
      "ridgeScaleMultiplier": 1.1424,
      "ridgeHeightMultiplier": 0.1708,
      "octaves": 3,
      "lacunarity": 2,
      "gain": 0.48,
      "secondaryAmount": 0.018,
      "warpStrength": 0,
      "warpScaleMultiplier": 1.55,
      "gradientCap": 0.05,
      "gradientSampleMeters": 6
    },
    "hasTrees": false,
    "fogDensityMultiplier": 0.9936000000000001,
    "humidityBand": "xeric",
    "isMountainVariant": true,
    "baseBiomeId": "rocky_mountains",
    "detailTextureId": 2
  }
});

export default definition;
