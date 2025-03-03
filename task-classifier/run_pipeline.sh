#!/bin/bash

set -e

# Set base directory to the script location
BASE_DIR=$(dirname "$(readlink -f "$0")")
cd "$BASE_DIR"

echo "Starting data preparation..."
python data/prepare_data.py

echo "Starting model training..."
ython model/train.py --config config/training_config.yaml --output-dir models/task_classifier --data_path data/processed/train.json

echo "Pipeline completed successfully!"
