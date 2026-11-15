from tensorflow import keras


def build_mlp(n_features, n_classes):

    model = keras.Sequential([
        keras.Input(shape=(n_features,)),
        keras.layers.Dense(64, activation="relu"),
        keras.layers.Dropout(0.2),
        keras.layers.Dense(32, activation="relu"),
        keras.layers.Dense(n_classes, activation="softmax"),
        ])

    model.compile(
    optimizer="adam",
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy", keras.metrics.SparseTopKCategoricalAccuracy(k=5, name="top5")],
    )

    return model

model = build_mlp(5, 10)
model.summary()

print(model.loss)
print(model.optimizer)
print(model.metrics_names)