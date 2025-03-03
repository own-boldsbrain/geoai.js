import os
import json
import argparse
import yaml
import torch
import numpy as np
from pathlib import Path
import logging
import sys
from tqdm import tqdm
import random

from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    AdamW,
    get_linear_schedule_with_warmup,
    set_seed
)
from torch.utils.data import DataLoader, Dataset
from torch.utils.tensorboard import SummaryWriter
from sklearn.metrics import accuracy_score, f1_score, classification_report

# Add project root to path
sys.path.append(str(Path(__file__).resolve().parent.parent))
def setup_logger():
    logging.basicConfig(level=logging.INFO)
    return logging.getLogger(__name__)

logger = setup_logger()

class TextClassificationDataset(Dataset):
    """Dataset for text classification tasks"""
    
    def __init__(self, texts, labels, tokenizer, max_length):
        self.encodings = tokenizer(texts, truncation=True, padding=True, max_length=max_length)
        self.labels = labels

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        item = {key: torch.tensor(val[idx]) for key, val in self.encodings.items()}
        item['labels'] = torch.tensor(self.labels[idx])
        return item

def train(model, dataloader, optimizer, scheduler, device):
    model.train()
    total_loss = 0
    for batch in tqdm(dataloader, desc="Training"):
        batch = {k: v.to(device) for k, v in batch.items()}
        outputs = model(**batch)
        loss = outputs.loss
        total_loss += loss.item()
        loss.backward()
        optimizer.step()
        scheduler.step()
        optimizer.zero_grad()
    return total_loss / len(dataloader)

def evaluate(model, dataloader, device):
    model.eval()
    preds, true_labels = [], []
    for batch in tqdm(dataloader, desc="Evaluating"):
        batch = {k: v.to(device) for k, v in batch.items()}
        with torch.no_grad():
            outputs = model(**batch)
        logits = outputs.logits
        preds.extend(torch.argmax(logits, dim=1).tolist())
        true_labels.extend(batch['labels'].tolist())
    accuracy = accuracy_score(true_labels, preds)
    f1 = f1_score(true_labels, preds, average='weighted')
    return accuracy, f1

def load_data(data_path, tokenizer, max_length):
    """Load and prepare data for training/evaluation"""
    with open(data_path, 'r') as f:
        data = json.load(f)
    
    print(data)
    texts = [item["text"] for item in data]
    labels = [item["label"] for item in data]
    
    # Convert text labels to numeric ids
    unique_labels = list(set(labels))
    label_to_id = {label: i for i, label in enumerate(unique_labels)}
    label_ids = [label_to_id[label] for label in labels]
    
    return TextClassificationDataset(texts, label_ids, tokenizer, max_length), label_to_id, unique_labels

def save_model(model, tokenizer, output_dir, label_to_id):
    """Save model, tokenizer and label mapping"""
    os.makedirs(output_dir, exist_ok=True)
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)
    
    # Save label mapping
    with open(os.path.join(output_dir, "label_mapping.json"), "w") as f:
        json.dump({"label_to_id": label_to_id, "id_to_label": {str(v): k for k, v in label_to_id.items()}}, f)
    
    logger.info(f"Model saved to {output_dir}")

def main():
    parser = argparse.ArgumentParser(description="Train a text classifier for GeoBase AI task classification")
    parser.add_argument("--config", type=str, default="../config/training_config.yaml", help="Path to config file")
    parser.add_argument("--data_path", type=str, default="../data/queries.json", help="Path to training data")
    parser.add_argument("--output-dir", type=str, default="./output", help="Directory to save the model")
    args = parser.parse_args()

    # Load config
    with open(args.config, "r") as f:
        config = yaml.safe_load(f)
    
    # Set seed for reproducibility
    set_seed(config["training"]["seed"])
    
    # Setup device
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Using device: {device}")
    
    # Setup tensorboard
    writer = SummaryWriter(log_dir=os.path.join(config["training"]["output_dir"], "logs"))
    
    # Load tokenizer and model
    tokenizer = AutoTokenizer.from_pretrained(config["model"]["base_model"])
    
    # Load and prepare data
    dataset, label_to_id, unique_labels = load_data(
        args.data_path, tokenizer, config["model"]["max_sequence_length"]
    )
    num_classes = len(unique_labels)
    logger.info(f"Loaded dataset with {len(dataset)} samples and {num_classes} classes")
    logger.info(f"Labels: {unique_labels}")
    
    # Initialize model with the correct number of classes
    model = AutoModelForSequenceClassification.from_pretrained(
        config["model"]["base_model"], num_labels=num_classes
    )
    model.to(device)
    
    # Split data into train/val
    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_dataset, val_dataset = torch.utils.data.random_split(dataset, [train_size, val_size])
    
    # Create data loaders
    train_dataloader = DataLoader(
        train_dataset, 
        batch_size=config["training"]["batch_size"], 
        shuffle=True
    )
    
    val_dataloader = DataLoader(
        val_dataset, 
        batch_size=config["training"]["batch_size"]
    )
    
    # Setup optimizer and scheduler
    optimizer = AdamW(
        model.parameters(), 
        lr=config["training"]["learning_rate"],
        weight_decay=config["training"]["weight_decay"]
    )
    
    total_steps = len(train_dataloader) * config["training"]["epochs"]
    scheduler = get_linear_schedule_with_warmup(
        optimizer, 
        num_warmup_steps=config["training"]["warmup_steps"],
        num_training_steps=total_steps
    )
    
    # Training loop
    best_f1 = 0.0
    for epoch in range(config["training"]["epochs"]):
        logger.info(f"Starting epoch {epoch+1}/{config['training']['epochs']}")
        
        # Train
        train_loss = train(model, train_dataloader, optimizer, scheduler, device)
        logger.info(f"Epoch {epoch+1} - Training loss: {train_loss:.4f}")
        writer.add_scalar("Loss/train", train_loss, epoch)
        
        # Evaluate
        accuracy, f1 = evaluate(model, val_dataloader, device)
        logger.info(f"Epoch {epoch+1} - Validation accuracy: {accuracy:.4f}, F1: {f1:.4f}")
        writer.add_scalar("Accuracy/val", accuracy, epoch)
        writer.add_scalar("F1/val", f1, epoch)
        
        # Save best model
        if f1 > best_f1:
            best_f1 = f1
            save_model(model, tokenizer, os.path.join(args.output_dir, "best_model"), label_to_id)
    
    # Save final model
    save_model(model, tokenizer, os.path.join(args.output_dir, "final_model"), label_to_id)
    logger.info(f"Training completed. Best validation F1: {best_f1:.4f}")

if __name__ == "__main__":
    main()