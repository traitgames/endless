const definition = Object.freeze({
  "id": "smooth_icefield",
  "derive": {
    "type": "subdivision",
    "from": "icefield",
    "mode": "smooth"
  },
  "settings": {
    "colors": {
      "ground": "#e6f2fa",
      "water": "#a3d3ed",
      "fog": "#e6f2fe"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 0.8960000000000001,
      "baseHeightMultiplier": 0.7812,
      "ridgeScaleMultiplier": 1.2096,
      "ridgeHeightMultiplier": 0.22680000000000003,
      "octaves": 3,
      "lacunarity": 2.02,
      "gain": 0.48,
      "secondaryAmount": 0.014000000000000002,
      "warpStrength": 0,
      "warpScaleMultiplier": 1.55,
      "gradientCap": 0.05,
      "gradientSampleMeters": 6,
      "heightOffset": 0
    },
    "hasTrees": false,
    "fogDensityMultiplier": 1.1592,
    "humidityBand": "hydric",
    "detailTextureId": 1
  }
});

export default definition;
