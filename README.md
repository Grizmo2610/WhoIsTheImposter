<!-- Improved compatibility of back to top link -->

<a id="readme-top"></a>

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![project\_license][license-shield]][license-url]

<br />
<div align="center">
  <a href="https://github.com/Grizmo2610/WhoIsTheImposter">
    <img src="images/logo.png" alt="Logo" width="80" height="80">
  </a>

<h3 align="center">Who Is The Imposter?</h3>

  <p align="center">
    Real-time & Pass-and-play party game — find the imposter among your friends
    <br />
    <a href="https://github.com/Grizmo2610/WhoIsTheImposter"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/Grizmo2610/WhoIsTheImposter">View Demo</a>
    &middot;
    <a href="https://github.com/Grizmo2610/WhoIsTheImposter/issues/new?labels=bug&template=bug-report---.md">Report Bug</a>
    &middot;
    <a href="https://github.com/Grizmo2610/WhoIsTheImposter/issues/new?labels=enhancement&template=feature-request---.md">Request Feature</a>
  </p>
</div>

---

## About The Project

[![Product Name Screen Shot][product-screenshot]](https://example.com)

**Who Is The Imposter?** is a party game inspired by classic social deduction formats (Mafia / Among Us). Players take turns viewing their secret word, discussing, and voting to eliminate the imposter before they sabotage the group.

The project supports two flexible deployment modes:
1. **Classic Pass-and-Play (Frontend-Only)**: Runs entirely client-side on a single device — zero setup, no network required.
2. **Authoritative Backend (FastAPI + WebSocket)**: Server-managed state with secure role/secret distribution and multi-device real-time sync across phones.

### Core Features

* **Dual Mode Play**: Pass-and-play on a single device or multi-device online via WebSocket.
* **Configurable Setup**: Player count (3–12), imposter count, and round timer with circular progress indicator.
* **Imposter Modes**: 
  * **Aware**: Imposter knows their role and receives a related clue to bluff with.
  * **Hidden**: Imposter only sees a word similar to the civilians' word with no role indication.
* **Anti-Cheat Protection**: Automatically hides the screen when switching browser tabs.
* **Word Bank**: 50+ Vietnamese word pairs stored in CSV (local or Cloudflare R2 S3-compatible storage).
* **Interactive UI**: Confetti celebration on game victory and smooth multi-round support.

Pipeline:
Setup → Names → Handover → Reveal → Discuss → Vote → Eliminate → Results

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Built With

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/Python-3.10%2B-blue?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.100%2B-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/WebSocket-Realtime-orange?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Cloudflare_R2-S3-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" />
</p>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Getting Started & Installation

### Prerequisites

* A modern web browser (Chrome, Firefox, Safari, Edge)
* Python 3.10+ (optional, only required if running the FastAPI backend)

### 1. Clone the Repository

```sh
git clone https://github.com/Grizmo2610/WhoIsTheImposter.git
```

2. Open the project folder

```sh
cd WhoIsTheImposter
```

### 2. Option A: Run Frontend-Only (Pass-and-Play)

No installation or build step required. Simply open `index.html` in your browser:

* **Windows:** `start index.html` (or double-click `index.html`)
* **macOS:** `open index.html`
* **Linux:** `xdg-open index.html`

### 3. Option B: Run Full-Stack (FastAPI Backend + Frontend)

To run with secure server-side state and multi-device WebSocket support:

* **Terminal 1 (Backend):**
  ```bash
  cd backend
  python -m venv .venv
  .venv\Scripts\activate.bat   # On macOS/Linux: source .venv/bin/activate
  pip install -r requirements.txt
  cp .env.example .env
  uvicorn app.main:app --reload --port 8000
  ```

* **Terminal 2 (Frontend Static Server):**
  ```bash
  cd frontend
  python -m http.server 5500
  ```
  Then open `http://localhost:5500` in your browser.

* For detailed architecture and Cloudflare R2 word bank configuration, see [backend/README.md](backend/README.md).
* For frontend client architecture, see [frontend/README.md](frontend/README.md).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Usage

### How to Play

1. **Setup** — Configure the number of players, imposters, imposter mode, and optional timer.
2. **Names** — Enter a name for each player.
3. **Handover** — Pass the device to the next player. They tap to see their secret word.
4. **Reveal** — The current player views their word privately (protected by anti-cheat tab switching).
5. **Discuss** — All players discuss openly within the time limit.
6. **Vote** — Each player votes for who they think is the imposter.
7. **Eliminate** — The voted player is revealed as civilian or imposter.
8. **Results** — The game ends when all imposters are eliminated (civilians win) or imposters outnumber civilians.

### Word Bank

Words are loaded from `words.csv` (managed locally or via Cloudflare R2). Each row contains:

```csv
tu_that,tu_lien_quan,goi_y
Phở,Bánh mì,Món ăn đường phố Việt Nam
Biển,Nhà tắm,Quán cà phê có view biển
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Roadmap

* [x] Client-side pass-and-play mode
* [x] FastAPI authoritative backend with WebSocket real-time sync
* [x] Cloudflare R2 storage integration for word banks
* [ ] Localization support (English, Japanese, Korean, etc.)
* [ ] Sound effects and background music
* [ ] Custom word packs
* [ ] Online multiplayer expansion (WebRTC / Cloud deployment)
* [ ] Mobile app wrapper (Capacitor / PWA)
* [ ] Score tracking and statistics

See the [open issues](https://github.com/Grizmo2610/WhoIsTheImposter/issues)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

### Top Contributors:

<a href="https://github.com/Grizmo2610/WhoIsTheImposter/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Grizmo2610/WhoIsTheImposter" />
</a>

---

## License

Distributed under the MIT License. See `LICENSE.txt` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Contact

hoangtuantu - [hoangtuantu893@gmail.com](mailto:hoangtuantu893@gmail.com)

Project Link:
https://github.com/Grizmo2610/WhoIsTheImposter

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Acknowledgments

* Among Us / Mafia / Werewolf game formats
* FastAPI & Python ecosystem
* Cloudflare R2

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

[contributors-shield]: https://img.shields.io/github/contributors/Grizmo2610/WhoIsTheImposter.svg?style=for-the-badge
[contributors-url]: https://github.com/Grizmo2610/WhoIsTheImposter/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/Grizmo2610/WhoIsTheImposter.svg?style=for-the-badge
[forks-url]: https://github.com/Grizmo2610/WhoIsTheImposter/network/members
[stars-shield]: https://img.shields.io/github/stars/Grizmo2610/WhoIsTheImposter.svg?style=for-the-badge
[stars-url]: https://github.com/Grizmo2610/WhoIsTheImposter/stargazers
[issues-shield]: https://img.shields.io/github/issues/Grizmo2610/WhoIsTheImposter.svg?style=for-the-badge
[issues-url]: https://github.com/Grizmo2610/WhoIsTheImposter/issues
[license-shield]: https://img.shields.io/github/license/Grizmo2610/WhoIsTheImposter.svg?style=for-the-badge
[license-url]: https://github.com/Grizmo2610/WhoIsTheImposter/blob/master/LICENSE.txt
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://linkedin.com/in/linkedin_username
[product-screenshot]: images/screenshot.png
