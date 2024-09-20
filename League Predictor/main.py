import pandas as pd
from sklearn.model_selection import train_test_split, GridSearchCV, KFold, cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.feature_selection import RFE
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns


file_path = "C:\VSCode\My Projects\myProjects\League Predictor\high_diamond_ranked_10min.csv"  # Replace with your file path if needed
df = pd.read_csv(file_path)

df_clean = df.drop(columns=['gameId'])

X = df_clean.drop(columns=['blueWins'])
y = df_clean['blueWins']

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

logreg = LogisticRegression()
rfe = RFE(logreg, n_features_to_select=10)
rfe.fit(X_scaled, y)

selected_features = X.columns[rfe.support_]
X_selected = X_scaled[:, rfe.support_]

kfold = KFold(n_splits=5, random_state=42, shuffle=True)  # Simple K-Fold
strat_kfold = StratifiedKFold(n_splits=5, random_state=42, shuffle=True)  # Stratified K-Fold


logreg_param_grid = {
    'C': [0.01, 0.1, 1, 10, 100],  # Regularization strength
    'solver': ['liblinear', 'lbfgs'],  # Solvers for logistic regression
}
logreg_grid = GridSearchCV(LogisticRegression(), logreg_param_grid, cv=strat_kfold, scoring='accuracy')
logreg_grid.fit(X_selected, y)
best_logreg = logreg_grid.best_estimator_

knn_param_grid = {
    'n_neighbors': [3, 5, 7, 9],  # Number of neighbors
    'weights': ['uniform', 'distance'],  # Weighting method
    'metric': ['euclidean', 'manhattan']  # Distance metrics
}

knn_grid = GridSearchCV(KNeighborsClassifier(), knn_param_grid, cv=kfold, scoring='accuracy')
knn_grid.fit(X_selected, y)
best_knn = knn_grid.best_estimator_

logreg_cv_scores = cross_val_score(best_logreg, X_selected, y, cv=strat_kfold, scoring='accuracy')
print(f"Logistic Regression Cross-Validation Accuracy: {logreg_cv_scores.mean() * 100:.2f}%")

knn_cv_scores = cross_val_score(best_knn, X_selected, y, cv=kfold, scoring='accuracy')
print(f"KNN Cross-Validation Accuracy: {knn_cv_scores.mean() * 100:.2f}%")

X_train, X_test, y_train, y_test = train_test_split(X_selected, y, test_size=0.3, random_state=42)

y_pred_logreg = best_logreg.predict(X_test)
logreg_accuracy = accuracy_score(y_test, y_pred_logreg)

y_pred_knn = best_knn.predict(X_test)
knn_accuracy = accuracy_score(y_test, y_pred_knn)

report = classification_report(y_test, y_pred_logreg)
print("Classification Report for Logistic Regression:\n", report)
conf_matrix = confusion_matrix(y_test, y_pred_logreg)
plt.figure(figsize=(6,4))
sns.heatmap(conf_matrix, annot=True, fmt='d', cmap='Blues', cbar=False)
plt.title('Confusion Matrix - Logistic Regression')
plt.ylabel('Actual')
plt.xlabel('Predicted')
plt.show()

# Confusion Matrix for KNN
conf_matrix_knn = confusion_matrix(y_test, y_pred_knn)
plt.figure(figsize=(6,4))
sns.heatmap(conf_matrix_knn, annot=True, fmt='d', cmap='Blues', cbar=False)
plt.title('Confusion Matrix - KNN')
plt.ylabel('Actual')
plt.xlabel('Predicted')
plt.show()

# Output the best parameters for both models
print(f"Best parameters for Logistic Regression: {logreg_grid.best_params_}")
print(f"Best parameters for KNN: {knn_grid.best_params_}")