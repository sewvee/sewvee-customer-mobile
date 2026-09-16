from PIL import Image, ImageOps

# Open the image
img = Image.open('/Users/bhuvan/.gemini/antigravity/brain/6821b6e5-fa2c-4c93-8e34-92b4dabe3268/.user_uploaded/media_1789551202966.png').convert('RGBA')
datas = img.getdata()

newData = []
for item in datas:
    # item is (R, G, B, A)
    # If the pixel is mostly white, make it transparent
    if item[0] > 200 and item[1] > 200 and item[2] > 200:
        newData.append((255, 255, 255, 0))
    else:
        # Otherwise make it solid white
        newData.append((255, 255, 255, 255))

img.putdata(newData)
img = img.resize((96, 96), Image.Resampling.LANCZOS)
img.save('/tmp/ic_notification.png', 'PNG')
print("Icon generated at /tmp/ic_notification.png")
