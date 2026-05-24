# Langkah Pembuatan Model AI SnapTrip

Dokumen ini menjelaskan alur notebook `notebook/Kelompok06_snaptrip_training_model.ipynb` dalam membuat model classifier gambar SnapTrip.

## 1. Tujuan Model

Model dibuat untuk mengklasifikasikan gambar wisata ke empat kategori canonical SnapTrip:

- `pantai`
- `gunung`
- `air_terjun`
- `wisata_tradisional`

Output model mengikuti kebutuhan teknis PRD: kategori canonical dan confidence score dalam rentang `0` sampai `1`.

## 2. Dataset

Notebook menggunakan tiga file metadata:

- `train.csv`
- `val.csv`
- `test.csv`

Setiap CSV memiliki kolom:

- `filename`
- `Classes`
- `Labels`

File gambar diambil dari:

- `data/train/`
- `data/val/`
- `data/test/`

Dataset yang tersedia berisi 80 gambar training, 20 gambar validation, dan 20 gambar testing. Distribusi kelas pada setiap split seimbang.

## 3. Validasi Awal

Notebook memeriksa beberapa hal sebelum training:

- Semua path gambar tersedia.
- Tidak ada missing value pada metadata.
- Label hanya berisi nilai `0`, `1`, `2`, dan `3`.
- Nama kelas sesuai dengan kategori canonical SnapTrip.
- Gambar dapat dibaca oleh PIL.

Validasi ini penting agar model tidak dilatih dengan mapping label yang salah.

## 4. EDA

Notebook melakukan EDA singkat untuk memahami data:

- Distribusi kelas per split.
- Statistik ukuran gambar.
- Mode warna gambar.
- Contoh gambar dari setiap kelas.

Pada dataset ditemukan ada gambar training dengan mode grayscale, sehingga semua gambar dikonversi ke RGB saat preprocessing.

## 5. Preprocessing

Preprocessing training:

- Resize ke `256 x 256`.
- Random resized crop ke `224 x 224`.
- Random horizontal flip.
- Color jitter ringan.
- Normalisasi ImageNet.

Preprocessing validation dan testing:

- Resize ke `256 x 256`.
- Center crop ke `224 x 224`.
- Normalisasi ImageNet.

Ukuran `224 x 224` dipilih karena sesuai dengan kebutuhan input classifier pada PRD.

## 6. Model

Notebook menggunakan MobileNetV4 Medium melalui library `timm`:

```text
mobilenetv4_conv_medium.e500_r224_in1k
```

Model memakai pretrained weight ImageNet, lalu classification head diganti menjadi 4 output sesuai jumlah kategori SnapTrip.

PRD teknis awal menyebut MobileNetV2. Notebook ini memakai MobileNetV4 Medium sebagai adaptasi sesuai keputusan implementasi, tanpa mengubah taxonomy, preprocessing utama, atau kontrak output classifier.

## 7. Strategi Fine-Tuning

Training dilakukan maksimal 30 epoch dengan dua fase:

1. Fase `head`

   Backbone dibekukan selama 5 epoch pertama. Pada fase ini hanya classification head yang dilatih agar cepat menyesuaikan dataset SnapTrip.

2. Fase `full`

   Setelah fase awal selesai, seluruh backbone dibuka kembali dan model dilatih penuh.

Strategi ini dipakai karena dataset relatif kecil. Freeze-unfreeze membantu mengurangi risiko pretrained representation berubah terlalu agresif di awal training.

## 8. Loss, Optimizer, dan Scheduler

Notebook menggunakan:

- `CrossEntropyLoss` dengan label smoothing.
- `AdamW`.
- `CosineAnnealingLR`.
- Mixed precision jika CUDA tersedia.

Metric utama untuk pemilihan model terbaik adalah `val_macro_f1`, karena dataset classification multi-kelas perlu dinilai secara seimbang antar kelas.

## 9. Early Stopping

Early stopping aktif setelah fase freeze selesai.

Jika `val_macro_f1` tidak membaik selama 7 epoch berturut-turut, training berhenti lebih awal. Model terbaik tetap disimpan berdasarkan nilai `val_macro_f1` tertinggi.

## 10. Evaluasi

Setelah training, notebook memuat checkpoint terbaik dan melakukan evaluasi pada test set.

Metric yang dihitung:

- Accuracy.
- Macro precision.
- Macro recall.
- Macro F1.
- Classification report per kelas.
- Confusion matrix.
- Confidence prediction per gambar.

## 11. Output

Notebook menyimpan hasil ke folder lokal:

- `output/model/snaptrip_mobilenetv4_medium_best.pth`
- `output/model/snaptrip_mobilenetv4_medium_last.pth`
- `output/model/snaptrip_mobilenetv4_medium_metadata.json`
- `output/metrics/mobilenetv4_medium_training_history.csv`
- `output/metrics/mobilenetv4_medium_classification_report.csv`
- `output/metrics/mobilenetv4_medium_confusion_matrix.png`
- `output/metrics/mobilenetv4_medium_test_predictions.csv`

Metadata model menyimpan informasi framework, architecture, class mapping, preprocessing, epoch training, dan hasil metric utama agar artifact mudah diintegrasikan ke backend.
