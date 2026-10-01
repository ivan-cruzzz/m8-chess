from PIL import Image, ImageDraw, ImageFont
import os

# Output directory
out_dir = "src-tauri/icons"
os.makedirs(out_dir, exist_ok=True)

def create_icon(size, output_path):
    """Create a simple chess-themed icon"""
    img = Image.new('RGBA', (size, size), (26, 26, 26, 255))  # #1a1a1a background
    draw = ImageDraw.Draw(img)
    
    # Draw rounded rectangle background
    corner_radius = size // 5
    draw.rounded_rectangle([0, 0, size-1, size-1], radius=corner_radius, fill=(26, 26, 26, 255))
    
    # Draw chess pawn symbol
    # Use a large font size relative to icon size
    font_size = int(size * 0.55)
    
    # Try to use a font that supports chess symbols, fallback to default
    try:
        font = ImageFont.truetype("segoe-ui-symbol.ttf", font_size)
    except:
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            font = ImageFont.load_default()
    
    # Draw pawn character ♟ (we'll use text)
    text = "♟"
    
    # Get text bounding box for centering
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - int(size * 0.05)
    
    # Draw text with the board light color
    draw.text((x, y), text, font=font, fill=(240, 217, 181, 255))  # #f0d9b5
    
    img.save(output_path)
    print(f"Created: {output_path}")

# Generate icons for Tauri
create_icon(32, os.path.join(out_dir, "32x32.png"))
create_icon(128, os.path.join(out_dir, "128x128.png"))
create_icon(256, os.path.join(out_dir, "128x128@2x.png"))

# Create ICO file (multi-resolution)
ico_sizes = [16, 24, 32, 48, 64, 128, 256]
ico_images = []
for s in ico_sizes:
    img = Image.new('RGBA', (s, s), (26, 26, 26, 255))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([0, 0, s-1, s-1], radius=s//5, fill=(26, 26, 26, 255))
    
    font_size = int(s * 0.55)
    try:
        font = ImageFont.truetype("segoe-ui-symbol.ttf", font_size)
    except:
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            font = ImageFont.load_default()
    
    text = "♟"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (s - text_width) // 2
    y = (s - text_height) // 2 - int(s * 0.05)
    draw.text((x, y), text, font=font, fill=(240, 217, 181, 255))
    
    ico_images.append(img)

ico_images[0].save(os.path.join(out_dir, "icon.ico"), sizes=[(s, s) for s in ico_sizes])
print(f"Created: {os.path.join(out_dir, 'icon.ico')}")

print("All icons generated successfully!")
