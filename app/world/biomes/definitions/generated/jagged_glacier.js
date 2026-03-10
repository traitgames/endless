const definition = Object.freeze({
  "id": "jagged_glacier",
  "derive": {
    "type": "subdivision",
    "from": "glacier",
    "mode": "jagged"
  },
  "settings": {
    "colors": {
      "ground": "#e1eaf4",
      "water": "#8cc0e5",
      "fog": "#dbecfc"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 0.2,
      "baseHeightMultiplier": 1.8,
      "ridgeScaleMultiplier": 1.6,
      "ridgeHeightMultiplier": 0.5,
      "octaves": 5,
      "lacunarity": 0.72,
      "gain": 0.5,
      "warpStrength": 2.5,
      "warpScaleMultiplier": 22,
      "secondaryAmount": 0.2,
      "heightOffset": -7,
      "gradientCap": 0.6,
      "gradientSampleMeters": 3
    },
    "hasTrees": false,
    "fogDensityMultiplier": 1.26,
    "humidityBand": "mesic",
    "detailTextureId": 1
  }
});

export default definition;
