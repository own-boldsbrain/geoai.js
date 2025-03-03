import os
import json
import random
import logging
import argparse
import yaml
import re
# import numpy as np  # Removed unused import
from pathlib import Path
import sys

# Add project root to path
sys.path.append(str(Path(__file__).resolve().parent.parent))

def setup_logger():
    logging.basicConfig(level=logging.INFO)
    return logging.getLogger(__name__)

logger = setup_logger()

def load_config(config_path):
    """Load configuration from YAML file."""
    with open(config_path, "r") as f:
        return yaml.safe_load(f)

def load_task_labels(labels_path):
    """Load task labels from JSON file."""
    with open(labels_path, "r") as f:
        return json.load(f)["task_labels"]

def clean_text(text):
    """Clean and preprocess text."""
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text.strip())
    # Keep some punctuation as it might be important for NLP tasks
    # Convert to lowercase
    return text.lower()

def prepare_data(raw_data_path, output_dir, config, task_labels):
    """Prepare and process raw data for training."""
    logger.info("Starting data preparation")
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Check if raw data exists
    if not os.path.exists(raw_data_path):
        logger.error(f"Raw data file not found at {raw_data_path}")
        return
    
    # Load raw data
    with open(raw_data_path, "r") as f:
        raw_data = json.load(f)
    
    # Process and clean data
    processed_data = []
    for item in raw_data:
        print(item)
        task_type = item.get("task", "other")
        
        # Get the index of task_type in task_labels, default to "other" if not found
        if task_type in task_labels:
            label_idx = task_labels.index(task_type)
        else:
            if "other" not in task_labels:
                logger.error("'other' label not found in task_labels")
                return
            label_idx = task_labels.index("other")
        
        processed_data.append({
            "text": clean_text(item["query"]),
            "label": label_idx
        })
    
    # Shuffle data
    random.seed(config["training"]["seed"])
    random.shuffle(processed_data)
    
    # Split data into train and test sets
    data_len = len(processed_data)
    train_size = int(data_len * config["data"]["train_split"])
    
    train_data = processed_data[:train_size]
    test_data = processed_data[train_size:]
    
    # Save processed datasets
    with open(os.path.join(output_dir, "train.json"), "w") as f:
        json.dump(train_data, f, indent=2)
    
    with open(os.path.join(output_dir, "test.json"), "w") as f:
        json.dump(test_data, f, indent=2)
    
    logger.info(f"Data preparation completed: {len(train_data)} training, {len(val_data)} validation, {len(test_data)} test samples")

def main():
    parser = argparse.ArgumentParser(description="Prepare data for task classification")
    parser.add_argument("--input-file", default="data/queries.json", help="Path to raw data file")
    parser.add_argument("--output-dir", default="data/processed", help="Output directory for processed data")
    parser.add_argument("--config", default="config/training_config.yaml", help="Path to config file")
    parser.add_argument("--task-labels", default="config/task_labels.json", help="Path to task labels file")
    args = parser.parse_args()
    
    # Load config
    config = load_config(args.config)
    task_labels = load_task_labels(args.task_labels)
    
    # Prepare data
    prepare_data(args.input_file, args.output_dir, config, task_labels)

if __name__ == "__main__":
    main()
