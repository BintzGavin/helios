import re

with open('packages/renderer/src/strategies/DomStrategy.ts', 'r') as f:
    content = f.read()

# Replace 1x1 PNG empty buffer
content = content.replace(
    '''const EMPTY_IMAGE_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);''',
    '''const EMPTY_IMAGE_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQIW2NkYGD4z8DAwMgAI0AMDA4wBfQoO4UAAAAASUVORK5CYII=",
  "base64"
);'''
)

# Replace other PNG empty buffer
content = content.replace(
    'this.emptyImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";',
    'this.emptyImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQIW2NkYGD4z8DAwMgAI0AMDA4wBfQoO4UAAAAASUVORK5CYII=";'
)

# Replace JPEG empty buffer
content = content.replace(
    '''// 1x1 JPEG pixel
        this.emptyImageBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';''',
    '''// 2x2 JPEG pixel
        this.emptyImageBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAACAAIBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';'''
)

# Replace WEBP empty buffer
content = content.replace(
    '''// 1x1 WEBP pixel
        this.emptyImageBase64 = 'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';''',
    '''// 2x2 WEBP pixel
        this.emptyImageBase64 = 'UklGRjIAAABXRUJQVlA4ICYAAAAwAQCdASoCAAIACgEAAwBkAGsAIP4B2gAAACH+/4IAAA==';'''
)

with open('packages/renderer/src/strategies/DomStrategy.ts', 'w') as f:
    f.write(content)
