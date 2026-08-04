<!-- Improved compatibility of back to top link -->

<a id="readme-top"></a>

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![project\_license][license-shield]][license-url]

<br />
<div align="center">
  <a href="https://github.com/hoangtuantu/WhoIsTheImposter">
    <img src="images/logo.png" alt="Logo" width="80" height="80">
  </a>

<h3 align="center">Who Is The Imposter?</h3>

  <p align="center">
    Pass-and-play party game — find the imposter among your friends
    <br />
    <a href="https://github.com/hoangtuantu/WhoIsTheImposter"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/hoangtuantu/WhoIsTheImposter">View Demo</a>
    &middot;
    <a href="https://github.com/hoangtuantu/WhoIsTheImposter/issues/new?labels=bug&template=bug-report---.md">Report Bug</a>
    &middot;
    <a href="https://github.com/hoangtuantu/WhoIsTheImposter/issues/new?labels=enhancement&template=feature-request---.md">Request Feature</a>
  </p>
</div>

---

## About The Project

[![Product Name Screen Shot][product-screenshot]](https://example.com)

A real-time, pass-and-play party game inspired by the classic "Who is the Imposter?" / Mafia / Among Us format. One player is secretly the imposter — everyone else is a civilian. Players take turns viewing their secret word, then discuss and vote to eliminate the imposter before they sabotage the group.

Core features:

* Pass-and-play on a single device — no network required
* Configurable player count (3–12) and imposter count
* Two imposter modes: **Aware** (imposter knows the imposter role and gets a related clue) and **Hidden** (imposter only sees a word similar to the civilians')
* Optional discussion timer with circular progress indicator
* Anti-cheat protection — hides the screen when the user switches tabs
* Word bank with 50+ Vietnamese word pairs (CSV-based, easily extensible)
* Multi-round support — play until imposters or civilians win
* Confetti celebration on game end
* Fully client-side — no backend, no build step

Pipeline:
Setup → Names → Handover → Reveal → Discuss → Vote → Eliminate → Results

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

### Built With

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/Canvas-2D_Graphics?style=for-the-badge" />
  <img src="https://img.shields.io/badge/CSV-Data-blue?style=for-the-badge" />
</p>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Getting Started

### Prerequisites

* A modern web browser (Chrome, Firefox, Safari, Edge)
* No installation or build step required

---

### Installation

1. Clone repository

```sh
git clone https://github.com/hoangtuantu/WhoIsTheImposter.git
```

2. Open the project folder

```sh
cd WhoIsTheImposter
```

3. Open `index.html` in your browser

```sh
# On Windows
start index.html

# On macOS
open index.html

# On Linux
xdg-open index.html
```

Or simply double-click `index.html`.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Usage

### How to Play

1. **Setup** — Configure the number of players, imposters, imposter mode, and optional timer.
2. **Names** — Enter a name for each player.
3. **Handover** — Pass the device to the next player. They tap to see their secret word.
4. **Reveal** — The current player views their word privately. The screen is hidden when they switch tabs (anti-cheat).
5. **Discuss** — All players discuss openly. If a timer is enabled, the round is time-limited.
6. **Vote** — Each player votes for who they think is the imposter.
7. **Eliminate** — The voted player is revealed as civilian or imposter.
8. **Results** — The game ends when all imposters are eliminated (civilians win) or imposters outnumber civilians (imposters win).

### Imposter Modes

* **Aware** — The imposter knows their role and receives a related clue to bluff with.
* **Hidden** — The imposter only sees a word similar to the civilians' word, with no indication they are the imposter.

### Word Bank

Words are loaded from `words.csv`. Each row contains:

```csv
tu_that,tu_lien_quan,goi_y
Phở,Bánh mì,Món ăn đường phố Việt Nam
Biển,Nhà tắm,Quán cà phê có view biển
```

The first column is the civilian word, the second is the related word shown to the imposter in hidden mode, and the third is an optional clue shown to the aware imposter.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Roadmap

* [ ] Localization support (English, Japanese, Korean, etc.)
* [ ] Sound effects and background music
* [ ] Custom word packs
* [ ] Online multiplayer (WebRTC / WebSocket)
* [ ] Mobile app wrapper (Capacitor / PWA)
* [ ] Score tracking and statistics
* [ ] Theme customization (dark / light / custom)

See the [open issues](https://github.com/hoangtuantu/WhoIsTheImposter/issues)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Contributing

1. Fork the project
2. Create branch (`feature/...`)
3. Commit changes
4. Push to branch
5. Create Pull Request

---

### Top contributors:

<a href="https://github.com/hoangtuantu/WhoIsTheImposter/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=hoangtuantu/WhoIsTheImposter" />
</a>

---

## License

Distributed under the MIT License.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Contact

hoangtuantu - [hoangtuantu893@gmail.com](mailto:hoangtuantu893@gmail.com)

Project Link:
https://github.com/hoangtuantu/WhoIsTheImposter

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Acknowledgments

* Among Us / Mafia / Werewolf game formats
* FaceNet paper
* PyTorch
* MTCNN
* Cloudflare R2

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

[contributors-shield]: https://img.shields.io/github/contributors/hoangtuantu/WhoIsTheImposter.svg?style=for-the-badge
[contributors-url]: https://github.com/hoangtuantu/WhoIsTheImposter/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/hoangtuantu/WhoIsTheImposter.svg?style=for-the-badge
[forks-url]: https://github.com/hoangtuantu/WhoIsTheImposter/network/members
[stars-shield]: https://img.shields.io/github/stars/hoangtuantu/WhoIsTheImposter.svg?style=for-the-badge
[stars-url]: https://github.com/hoangtuantu/WhoIsTheImposter/stargazers
[issues-shield]: https://img.shields.io/github/issues/hoangtuantu/WhoIsTheImposter.svg?style=for-the-badge
[issues-url]: https://github.com/hoangtuantu/WhoIsTheImposter/issues
[license-shield]: https://img.shields.io/github/license/hoangtuantu/WhoIsTheImposter.svg?style=for-the-badge
[license-url]: https://github.com/hoangtuantu/WhoIsTheImposter/blob/master/LICENSE.txt
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://linkedin.com/in/linkedin_username
[product-screenshot]: images/screenshot.png