from PIL import Image, ImageDraw, ImageFont

# Load the image
local_image_path = "/Users/shoaib/code/geobase/geobase-ai.js/merged.png"
image = Image.open(local_image_path)

# Extract model output data
model_output = {
  "scores": [ 0.5780525803565979, 0.381366103887558 ],
  "boxes": [
    [
      219.52191925048828,
      236.42499542236328,
      245.98351287841797,
      276.92955780029297
    ],
    [
      199.5087127685547,
      408.4712677001953,
      246.5415802001953,
      467.4294891357422
    ]
  ],
  "labels": [ "tree", "tree" ]
}

# Prepare to draw bounding boxes
draw = ImageDraw.Draw(image)
try:
    font = ImageFont.truetype("arial.ttf", size=16)
except IOError:
    font = ImageFont.load_default(size=16)  # Fallback to default font if arial is not available

# Draw each bounding box on the image
for box, label, score in zip(model_output["boxes"], model_output["labels"], model_output["scores"]):
    x_min, y_min, x_max, y_max = box
    draw.rectangle([x_min, y_min, x_max, y_max], outline="red", width=3)
    label_text = f"{label} ({score:.2f})"
    text_position = (x_max - 20, y_max - 20)  # Position text slightly above the box
    draw.text(text_position, label_text, fill="yellow", font=font)

# Save the modified image
output_path = "/Users/shoaib/code/geobase/geobase-ai.js/merged_with_boxes.png"
image.save(output_path)

output_path
