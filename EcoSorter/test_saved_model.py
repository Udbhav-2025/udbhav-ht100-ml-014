# test_saved_model.py
import numpy as np
import tensorflow as tf
from PIL import Image

# path to your saved Keras model file
MODEL_PATH = "saved_model.keras"

# small helper to load a sample image (random noise used here)
def random_input(img_size=(128,128)):
    # create a single random image in the right shape
    arr = (np.random.rand(1, img_size[0], img_size[1], 3) * 255).astype("float32")
    return arr

print("Loading model:", MODEL_PATH)
model = tf.keras.models.load_model(MODEL_PATH)
print("Model loaded OK. Summary:")
model.summary()

# run one dummy prediction
x = random_input((128,128))
pred = model.predict(x)
print("pred shape:", pred.shape)
print("pred (first 5 elements):", pred.ravel()[:5])
