import cv2
import numpy as np

# Load images
img_hero = cv2.imread(r'c:\Users\Gebruiker\.gemini\antigravity\scratch\popsongchordbook\images\pwa_logo_hero.jpg')
img_small = cv2.imread(r'c:\Users\Gebruiker\.gemini\antigravity\scratch\popsongchordbook\images\LogoSmall1050x1050.jpg')

print("img_hero shape:", img_hero.shape if img_hero is not None else "None")
print("img_small shape:", img_small.shape if img_small is not None else "None")
