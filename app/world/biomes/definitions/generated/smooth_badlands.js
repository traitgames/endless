const definition = Object.freeze({
  "id": "smooth_badlands",
  "derive": {
    "type": "subdivision",
    "from": "badlands",
    "mode": "smooth"
  },
  "settings": {
    "colors": {
      "ground": "#bc7660",
      "water": "#957a6a",
      "fog": "#d6b095"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 1.2544000000000002,
      "baseHeightMultiplier": 0.6696000000000001,
      "ridgeScaleMultiplier": 1.1927999999999999,
      "ridgeHeightMultiplier": 0.1652,
      "octaves": 2,
      "lacunarity": 2.08,
      "gain": 0.48,
      "secondaryAmount": 0.016,
      "warpStrength": 0,
      "warpScaleMultiplier": 1.55,
      "gradientCap": 0.05,
      "gradientSampleMeters": 6,
      "heightOffset": 5
    },
    "hasTrees": false,
    "fogDensityMultiplier": 0.9384,
    "humidityBand": "xeric",
    "detailTextureId": 9
  }
});

export default definition;
