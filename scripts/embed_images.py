"""
Embed images as base64 in HTML email template.
"""
import base64
import os
import re

images_dir = 'assets/rise-emailer/images'
html_file = 'assets/rise-emailer/email.html'

# Read the HTML
with open(html_file, 'r', encoding='utf-8') as f:
    html_content = f.read()

# Create mapping of image filenames to base64
image_map = {}
for image_file in os.listdir(images_dir):
    if image_file.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
        image_path = os.path.join(images_dir, image_file)
        ext = image_file.split('.')[-1].lower()
        mime_type = 'image/png' if ext == 'png' else f'image/{ext}'
        
        with open(image_path, 'rb') as f:
            image_data = base64.b64encode(f.read()).decode('utf-8')
        
        image_map[image_file] = f'data:{mime_type};base64,{image_data}'
        print(f'Encoded {image_file} ({len(image_data)} chars)')

# Replace image references in HTML
for filename, data_uri in image_map.items():
    pattern = f'images/{filename}'
    html_content = html_content.replace(pattern, data_uri)

# Also remove the preload links since we're embedding now
html_content = re.sub(r'<link rel="preload"[^>]*>', '', html_content)

# Save modified HTML
with open(html_file, 'w', encoding='utf-8') as f:
    f.write(html_content)

print(f'\n✅ HTML updated with embedded base64 images')
print(f'File size: {len(html_content)} chars')
