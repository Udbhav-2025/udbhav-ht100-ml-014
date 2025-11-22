import tensorflow as tf
import numpy as np
from datasets import load_dataset
from sklearn.model_selection import train_test_split
from PIL import Image
from tqdm import tqdm
import os

# ---- CONFIG ----
DATASET_ID = "garythung/trashnet"
IMG_SIZE = (128, 128)
BATCH_SIZE = 32
EPOCHS = 10
MODEL_DIR = "saved_model.keras"
  # will be created in the current folder

# ---- Convert HF dataset -> numpy arrays ----
def dataset_to_arrays(ds, img_size=IMG_SIZE):
    images = []
    labels = []

    for ex in tqdm(ds, desc="Converting images"):
        img = ex.get("image")
        if img is None:
            continue

        # Accept either PIL Image objects or numpy arrays
        if not isinstance(img, Image.Image):
            # If it's a HuggingFace Image object, convert to numpy then to PIL
            try:
                arr = np.array(img)
                img = Image.fromarray(arr)
            except Exception:
                # fallback: skip this example
                continue

        pil = img.convert("RGB").resize(img_size, Image.BILINEAR)
        arr = np.array(pil)

        images.append(arr)
        labels.append(int(ex.get("label", -1)))

    X = np.array(images, dtype=np.uint8)
    y = np.array(labels, dtype=np.int64)
    return X, y

# ---- Load dataset ----
print("Loading dataset...")
ds = load_dataset(DATASET_ID, split="train")
print("Dataset loaded:", len(ds), "items")

# Convert all images to numpy arrays (this may take a few minutes)
X, y = dataset_to_arrays(ds)
print("Shape:", X.shape, y.shape)

# ---- Train/Val split ----
X_train, X_val, y_train, y_val = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# ---- Normalize + tf.data ----
def make_dataset(X, y, training=True):
    ds = tf.data.Dataset.from_tensor_slices((X, y))
    if training:
        ds = ds.shuffle(1000)
    ds = ds.map(lambda im, lab: ((tf.cast(im, tf.float32) / 255.0), lab),
                num_parallel_calls=tf.data.AUTOTUNE)
    ds = ds.batch(BATCH_SIZE).prefetch(tf.data.AUTOTUNE)
    return ds

train_ds = make_dataset(X_train, y_train, training=True)
val_ds = make_dataset(X_val, y_val, training=False)

# ---- Build CNN Model ----
num_classes = int(np.max(y) + 1)  # or len(np.unique(y))

model = tf.keras.Sequential([
    tf.keras.layers.Input(shape=(IMG_SIZE[0], IMG_SIZE[1], 3)),
    tf.keras.layers.Conv2D(32, 3, activation="relu"),
    tf.keras.layers.MaxPool2D(),
    tf.keras.layers.Conv2D(64, 3, activation="relu"),
    tf.keras.layers.MaxPool2D(),
    tf.keras.layers.Conv2D(128, 3, activation="relu"),
    tf.keras.layers.GlobalAveragePooling2D(),
    tf.keras.layers.Dense(128, activation="relu"),
    tf.keras.layers.Dense(num_classes, activation="softmax"),
])

model.compile(
    optimizer="adam",
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"]
)

model.summary()

# ---- Train ----
# <-- FIX: pass validation dataset using the keyword `validation_data=` -->
history = model.fit(train_ds, validation_data=val_ds, epochs=EPOCHS)

# ---- Save model ----
# model.save creates a SavedModel directory by default
os.makedirs(MODEL_DIR, exist_ok=True)
model.save("saved_model.h5")


print("Saved model to", MODEL_DIR)
