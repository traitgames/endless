const definition = Object.freeze({
  "id": "smooth_saltflat",
  "derive": {
    "type": "subdivision",
    "from": "saltflat",
    "mode": "smooth"
  },
  "settings": {
    "colors": {
      "ground": "#d9d1b8",
      "water": "#92b4c1",
      "fog": "#dcd9cd"
    },
    "terrainProfile": {
      "noiseAlgorithm": "billow",
      "noiseScaleMultiplier": 0.9408000000000001,
      "baseHeightMultiplier": 0.3596,
      "ridgeScaleMultiplier": 0.6048,
      "ridgeHeightMultiplier": 0.0252,
      "octaves": 2,
      "lacunarity": 1.9,
      "gain": 0.53,
      "secondaryAmount": 0.010000000000000002,
      "gradientCap": 0.05,
      "gradientSampleMeters": 6,
      "warpStrength": 0,
      "warpScaleMultiplier": 1.55,
      "heightOffset": 0
    },
    "hasTrees": false,
    "fogDensityMultiplier": 0.8280000000000001,
    "humidityBand": "xeric",
    "detailTextureId": 7
  }
});

export default definition;
