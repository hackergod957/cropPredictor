# Development log

## 2026-11-15: Chitwan climate check and Express proxy

Queried NASA POWER climatology at latitude 27.60, longitude 84.35.
Monthly RH2M (%): JAN 46.83, FEB 40.32, MAR 31.76, APR 28.36,
MAY 39.47, JUN 57.43, JUL 79.69, AUG 82.87, SEP 82.90,
OCT 71.78, NOV 59.50, DEC 51.88. ANN: 56.17.

July–September are humid while the dry months lower the annual value.
June is lower than the proposed 75–85% range. These results support a
seasonal explanation for the annual value, but do not validate rice recommendations.
Annual climate averages vs. growing-season training data remains a model
limitation; its effect on rice recommendations is an untested hypothesis.

NASA geometry coordinates were [84.35, 27.60, 357.81], including elevation.
The prediction handler omitted elevation from its returned dictionary, causing
Pydantic to use the schema's null default. It now returns the fetched elevation;
two-coordinate responses safely yield null. Elevation is not a model feature.

Added POST /api/recommend in Express with ML_URL configuration, a 20-second
timeout, upstream JSON/status passthrough, and 503 on transport failure.
