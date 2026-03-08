const definition = Object.freeze({
  "id": "smooth_scrubland",
  "derive": {
    "type": "subdivision",
    "from": "scrubland",
    "mode": "smooth"
  },
  "settings": {
    "colors": {
      "ground": "#a38f67",
      "water": "#86978a",
      "fog": "#ceb792",
      "trunk": "#6f5138",
      "canopy": "#8d8e46"
    },
    "terrainProfile": {
      "noiseAlgorithm": "hybrid",
      "noiseScaleMultiplier": 1.1872000000000003,
      "baseHeightMultiplier": 0.5704,
      "ridgeScaleMultiplier": 0.9743999999999999,
      "ridgeHeightMultiplier": 0.1008,
      "octaves": 2,
      "lacunarity": 1.98,
      "gain": 0.5,
      "secondaryAmount": 0.014000000000000002,
      "warpStrength": 0,
      "warpScaleMultiplier": 1.55,
      "gradientCap": 0.05,
      "gradientSampleMeters": 6,
      "heightOffset": 5
    },
    "hasTrees": true,
    "fogDensityMultiplier": 0.8648,
    "humidityBand": "mesic",
    "treeStyle": "shrubland",
    "treeDensityMultiplier": 0.34,
    "detailTextureId": 8
  }
});

export default definition;
