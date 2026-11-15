import pandas as pd
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import joblib, json
from pathlib import Path


FEATURES = ["temperature", "humidity", "ph", "rainfall"]
ART = Path("artifacts")
ART.mkdir(exist_ok=True)



def load_and_prepare(csv_path):
    df = pd.read_csv(csv_path)
    df = df[FEATURES + ["label"]]

    print(df["rainfall"].describe())

    X = df[FEATURES]
    le = LabelEncoder()
    y = le.fit_transform(df["label"])


    X_train, X_test, y_train, y_test = train_test_split(
        X,y,
        test_size=0.2,
        stratify=y,
        random_state=42
    )

    scaler = StandardScaler()


    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    joblib.dump(scaler, ART / "scaler.joblib")
    joblib.dump(le, ART / "label_encoder.joblib")
    (ART / "feature_list.json").write_text(json.dumps(FEATURES))


    return X_train_scaled,X_test_scaled,y_train,y_test,scaler,le

if __name__ == "__main__":
    X_tr, X_te, y_tr, y_te,scaler,le = load_and_prepare("data/raw/Crop_recommendation.csv")
    print(X_tr.shape, X_te.shape, len(set(y_tr)))