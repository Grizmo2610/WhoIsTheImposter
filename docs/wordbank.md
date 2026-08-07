# 📚 Word Bank & CLI Management — Who Is The Imposter?

The word bank system in **Who Is The Imposter?** is decoupled via a flexible repository pattern supporting local files and cloud storage backends.

---

## Word Format & CSV Structure

Each word entry contains the following fields:
* `word` (`tu_that`): The secret word assigned to civilian players (or base word).
* `topic` (`tu_lien_quan` or category topic): The category group. In imposter modes, imposters receive a related word or clue from the same topic.
* `hints` (`goi_y`): A list of helpful clues or hints used during discussion (especially in "Aware" imposter mode).
* `meaning`: Definition or description of the word shown when players inspect their word.

CSV Format Example:
```csv
tu_that,tu_lien_quan,goi_y
Phở,Bánh mì,Món ăn đường phố Việt Nam;Món nước có sợi
Biển,Nhà tắm,Quán cà phê có view biển;Nơi ngắm hoàng hôn
```

---

## Storage Backends

1. **`local`**: Stores the word bank in a local CSV file (`backend/data/words.csv`).
2. **`r2`**: Cloudflare R2 (S3-compatible object storage) storing the entire word bank CSV file with TTL-based in-memory caching.
3. **`d1`**: Cloudflare D1 (managed SQLite database) accessed via the Cloudflare REST API, allowing row-level inserts, updates, and deletes without overwrite conflicts.

---

## CLI Word Management (`manage_words.py`)

The command-line tool `backend/manage_words.py` provides full CRUD capabilities against any configured storage backend (`local`, `r2`, or `d1`).

### General Command Syntax
```bash
python manage_words.py [--backend local|r2|d1] <command> [options]
```

### Available Commands

* **`init-schema`** (D1 only):
  ```bash
  python manage_words.py --backend d1 init-schema
  ```

* **`add`**: Add a new word entry.
  ```bash
  python manage_words.py --backend local add --word "Phở" --topic "Ẩm thực" --hints "Món nước có sợi" "Ăn sáng" --meaning "Món ăn truyền thống Việt Nam"
  ```

* **`list`**: Display all words grouped by topic.
  ```bash
  python manage_words.py --backend local list
  ```

* **`get`**: Retrieve a specific word entry.
  ```bash
  python manage_words.py --backend local get --word "Phở"
  ```

* **`update`**: Update an existing word entry.
  ```bash
  python manage_words.py --backend local update --word "Phở" --meaning "Món phở truyền thống nổi tiếng"
  ```

* **`delete`**: Delete a word entry.
  ```bash
  python manage_words.py --backend local delete --word "Phở"
  ```

* **`export`**: Backup the word bank to a local CSV file.
  ```bash
  python manage_words.py --backend r2 export --out backup.csv
  ```

* **`import`**: Upload a local CSV file to the backend (overwrites existing data).
  ```bash
  python manage_words.py --backend d1 import --file data/words.csv -y
  ```
