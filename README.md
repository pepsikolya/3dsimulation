# Orbitální mechanika & Antigravitační sandbox

Interaktivní 3D fyzikální simulace Newtonovy gravitace N-těles s dynamickým přechodem do odpudivé **antigravitační** fáze ($G \to -G$).

Vytvořeno v souladu s technickou specifikací a ve stylu moderního rozhraní **Apple macOS Pro** (bez AI šablonovitých prvků, s nativní typografií a Apple dark mode paletou).

---

## 🌟 Klíčové vlastnosti

1. **3D WebGL simulace v reálném čase (Three.js)**:
   - Hardwarově akcelerované vykreslování s plynulými 60+ FPS.
   - Elegantní tmavé rozhraní macOS (`#121214`, `#1c1c1e`, `#2c2c2e`).
   - Centrální zářící Slunce s měkkou optickou koronou a bodovým světlem.
   - Plynulé trajektorie oběhu s exponenciálním dozníváním stopy.
   - Vizuální zobrazení rázové vlny při inverzi gravitačního pole.

2. **Symplektický integrátor Euler-Cromer**:
   - Vzájemné gravitační působení s vyhlazovacím parametrem $\epsilon = 0.1$:
     $$a_i = G \sum_{j \neq i} \frac{m_j \mathbf{r}_{ij}}{(|\mathbf{r}_{ij}|^2 + \epsilon^2)^{3/2}}$$
   - Semi-implicitní časová integrace Euler-Cromer ($\Delta t = 0.01\text{s}$):
     $$v_i^{(t+\Delta t)} = v_i^{(t)} + a_i^{(t)} \cdot \Delta t$$
     $$r_i^{(t+\Delta t)} = r_i^{(t)} + v_i^{(t+\Delta t)} \cdot \Delta t$$
   - Zachovává objem fázového prostoru a brání nežádoucímu numerickému rozpadu orbit.

3. **Inverze gravitace ($G \to -G$)**:
   - Změna gravitačních jam na odpudivé kopce způsobuje okamžitý hyperbolický rozptyl těles.
   - Automatické přepnutí v kroku 500 nebo okamžité ruční přepnutí segmentovaným tlačítkem či klávesou `[G]`.

4. **Implementovaná rozšíření specifikace**:
   - **Nepružné srážky (Rozšíření č. 1)**: Tělesa se při srážce sloučí v jedno, přičemž je zachována celková hmotnost i hybnost ($\mathbf{v} = \frac{m_1\mathbf{v}_1 + m_2\mathbf{v}_2}{m_1 + m_2}$).
   - **Export pro 3D grafiku (Rozšíření č. 2)**: Export matice trajektorií $[T \times N \times 3]$ do formátů **JSON** (pro Blender Geometry Nodes) a **CSV** (pro Unreal Engine / Pandas).
   - **Interaktivní inspektor (Rozšíření č. 3)**: Změna hmotností těles v reálném čase, vyhlazovací faktor $\epsilon$, časový krok $\Delta t$, přidávání nových těles.

5. **Interaktivní průvodce (Tutorial)**:
   - Přímo v aplikaci dostupný modální list **Průvodce**, který uživateli srozumitelně vysvětluje principy simulace, fungování integrátoru a jev antigravitace.

6. **Přednastavené scénáře oběhu**:
   - **Základní systém**: Referenční konfigurace z kapitoly 5 (Slunce + Alfa, Beta, Gama).
   - **Choreografie osmičky**: Stabilní analytické řešení 3 těles o shodné hmotnosti.
   - **Dvojhvězda**: Dvě centrální hvězdy s vnějšími planetami.
   - **Lagrangeovy body**: Stabilní rovnovážné body L4 a L5 se zachycenými planetkami.
   - **Chaotická hvězdokupa**: Hustá 16-tělesová soustava s dramatickým rozptylem.

---

## 🚀 Jak aplikaci spustit

### Možnost 1: Dvojklikem na Windows
Spusťte dávkový soubor `run.bat` ve složce projektu:
```powershell
.\run.bat
```

### Možnost 2: Z příkazové řádky Pythonu
```powershell
python server.py
```
Aplikace automaticky spustí lokální server a otevře výchozí webový prohlížeč na adrese `http://localhost:8080/index.html`.

### Možnost 3: Spuštění referenční simulace v Pythonu
```powershell
python reference_sim.py
```

---

## ⌨️ Klávesové zkratky

| Klávesa | Akce |
| :--- | :--- |
| `Mezerník` | Spustit / Pozastavit simulaci |
| `G` | Přepnout Gravitaci / Antigravitaci ($G \leftrightarrow -G$) |
| `R` | Obnovit simulaci do výchozího stavu |
| `.` | Posun o 1 časový krok vpřed |
| `C` | Vymazat stopy trajektorií |
| `H` | Skrýt / Zobrazit boční inspektor |
| `V` | Zobrazit / Skrýt vektory rychlostí |
| `T` | Přepnout na pohled shora (rovina XY) |
