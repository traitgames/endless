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
      "noiseScaleMultiplier": 0.1,
      "baseHeightMultiplier": 0.01,
      "ridgeScaleMultiplier": 0.9,
      "ridgeHeightMultiplier": 0.01,
      "octaves": 2,
      "lacunarity": 1.9,
      "gain": 0.53,
      "secondaryAmount": 0.01,
      "gradientCap": 0.05,
      "gradientSampleMeters": 6,
      "warpStrength": 0,
      "warpScaleMultiplier": 1.55,
      "heightOffset": 6
    },
    "hasTrees": false,
    "fogDensityMultiplier": 0.8280000000000001,
    "humidityBand": "xeric",
    "detailTextureId": 7
  }
});

export default definition;
