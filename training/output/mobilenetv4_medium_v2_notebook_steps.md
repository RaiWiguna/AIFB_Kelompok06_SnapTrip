# Langkah Pembuatan Model AI SnapTrip V2

Dokumen ini menjelaskan alur notebook `notebook/Kelompok06_snaptrip_training_model_v2.ipynb`.

## Ringkasan Perubahan

Training V2 menggunakan dataset training terbaru:

- `train.csv`: 6116 gambar
- `data/train/`: 6116 gambar
- `val.csv`: 20 gambar
- `test.csv`: 20 gambar

Kategori tetap mengikuti taxonomy canonical SnapTrip:

- `pantai`
- `gunung`
- `air_terjun`
- `wisata_tradisional`

## Alur Notebook

1. Notebook membaca metadata dari `train.csv`, `val.csv`, dan `test.csv`.
2. Path gambar dibangun dari folder `data/train`, `data/val`, dan `data/test`.
3. Dataset divalidasi agar label, nama kelas, dan file gambar sesuai.
4. EDA dilakukan untuk melihat distribusi kelas, ukuran gambar, mode gambar, dan sample visual.
5. Semua gambar dikonversi ke RGB saat masuk dataset PyTorch.
6. Preprocessing training memakai resize, random resized crop `224 x 224`, horizontal flip, color jitter, dan normalisasi ImageNet.
7. Preprocessing validation/test memakai resize, center crop `224 x 224`, dan normalisasi ImageNet.
8. Model MobileNetV4 Medium dari `timm` dimuat dengan pretrained ImageNet.
9. Classification head diganti menjadi 4 kelas.
10. Training berjalan maksimal 30 epoch.
11. Fase awal melakukan freeze backbone selama 5 epoch.
12. Fase berikutnya melakukan unfreeze backbone untuk fine-tuning penuh.
13. Early stopping memakai `val_macro_f1` dengan patience 7 epoch.
14. Checkpoint terbaik dipilih dari nilai validation macro F1 tertinggi.
15. Notebook mengevaluasi checkpoint terbaik pada test set.
16. Notebook menyimpan metric, prediction CSV, confusion matrix, model, dan metadata.

## Output V2

Output V2 dibuat dengan nama berbeda agar tidak menimpa hasil training sebelumnya:

- `output/model/snaptrip_mobilenetv4_medium_v2_best.pth`
- `output/model/snaptrip_mobilenetv4_medium_v2_last.pth`
- `output/model/snaptrip_mobilenetv4_medium_v2_metadata.json`
- `output/metrics/mobilenetv4_medium_v2_training_history.csv`
- `output/metrics/mobilenetv4_medium_v2_classification_report.csv`
- `output/metrics/mobilenetv4_medium_v2_confusion_matrix.png`
- `output/metrics/mobilenetv4_medium_v2_training_curves.png`
- `output/metrics/mobilenetv4_medium_v2_test_predictions.csv`

## Catatan PRD

PRD teknis awal menyebut MobileNetV2. Notebook ini tetap memakai MobileNetV4 Medium sebagai adaptasi implementasi yang sudah dikonfirmasi, tanpa mengubah kategori canonical, ukuran input utama, framework PyTorch, atau kontrak output confidence.
