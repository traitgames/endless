const definition = Object.freeze({
  "id": "smooth_glacier",
  "derive": {
    "type": "subdivision",
    "from": "glacier",
    "mode": "smooth"
  },
  "settings": {
    "colors": {
      "ground": "#e9f3fa",
      "water": "#95c6ea",
      "fog": "#e0effe"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 0.9184,
      "baseHeightMultiplier": 0.7315999999999999,
      "ridgeScaleMultiplier": 1.1340000000000001,
      "ridgeHeightMultiplier": 0.21700000000000003,
      "octaves": 2,
      "lacunarity": 2,
      "gain": 0.5,
      "secondaryAmount": 0.012,
      "warpStrength": 0,
      "warpScaleMultiplier": 1.55,
      "gradientCap": 0.05,
      "gradientSampleMeters": 6,
      "heightOffset": 0
    },
    "hasTrees": false,
    "fogDensityMultiplier": 1.104,
    "humidityBand": "mesic",
    "detailTextureId": 1
  }
});

export default definition;
