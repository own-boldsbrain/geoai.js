# GeoBase AI Task Classifier

This module classifies natural language queries into specific geospatial AI task types for the GeoBase AI system.

## Task Categories

The classifier can identify the following task types:

- `object-detection`: Finding and identifying objects in geospatial imagery
- `zero-shot-object-detection`: Detecting arbitrary objects specified in the query
- `mask-segmentation`: Creating pixel masks for geographic features

## Setup and Installation

## Project Structure

- `config/`: Configuration files for training and model parameters
- `data/`: Scripts for data processing and preparation
- `model/`: Model definition and training scripts

## Getting Started

1. Set up the environment:

```bash
pip install -r requirements.txt
```

2. Prepare your data:

```bash
python data/prepare_data.py --input-file data/queries.json --output-dir data/processed
```

## Training

Train the model using the following command:

```bash
python model/train.py --config config/training_config.yaml --output-dir models/my_classifier
```
