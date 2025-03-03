import argparse
import torch
import json
from transformers import AutoModelForSequenceClassification, AutoTokenizer
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).resolve().parent.parent))
from utils.logger import setup_logger

logger = setup_logger()

class TaskClassifier:
    def __init__(self, model_path):
        """
        Initialize the task classifier with a trained model
        
        Args:
            model_path: Path to the trained model directory
        """
        logger.info(f"Loading model from {model_path}")
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = AutoModelForSequenceClassification.from_pretrained(model_path)
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)
        self.model.to(self.device)
        self.model.eval()
        
        # Load label mapping
        with open(f"{model_path}/label_mapping.json", "r") as f:
            mapping = json.load(f)
            self.id_to_label = {int(k): v for k, v in mapping["id_to_label"].items()}
        
        logger.info("Model loaded successfully")
    
    def predict(self, query):
        """
        Predict the task type from a natural language query
        
        Args:
            query: String containing the user query
            
        Returns:
            Dictionary with predicted task label and confidence score
        """
        inputs = self.tokenizer(
            query,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=128
        ).to(self.device)
        
        with torch.no_grad():
            outputs = self.model(**inputs)
            
        logits = outputs.logits
        probabilities = torch.nn.functional.softmax(logits, dim=1)[0]
        predicted_class = torch.argmax(probabilities).item()
        confidence = probabilities[predicted_class].item()
        
        return {
            "task": self.id_to_label[predicted_class],
            "confidence": confidence
        }

def main():
    parser = argparse.ArgumentParser(description="Predict task type from query")
    parser.add_argument("--model_path", type=str, default="./output/best_model", help="Path to trained model")
    parser.add_argument("--query", type=str, required=True, help="Query text for prediction")
    args = parser.parse_args()
    
    classifier = TaskClassifier(args.model_path)
    prediction = classifier.predict(args.query)
    
    logger.info(f"Query: {args.query}")
    logger.info(f"Predicted task: {prediction['task']} (confidence: {prediction['confidence']:.4f})")
    
    print(json.dumps(prediction, indent=2))

if __name__ == "__main__":
    main()
