const definition = Object.freeze({
  "id": "alpine_mire",
  "label": "Alpine Mire",
  "category": "cold",
  "colors": {
    "ground": "#5d6e67",
    "water": "#4d6d72",
    "fog": "#9fb0ad",
    "trunk": "#5a4739",
    "canopy": "#58705f"
  },
  "terrainProfile": {
    "noiseAlgorithm": "ridged",
    "noiseScaleMultiplier": 0.88,
    "baseHeightMultiplier": 1.12,
    "ridgeScaleMultiplier": 1.32,
    "ridgeHeightMultiplier": 1,
    "octaves": 5,
    "lacunarity": 1.95,
    "gain": 0.5,
    "warpStrength": 0.12,
    "warpScaleMultiplier": 1.45,
    "secondaryAmount": 0.1
  },
  "hasTrees": true,
  "fogDensityMultiplier": 1.26,
  "humidityBand": "hydric",
  "waterlineMode": "wetland",
  "isMountainVariant": true,
  "baseBiomeId": "rocky_mountains",
  "treeStyle": "muskeg",
  "treeDensityMultiplier": 0.34,
  "detailTextureId": 6
});

export default definition;
